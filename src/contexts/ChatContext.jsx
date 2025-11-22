import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);

  const connectSocket = () => {
    const newSocket = io('http://localhost:3001');

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setSocketConnected(true);
      if (user?.username) {
        newSocket.emit('setUsername', user.username);
        joinRoom(currentRoom);
      }
    });

    newSocket.on('disconnect', () => {
      setSocketConnected(false);
    });

    newSocket.on('roomMessages', (roomMessages) => {
      setMessages(prev => {
        const existing = prev[currentRoom] || [];
        const newMessages = roomMessages.filter(msg => !existing.find(e => e.id === msg.id));
        return { ...prev, [currentRoom]: [...existing, ...newMessages] };
      });
    });

    newSocket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('message', (message) => {
      setMessages(prev => ({
        ...prev,
        [currentRoom]: [...(prev[currentRoom] || []), message]
      }));
      // Add notification if not from current user
      if (message.user !== user?.username) {
        setNotifications(prev => [...prev, { type: 'message', from: message.user, room: currentRoom }]);
      }
    });

    newSocket.on('userTyping', ({ user: typingUser, typing }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (typing) {
          newSet.add(typingUser);
        } else {
          newSet.delete(typingUser);
        }
        return newSet;
      });
    });

    newSocket.on('readReceipt', ({ messageId, user: readUser }) => {
      setMessages(prev => ({
        ...prev,
        [currentRoom]: prev[currentRoom]?.map(msg =>
          msg.id === messageId ? { ...msg, readBy: [...msg.readBy, readUser] } : msg
        ) || []
      }));
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const joinRoom = (room) => {
    if (socketConnected) {
      if (currentRoom) {
        socket.emit('leaveRoom', currentRoom);
      }
      socket.emit('joinRoom', room);
      setCurrentRoom(room);
      if (!messages[room]) {
        setMessages(prev => ({ ...prev, [room]: [] }));
      }
    }
  };

  const sendMessage = (message, isPrivate = false, recipient = null) => {
    if (socketConnected) {
      const msg = {
        id: Date.now(),
        user: user.username,
        message,
        timestamp: new Date(),
        readBy: [user.username]
      };
      setMessages(prev => ({ ...prev, [currentRoom]: [...(prev[currentRoom] || []), msg] }));
      socket.emit('sendMessage', { room: currentRoom, message, isPrivate, recipient });
    }
  };

  const startTyping = (isPrivate = false, recipient = null) => {
    if (socket) {
      socket.emit('typing', { room: currentRoom, isPrivate, recipient });
    }
  };

  const stopTyping = (isPrivate = false, recipient = null) => {
    if (socket) {
      socket.emit('stopTyping', { room: currentRoom, isPrivate, recipient });
    }
  };

  const markAsRead = (messageId, isPrivate = false, recipient = null) => {
    if (socket) {
      socket.emit('markAsRead', { messageId, room: currentRoom, isPrivate, recipient });
    }
  };

  const login = async (username, password) => {
    const response = await fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      setUser({ username });
      connectSocket(data.token);
      return true;
    }
    return false;
  };

  const register = async (username, password) => {
    const response = await fetch('http://localhost:3001/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.ok;
  };

  const setUsername = (username) => {
    setUser({ username });
    localStorage.setItem('username', username);
    if (socketConnected) {
      socket.emit('setUsername', username);
      joinRoom(currentRoom);
    }
  };

  const logout = () => {
    disconnectSocket();
    setUser(null);
    localStorage.removeItem('username');
    setOnlineUsers([]);
    setTypingUsers(new Set());
    setNotifications([]);
  };

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (username) {
      setUser({ username });
      // Load messages for this user
      const savedMessages = localStorage.getItem(`messages_${username}`);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          Object.keys(parsed).forEach(room => {
            parsed[room] = parsed[room].map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
          });
          setMessages(parsed);
        } catch (e) {
          console.error('Error loading messages from localStorage', e);
        }
      }
      connectSocket();
    } else {
      connectSocket();
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (user && Object.keys(messages).length > 0) {
      localStorage.setItem(`messages_${user.username}`, JSON.stringify(messages));
    }
  }, [messages, user]);

  return (
    <ChatContext.Provider value={{
      user,
      onlineUsers,
      currentRoom,
      messages,
      typingUsers,
      notifications,
      joinRoom,
      sendMessage,
      startTyping,
      stopTyping,
      markAsRead,
      setUsername,
      login,
      register,
      logout
    }}>
      {children}
    </ChatContext.Provider>
  );
};