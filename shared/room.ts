import { Chat } from "./chat";
import { Player } from "./player";
import { State } from "./state";

export type RoomState = "waiting" | "playing" | "finished";

export class Room {
   code: string;
   players: Map<string, Player>;
   roomState: RoomState;
   gameState: State;
   chat: Chat;

   constructor(code: string) {
      this.code = code;
      this.players = new Map();
      this.roomState = "waiting";
      this.gameState = new State();
      this.chat = new Chat();
   }

   addPlayer(player: Player): void {
      this.players.set(player.id, player);
      this.gameState.players.push(player);
   }

   removePlayer(playerId: string): void {
      this.players.delete(playerId);
      this.gameState.players = this.gameState.players.filter((p) => p.id !== playerId);
   }

   getPlayer(playerId: string): Player | undefined {
      return this.players.get(playerId);
   }

   getTeamCount(team: "red" | "blue"): number {
      let count = 0;
      for (const player of this.players.values()) {
         if (player.team === team) count++;
      }
      return count;
   }

   allPlayersReady(): boolean {
      if (this.players.size === 0) return false;
      for (const player of this.players.values()) {
         if (!player.ready) return false;
      }
      return true;
   }

   startGame(): void {
      this.roomState = "playing";
   }

   endGame(): void {
      this.roomState = "finished";
   }

   resetGame(): void {
      this.roomState = "waiting";
      this.gameState.resetState();
      for (const player of this.players.values()) {
         player.ready = false;
         this.gameState.players.push(player);
      }
   }
}
