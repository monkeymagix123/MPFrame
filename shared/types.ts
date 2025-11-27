import { ChatMessage } from "./chat";
import { Player } from "./player";

export interface RoomData {
   roomCode: string;
   players: Player[];
   chatMessages: ChatMessage[];
}

export interface Lobby {
   code: string;
   redCount: number;
   blueCount: number;
}

export interface Keys {
   [key: string]: boolean;
}

// export enum gameEndReason {
//    win = "win",
//    draw = "draw",
//    disconnect = "disconnect",
// }

export enum TeamColor {
   red = "red",
   blue = "blue",
}

export type WinColor = "None" | TeamColor;

export interface EndGameMsg {
   winColor: WinColor;
   reason: EndGameResult;
}

export enum EndGameResult {
   win = "win",
   draw = "draw",
   disconnect = "disconnect",
}