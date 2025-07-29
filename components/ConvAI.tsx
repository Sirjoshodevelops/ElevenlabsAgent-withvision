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
      <Card className="rounded-3xl w-full h-full flex flex-col bg-black text-white border-gray-800">
        <CardContent>
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-sm text-white">
              {conversation.status === "connected"
                ? conversation.isSpeaking
                  ? `Agent is speaking`
                  : "Agent is listening"
                : "Disconnected"}
            </CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-y-4 text-center flex-1">
            <div className="flex justify-center my-4">
              <div className="w-64 h-64 bg-gray-900 rounded-lg flex items-center justify-center">
                <WebGLOrb
                  isActive={conversation.status === "connected"}
                  isSpeaking={conversation.isSpeaking}
                  inputVolume={volumeData.inputVolume}
                  outputVolume={volumeData.outputVolume}
                />
              </div>
            </div>

            {/* Glassmorphism Bento Grid - 4 buttons */}
            <div className="mx-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Start Conversation Button - Original Design */}
                <Button
                  className="w-full h-16 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={conversation !== null && conversation.status === "connected"}
                  onClick={startConversation}
                >
                  Start conversation
                </Button>

                {/* End Conversation Button - Original Design */}
                <Button
                  className="w-full h-16 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={conversation === null}
                  onClick={stopConversation}
                >
                  End conversation
                </Button>

                {/* Screen Share Button */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  {!isScreenSharing ? (
                    <Button
                      variant="ghost"
                      className="w-full h-full flex flex-col items-center justify-center gap-2 text-white hover:bg-transparent p-0"
                      onClick={startScreenShare}
                    >
                      <div className="text-2xl">🖥️</div>
                      <span className="text-xs font-medium">Screen Share</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-400 hover:bg-transparent p-0"
                      onClick={stopScreenShare}
                    >
                      <div className="text-2xl">🔴</div>
                      <span className="text-xs font-medium">Stop Share</span>
                    </Button>
                  )}
                </div>

                {/* Settings Button */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <Button
                    variant="ghost"
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-white hover:bg-transparent p-0"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <div className="text-2xl">⚙️</div>
                    <span className="text-xs font-medium">Settings</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-gray-900/50 backdrop-blur-md rounded-xl p-4 mx-4 mb-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Settings</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(false)}
                    className="h-6 w-6 rounded-full text-gray-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">Theme</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            )}

            {/* Chat Section - Always Visible at Bottom */}
            <div className="flex-1 flex flex-col bg-gray-900/50 backdrop-blur-md rounded-xl p-4 mx-4 mb-4 border border-gray-700/50">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-white">Chat & Transcripts</h3>
              </div>
              
              <ScrollArea className="flex-1 pr-3 mb-3 max-h-48">
                <div className="space-y-2">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-2 rounded-lg text-xs max-w-[85%] break-words",
                        message.type === "user" && "bg-primary text-primary-foreground ml-auto",
                        message.type === "agent" && "bg-gray-700 text-white mr-auto",
                        message.type === "system" && "bg-yellow-900 text-yellow-100 mx-auto text-center text-xs max-w-full"
                      )}
                    >
                      <div className="font-medium text-xs opacity-70 mb-1">
                        {message.type === "user" ? "You" : message.type === "agent" ? "Agent" : "System"} • {message.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="leading-relaxed">{message.content}</div>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-6">
                      <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p>Start a conversation to see messages here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {conversation.status === "connected" && (
                <div className="flex gap-2 pt-3 border-t border-gray-700">
                  <Input
                    placeholder="Type a message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendTextMessage()}
                    onInput={() => conversation.sendUserActivity?.()}
                    className="flex-1 rounded-full text-xs h-8 bg-gray-800 border-gray-600 text-white"
                  />
                  <Button
                    size="icon"
                    onClick={sendTextMessage}
                    disabled={!textInput.trim()}
                    className="rounded-full h-8 w-8"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {conversation.status !== "connected" && (
                <div className="pt-3 border-t border-gray-700 text-center text-xs text-gray-400">
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