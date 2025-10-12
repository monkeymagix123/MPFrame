import { Socket } from "socket.io";
import { ChatMessage } from "../shared/chat";
import { Player } from "../shared/player";


// Extended socket interface to include roomCode
export interface GameSocket extends Socket {
   roomCode?: string;
}
// Room interface
export interface Room {
   code: string;
   players: Map<string, Player>;
   gameState: "lobby" | "starting" | "playing";
   startVotes: Set<string>;
   lastUpdate: number;
   chatMessages: ChatMessage[];
}
