"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversation } from "@11labs/react";
import { cn } from "@/lib/utils";
// Removed GoogleGenAI import - using OpenRouter API instead

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

export function ConvAI() {
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
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
    },
    onDisconnect: () => {
      console.log("disconnected");
    },
    onError: error => {
      console.log(error);
      alert("An error occurred during the conversation");
    },
    onMessage: message => {
      console.log(message);
    },
  });

  async function startConversation() {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      alert("No permission");
      return;
    }
    const signedUrl = await getSignedUrl();
    const conversationId = await conversation.startSession({ 
      signedUrl,
      clientTools,
    });
    console.log(conversationId);
  }

  const stopConversation = useCallback(async () => {
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
    <div className={"flex justify-center items-center gap-x-4"}>
      <Card className={"rounded-3xl"}>
        <CardContent>
          <CardHeader>
            <CardTitle className={"text-center"}>
              {conversation.status === "connected"
                ? conversation.isSpeaking
                  ? `Agent is speaking`
                  : "Agent is listening"
                : "Disconnected"}
            </CardTitle>
          </CardHeader>
          <div className={"flex flex-col gap-y-4 text-center"}>
            <div
              className={cn(
                "orb my-16 mx-12",
                conversation.status === "connected" && conversation.isSpeaking
                  ? "orb-active animate-orb"
                  : conversation.status === "connected"
                  ? "animate-orb-slow orb-inactive"
                  : "orb-inactive"
              )}
            ></div>

            <Button
              variant={"default"}
              className={"rounded-full"}
              size={"lg"}
              disabled={
                conversation !== null && conversation.status === "connected"
              }
              onClick={startConversation}
            >
              Start conversation
            </Button>
            <Button
              variant={"outline"}
              className={"rounded-full"}
              size={"lg"}
              disabled={conversation === null}
              onClick={stopConversation}
            >
              End conversation
            </Button>
            
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-2 text-center">Share Your Screen with the Agent</p>
              {!isScreenSharing ? (
                <Button
                  variant={"secondary"}
                  className={"rounded-full"}
                  size={"lg"}
                  onClick={startScreenShare}
                >
                  🖥️ Start Screen Share
                </Button>
              ) : (
                <Button
                  variant={"destructive"}
                  className={"rounded-full"}
                  size={"lg"}
                  onClick={stopScreenShare}
                >
                  🛑 Stop Screen Share
                </Button>
              )}
              
              {isScreenSharing && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-green-600">
                    🟢 Capturing screen every 3 seconds
                  </p>
                  {capturedImage && (
                    <p className="text-xs text-blue-600 mt-1">
                      📸 Latest capture: {new Date().toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
