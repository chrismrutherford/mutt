import { NextRequest, NextResponse } from 'next/server';
import { LlamaCppApi } from '@/lib/llamaCppApi';
import { applyChatTemplate, formatConversation } from '@/lib/chatTemplate';
import { chatStore } from '@/lib/chatStore';
import { chatEvents } from '@/lib/eventEmitter';

const client = new LlamaCppApi();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    // Limit message length to 2000 characters
    if (message.trim().length > 2000) {
      return NextResponse.json({ error: 'Message too long. Maximum 2000 characters allowed.' }, { status: 400 });
    }

    // Check if AI is currently processing
    if (chatStore.isCurrentlyProcessing()) {
      return NextResponse.json({ error: 'AI is currently processing another message' }, { status: 429 });
    }

    // Add user message to store
    const userMessage = await chatStore.addMessage('user', message.trim(), userId);
    
    // Notify all clients of new user message
    chatEvents.emit('newMessage', userMessage);
    
    // Set processing state
    chatStore.setProcessing(true);
    chatEvents.emit('processingStateChanged', true);

    // Get all messages for context - send complete history to LLM
    const allMessages = await chatStore.getMessages();
    const messages = formatConversation(allMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    })));
    
    const promptText = applyChatTemplate(messages);

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Start streaming message
        const streamingId = chatStore.startStreamingMessage();
        
        try {
          for await (const content of client.streamCompletion(promptText)) {
            // Append to streaming message
            chatStore.appendToStreamingMessage(content);
            
            // Send streaming content to all clients
            chatEvents.emit('streamingContent', content);
            
            const sseData = `data: ${JSON.stringify({ type: 'text', content })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
          
          // Finish streaming and add final message to store
          const assistantMessage = await chatStore.finishStreamingMessage();
          
          if (assistantMessage) {
            // Notify all clients of complete assistant message
            chatEvents.emit('newMessage', assistantMessage);
          }
          
          // Send completion signal
          const completeData = `data: ${JSON.stringify({ type: 'complete' })}\n\n`;
          controller.enqueue(encoder.encode(completeData));
          
          controller.close();
        } catch (error) {
          console.error('Error in stream:', error);
          // Clear any partial streaming message on error
          await chatStore.finishStreamingMessage();
          const errorData = `data: ${JSON.stringify({ type: 'error', message: `Error processing request: ${error}` })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        } finally {
          // Clear processing state
          chatStore.setProcessing(false);
          chatEvents.emit('processingStateChanged', false);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    chatStore.setProcessing(false);
    chatEvents.emit('processingStateChanged', false);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
