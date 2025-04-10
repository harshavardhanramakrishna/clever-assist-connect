
import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UserFormProps {
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const UserForm = ({ userName, setUserName, userEmail, setUserEmail, onSubmit }: UserFormProps) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Welcome to our Chat</h2>
        <form onSubmit={onSubmit} className="space-y-4">
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
  );
};
