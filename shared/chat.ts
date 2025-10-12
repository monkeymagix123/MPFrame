export interface ChatMessage {
	playerId: string;
	playerName: string;
	message: string;
}

export class Chat {
   chatMessages: ChatMessage[];

   constructor() {
      this.chatMessages = [];
   }

   addChatMessage(message: ChatMessage): void {
      this.chatMessages.push(message);
      if (this.chatMessages.length > 100) {
         this.chatMessages.shift();
      }
   }

   clearChat(): void {
      this.chatMessages = [];
   }
}

export const chat = new Chat();