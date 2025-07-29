"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Monitor, Settings, X, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/theme-toggle';
import { AudioVisualizer } from '@/components/AudioVisualizer';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

export function ConvAI() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartConversation = () => {
    setIsConnected(true);
    // Add connection logic here
  };

  const handleEndConversation = () => {
    setIsConnected(false);
    setIsSpeaking(false);
    // Add disconnection logic here
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputMessage,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
      
      // Simulate agent response
      setTimeout(() => {
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "I received your message: " + inputMessage,
          sender: 'agent',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, agentMessage]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <Card className="rounded-2xl w-full h-full flex flex-col bg-black border-gray-800 shadow-none text-white relative overflow-hidden">
      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Settings</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
                className="text-white/60 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6">
        {/* Status */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-wide text-white/30 font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>

        {/* Audio Visualizer */}
        <div className="flex-1 flex items-center justify-center mb-6">
          <AudioVisualizer
            isActive={isConnected}
            isSpeaking={isSpeaking}
            inputVolume={inputVolume}
            outputVolume={outputVolume}
          />
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            onClick={isConnected ? handleEndConversation : handleStartConversation}
            className={`h-12 rounded-xl border transition-all duration-200 ${
              isConnected
                ? 'bg-gray-900 border-gray-700 text-white/80 hover:bg-gray-800 hover:text-white'
                : 'bg-gray-900 border-gray-700 text-white/80 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {isConnected ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>

          <Button
            className="h-12 bg-gray-900 border border-gray-700 text-white/80 hover:bg-gray-800 hover:text-white rounded-xl transition-all duration-200"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Share
          </Button>

          <Button
            onClick={() => setShowSettings(true)}
            className="h-12 bg-gray-900 border border-gray-700 text-white/80 hover:bg-gray-800 hover:text-white rounded-xl transition-all duration-200"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Chat Section */}
        <div className="flex-1 bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col mb-6">
          <div className="flex items-center mb-3">
            <div className="w-2 h-2 bg-white/60 rounded-full mr-2"></div>
            <h3 className="text-xs uppercase tracking-wide text-white/60 font-medium">
              Transcripts
            </h3>
          </div>

          <ScrollArea className="flex-1 mb-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border border-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                  </div>
                  <p className="text-xs text-white/40">
                    {isConnected ? 'Start conversation to see messages' : 'Connect to start chatting'}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg text-xs ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-white/80'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-gray-900 border-gray-700 text-white placeholder:text-white/40 rounded-lg text-xs"
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!isConnected || !inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}