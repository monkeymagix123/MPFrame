import { Server } from "socket.io";
import { GameSocket } from "./types";
import { Room } from "../shared/room";
import { rooms } from "./server";
import { broadcastLobbiesList } from "./misc";
import { config } from "../shared/config";
import { Serializer } from "../shared/serializer";
import { DamageData } from "../shared/moveData";
import { serverConfig } from "serverConfig";
import { Vec2 } from "../shared/v2";
import { TeamColor } from "../shared/types";

const gameLoops = new Map<string, NodeJS.Timeout>();

function startGame(room: Room, io: Server): void {
   const wasWaiting = room.roomState === "waiting";

   room.players.forEach((player) => {
      player.ready = true;
      player.pos.x = Math.random() * config.mapWidth;
      player.pos.y = Math.random() * config.mapHeight;
      player.health = config.maxHealth;
      player.dashProgress = config.dashCooldown;
      player.dashing = false;
   });

   room.startGame();
   Serializer.emitToRoom(io, room.code, "game/start", room.players, "Map<string, Player>");

   if (wasWaiting) {
      broadcastLobbiesList(io);
   }

   // Start game loop
   if (room.roomState === "playing" && !gameLoops.has(room.code)) {
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

               io.to(room.code).emit("game/player-damage", damageData);
            }
         }
      }, 1000 / serverConfig.simulationRate);

      gameLoops.set(room.code, interval);
   }
}

function endGame(room: Room, io: Server): void {
   const wasWaiting = room.roomState === "waiting";

   // Stop game loop
   const interval = gameLoops.get(room.code);
   if (interval) {
      clearInterval(interval);
      gameLoops.delete(room.code);
   }

   room.endGame();

   if (wasWaiting) {
      broadcastLobbiesList(io);
   }
}

export function setupLobbyHandlers(socket: GameSocket, io: Server): void {
   socket.on("lobby/change-team", (team: TeamColor) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.getPlayer(socket.id);

      if (!player || room.roomState !== "waiting") return;

      player.team = team;
      player.ready = false;

      Serializer.emitToRoom(io, socket.roomCode, "room/player-list", room.players, "Map<string, Player>");
   });

   socket.on("lobby/ready-toggle", () => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.getPlayer(socket.id);

      if (!player || room.roomState !== "waiting") return;

      player.ready = !player.ready;

      Serializer.emitToRoom(io, socket.roomCode, "room/player-list", room.players, "Map<string, Player>");

      const redCount = room.getTeamCount(TeamColor.red);
      const blueCount = room.getTeamCount(TeamColor.blue);

      if (room.allPlayersReady() && room.players.size >= 2 && redCount > 0 && blueCount > 0) {
         startGame(room, io);
      }
   });
}
