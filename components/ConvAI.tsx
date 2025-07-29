"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversation } from "@11labs/react";
import { cn } from "@/lib/utils";
import { MessageCircle, X, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WebGLOrb } from "@/components/WebGLOrb";
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
      <Card className="rounded-3xl w-full h-full flex flex-col bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 text-white relative overflow-hidden">
        {/* Ambient Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <CardContent>
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-sm font-medium text-white/90 tracking-wide relative z-10">
              {conversation.status === "connected"
                ? conversation.isSpeaking
                  ? `Agent is speaking`
                  : "Agent is listening"
                : "Disconnected"}
            </CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-y-6 text-center flex-1 relative z-10">
            <div className="flex justify-center my-4">
              <div className="w-64 h-64 bg-gradient-to-br from-slate-800/50 to-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner flex items-center justify-center relative overflow-hidden">
                {/* Orb Container Glow */}
                <div className="absolute inset-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-sm" />
                <WebGLOrb
                  isActive={conversation.status === "connected"}
                  isSpeaking={conversation.isSpeaking}
                  inputVolume={volumeData.inputVolume}
                  outputVolume={volumeData.outputVolume}
                />
              </div>
            </div>

            {/* Premium Button Grid */}
            <div className="mx-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Start Conversation Button - Original Design */}
                <Button
                  className="w-full h-16 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] border border-white/10"
                  disabled={conversation !== null && conversation.status === "connected"}
                  onClick={startConversation}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    Start conversation
                  </div>
                </Button>

                {/* End Conversation Button - Original Design */}
                <Button
                  className="w-full h-16 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-700 hover:from-slate-700 hover:via-slate-600 hover:to-slate-800 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-slate-500/25 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] border border-white/10"
                  disabled={conversation === null}
                  onClick={stopConversation}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-sm" />
                    End conversation
                  </div>
                </Button>

                {/* Screen Share Button */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-xl group">
                  {!isScreenSharing ? (
                    <Button
                      variant="ghost"
                      className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/80 hover:text-white hover:bg-transparent p-0 transition-all duration-200"
                      onClick={startScreenShare}
                    >
                      <div className="text-2xl group-hover:scale-110 transition-transform duration-200">🖥️</div>
                      <span className="text-xs font-medium tracking-wide">Screen Share</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-transparent p-0 transition-all duration-200"
                      onClick={stopScreenShare}
                    >
                      <div className="text-2xl animate-pulse">🔴</div>
                      <span className="text-xs font-medium tracking-wide">Stop Share</span>
                    </Button>
                  )}
                </div>

                {/* Settings Button */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-xl group">
                  <Button
                    variant="ghost"
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/80 hover:text-white hover:bg-transparent p-0 transition-all duration-200"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <div className="text-2xl group-hover:rotate-90 transition-transform duration-300">⚙️</div>
                    <span className="text-xs font-medium tracking-wide">Settings</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 mx-4 mb-6 border border-white/10 shadow-2xl animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white tracking-wide">Settings</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(false)}
                    className="h-6 w-6 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/90 font-medium">Theme</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            )}

            {/* Chat Section - Always Visible at Bottom */}
            <div className="flex-1 flex flex-col bg-slate-900/40 backdrop-blur-xl rounded-2xl p-6 mx-4 mb-4 border border-white/10 shadow-xl min-h-[200px]">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Chat & Transcripts
                </h3>
              </div>
              
              <ScrollArea className="flex-1 pr-3 mb-4 max-h-48">
                <div className="space-y-2">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-3 rounded-xl text-xs max-w-[85%] break-words backdrop-blur-sm transition-all duration-200 hover:scale-[1.02]",
                        message.type === "user" && "bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white ml-auto border border-white/10 shadow-lg",
                        message.type === "agent" && "bg-slate-700/60 text-white mr-auto border border-white/10 shadow-lg",
                        message.type === "system" && "bg-amber-900/60 text-amber-100 mx-auto text-center text-xs max-w-full border border-amber-500/20 shadow-lg"
                      )}
                    >
                      <div className="font-medium text-xs opacity-80 mb-1 tracking-wide">
                        {message.type === "user" ? "You" : message.type === "agent" ? "Agent" : "System"} • {message.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="leading-relaxed">{message.content}</div>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="text-center text-white/50 text-xs py-8">
                      <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-60" />
                      <p className="font-medium tracking-wide">Start a conversation to see messages here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {conversation.status === "connected" && (
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Input
                    placeholder="Type a message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendTextMessage()}
                    onInput={() => conversation.sendUserActivity?.()}
                    className="flex-1 rounded-xl text-xs h-10 bg-slate-800/50 backdrop-blur-sm border-white/10 text-white placeholder:text-white/50 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-all duration-200"
                  />
                  <Button
                    size="icon"
                    onClick={sendTextMessage}
                    disabled={!textInput.trim()}
                    className="rounded-xl h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border border-white/10 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {conversation.status !== "connected" && (
                <div className="pt-4 border-t border-white/10 text-center text-xs text-white/50 font-medium tracking-wide">
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