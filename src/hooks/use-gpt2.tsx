import { useState, useEffect } from 'react';
import { pipeline } from '@huggingface/transformers';
import { toast } from '@/hooks/use-toast';

interface UseGPT2Return {
  model: any;
  isModelLoading: boolean;
  generateResponse: (prompt: string) => Promise<string>;
}

export const useGPT2 = (): UseGPT2Return => {
  const [model, setModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        // Load the text generation model from Hugging Face
        const generator = await pipeline(
          'text-generation',
          'gpt2',
          {}
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

  const generateResponse = async (prompt: string): Promise<string> => {
    if (!model || isModelLoading) {
      return "I'm not able to generate a response right now. Please try again later.";
    }

    try {
      const result = await model(prompt, {
        max_new_tokens: 100,
        num_return_sequences: 1,
      });

      // Extract the generated text from the result
      let botResponse = result[0].generated_text;
      
      // Clean up the response (remove the input prompt and keep just the response)
      if (botResponse.includes(prompt)) {
        botResponse = botResponse.substring(prompt.length).trim();
      }
      
      // Make sure we have something to display
      if (!botResponse) {
        botResponse = "I'm not sure how to respond to that. Can you try rephrasing your question?";
      }

      return botResponse;
    } catch (error) {
      console.error('Error generating response:', error);
      return "I encountered an error while generating a response. Please try again.";
    }
  };

  return {
    model,
    isModelLoading,
    generateResponse
  };
};
