export interface ChatMessage {
   id: string;
   name: string;
   message: string;
}

export class Chat {
   messages: ChatMessage[];

   constructor() {
      this.messages = [];
   }

   addChatMessage(message: ChatMessage): void {
      this.messages.push(message);
      if (this.messages.length > 100) {
         this.messages.shift();
      }
   }

   clearChat(): void {
      this.messages = [];
   }
}
