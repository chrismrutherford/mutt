'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [userId] = useState(() => 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9));
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const eventsRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  // Load initial messages and set up real-time updates
  useEffect(() => {
    const loadMessages = async () => {
      console.log('=== CLIENT: Starting message load process ===');
      console.log('CLIENT: Current URL:', window.location.href);
      console.log('CLIENT: User agent:', navigator.userAgent);
      console.log('CLIENT: Timestamp:', new Date().toISOString());
      
      // Test basic API connectivity first
      try {
        console.log('CLIENT: Testing API connectivity...');
        const testResponse = await fetch('/mutt/api/test/');
        console.log('CLIENT: Test API status:', testResponse.status);
        const testData = await testResponse.json();
        console.log('CLIENT: Test API response:', testData);
      } catch (testError) {
        console.error('CLIENT: Test API failed:', testError);
      }
      
      // Now try to load messages
      try {
        console.log('CLIENT: Making fetch request to /mutt/api/messages');
        console.log('CLIENT: Fetch timestamp:', new Date().toISOString());
        
        const response = await fetch('/mutt/api/messages/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          cache: 'no-cache'
        });
        
        console.log('CLIENT: Messages API response received');
        console.log('CLIENT: Response status:', response.status);
        console.log('CLIENT: Response statusText:', response.statusText);
        console.log('CLIENT: Response ok:', response.ok);
        console.log('CLIENT: Response headers:', Object.fromEntries(response.headers.entries()));
        console.log('CLIENT: Response URL:', response.url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('CLIENT: Response error text:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        console.log('CLIENT: Parsing JSON response...');
        const data = await response.json();
        console.log('CLIENT: Raw response data:', data);
        console.log('CLIENT: Response type:', typeof data);
        console.log('CLIENT: Response keys:', Object.keys(data));
        console.log('CLIENT: Messages array:', data.messages);
        console.log('CLIENT: Messages array type:', typeof data.messages);
        console.log('CLIENT: Messages array length:', data.messages?.length);
        console.log('CLIENT: Is messages array?', Array.isArray(data.messages));
        
        if (data.messages && data.messages.length > 0) {
          console.log('CLIENT: First message details:', data.messages[0]);
          console.log('CLIENT: Last message details:', data.messages[data.messages.length - 1]);
          
          // Log all messages
          data.messages.forEach((msg: Message, index: number) => {
            console.log(`CLIENT: Message ${index + 1}:`, {
              id: msg.id,
              role: msg.role,
              content: msg.content?.substring(0, 50) + '...',
              timestamp: msg.timestamp,
              userId: msg.userId
            });
          });
        } else {
          console.log('CLIENT: No messages in response or empty array');
        }
        
        console.log('CLIENT: Setting messages state...');
        setMessages(data.messages || []);
        console.log('CLIENT: Messages state set');
        
        setIsProcessing(data.isProcessing || false);
        console.log('CLIENT: Processing state set to:', data.isProcessing || false);
        
        // If there's a current streaming message, set it as the current response
        if (data.currentStreaming) {
          console.log('CLIENT: Setting current streaming response:', data.currentStreaming.content);
          setCurrentResponse(data.currentStreaming.content);
        }
        
        console.log('CLIENT: Debug info from server:', data.debug);
        console.log('=== CLIENT: Messages loaded successfully ===');
        
      } catch (error) {
        console.error('=== CLIENT: Error loading messages ===');
        console.error('CLIENT: Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('CLIENT: Error message:', error instanceof Error ? error.message : String(error));
        console.error('CLIENT: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('CLIENT: Full error object:', error);
        
        // Try to get more details about the error
        if (error instanceof TypeError) {
          console.error('CLIENT: This might be a network error or CORS issue');
        }
      }
    };
    
    loadMessages();

    // Set up Server-Sent Events for real-time updates
    const eventSource = new EventSource('/mutt/api/events/');
    eventsRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        
        switch (type) {
          case 'connected':
            console.log('SSE connected at:', new Date(data.timestamp));
            break;
            
          case 'newMessage':
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(msg => msg.id === data.id)) return prev;
              return [...prev, data];
            });
            setCurrentResponse('');
            break;
            
          case 'processingStateChanged':
            setIsProcessing(data.isProcessing);
            if (!data.isProcessing) {
              setCurrentResponse('');
            }
            break;
            
          case 'streamingContent':
            setCurrentResponse(prev => prev + data.content);
            break;
            
          case 'heartbeat':
            // Keep connection alive
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      // Try to reconnect after a delay
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('Attempting to reconnect SSE...');
          window.location.reload();
        }
      }, 5000);
    };

    eventSource.onopen = () => {
      console.log('SSE connection opened');
    };

    return () => {
      eventSource.close();
    };
  }, []);


  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const messageContent = input.trim();
    setInput('');

    try {
      const response = await fetch('/mutt/api/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          userId: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Read the streaming response directly
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let assistantContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.type === 'text' && data.content) {
                  assistantContent += data.content;
                  setCurrentResponse(assistantContent);
                } else if (data.type === 'complete') {
                  // Message will be added via SSE, just clear current response
                  setCurrentResponse('');
                } else if (data.type === 'error') {
                  console.error('Stream error:', data.message);
                  setCurrentResponse('Error: ' + data.message);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + (error as Error).message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      adjustTextareaHeight();
    }
  }, []);


  return (
    <div className="terminal-container">
      <div className="terminal-scanlines"></div>
      
      <div className="terminal-header">
        <div className="terminal-title">MUTT - MULTI-USER TEXT TERMINAL v2.0</div>
      </div>

      <div className="conversation-area" ref={conversationRef}>
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.role}`}>
            <span className="message-prefix">
              {message.role === 'user' ? 
                (message.userId === userId ? '>' : `[${message.userId?.slice(-4)}]>`) : 
                'AI:'
              }
            </span>
            <span className="message-content">{message.content}</span>
          </div>
        ))}
        
        {currentResponse && (
          <div className="message message-assistant">
            <span className="message-prefix">AI:</span>
            <span className="message-content">{currentResponse}</span>
            <span className="cursor">█</span>
          </div>
        )}
        
        {isProcessing && !currentResponse && (
          <div className="message typing-indicator">
            <span className="message-prefix">AI:</span>
            Thinking<span className="cursor">█</span>
          </div>
        )}
      </div>

      <div className="input-area">
        <span className="input-prompt">{'>'}</span>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          onInput={adjustTextareaHeight}
          onFocus={adjustTextareaHeight}
          placeholder="Enter your message..."
          className="message-input"
          disabled={isProcessing}
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={isProcessing || !input.trim()}
          className="send-button"
        >
          {isProcessing ? 'WAIT' : 'SEND'}
        </button>
      </div>
      
    </div>
  );
}
