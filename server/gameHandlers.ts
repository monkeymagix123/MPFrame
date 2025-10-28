import { Server } from "socket.io";
import { GameSocket } from "./types";
import { MoveData, DamageData } from "../shared/moveData";
import { rooms } from "./server";
import { validateMoveData } from "../shared/serializer";

export function setupGameHandlers(socket: GameSocket, io: Server): void {
   socket.on("game/player-move", (data: MoveData) => {
      if (!validateMoveData(data)) {
         console.warn("Invalid move data received");
         return;
      }

      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.players.get(socket.id);

      if (!player || room.roomState !== "playing") return;

      const previousHealth = player.health;

      player.applyMoveData(data);

      socket.to(socket.roomCode).emit("game/player-moved", socket.id, data);

      if (player.health < previousHealth) {
         const damageData: DamageData = {
            playerId: socket.id,
            health: player.health,
            maxHealth: player.maxHealth,
            damage: previousHealth - player.health,
            timestamp: Date.now(),
         };

         io.to(socket.roomCode).emit("game/player-damage", damageData);
      }
   });

   const gameLoops = new Map<string, NodeJS.Timeout>();

   socket.on("game/start-loop", () => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;
      const room = rooms.get(socket.roomCode)!;

      if (room.roomState !== "playing" || gameLoops.has(socket.roomCode)) return;

      let lastTime = Date.now();
      const interval = setInterval(() => {
         const currentTime = Date.now();
         const dt = (currentTime - lastTime) / 1000;
         lastTime = currentTime;

         const previousHealths = new Map<string, number>();
         for (const player of room.gameState.players) {
            previousHealths.set(player.id, player.health);
         }

         room.gameState.updateAll(dt, true);

         for (const player of room.gameState.players) {
            const prevHealth = previousHealths.get(player.id)!;
            if (player.health < prevHealth) {
               const damageData: DamageData = {
                  playerId: player.id,
                  health: player.health,
                  maxHealth: player.maxHealth,
                  damage: prevHealth - player.health,
                  timestamp: currentTime,
               };

               io.to(socket.roomCode!).emit("game/player-damage", damageData);
            }
         }
      }, 1000 / 60);

      gameLoops.set(socket.roomCode, interval);
   });

   socket.on("game/stop-loop", () => {
      if (!socket.roomCode) return;
      const interval = gameLoops.get(socket.roomCode);
      if (interval) {
         clearInterval(interval);
         gameLoops.delete(socket.roomCode);
      }
   });
}
