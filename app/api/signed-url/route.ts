import { NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

export async function GET() {
  const agentId = process.env.AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!agentId) {
    console.error("AGENT_ID environment variable is not set");
    return NextResponse.json(
      { error: "AGENT_ID is not configured" },
      { status: 500 }
    );
  }
  
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY environment variable is not set");
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
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
      { error: `Failed to get signed URL: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
