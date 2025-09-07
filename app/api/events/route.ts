import { NextRequest } from 'next/server';
import { chatEvents } from '@/lib/eventEmitter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (type: string, data: any) => {
        const sseData = `data: ${JSON.stringify({ type, data })}\n\n`;
        controller.enqueue(encoder.encode(sseData));
      };

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        sendEvent('heartbeat', { timestamp: Date.now() });
      }, 30000);

      const onNewMessage = (message: any) => {
        sendEvent('newMessage', message);
      };

      const onProcessingStateChanged = (isProcessing: boolean) => {
        sendEvent('processingStateChanged', { isProcessing });
      };

      const onStreamingContent = (content: string) => {
        sendEvent('streamingContent', { content });
      };

      chatEvents.on('newMessage', onNewMessage);
      chatEvents.on('processingStateChanged', onProcessingStateChanged);
      chatEvents.on('streamingContent', onStreamingContent);

      // Send initial connection confirmation
      sendEvent('connected', { timestamp: Date.now() });

      // Clean up on close
      const cleanup = () => {
        clearInterval(heartbeat);
        chatEvents.off('newMessage', onNewMessage);
        chatEvents.off('processingStateChanged', onProcessingStateChanged);
        chatEvents.off('streamingContent', onStreamingContent);
        try {
          controller.close();
        } catch (e) {
          // Controller might already be closed
        }
      };

      request.signal.addEventListener('abort', cleanup);
      
      // Also handle controller close
      return cleanup;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
