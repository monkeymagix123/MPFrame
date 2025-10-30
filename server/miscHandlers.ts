import { Server } from "socket.io";
import { ChatMessage } from "../shared/chat";
import { GameSocket } from "./types";
import { rooms, playerNames } from "./server";
import { Serializer } from "../shared/serializer";

export function setupMiscHandlers(socket: GameSocket, io: Server): void {
   socket.on("misc/set-name", (name: string) => {
      const sanitizedName = name.trim().substring(0, 20);

      playerNames.set(socket.id, sanitizedName);
      socket.emit("name-updated", sanitizedName);

      if (socket.roomCode && rooms.has(socket.roomCode)) {
         const room = rooms.get(socket.roomCode)!;
         const player = room.players.get(socket.id);

         if (player) {
            player.name = sanitizedName;
            Serializer.emitToRoom(io, socket.roomCode, "room/player-list", room.players, "Map<string, Player>");
         }
      }
   });

   socket.on("misc/send-chat", (message: string) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.players.get(socket.id);

      if (!player || !message.trim()) return;

      const chatMessage: ChatMessage = {
         id: socket.id,
         name: player.name,
         message: message.trim().substring(0, 200),
      };

      room.chat.messages.push(chatMessage);

      if (room.chat.messages.length > 50) {
         room.chat.messages.shift();
      }

      io.to(socket.roomCode).emit("game/chat-message", chatMessage);
   });
}
