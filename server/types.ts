import { Socket } from "socket.io";

// Extended socket interface to include roomCode
export interface GameSocket extends Socket {
   roomCode?: string;
}