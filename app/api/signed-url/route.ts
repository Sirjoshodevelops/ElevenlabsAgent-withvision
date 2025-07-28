import { NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

export async function GET() {
  // Check if required environment variables are set
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.AGENT_ID;
  
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY is not set");
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY environment variable is not configured" },
      { status: 500 }
    );
  }
  
  if (!agentId) {
    console.error("AGENT_ID is not set");
    return NextResponse.json(
      { error: "AGENT_ID environment variable is not configured" },
      { status: 500 }
    );
  }
  
  try {
    const client = new ElevenLabsClient({
      apiKey: apiKey,
    });
    const response = await client.conversationalAi.getSignedUrl({
      agent_id: agentId,
    });
    return NextResponse.json({ signedUrl: response.signed_url });
  } catch (error) {
    console.error("Error getting signed URL from ElevenLabs:", error);
    return NextResponse.json(
      { 
        error: "Failed to get signed URL from ElevenLabs", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
