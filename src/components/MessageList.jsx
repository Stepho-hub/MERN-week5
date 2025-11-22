import React, { useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';

const MessageList = () => {
  const { messages, currentRoom, user, typingUsers, markAsRead } = useChat();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const messageContainer = messagesEndRef.current?.parentElement;
    if (messageContainer) {
      const { scrollTop, scrollHeight, clientHeight } = messageContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages[currentRoom]]);

  useEffect(() => {
    // Mark messages as read when they come into view
    const messageElements = document.querySelectorAll('.message-item');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const messageId = entry.target.dataset.messageId;
          const message = messages[currentRoom]?.find(m => m.id == messageId);
          if (message && !message.readBy.includes(user?.username)) {
            markAsRead(messageId);
          }
        }
      });
    });

    messageElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [messages[currentRoom], currentRoom, user, markAsRead]);

  const roomMessages = messages[currentRoom] || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {roomMessages.map((message) => (
        <div
          key={message.id}
          data-message-id={message.id}
          className={`message-item flex ${message.user === user?.username ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.user === user?.username
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-800'
            }`}
          >
            <div className="font-semibold text-sm">{message.user}</div>
            <div>{message.message}</div>
            <div className="text-xs opacity-75 mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
              {message.readBy.length > 1 && (
                <span className="ml-2">✓✓</span>
              )}
            </div>
          </div>
        </div>
      ))}
      {typingUsers.size > 0 && (
        <div className="text-gray-500 italic">
          {Array.from(typingUsers).join(', ')} is typing...
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;