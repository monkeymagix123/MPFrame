import { Server } from "socket.io";
import { GameSocket } from "./types";
import { Room } from "@shared/room";
import { Player } from "@shared/player";
import { rooms, playerNames } from "./server";
import { broadcastLobbiesList, generateRoomCode } from "./misc";
import { Vec2 } from "@shared/v2";
import { config } from "@shared/config";
import { Serializer } from "@shared/serializer";
import { TeamColor } from "@shared/types";

export function setupMenuHandlers(socket: GameSocket, io: Server): void {
   socket.on("menu/list-lobbies", () => {
      broadcastLobbiesList(io);
   });

   socket.on("menu/create-room", () => {
      if (rooms.size >= 10000) {
         socket.emit("room/error", "Maximum number of rooms reached");
         return;
      }

      const roomCode = generateRoomCode();

      const room = new Room(roomCode);
      rooms.set(roomCode, room);

      socket.join(roomCode);
      socket.roomCode = roomCode;

      const p: Player = new Player(
         socket.id,
         TeamColor.red,
         new Vec2(Math.random() * config.mapWidth, Math.random() * config.mapHeight),
         playerNames.get(socket.id) || "Player",
         false
      );

      room.addPlayer(p);

      Serializer.emit(socket, "room/joined", room, "Room");

      console.log(`Room ${roomCode} created by ${playerNames.get(socket.id) || "[unnamed]"}`);

      broadcastLobbiesList(io);
   });

   socket.on("menu/join-room", (roomCode: string) => {
      roomCode = roomCode.toUpperCase();

      if (rooms.size >= 10000) {
         socket.emit("room/error", "Maximum number of rooms reached");
         return;
      }

      let room: Room;
      let isNewRoom = false;

      if (!rooms.has(roomCode)) {
         // Create new room with the specified code
         room = new Room(roomCode);
         rooms.set(roomCode, room);
         isNewRoom = true;
         console.log(`Room ${roomCode} created by ${playerNames.get(socket.id) || "[unnamed]"}`);
      } else {
         room = rooms.get(roomCode)!;
      }

      socket.join(roomCode);
      socket.roomCode = roomCode;

      const p: Player = new Player(
         socket.id,
         room.getTeamCount(TeamColor.red) > room.getTeamCount(TeamColor.blue) ? TeamColor.blue : TeamColor.red,
         new Vec2(Math.random() * config.mapWidth, Math.random() * config.mapHeight),
         playerNames.get(socket.id),
         false
      );

      room.addPlayer(p);

      Serializer.emit(socket, "room/joined", room, "Room");

      Serializer.emitToRoom(io, roomCode, "room/player-list", room.players, "Map<string, Player>");

      if (!isNewRoom) {
         console.log(`${playerNames.get(socket.id) || "[unnamed]"} joined room ${roomCode}`);
      }

      if (room.players.size === 1 || room.roomState !== "waiting") {
         broadcastLobbiesList(io);
      }
   });
}
