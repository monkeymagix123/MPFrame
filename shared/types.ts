import { Socket } from "socket.io-client";

export interface Player {
  id: string;
  name?: string;
  team: "red" | "blue";
  ready: boolean;
  x: number;
  y: number;
  dashX?: number;
  dashY?: number;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
}

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

export interface PlayerMoveData {
  id: string;
  x: number;
  y: number;
  dashX?: number;
  dashY?: number;
}

export interface Keys {
  [key: string]: boolean;
}