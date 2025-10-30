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
      const player = room.players.get(socket.id);

      if (!player || room.roomState !== "playing") return;

      const previousHealth = player.health;

      player.applyMoveData(data);

      socket.to(socket.roomCode).emit("game/player-moved", socket.id, data);
   });
}
