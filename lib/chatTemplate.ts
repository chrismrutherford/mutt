export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function applyChatTemplate(messages: ChatMessage[]): string {
  // GPT-OSS chat template format
//  let result = '<|start|>system<|channel|>system<|message|>You are MUTT AI, an artificial intelligence assistant integrated into the Multi-User Text Terminal (MUTT) v2.0 system. You provide helpful, accurate, and concise responses to users in this terminal environment. Maintain context from the entire conversation and respond appropriately to the user\'s current question. You can assist with various topics including technical questions, general knowledge, problem-solving, and analysis.<|end|>';
   let result = ''

  for (const message of messages) {
    if (message.role === 'system') {
      result += `<|start|>system<|channel|>system<|message|>${message.content}<|end|>`;
    } else if (message.role === 'user') {
      result += `<|start|>user<|channel|>user<|message|>${message.content}<|end|>`;
    } else if (message.role === 'assistant') {
      result += `<|start|>assistant<|channel|>assistant<|message|>${message.content}<|end|>`;
    }
  }
  
  result += `<|start|>assistant<|channel|>assistant<|message|>`;
  
  console.log('=== CHAT TEMPLATE DEBUG ===');
  console.log('Total messages in template:', messages.length);
  console.log('Template length:', result.length);
  console.log('Last 500 chars of template:', result.slice(-500));
  console.log('=== END TEMPLATE DEBUG ===');
  
  return result;
}

export function formatConversation(conversation: Array<{role: string; content: string}>): ChatMessage[] {
  return conversation.map(turn => ({
    role: turn.role as 'user' | 'assistant',
    content: turn.content
  }));
}
