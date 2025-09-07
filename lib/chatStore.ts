import { Pool } from 'pg';

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId?: string;
}

interface StreamingMessage {
  id: string;
  role: 'assistant';
  content: string;
  timestamp: Date;
  isStreaming: boolean;
}

class ChatStore {
  private messages: StoredMessage[] = [];
  private isProcessing = false;
  private currentStreamingMessage: StreamingMessage | null = null;
  private readonly MAX_WORDS = 10000;
  private pool: Pool;
  private isReady = false;
  private readyPromise: Promise<void>;

  constructor() {
    const timestamp = new Date().toISOString();
    const processId = process.pid;
    
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      user: 'postgres',
      host: 'postgres',
      database: 'postgres',
      password: 'postgres',
      port: 5432,
    });
    
    // Initialize database and load messages sequentially
    this.readyPromise = this.initialize();
    
    console.log(`[${timestamp}] ChatStore constructor called - PID: ${processId} - using PostgreSQL storage`);
    console.log(`[${timestamp}] Database: postgres@postgres:5432/postgres`);
    console.log(`[${timestamp}] Node.js version: ${process.version}`);
    console.log(`[${timestamp}] Environment: ${process.env.NODE_ENV}`);
  }

  private async initialize(): Promise<void> {
    try {
      await this.initializeDatabase();
      await this.loadMessages();
      this.isReady = true;
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ChatStore initialized - Current message count: ${this.messages.length}`);
    } catch (error) {
      console.error('Failed to initialize ChatStore:', error);
    }
  }

  async waitForReady(): Promise<void> {
    await this.readyPromise;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS messages (
            id VARCHAR(255) PRIMARY KEY,
            role VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
            user_id VARCHAR(255)
          )
        `);
        
        // Create index on timestamp for better performance
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)
        `);
        
        console.log('Database initialized successfully');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  private async loadMessages(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM messages ORDER BY timestamp ASC'
        );
        this.messages = result.rows.map(row => ({
          id: row.id,
          role: row.role as 'user' | 'assistant',
          content: row.content,
          timestamp: new Date(row.timestamp),
          userId: row.user_id
        }));
        console.log(`Loaded ${this.messages.length} messages from database`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      this.messages = [];
    }
  }

  private async saveMessage(message: StoredMessage): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query(
          'INSERT INTO messages (id, role, content, timestamp, user_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET content = $3, timestamp = $4',
          [message.id, message.role, message.content, message.timestamp, message.userId]
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private getTotalWordCount(): number {
    return this.messages.reduce((total, msg) => total + this.countWords(msg.content), 0);
  }

  private async trimMessages(): Promise<void> {
    const messagesToDelete: string[] = [];
    
    while (this.getTotalWordCount() > this.MAX_WORDS && this.messages.length >= 2) {
      // Remove oldest user/assistant pair
      const firstMsg = this.messages[0];
      const secondMsg = this.messages[1];
      
      if ((firstMsg.role === 'user' && secondMsg.role === 'assistant') ||
          (firstMsg.role === 'assistant' && secondMsg.role === 'user')) {
        messagesToDelete.push(firstMsg.id, secondMsg.id);
        this.messages.splice(0, 2);
      } else {
        messagesToDelete.push(firstMsg.id);
        this.messages.splice(0, 1);
      }
    }
    
    if (messagesToDelete.length > 0) {
      try {
        const client = await this.pool.connect();
        try {
          await client.query(
            'DELETE FROM messages WHERE id = ANY($1)',
            [messagesToDelete]
          );
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error deleting messages:', error);
      }
    }
    
    console.log(`Trimmed messages to ${this.messages.length} (${this.getTotalWordCount()} words)`);
  }

  async addMessage(role: 'user' | 'assistant', content: string, userId?: string): Promise<StoredMessage> {
    const message: StoredMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role,
      content,
      timestamp: new Date(),
      userId
    };

    this.messages.push(message);
    await this.saveMessage(message);
    await this.trimMessages();
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Added ${role} message (${this.countWords(content)} words) - Total messages: ${this.messages.length} - PID: ${process.pid}`);
    return message;
  }

  async getMessages(): Promise<StoredMessage[]> {
    await this.waitForReady();
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] getMessages called, returning ${this.messages.length} messages - PID: ${process.pid}`);
    return [...this.messages];
  }

  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  startStreamingMessage(): string {
    const streamingId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    this.currentStreamingMessage = {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    console.log('Started streaming message:', streamingId);
    return streamingId;
  }

  appendToStreamingMessage(content: string): void {
    if (this.currentStreamingMessage) {
      this.currentStreamingMessage.content += content;
    }
  }

  async finishStreamingMessage(): Promise<StoredMessage | null> {
    if (!this.currentStreamingMessage) {
      return null;
    }

    const finalMessage: StoredMessage = {
      id: this.currentStreamingMessage.id,
      role: this.currentStreamingMessage.role,
      content: this.currentStreamingMessage.content,
      timestamp: this.currentStreamingMessage.timestamp,
      userId: undefined
    };

    this.messages.push(finalMessage);
    await this.saveMessage(finalMessage);
    this.currentStreamingMessage = null;
    await this.trimMessages();
    console.log(`Finished streaming message (${this.countWords(finalMessage.content)} words)`);
    return finalMessage;
  }

  getCurrentStreamingMessage(): StreamingMessage | null {
    return this.currentStreamingMessage;
  }

  async clear(): Promise<void> {
    this.messages = [];
    this.isProcessing = false;
    this.currentStreamingMessage = null;
    
    try {
      const client = await this.pool.connect();
      try {
        await client.query('DELETE FROM messages');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
    
    console.log('Cleared all messages from storage');
  }
}

// Create single instance at module level
const chatStore = new ChatStore();

export { chatStore };
export type { StoredMessage, StreamingMessage };
