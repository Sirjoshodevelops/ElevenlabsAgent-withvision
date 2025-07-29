"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Monitor, Settings, Send, MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AudioVisualizer } from './AudioVisualizer';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

export function ConvAI() {
  const [isConnected, setIsConnected] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const connectToElevenLabs = async () => {
    try {
      const response = await fetch('/api/signed-url');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get signed URL');
      }

      const ws = new WebSocket(data.signedUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to ElevenLabs');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message:', message);
          
          if (message.type === 'conversation_initiation_metadata') {
            console.log('Conversation initiated');
          } else if (message.type === 'audio') {
            setIsSpeaking(true);
            setOutputVolume(Math.random() * 0.8 + 0.2);
            setTimeout(() => {
              setIsSpeaking(false);
              setOutputVolume(0);
            }, 1000);
          } else if (message.type === 'user_transcript') {
            addMessage(message.user_transcript, 'user');
          } else if (message.type === 'agent_response') {
            addMessage(message.agent_response, 'agent');
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from ElevenLabs');
        setIsConnected(false);
        setIsActive(false);
        setIsSpeaking(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Connection error:', error);
      alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsActive(false);
    setIsSpeaking(false);
    setInputVolume(0);
    setOutputVolume(0);
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;
      microphone.connect(analyser);
      
      setIsActive(true);
      
      const updateVolume = () => {
        if (analyserRef.current && isActive) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setInputVolume(average / 255);
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopListening = () => {
    setIsActive(false);
    setInputVolume(0);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const addMessage = (text: string, sender: 'user' | 'agent') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = () => {
    if (inputMessage.trim() && wsRef.current) {
      addMessage(inputMessage, 'user');
      wsRef.current.send(JSON.stringify({
        type: 'text',
        text: inputMessage
      }));
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="w-full h-full bg-black border border-purple-500/30 rounded-2xl p-6 shadow-2xl shadow-purple-500/20">
      {/* Status */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs font-medium tracking-widest uppercase text-white/60">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Audio Visualizer */}
      <div className="flex justify-center mb-8">
        <div className="w-80 h-80">
          <AudioVisualizer 
            isActive={isActive} 
            isSpeaking={isSpeaking}
            inputVolume={inputVolume}
            outputVolume={outputVolume}
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button
          onClick={isConnected ? (isActive ? stopListening : startListening) : connectToElevenLabs}
          className="h-12 bg-gray-950 border border-purple-500/30 text-white hover:bg-purple-900/20 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 rounded-xl"
        >
          {isConnected ? (
            isActive ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start
              </>
            )
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Connect
            </>
          )}
        </Button>

        <Button
          onClick={disconnect}
          disabled={!isConnected}
          className="h-12 bg-gray-950 border border-red-500/30 text-white hover:bg-red-900/20 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MicOff className="w-4 h-4 mr-2" />
          Stop
        </Button>

        <Button
          onClick={() => navigator.share?.({ title: 'Voice AI Assistant', url: window.location.href })}
          className="h-12 bg-gray-950 border border-purple-500/30 text-white hover:bg-purple-900/20 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 rounded-xl"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Share
        </Button>

        <Button
          onClick={() => setShowSettings(!showSettings)}
          className="h-12 bg-gray-950 border border-purple-500/30 text-white hover:bg-purple-900/20 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 rounded-xl"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-950 border border-purple-500/30 rounded-xl shadow-lg shadow-purple-500/10">
          <h3 className="text-sm font-medium text-white/80 mb-3 tracking-wide uppercase">Settings</h3>
          <div className="space-y-2 text-xs text-white/60">
            <div>Input Volume: {Math.round(inputVolume * 100)}%</div>
            <div>Output Volume: {Math.round(outputVolume * 100)}%</div>
            <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
            <div>Microphone: {isActive ? 'Active' : 'Inactive'}</div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className="flex-1 bg-gray-950 border border-purple-500/30 rounded-xl p-4 mb-6 shadow-inner shadow-purple-500/10">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-medium tracking-widest uppercase text-white/60">Transcripts</span>
        </div>
        
        <ScrollArea className="h-48 mb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-8 h-8 border-2 border-purple-500/30 rounded-full mb-3" />
              <p className="text-xs text-white/40 mb-2">Start conversation to see messages</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg text-xs ${
                    message.sender === 'user'
                      ? 'bg-purple-900/30 text-purple-100 border border-purple-500/20 ml-4'
                      : 'bg-gray-800/50 text-white/80 border border-gray-700/50 mr-4'
                  }`}
                >
                  <div className="font-medium mb-1 text-white/60 uppercase tracking-wide">
                    {message.sender === 'user' ? 'You' : 'Agent'}
                  </div>
                  {message.text}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Connect to start chatting"
            disabled={!isConnected}
            className="flex-1 bg-gray-900 border-purple-500/30 text-white placeholder:text-white/30 focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/25 rounded-lg"
          />
          <Button
            onClick={sendMessage}
            disabled={!isConnected || !inputMessage.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}