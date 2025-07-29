"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversation } from "@11labs/react";
import { cn } from "@/lib/utils";
import { MessageCircle, X, Send, Mic, MicOff, Monitor, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { ThemeToggle } from "@/components/theme-toggle";

interface VolumeData {
  inputVolume: number;
  outputVolume: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

async function requestMicrophonePermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch {
    console.error("Microphone permission denied");
    return false;
  }
}

async function getSignedUrl(): Promise<string> {
  const response = await fetch("/api/signed-url");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Failed to get signed URL: ${errorData.error || response.statusText}`);
  }
  const data = await response.json();
  return data.signedUrl;
}

export function ConvAI() {
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [showChat, setShowChat] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = React.useState("");
  const [isMobile, setIsMobile] = React.useState(false);
  const [volumeData, setVolumeData] = React.useState<VolumeData>({ inputVolume: 0, outputVolume: 0 });
  const [showSettings, setShowSettings] = React.useState(false);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const captureIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const capturedImageRef = React.useRef<string | null>(null);

  // Keep ref in sync with state
  React.useEffect(() => {
    capturedImageRef.current = capturedImage;
  }, [capturedImage]);
  
  // Check for mobile device
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Google Gemini API configuration
  const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  // Define client tools outside of startSession
  const clientTools = React.useMemo(() => ({
    SeeImage: async ({ image_prompt }: { image_prompt: string }) => {
      const startTime = Date.now();
      const timestamp = () => `[${new Date().toLocaleTimeString()}.${Date.now() % 1000}]`;
      
      console.log(`${timestamp()} 🔍 SeeImage tool called with prompt:`, image_prompt);
      
      if (!capturedImageRef.current) {
        console.log(`${timestamp()} ❌ No captured image available`);
        return "No image is currently available. Please start screen sharing first.";
      }

      try {
        console.log(`${timestamp()} 🚀 Starting image analysis process...`);
        
        // Image is already in data URL format (data:image/jpeg;base64,...)
        const dataExtractionStart = Date.now();
        console.log(`${timestamp()} 📊 Using captured image data URL (${Date.now() - dataExtractionStart}ms)`);
        console.log(`${timestamp()} 📏 Image data size: ${Math.round(capturedImageRef.current.length / 1024)}KB`);

        console.log(`${timestamp()} 🌐 Sending request to Google Gemini API with prompt...`);
        console.log(`${timestamp()} 📝 Using prompt: "${image_prompt}"`);
        const apiCallStart = Date.now();
        
        // Extract base64 image data from data URL
        const base64Image = capturedImageRef.current.split(',')[1];
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: image_prompt
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image
                  }
                }
              ]
            }]
          }),
        });

        const apiCallDuration = Date.now() - apiCallStart;
        console.log(`${timestamp()} ⚡ Google Gemini API response received (${apiCallDuration}ms)`);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const description = data.candidates?.[0]?.content?.parts?.[0]?.text || "No description generated";
        const totalDuration = Date.now() - startTime;
        
        console.log(`${timestamp()} ✅ Image analysis completed (Total: ${totalDuration}ms)`);
        console.log(`${timestamp()} 📝 Description length: ${description.length} characters`);
        console.log(`${timestamp()} 📄 Description:`, description);
        
        return description;
        
      } catch (error) {
        const errorDuration = Date.now() - startTime;
        console.error(`${timestamp()} ❌ Error analyzing image with Google Gemini (${errorDuration}ms):`, error);
        return "Sorry, I couldn't analyze the image at this moment. Please try again.";
      }
    },
  }), [GOOGLE_API_KEY]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("connected");
      addChatMessage("system", "Connected to voice agent");
    },
    onDisconnect: () => {
      console.log("disconnected");
      addChatMessage("system", "Disconnected from voice agent");
    },
    onError: error => {
      console.log(error);
      addChatMessage("system", `Error: ${error instanceof Error ? error.message : error || "An error occurred"}`);
      alert("An error occurred during the conversation");
    },
    onModeChange: ({ mode }) => {
      console.log("Mode changed:", mode);
    },
    onStatusChange: ({ status }) => {
      console.log("Status changed:", status);
    },
    onVolumeChange: ({ inputVolume, outputVolume }) => {
      setVolumeData({ inputVolume, outputVolume });
    },
    onMessage: message => {
      console.log(message);
      if (message.type === "agent_response" || message.type === "agent_response_corrected") {
        addChatMessage("agent", message.message);
      } else if (message.type === "user_transcript" || message.type === "user_transcript_corrected") {
        addChatMessage("user", message.message);
      } else if (message.type === "agent_response_start") {
        // Agent started speaking
        console.log("Agent started speaking");
      } else if (message.type === "agent_response_end") {
        // Agent finished speaking
        console.log("Agent finished speaking");
      } else if (message.type === "interruption") {
        addChatMessage("system", "Conversation interrupted");
      } else if (message.type === "ping") {
        // Ignore ping messages
        console.log("Received ping");
      } else {
        // Log any other message types for debugging
        console.log("Unknown message type:", message.type, message);
      }
    },
  });

  const addChatMessage = (type: 'user' | 'agent' | 'system', content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const sendTextMessage = async () => {
    if (!textInput.trim() || conversation.status !== "connected") return;
    
    addChatMessage("user", textInput);
    const messageToSend = textInput;
    setTextInput(""); // Clear input immediately for better UX
    
    try {
      // Send text message using the correct method
      await conversation.sendUserMessage(messageToSend);
    } catch (error) {
      console.error("Error sending message:", error);
      addChatMessage("system", "Failed to send message");
      // Re-add the message to input if sending failed
      setTextInput(messageToSend);
    }
  };

  async function startConversation() {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      alert("Microphone permission is required to start the conversation");
      return;
    }
    
    addChatMessage("system", "Connecting to voice agent...");
    
    try {
      const signedUrl = await getSignedUrl();
      const conversationId = await conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        clientTools,
      });
      console.log("Conversation started with ID:", conversationId);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      addChatMessage("system", `Failed to connect: ${error instanceof Error ? error.message : "Unknown error"}`);
      alert(`Failed to start conversation: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  const stopConversation = useCallback(async () => {
    addChatMessage("system", "Disconnecting...");
    await conversation.endSession();
  }, [conversation]);

  const captureScreen = useCallback(async () => {
    if (!screenStreamRef.current) return;

    try {
      const video = document.createElement('video');
      video.srcObject = screenStreamRef.current;
      video.play();

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      
      // Resize image to maximum 800px width while maintaining aspect ratio
      const maxWidth = 800;
      const aspectRatio = video.videoWidth / video.videoHeight;
      
      if (video.videoWidth > maxWidth) {
        canvas.width = maxWidth;
        canvas.height = maxWidth / aspectRatio;
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw the resized image
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Use lower quality for smaller file size (0.5 instead of 0.8)
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.5);
        setCapturedImage(imageDataUrl);
        
        console.log('✅ Screen captured successfully:', new Date().toLocaleTimeString());
        console.log('📸 Original size:', `${video.videoWidth}x${video.videoHeight}`);
        console.log('📸 Resized to:', `${canvas.width}x${canvas.height}`);
        console.log('📸 Image size:', Math.round(imageDataUrl.length / 1024), 'KB');
      }
    } catch (error) {
      console.error('❌ Error capturing screen:', error);
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      console.log('🚀 Starting screen share...');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      console.log('✅ Screen share started successfully');
      
      // Set up periodic capture every 3 seconds
      captureIntervalRef.current = setInterval(() => {
        console.log('📱 Capturing screen...');
        captureScreen();
      }, 3000);
      
      // Initial capture
      setTimeout(() => captureScreen(), 1000);
      
      // Handle stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('🛑 Screen share ended by user');
        stopScreenShare();
      });
      
    } catch (error) {
      console.error('❌ Error starting screen share:', error);
      alert('Failed to start screen sharing');
    }
  }, [captureScreen]);

  const stopScreenShare = useCallback(() => {
    console.log('🛑 Stopping screen share...');
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    setIsScreenSharing(false);
    setCapturedImage(null);
    console.log('✅ Screen share stopped');
  }, []);

  return (
    <div className="flex flex-col w-full h-full max-w-[400px] mx-auto">
      {/* Main Interface Card */}
      <Card className="rounded-none w-full h-full flex flex-col bg-black border-0 shadow-none text-white relative overflow-hidden">
        
        <CardContent>
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-xs font-normal text-white/60 uppercase tracking-widest relative z-10">
              {conversation.status === "connected"
                ? conversation.isSpeaking
                  ? "Agent Speaking"
                  : "Listening"
                : "Disconnected"}
            </CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-y-4 text-center flex-1 relative z-10">
            {/* Audio Visualizer Section */}
            <div className="flex justify-center my-6">
              <div className="w-72 h-72 bg-gray-950 rounded-none border border-gray-800 flex items-center justify-center relative overflow-hidden">
                <AudioVisualizer
                  isActive={conversation.status === "connected"}
                  isSpeaking={conversation.isSpeaking}
                  inputVolume={volumeData.inputVolume}
                  outputVolume={volumeData.outputVolume}
                />
              </div>
            </div>

            {/* Button Grid */}
            <div className="mx-6 mb-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Start Conversation Button */}
                <Button
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-none transition-all duration-200 border border-gray-700 hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  disabled={conversation !== null && conversation.status === "connected"}
                  onClick={startConversation}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start
                </Button>

                {/* End Conversation Button */}
                <Button
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-none transition-all duration-200 border border-gray-700 hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  disabled={conversation === null}
                  onClick={stopConversation}
                >
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop
                </Button>

                {/* Screen Share Button */}
                <Button
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-none transition-all duration-200 border border-gray-700 hover:border-gray-600 text-sm"
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {isScreenSharing ? "Stop" : "Share"}
                </Button>

                {/* Settings Button */}
                <Button
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-none transition-all duration-200 border border-gray-700 hover:border-gray-600 text-sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-gray-950 rounded-none p-4 mx-6 mb-4 border border-gray-800 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-white uppercase tracking-wider">Settings</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(false)}
                    className="h-6 w-6 rounded-none text-white/60 hover:text-white hover:bg-gray-800 transition-all duration-200"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/70 font-medium uppercase tracking-wide">Theme</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            )}

            {/* Chat Section - Always Visible at Bottom */}
            <div className="flex-1 flex flex-col bg-gray-950 rounded-none p-4 mx-6 mb-4 border border-gray-800 min-h-[200px]">
              <div className="mb-3">
                <h3 className="text-xs font-medium text-white uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  Transcripts
                </h3>
              </div>
              
              <ScrollArea className="flex-1 pr-2 mb-4 max-h-48">
                <div className="space-y-2">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-2 rounded-none text-xs max-w-[85%] break-words transition-all duration-200",
                        message.type === "user" && "bg-gray-800 text-white ml-auto border border-gray-700",
                        message.type === "agent" && "bg-gray-900 text-white mr-auto border border-gray-700",
                        message.type === "system" && "bg-gray-800 text-gray-300 mx-auto text-center text-xs max-w-full border border-gray-700"
                      )}
                    >
                      <div className="font-medium text-xs opacity-60 mb-1 tracking-wide">
                        {message.type === "user" ? "You" : message.type === "agent" ? "Agent" : "System"} • {message.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="leading-tight">{message.content}</div>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="text-center text-white/30 text-xs py-8">
                      <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      <p className="font-normal tracking-wide">Start conversation to see messages</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {conversation.status === "connected" && (
                <div className="flex gap-2 pt-3 border-t border-gray-800">
                  <Input
                    placeholder="Type a message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendTextMessage()}
                    onInput={() => conversation.sendUserActivity?.()}
                    className="flex-1 rounded-none text-xs h-8 bg-gray-900 border-gray-700 text-white placeholder:text-white/40 focus:border-gray-600 focus:ring-0 transition-all duration-200"
                  />
                  <Button
                    size="icon"
                    onClick={sendTextMessage}
                    disabled={!textInput.trim()}
                    className="rounded-none h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all duration-200"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {conversation.status !== "connected" && (
                <div className="pt-3 border-t border-gray-800 text-center text-xs text-white/30 font-normal tracking-wide">
                  Connect to start chatting
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}