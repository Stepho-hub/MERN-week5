import React, { useEffect, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';

const ChatRoom = () => {
  const { user, currentRoom, joinRoom, logout } = useChat();
  const [selectedRoom, setSelectedRoom] = useState('general');

  useEffect(() => {
    joinRoom(selectedRoom);
  }, [selectedRoom, joinRoom]);

  const rooms = ['general', 'random', 'tech'];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Chat Rooms</h2>
          <p className="text-sm text-gray-600">Welcome, {user?.username}</p>
          <button
            onClick={logout}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Logout
          </button>
        </div>
        <div className="p-4">
          {rooms.map(room => (
            <button
              key={room}
              onClick={() => setSelectedRoom(room)}
              className={`w-full text-left p-2 rounded mb-1 ${
                selectedRoom === room ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              }`}
            >
              #{room}
            </button>
          ))}
        </div>
        <UserList />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white shadow p-4 border-b">
          <h1 className="text-xl font-bold">#{currentRoom}</h1>
        </div>
        <MessageList />
        <MessageInput />
      </div>
    </div>
  );
};

export default ChatRoom;