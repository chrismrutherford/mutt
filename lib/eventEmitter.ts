import { EventEmitter } from 'events';

class ChatEventEmitter extends EventEmitter {
  private static instance: ChatEventEmitter;

  static getInstance(): ChatEventEmitter {
    if (!ChatEventEmitter.instance) {
      ChatEventEmitter.instance = new ChatEventEmitter();
    }
    return ChatEventEmitter.instance;
  }
}

export const chatEvents = ChatEventEmitter.getInstance();
