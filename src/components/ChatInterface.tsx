
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { pipeline } from '@huggingface/transformers';
import { toast } from '@/hooks/use-toast';

interface Message {
  message: string;
  sender: 'user' | 'bot' | 'human' | 'system';
  timestamp: string;
  agentName?: string;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [showUserForm, setShowUserForm] = useState(true);
  const [showHumanRequestForm, setShowHumanRequestForm] = useState(false);
  const [issue, setIssue] = useState('');
  const [model, setModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize the model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        // Load the text generation model from Hugging Face
        // Using proper options format for the pipeline
        const generator = await pipeline(
          'text-generation',
          'gpt2',
          { 
            // Removed maxLength as it's not a valid option in PretrainedModelOptions
          }
        );
        setModel(generator);
        setIsModelLoading(false);
        console.log('GPT-2 model loaded successfully');
      } catch (error) {
        console.error('Error loading GPT-2 model:', error);
        toast({
          title: 'Error',
          description: 'Failed to load GPT-2 model. Falling back to server responses.',
          variant: 'destructive'
        });
        setIsModelLoading(false);
      }
    };

    loadModel();
  }, []);

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
          setShowHumanRequestForm(false);
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

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleUserFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to start chatting.',
        variant: 'destructive'
      });
      return;
    }
    
    setShowUserForm(false);
    
    // Join chat room
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'join_room',
        userName,
        userEmail
      }));
    }
    
    // Add welcome message
    setMessages([
      {
        message: `Hello ${userName}! How can I assist you today?`,
        sender: 'bot',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    const userMessage = {
      message: inputMessage,
      sender: 'user' as const,
      timestamp: new Date().toISOString()
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputMessage('');
    
    setIsLoading(true);

    try {
      // Use the loaded GPT-2 model to generate a response
      if (model && !isModelLoading) {
        const result = await model(inputMessage, {
          // Proper options for GPT-2 generation
          max_new_tokens: 100,
          num_return_sequences: 1,
        });

        // Extract the generated text from the result
        let botResponse = result[0].generated_text;
        
        // Clean up the response (remove the input prompt and keep just the response)
        if (botResponse.includes(inputMessage)) {
          botResponse = botResponse.substring(inputMessage.length).trim();
        }
        
        // Make sure we have something to display
        if (!botResponse) {
          botResponse = "I'm not sure how to respond to that. Can you try rephrasing your question?";
        }

        // Add the bot response to messages
        const botMessage = {
          message: botResponse,
          sender: 'bot' as const,
          timestamp: new Date().toISOString()
        };
        
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      } else {
        // If model is not available, send to server instead
        if (socket && socket.readyState === WebSocket.OPEN && roomId) {
          socket.send(JSON.stringify({
            type: 'message',
            roomId,
            message: inputMessage,
            sender: 'user'
          }));
        }
      }
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Fallback to server response
      if (socket && socket.readyState === WebSocket.OPEN && roomId) {
        socket.send(JSON.stringify({
          type: 'message',
          roomId,
          message: inputMessage,
          sender: 'user'
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestHuman = () => {
    setShowHumanRequestForm(true);
  };

  const handleSubmitHumanRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim() || !userEmail.trim() || !issue.trim()) {
      toast({
        title: 'All Fields Required',
        description: 'Please fill in all required fields to request a human agent.',
        variant: 'destructive'
      });
      return;
    }
    
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 bg-white border-b">
        <h1 className="text-xl font-bold text-center">Company Chat Assistant</h1>
      </header>
      
      {showUserForm ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Welcome to our Chat</h2>
            <form onSubmit={handleUserFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email (optional)
                </label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Your email"
                />
              </div>
              <Button type="submit" className="w-full">
                Start Chatting
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4" id="chat-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[75%] ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white'
                      : msg.sender === 'bot'
                      ? 'bg-gray-100 text-gray-800'
                      : msg.sender === 'human'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {msg.sender !== 'user' && (
                    <div className="text-xs font-medium mb-1">
                      {msg.sender === 'bot' ? 'Chatbot' : msg.sender === 'human' ? msg.agentName || 'Agent' : 'System'}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.message}</div>
                  <div className="text-xs opacity-75 text-right mt-1">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
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
          
          {showHumanRequestForm ? (
            <div className="p-4 border-t">
              <Card className="p-4">
                <h2 className="text-lg font-bold mb-2">Request Human Assistance</h2>
                <form onSubmit={handleSubmitHumanRequest} className="space-y-3">
                  <div>
                    <label htmlFor="hr-name" className="block text-sm font-medium mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="hr-name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="hr-email" className="block text-sm font-medium mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="hr-email"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="hr-issue" className="block text-sm font-medium mb-1">
                      What do you need help with? <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="hr-issue"
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit" className="flex-1">
                      Submit Request
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowHumanRequestForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          ) : (
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending
                    </span>
                  ) : (
                    'Send'
                  )}
                </Button>
              </form>
              <div className="mt-3 flex justify-center">
                <Button variant="outline" size="sm" onClick={handleRequestHuman}>
                  Request Human Agent
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChatInterface;
