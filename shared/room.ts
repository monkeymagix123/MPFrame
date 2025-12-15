import { Chat } from "./chat";
import { addBots, config } from "./config";
import { Player } from "./player";
import { State } from "./state";
import { TeamColor } from "./types";
import { Vec2 } from "./v2";

export type RoomState = "waiting" | "playing" | "finished" | "skill-selection";

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

      if (config.devMode) {
         console.log("Added player to room:", player);
      }

      if (addBots) {
         // add another bot player
         const player2 = new Player("player67", TeamColor.blue, new Vec2(67, 667), "Player 2", true);
         this.players.set(player2.id, player2);
         this.gameState.players.push(player2);
      }
   }

   removePlayer(playerId: string): void {
      this.players.delete(playerId);
      this.gameState.players = this.gameState.players.filter((p) => p.id !== playerId);
   }

   getPlayer(playerId: string): Player | undefined {
      return this.players.get(playerId);
   }

   getTeamCount(team: TeamColor): number {
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
      this.gameState.startMatch();
   }

   endGame(): void {
      this.roomState = "finished";
   }

   endMatch(): void {
      this.roomState = "skill-selection";
      // this.gameState.resetState();
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
