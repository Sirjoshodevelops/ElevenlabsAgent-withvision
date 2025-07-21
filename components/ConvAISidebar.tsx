"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversation } from "@11labs/react";
import { cn } from "@/lib/utils";
import { MessageCircle, X, Send, Monitor, MonitorOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    throw Error("Failed to get signed url");
  }
  const data = await response.json();
  return data.signedUrl;
}

export function ConvAISidebar() {
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [showChat, setShowChat] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = React.useState("");
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const captureIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // OpenRouter API configuration
  const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

  // Define client tools outside of startSession
  const clientTools = React.useMemo(() => ({
    SeeImage: async ({ image_prompt }: { image_prompt: string }) => {
      const startTime = Date.now();
      const timestamp = () => `[${new Date().toLocaleTimeString()}.${Date.now() % 1000}]`;
      
      console.log(`${timestamp()} 🔍 SeeImage tool called with prompt:`, image_prompt);
      
      if (!capturedImage) {
        console.log(`${timestamp()} ❌ No captured image available`);
        return "No image is currently available. Please start screen sharing first.";
      }

      try {
        console.log(`${timestamp()} 🚀 Starting image analysis process...`);
        
        // Image is already in data URL format (data:image/jpeg;base64,...)
        const dataExtractionStart = Date.now();
        console.log(`${timestamp()} 📊 Using captured image data URL (${Date.now() - dataExtractionStart}ms)`);
        console.log(`${timestamp()} 📏 Image data size: ${Math.round(capturedImage.length / 1024)}KB`);

        console.log(`${timestamp()} 🌐 Sending request to OpenRouter API with prompt...`);
        console.log(`${timestamp()} 📝 Using prompt: "${image_prompt}"`);
        const apiCallStart = Date.now();
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-small-3.2-24b-instruct:free',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: "This is the instruction for you on the image, please directly answer the question." + image_prompt,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: capturedImage,
                    },
                  },
                ],
              },
            ],
          }),
        });

        const apiCallDuration = Date.now() - apiCallStart;
        console.log(`${timestamp()} ⚡ OpenRouter API response received (${apiCallDuration}ms)`);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const description = data.choices?.[0]?.message?.content || "No description generated";
        const totalDuration = Date.now() - startTime;
        
        console.log(`${timestamp()} ✅ Image analysis completed (Total: ${totalDuration}ms)`);
        console.log(`${timestamp()} 📝 Description length: ${description.length} characters`);
        console.log(`${timestamp()} 📄 Description:`, description);
        
        return description;
        
      } catch (error) {
        const errorDuration = Date.now() - startTime;
        console.error(`${timestamp()} ❌ Error analyzing image with OpenRouter (${errorDuration}ms):`, error);
        return "Sorry, I couldn't analyze the image at this moment. Please try again.";
      }
    },
  }), [capturedImage, OPENROUTER_API_KEY]);

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
    onMessage: message => {
      console.log(message);
      if (message.type === "agent_response") {
        addChatMessage("agent", message.message);
      } else if (message.type === "user_transcript") {
        addChatMessage("user", message.message);
      } else if (message.type === "agent_response_start") {
        // Agent started speaking
        console.log("Agent started speaking");
      } else if (message.type === "agent_response_end") {
        // Agent finished speaking
        console.log("Agent finished speaking");
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
      // Send text message to the 11Labs conversation
      await conversation.sendMessage(messageToSend);
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
      alert("No permission");
      return;
    }
    
    addChatMessage("system", "Connecting to voice agent...");
    
    const signedUrl = await getSignedUrl();
    const conversationId = await conversation.startSession({ 
      signedUrl,
      clientTools,
    });
    console.log(conversationId);
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
    <div className="min-w-[320px] max-w-full h-screen overflow-y-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
          Voice AI Assistant
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-sm">
              {conversation.status === "connected"
                ? conversation.isSpeaking
                  ? `Agent is speaking`
                  : "Agent is listening"
                : "Disconnected"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Compact Orb */}
            <div className="flex justify-center mb-4">
              <div
                className={cn(
                  "w-24 h-24 rounded-full relative overflow-hidden backdrop-blur-30 border-2 border-cyan-400/40",
                  "shadow-[0_0_0_1px_rgba(255,255,255,0.1),inset_0_0_0_1px_rgba(255,255,255,0.2)]",
                  conversation.status === "connected" && conversation.isSpeaking
                    ? "orb-active animate-orb"
                    : conversation.status === "connected"
                    ? "animate-orb-slow orb-inactive"
                    : "orb-inactive"
                )}
              ></div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                variant={"default"}
                className={"w-full rounded-full text-sm"}
                size={"sm"}
                disabled={
                  conversation !== null && conversation.status === "connected"
                }
                onClick={startConversation}
              >
                Start Conversation
              </Button>
              <Button
                variant={"outline"}
                className={"w-full rounded-full text-sm"}
                size={"sm"}
                disabled={conversation === null}
                onClick={stopConversation}
              >
                End Conversation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-3">
          {/* Screen Share */}
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isScreenSharing ? (
                    <Monitor className="w-5 h-5 text-green-600" />
                  ) : (
                    <MonitorOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Screen Share</p>
                    <p className="text-xs text-muted-foreground">
                      {isScreenSharing ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
                {!isScreenSharing ? (
                  <Button
                    variant={"secondary"}
                    size={"sm"}
                    className="text-xs"
                    onClick={startScreenShare}
                  >
                    Start
                  </Button>
                ) : (
                  <Button
                    variant={"destructive"}
                    size={"sm"}
                    className="text-xs"
                    onClick={stopScreenShare}
                  >
                    Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Toggle */}
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Chat & Transcripts</p>
                    <p className="text-xs text-muted-foreground">
                      {showChat ? "Visible" : "Hidden"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={"ghost"}
                  size={"sm"}
                  className="text-xs"
                  onClick={() => setShowChat(!showChat)}
                >
                  {showChat ? "Hide" : "Show"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Section */}
        {showChat && (
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Chat</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChat(false)}
                className="h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-48 w-full pr-4 mb-3">
                <div className="space-y-2">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-2 rounded-lg text-xs max-w-[90%] break-words",
                        message.type === "user" && "bg-primary text-primary-foreground ml-auto",
                        message.type === "agent" && "bg-muted mr-auto",
                        message.type === "system" && "bg-yellow-100 dark:bg-yellow-900 mx-auto text-center max-w-full"
                      )}
                    >
                      <div className="font-medium text-[10px] opacity-70 mb-1">
                        {message.type === "user" ? "You" : message.type === "agent" ? "Agent" : "System"} • {message.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="leading-relaxed">{message.content}</div>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-4">
                      <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p>Start a conversation to see messages</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {conversation.status === "connected" && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendTextMessage()}
                    className="flex-1 text-xs h-8"
                  />
                  <Button
                    size="icon"
                    onClick={sendTextMessage}
                    disabled={!textInput.trim()}
                    className="h-8 w-8"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {conversation.status !== "connected" && (
                <div className="text-center text-xs text-muted-foreground">
                  Connect to start chatting
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}