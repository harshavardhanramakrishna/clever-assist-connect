
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import ChatInterface from "@/components/ChatInterface";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6 p-6">
          <h1 className="text-2xl font-bold mb-4 text-center">Welcome to Chat Support</h1>
          <div className="flex justify-center gap-4 mb-6">
            <Button asChild variant="outline">
              <Link to="/agent" target="_blank">Open Agent Portal</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin" target="_blank">Open Admin Dashboard</Link>
            </Button>
          </div>
        </Card>
        <ChatInterface />
      </div>
    </div>
  );
};

export default Index;
