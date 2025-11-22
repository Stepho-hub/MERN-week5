import React from 'react';
import { useChat } from '../contexts/ChatContext';

const UserList = () => {
  const { onlineUsers, user } = useChat();

  return (
    <div className="p-4 border-t">
      <h3 className="text-sm font-semibold text-gray-600 mb-2">Online Users ({onlineUsers.length})</h3>
      <div className="space-y-1">
        {onlineUsers.map((onlineUser) => (
          <div
            key={onlineUser}
            className={`flex items-center space-x-2 p-2 rounded ${
              onlineUser === user?.username ? 'bg-blue-100' : 'hover:bg-gray-100'
            }`}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">{onlineUser}</span>
            {onlineUser === user?.username && <span className="text-xs text-gray-500">(you)</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;