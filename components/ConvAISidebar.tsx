"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversation } from "@11labs/react";
import { cn } from "@/lib/utils";
import { MessageCircle, Send, Monitor, MonitorOff } from "lucide-react";
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
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error("Failed to get signed URL:", errorData);
    throw new Error(`Failed to get signed URL: ${errorData.error || response.statusText}`);
  }
  const data = await response.json();
  return data.signedUrl;
}

export function ConvAISidebar() {
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = React.useState("");
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const captureIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const messageIdCounter = React.useRef(0);

  // OpenRouter API configuration
  const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

  // Define client tools outside of startSession
  const clientTools = React.useMemo(() => ({
    SeeImage: async ({ image_prompt }: { image_prompt: string }) => {
      const startTime = Date.now();
      const timestamp = () => `[${new Date().toLocaleTimeString()}.${Date.now() % 1000}]`;
      
      console.log(`${timestamp()} 🔍 SeeImage tool called with prompt:`, image_prompt);
      console.log(`${timestamp()} 📊 Current state - isScreenSharing:`, isScreenSharing);
      console.log(`${timestamp()} 📊 Current state - capturedImage exists:`, !!capturedImage);
      console.log(`${timestamp()} 📊 Current state - capturedImage length:`, capturedImage?.length || 0);
      console.log(`${timestamp()} 📊 Current state - screenStreamRef exists:`, !!screenStreamRef.current);
      console.log(`${timestamp()} 📊 OPENROUTER_API_KEY exists:`, !!OPENROUTER_API_KEY);
      
      // Add system message for debugging
      addChatMessage("system", `Vision tool called: "${image_prompt}"`);
      
      // If no image but screen sharing is active, try to capture immediately
      if (!capturedImage && isScreenSharing && screenStreamRef.current) {
        console.log(`${timestamp()} 🔄 No cached image but screen sharing active, capturing now...`);
        addChatMessage("system", "📸 Capturing screen image...");
        await captureScreen();
        
        // Wait a moment for capture to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!capturedImage) {
          console.log(`${timestamp()} ❌ Still no image after immediate capture`);
          addChatMessage("system", "❌ Failed to capture screen image");
          return "I couldn't capture the screen image. Please try stopping and restarting screen sharing.";
        }
      }
      
      if (!capturedImage) {
        console.log(`${timestamp()} ❌ No captured image available`);
        addChatMessage("system", "❌ No image available - start screen sharing first");
        return "No image is currently available. Please start screen sharing first.";
      }

      if (!OPENROUTER_API_KEY) {
        console.log(`${timestamp()} ❌ No OpenRouter API key available`);
        addChatMessage("system", "❌ OpenRouter API key not configured");
        return "Vision analysis is not available - API key not configured.";
      }

      try {
        console.log(`${timestamp()} 🚀 Starting image analysis process...`);
        addChatMessage("system", "🔍 Analyzing image...");
        
        // Image is already in data URL format (data:image/jpeg;base64,...)
        const dataExtractionStart = Date.now();
        console.log(`${timestamp()} 📊 Using captured image data URL (${Date.now() - dataExtractionStart}ms)`);
        console.log(`${timestamp()} 📏 Image data size: ${Math.round(capturedImage.length / 1024)}KB`);

        console.log(`${timestamp()} 🌐 Sending request to OpenRouter API with prompt...`);
        console.log(`${timestamp()} 📝 Using prompt: "${image_prompt}"`);
        const apiCallStart = Date.now();
        
        const requestBody = {
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
        };
        
        console.log(`${timestamp()} 📤 Request body prepared, model:`, requestBody.model);
        console.log(`${timestamp()} 📤 Message content types:`, requestBody.messages[0].content.map(c => c.type));
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const apiCallDuration = Date.now() - apiCallStart;
        console.log(`${timestamp()} ⚡ OpenRouter API response received (${apiCallDuration}ms)`);
        console.log(`${timestamp()} 📊 Response status:`, response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`${timestamp()} ❌ API Error Response:`, errorText);
          addChatMessage("system", `❌ API Error: ${response.status} ${response.statusText}`);
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`${timestamp()} 📊 Full API Response:`, data);
        const description = data.choices?.[0]?.message?.content || "No description generated";
        const totalDuration = Date.now() - startTime;
        
        console.log(`${timestamp()} ✅ Image analysis completed (Total: ${totalDuration}ms)`);
        console.log(`${timestamp()} 📝 Description length: ${description.length} characters`);
        console.log(`${timestamp()} 📄 Description:`, description);
        
        addChatMessage("system", `✅ Vision analysis completed in ${totalDuration}ms`);
        
        return description;
        
      } catch (error) {
        const errorDuration = Date.now() - startTime;
        console.error(`${timestamp()} ❌ Error analyzing image with OpenRouter (${errorDuration}ms):`, error);
        addChatMessage("system", `❌ Vision error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    messageIdCounter.current += 1;
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${messageIdCounter.current}`,
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
    console.log('📱 captureScreen called, screenStreamRef exists:', !!screenStreamRef.current);
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
        
        // Add visual feedback
        addChatMessage("system", `📸 Screen captured (${Math.round(imageDataUrl.length / 1024)}KB)`);
      }
    } catch (error) {
      console.error('❌ Error capturing screen:', error);
      addChatMessage("system", `❌ Screen capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

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
  }, [captureScreen, stopScreenShare]);


  return (
    <div className="sidebar-viewport">
      <div className="sidebar-container">
        <div className="p-2 space-y-2">
        {/* Status Card */}
        <Card className="w-full border-0 shadow-sm">
          <CardHeader className="pb-1 px-2 pt-2">
            <CardTitle className="text-center text-xs font-medium">
              {conversation.status === "connected"
                ? conversation.isSpeaking
                  ? `Agent is speaking`
                  : "Agent is listening"
                : "Disconnected"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-2 pb-2">
            {/* Compact Orb */}
            <div className="flex justify-center mb-2">
              <div
                className={cn(
                  "w-16 h-16 rounded-full relative overflow-hidden backdrop-blur-30 border-2 border-cyan-400/40",
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
            <div className="space-y-1">
              <Button
                variant={"default"}
                className={"w-full rounded-full text-xs"}
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
                className={"w-full rounded-full text-xs"}
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
        <div className="grid grid-cols-1 gap-1">
          {/* Screen Share */}
          <Card className="w-full border-0 shadow-sm">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isScreenSharing ? (
                    <Monitor className="w-4 h-4 text-green-600" />
                  ) : (
                    <MonitorOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-xs font-medium">Screen Share</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isScreenSharing ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
                {!isScreenSharing ? (
                  <Button
                    variant={"secondary"}
                    size={"sm"}
                    className="text-[10px] h-6 px-2"
                    onClick={startScreenShare}
                  >
                    Start
                  </Button>
                ) : (
                  <Button
                    variant={"destructive"}
                    size={"sm"}
                    className="text-[10px] h-6 px-2"
                    onClick={stopScreenShare}
                  >
                    Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Section - Always Visible */}
        <Card className="w-full flex-1 flex flex-col border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Chat & Transcripts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-2 pb-2 flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 w-full pr-1 mb-2">
              <div className="space-y-1">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "p-1.5 rounded text-[10px] max-w-[90%] break-words",
                      message.type === "user" && "bg-primary text-primary-foreground ml-auto",
                      message.type === "agent" && "bg-muted mr-auto",
                      message.type === "system" && "bg-yellow-100 dark:bg-yellow-900 mx-auto text-center max-w-full"
                    )}
                  >
                    <div className="font-medium text-[8px] opacity-70 mb-0.5">
                      {message.type === "user" ? "You" : message.type === "agent" ? "Agent" : "System"} • {message.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="leading-tight">{message.content}</div>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="text-center text-muted-foreground text-[10px] py-4">
                    <MessageCircle className="w-4 h-4 mx-auto mb-1 opacity-50" />
                    <p>Start a conversation to see messages</p>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {conversation.status === "connected" && (
              <div className="flex gap-1 flex-shrink-0">
                <Input
                  placeholder="Type a message..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendTextMessage()}
                  className="flex-1 text-[10px] h-6"
                />
                <Button
                  size="icon"
                  onClick={sendTextMessage}
                  disabled={!textInput.trim()}
                  className="h-6 w-6 flex-shrink-0"
                >
                  <Send className="h-2.5 w-2.5" />
                </Button>
              </div>
            )}
            
            {conversation.status !== "connected" && (
              <div className="text-center text-[10px] text-muted-foreground flex-shrink-0">
                Connect to start chatting
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}