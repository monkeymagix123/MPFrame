import { Server } from "socket.io";
import { GameSocket } from "./types";
import { Room } from "../shared/room";
import { Player } from "../shared/player";
import { rooms, playerNames } from "./server";
import { broadcastLobbiesList, generateRoomCode } from "./misc";
import { Vec2 } from "../shared/v2";
import { config } from "../shared/config";
import { Serializer } from "../shared/serializer";

export function setupMenuHandlers(socket: GameSocket, io: Server): void {
   socket.on("menu/list-lobbies", () => {
      broadcastLobbiesList(io);
   });

   socket.on("menu/create-room", () => {
      if (rooms.size >= 10000) {
         socket.emit("room/error", "Maximum number of rooms reached");
         return;
      }

      let roomCode = generateRoomCode();

      const room = new Room(roomCode);
      rooms.set(roomCode, room);

      socket.join(roomCode);
      socket.roomCode = roomCode;

      const p: Player = new Player(
         socket.id,
         "red",
         new Vec2(Math.random() * config.mapWidth, Math.random() * config.mapHeight),
         playerNames.get(socket.id) || "Player",
         false
      );
      room.players.set(socket.id, p);

      Serializer.emit(socket, "room/joined", room, "Room");

      console.log(`Room ${roomCode} created by ${playerNames.get(socket.id) || "[unnamed]"}`);

      broadcastLobbiesList(io);
   });

   socket.on("menu/join-room", (roomCode: string) => {
      roomCode = roomCode.toUpperCase();

      if (!rooms.has(roomCode)) {
         socket.emit("room/error", "Room not found");
         return;
      }

      const room = rooms.get(roomCode)!;

      socket.join(roomCode);
      socket.roomCode = roomCode;

      const p: Player = new Player(
         socket.id,
         room.getTeamCount("red") > room.getTeamCount("blue") ? "blue" : "red",
         new Vec2(Math.random() * config.mapWidth, Math.random() * config.mapHeight),
         playerNames.get(socket.id),
         false
      );
      room.players.set(socket.id, p);

      Serializer.emit(socket, "room/joined", room, "Room");

      Serializer.emitToRoom(io, roomCode, "room/player-list", room.players, "Map<string, Player>");

      console.log(`${playerNames.get(socket.id) || "[unnamed]"} joined room ${roomCode}`);

      if (room.players.size === 1 || room.roomState !== "waiting") {
         broadcastLobbiesList(io);
      }
   });
}
