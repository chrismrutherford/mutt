import { NextResponse } from 'next/server';
import { chatStore } from '@/lib/chatStore';

export async function GET() {
  const timestamp = new Date().toISOString();
  const processId = process.pid;
  const uptime = process.uptime();
  const messages = await chatStore.getMessages();
  const messageCount = messages.length;
  const isProcessing = chatStore.isCurrentlyProcessing();
  const hasStreaming = !!chatStore.getCurrentStreamingMessage();

  console.log(`[${timestamp}] Health check - PID: ${processId}, Uptime: ${uptime}s, Messages: ${messageCount}`);

  return NextResponse.json({
    status: 'healthy',
    timestamp,
    processId,
    uptime: Math.floor(uptime),
    messageCount,
    isProcessing,
    hasStreaming,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV
  });
}
