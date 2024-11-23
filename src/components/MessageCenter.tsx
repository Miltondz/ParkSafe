import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Send, AlertTriangle } from 'lucide-react';
import { useMessageStore } from '../stores/messageStore';
import { useUserStore } from '../stores/userStore';
import toast from 'react-hot-toast';

const MessageCenter: React.FC = () => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUserStore();
  const { messages, loading, error, fetchMessages, sendMessage, subscribeToMessages, unsubscribeFromMessages } = useMessageStore();

  useEffect(() => {
    if (user) {
      fetchMessages();
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error: any) {
      toast.error('Failed to send message');
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-[40vh] bg-white shadow-lg rounded-t-xl">
      <div className="p-3 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center text-sm">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-500 text-center text-sm">No messages yet</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-2 ${
                  message.type === 'emergency'
                    ? 'bg-red-100 text-red-900'
                    : message.sender_id === user.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.type === 'emergency' && (
                  <div className="flex items-center mb-1 text-red-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    <span className="text-xs font-semibold">Emergency</span>
                  </div>
                )}
                <p className="text-sm break-words">{message.content}</p>
                <div
                  className={`text-xs mt-1 ${
                    message.sender_id === user.id ? 'text-indigo-100' : 'text-gray-500'
                  }`}
                >
                  {format(new Date(message.created_at), 'HH:mm')}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageCenter;