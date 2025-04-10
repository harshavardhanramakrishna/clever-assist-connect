
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface Message {
  message: string;
  sender: 'user' | 'bot' | 'human' | 'system';
  timestamp: string;
  agentName?: string;
}

interface ChatWebSocketReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isTyping: boolean;
  roomId: string | null;
  socket: WebSocket | null;
  sendMessage: (message: string, sender: 'user') => void;
  joinRoom: (userName: string, userEmail: string) => void;
  requestHuman: (userName: string, userEmail: string, issue: string) => void;
}

export const useChatWebSocket = (): ChatWebSocketReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (roomId) {
      const ws = new WebSocket('ws://localhost:5000/ws');
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'message') {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              message: data.message,
              sender: data.sender,
              timestamp: data.timestamp,
              agentName: data.agentName
            }
          ]);
          setIsTyping(false);
        } else if (data.type === 'typing') {
          setIsTyping(data.isTyping);
        } else if (data.type === 'room_created') {
          setRoomId(data.roomId);
        } else if (data.type === 'human_requested') {
          toast({
            title: 'Human Agent Requested',
            description: 'An agent will join the chat shortly.',
            duration: 5000,
          });
        } else if (data.type === 'human_joined') {
          toast({
            title: 'Human Agent Connected',
            description: `${data.agentName} has joined the chat.`,
            duration: 5000,
          });
        }
      };
      
      ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
      };
      
      setSocket(ws);
      
      return () => {
        ws.close();
      };
    }
  }, [roomId]);

  const sendMessage = (message: string, sender: 'user') => {
    if (socket && socket.readyState === WebSocket.OPEN && roomId) {
      socket.send(JSON.stringify({
        type: 'message',
        roomId,
        message,
        sender
      }));
    }
  };

  const joinRoom = (userName: string, userEmail: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'join_room',
        userName,
        userEmail
      }));
    }
  };

  const requestHuman = (userName: string, userEmail: string, issue: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && roomId) {
      socket.send(JSON.stringify({
        type: 'request_human',
        roomId,
        userName,
        userEmail,
        issue
      }));
    }
  };

  return {
    messages,
    setMessages,
    isTyping,
    roomId,
    socket,
    sendMessage,
    joinRoom,
    requestHuman
  };
};
