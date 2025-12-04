import { Server } from "socket.io";
import { GameSocket } from "./types";
import { MoveData } from "../shared/moveData";
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
      const player = room.gameState.players.find((p) => p.id === socket.id); // figure out why players map doesn't link

      if (!player || room.roomState !== "playing") return;

      player.applyMoveData(data);

      socket.to(socket.roomCode).emit("game/player-moved", socket.id, data);
   });

   socket.on("game/player-buy-upgrade", (upgrade: string) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.gameState.players.find((p) => p.id === socket.id); // figure out why players map doesn't link

      if (!player || room.roomState !== "playing") return;

      const boughtUpgrade = player.buyUpgrade(upgrade);

      if (boughtUpgrade) {
         socket.to(socket.roomCode).emit("game/player-bought-upgrade", socket.id, boughtUpgrade);
      }
   })
}
