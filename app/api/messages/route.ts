import { NextResponse } from 'next/server';
import { chatStore } from '@/lib/chatStore';

export async function GET(request: Request) {
  try {
    const timestamp = new Date().toISOString();
    const processId = process.pid;
    const hostname = process.env.HOSTNAME || 'unknown';
    const nodeEnv = process.env.NODE_ENV || 'unknown';
    console.log(`[${timestamp}] ===== Messages API called - PID: ${processId}, Hostname: ${hostname}, Env: ${nodeEnv} =====`);
    console.log(`[${timestamp}] Request headers:`, Object.fromEntries(request.headers.entries()));
    console.log(`[${timestamp}] Request URL:`, request.url);
    console.log(`[${timestamp}] Request method:`, request.method);
    console.log(`[${timestamp}] Container hostname:`, process.env.HOSTNAME);
    console.log(`[${timestamp}] Container port:`, process.env.PORT);
    
    // Wait for ChatStore to be ready
    console.log(`[${timestamp}] Waiting for ChatStore to be ready...`);
    await chatStore.waitForReady();
    console.log(`[${timestamp}] ChatStore is ready`);
    
    const messages = await chatStore.getMessages();
    const isProcessing = chatStore.isCurrentlyProcessing();
    const currentStreaming = chatStore.getCurrentStreamingMessage();
    
    console.log(`[${timestamp}] Retrieved ${messages.length} messages from ChatStore`);
    console.log(`[${timestamp}] Processing: ${isProcessing}, Streaming: ${!!currentStreaming}`);
    console.log(`[${timestamp}] Message IDs: [${messages.map(m => m.id).join(', ')}]`);
    
    // Log first few messages for debugging
    if (messages.length > 0) {
      console.log(`[${timestamp}] First message:`, {
        id: messages[0].id,
        role: messages[0].role,
        content: messages[0].content.substring(0, 50) + '...',
        timestamp: messages[0].timestamp
      });
    }
    
    const response = { 
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        userId: msg.userId
      })),
      isProcessing,
      currentStreaming: currentStreaming ? {
        id: currentStreaming.id,
        content: currentStreaming.content
      } : null,
      debug: {
        processId,
        hostname: process.env.HOSTNAME || 'unknown',
        timestamp,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        messageCount: messages.length,
        port: process.env.PORT || 'unknown'
      }
    };
    
    console.log(`[${timestamp}] Sending response with ${response.messages.length} messages`);
    console.log(`[${timestamp}] ===== End Messages API =====`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching messages:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}
