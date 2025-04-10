
import React, { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';

interface Message {
  message: string;
  sender: 'user' | 'bot' | 'human' | 'system';
  timestamp: string;
  agentName?: string;
}

interface ChatMessageListProps {
  messages: Message[];
  isTyping: boolean;
  isModelLoading: boolean;
}

export const ChatMessageList = ({ messages, isTyping, isModelLoading }: ChatMessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4" id="chat-messages">
      {messages.map((msg, index) => (
        <ChatMessage
          key={index}
          message={msg.message}
          sender={msg.sender}
          timestamp={msg.timestamp}
          agentName={msg.agentName}
        />
      ))}
      
      {isTyping && (
        <div className="flex justify-start mb-4">
          <div className="bg-gray-100 rounded-lg px-4 py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {isModelLoading && (
        <div className="flex justify-center my-4">
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm">
            Loading GPT-2 model... This may take a moment.
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};
