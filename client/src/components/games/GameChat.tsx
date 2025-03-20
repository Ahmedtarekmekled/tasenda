import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaUsers } from 'react-icons/fa';

interface GameChatProps {
  messages: any[];
  sendMessage: (message: string) => void;
  players: any[];
  user: any;
}

const GameChat: React.FC<GameChatProps> = ({ messages, sendMessage, players, user }) => {
  const [messageInput, setMessageInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'players'
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput('');
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 text-center ${
            activeTab === 'chat' ? 'border-b-2 border-primary-500 font-medium' : ''
          }`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`flex-1 py-3 text-center ${
            activeTab === 'players' ? 'border-b-2 border-primary-500 font-medium' : ''
          }`}
          onClick={() => setActiveTab('players')}
        >
          <div className="flex items-center justify-center space-x-1">
            <FaUsers />
            <span>Players ({players.length})</span>
          </div>
        </button>
      </div>
      
      {/* Chat messages */}
      {activeTab === 'chat' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isCurrentUser = message.senderId === user?.id;
              const isSystem = message.type === 'system';
              
              if (isSystem) {
                return (
                  <div key={index} className="text-center">
                    <div className="inline-block px-3 py-1 bg-gray-100 rounded-md text-xs text-gray-600">
                      {message.message}
                    </div>
                  </div>
                );
              }
              
              return (
                <div 
                  key={index} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    max-w-[75%] px-3 py-2 rounded-lg
                    ${isCurrentUser 
                      ? 'bg-primary-100 text-primary-800 rounded-tr-none' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'}
                  `}>
                    {!isCurrentUser && (
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        {message.senderName}
                      </div>
                    )}
                    <div>{message.message}</div>
                    <div className="text-xs text-gray-500 text-right mt-1">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
      
      {/* Players list */}
      {activeTab === 'players' && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-medium mb-3">Players ({players.length})</h3>
          <div className="space-y-3">
            {players.map((player) => {
              const isCurrentUser = player.user._id === user?.id;
              const isHost = player.role === 'host';
              
              return (
                <div 
                  key={player.user._id} 
                  className={`flex items-center p-2 rounded-md ${
                    isCurrentUser ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center mr-3
                    ${isHost 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-primary-100 text-primary-700'}
                  `}>
                    {player.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium flex items-center">
                      {player.user.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isHost ? 'Host' : 'Player'} • Joined {new Date(player.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Message input */}
      {activeTab === 'chat' && (
        <div className="p-3 border-t">
          <form onSubmit={handleSubmit} className="flex">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="submit"
              className="bg-primary-600 text-white px-3 py-2 rounded-r-md hover:bg-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
              disabled={!messageInput.trim()}
            >
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default GameChat; 