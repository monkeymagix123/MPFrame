import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { Player, ChatMessage, RoomData, PlayerMoveData } from "../shared/types";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "..", "..", "public")));

// Serve compiled client JS
app.use("/dist", express.static(path.join(__dirname, "..", "..", "public", "dist")));

console.log("Serving static files from:", path.join(__dirname, "..", "..", "public"));
console.log("Serving /dist files from:", path.join(__dirname, "..", "..", "public", "dist"));

app.get("/games/:roomCode", (req, res) => {
   const roomCode = req.params.roomCode as string;
   
   // Validate the room code format
   if (!/^[A-Z0-9]{4}$/.test(roomCode)) {
      return res.status(404).send("Invalid room code format");
   }
   
   res.sendFile(path.join(__dirname, "..", "..", "public", "index.html"));
});

// Extended socket interface to include roomCode
interface GameSocket extends Socket {
   roomCode?: string;
}

// Room interface
interface Room {
   code: string;
   players: Map<string, Player>;
   gameState: "lobby" | "starting" | "playing";
   startVotes: Set<string>;
   lastUpdate: number;
   chatMessages: ChatMessage[];
}

// Game state
const rooms = new Map<string, Room>();

function generateRoomCode(): string {
   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
   let result = "";
   do {
      result = "";
      for (let i = 0; i < 4; i++) {
         result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
   } while (rooms.has(result)); // Ensure unique code
   return result;
}

function createRoom(code: string): Room {
   return {
      code,
      players: new Map(),
      gameState: "lobby",
      startVotes: new Set(),
      lastUpdate: Date.now(),
      chatMessages: [],
   };
}

function getPlayerCount(room: Room): number {
   return room.players.size;
}

function getTeamCount(room: Room, team: "red" | "blue"): number {
   return Array.from(room.players.values()).filter((p) => p.team === team).length;
}

function broadcastLobbiesList(): void {
   const publicLobbies = Array.from(rooms.values())
      .filter((room) => room.gameState === "lobby" && room.players.size < 8)
      .map((room) => ({
         code: room.code,
         playerCount: room.players.size,
         redCount: getTeamCount(room, "red"),
         blueCount: getTeamCount(room, "blue"),
      }));

   io.emit("lobbies-list", publicLobbies);
}

io.on("connection", (socket: GameSocket) => {
   console.log("User connected:", socket.id);

   socket.on("get-lobbies", () => {
      broadcastLobbiesList();
   });

   socket.on("set-name", (name: string) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.players.get(socket.id);

      if (!player) return;

      // Sanitize and limit name length
      const sanitizedName = name.trim().substring(0, 20);
      if (sanitizedName.length === 0) return;

      player.name = sanitizedName;

      io.to(socket.roomCode).emit("player-updated", Array.from(room.players.values()));
   });

   socket.on("send-chat", (message: string) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.players.get(socket.id);

      if (!player || !message.trim()) return;

      const chatMessage: ChatMessage = {
         playerId: socket.id,
         playerName: player.name || `Player ${socket.id.substring(0, 6)}`,
         message: message.trim().substring(0, 200), // Limit message length
      };

      room.chatMessages.push(chatMessage);

      if (room.chatMessages.length > 50) {
         room.chatMessages = room.chatMessages.slice(-50);
      }

      io.to(socket.roomCode).emit("chat-message", chatMessage);
   });

   socket.on("create-room", () => {
      if (rooms.size >= 10000) {
         socket.emit("room-error", "Maximum number of rooms reached");
         return;
      }

      let roomCode = generateRoomCode();

      const room = createRoom(roomCode);
      rooms.set(roomCode, room);

      socket.join(roomCode);
      socket.roomCode = roomCode;

      // Add player to room
      room.players.set(socket.id, {
         id: socket.id,
         name: undefined,
         x: Math.random() * 760 + 20,
         y: Math.random() * 560 + 20,
         team: "red",
         ready: false,
      });

      socket.emit("room-joined", {
         roomCode,
         players: Array.from(room.players.values()),
         gameState: room.gameState,
         chatMessages: room.chatMessages,
      });

      console.log(`Room ${roomCode} created by ${socket.id}`);

      broadcastLobbiesList();
   });

   socket.on("join-room", (roomCode: string) => {
      roomCode = roomCode.toUpperCase();

      if (!rooms.has(roomCode)) {
         socket.emit("room-error", "Room not found");
         return;
      }

      const room = rooms.get(roomCode)!;

      if (room.players.size >= 8) {
         socket.emit("room-error", "Room is full");
         return;
      }

      const wasJoinable = room.players.size < 7; // Check if it was joinable BEFORE adding the player

      socket.join(roomCode);
      socket.roomCode = roomCode;

      // Add player to room
      room.players.set(socket.id, {
         id: socket.id,
         name: undefined,
         x: Math.random() * 760 + 20,
         y: Math.random() * 560 + 20,
         team: getTeamCount(room, "red") > getTeamCount(room, "blue") ? "blue" : "red",
         ready: false,
      });

      socket.emit("room-joined", {
         roomCode,
         players: Array.from(room.players.values()),
         gameState: room.gameState,
         chatMessages: room.chatMessages,
      });

      // Notify other players
      socket.to(roomCode).emit("player-joined", Array.from(room.players.values()));

      console.log(`${socket.id} joined room ${roomCode}`);

      if (room.players.size === 1 || (wasJoinable && room.players.size === 8) || room.gameState !== "lobby") {
         broadcastLobbiesList();
      }
   });

   socket.on("change-team", (team: "red" | "blue") => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.players.get(socket.id);

      if (!player || room.gameState !== "lobby") return;

      // Check team balance (max 4 per team)
      const teamCount = getTeamCount(room, team);
      if (teamCount >= 4) {
         socket.emit("team-error", "Team is full");
         return;
      }

      player.team = team;
      player.ready = false; // Reset ready state when changing teams
      room.startVotes.delete(socket.id);

      io.to(socket.roomCode).emit("player-updated", Array.from(room.players.values()));
   });

   socket.on("ready-toggle", () => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.players.get(socket.id);

      if (!player || room.gameState !== "lobby") return;

      player.ready = !player.ready;

      if (player.ready) {
         room.startVotes.add(socket.id);
      } else {
         room.startVotes.delete(socket.id);
      }

      io.to(socket.roomCode).emit("player-updated", Array.from(room.players.values()));

      // Check if all players are ready and there's at least one player per team
      const redCount = getTeamCount(room, "red");
      const blueCount = getTeamCount(room, "blue");

      if (room.startVotes.size === room.players.size && room.players.size >= 2 && redCount > 0 && blueCount > 0) {
         startGame(room);
      }
   });

   socket.on("player-move", (data: PlayerMoveData) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.players.get(socket.id);

      if (!player || room.gameState !== "playing") return;

      // Update player position with bounds checking
      player.x = Math.max(15, Math.min(785, data.x));
      player.y = Math.max(15, Math.min(585, data.y));

      player.dashX = data.dashX;
      player.dashY = data.dashY;

      // Broadcast to all players in room
      socket.to(socket.roomCode).emit("player-moved", {
         id: socket.id,
         x: player.x,
         y: player.y,
         dashX: player.dashX,
         dashY: player.dashY,
      });
   });

   socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (socket.roomCode && rooms.has(socket.roomCode)) {
         const room = rooms.get(socket.roomCode)!;
         const wasFull = room.players.size === 8;
         const wasLobby = room.gameState === "lobby";

         room.players.delete(socket.id);
         room.startVotes.delete(socket.id);

         if (room.players.size === 0) {
            rooms.delete(socket.roomCode);
            console.log(`Room ${socket.roomCode} deleted (empty)`);
            broadcastLobbiesList();
         } else if (teamsIngame() === 1) {
            console.log(`Game ${socket.roomCode} Finished`);
            socket.to(socket.roomCode).emit("game-ended", Array.from(room.players.values()));
         } else {
            socket.to(socket.roomCode).emit("player-left", Array.from(room.players.values()));
            // Broadcast if the room was a lobby and is now joinable (was full)
            if (wasLobby && wasFull) {
               broadcastLobbiesList();
            }
         }
      }
   });

   function teamsIngame(): number {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return 0;
      const room = rooms.get(socket.roomCode)!;
      const redCount = getTeamCount(room, "red");
      const blueCount = getTeamCount(room, "blue");
      return (redCount > 0 ? 1 : 0) + (blueCount > 0 ? 1 : 0);
   }

   function startGame(room: Room): void {
      const wasLobby = room.gameState === "lobby";
      room.gameState = "playing";
      room.startVotes.clear();

      // Reset all players to not ready
      room.players.forEach((player) => {
         player.ready = false;
         // Randomize starting positions
         player.x = Math.random() * 760 + 20;
         player.y = Math.random() * 560 + 20;
      });

      io.to(room.code).emit("game-started", Array.from(room.players.values()));

      // Broadcast the updated lobby list because a room is no longer in "lobby" state
      if (wasLobby) {
         broadcastLobbiesList();
      }
   }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
});

// Cleanup empty rooms periodically
setInterval(() => {
   let roomsRemoved = false;
   for (const [code, room] of rooms.entries()) {
      if (room.players.size === 0 && Date.now() - room.lastUpdate > 300000) {
         // 5 minutes
         rooms.delete(code);
         console.log(`Room ${code} cleaned up (inactive)`);
         roomsRemoved = true;
      }
   }

   // Broadcast the updated list if any rooms were removed
   if (roomsRemoved) {
      broadcastLobbiesList();
   }
}, 60000); // Check every minute