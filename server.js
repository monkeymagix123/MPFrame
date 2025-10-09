const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Handle /games/* routes
app.get("/games/:roomCode([A-Z0-9]{4})", (req, res) => {
   res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Game state
const rooms = new Map();

function generateRoomCode() {
   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
   let result = "";
   do {
      for (let i = 0; i < 4; i++) {
         result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
   } while (rooms.has(result)); // Ensure unique code
   return result;
}

function createRoom(code) {
   return {
      code,
      players: new Map(),
      gameState: "lobby", // lobby, starting, playing
      startVotes: new Set(),
      lastUpdate: Date.now(),
      chatMessages: [],
   };
}

function getPlayerCount(room) {
   return room.players.size;
}

function getTeamCount(room, team) {
   return Array.from(room.players.values()).filter((p) => p.team === team).length;
}

/**
 * Generates the public list of lobbies and broadcasts it to all connected sockets.
 */
function broadcastLobbiesList() {
   const publicLobbies = Array.from(rooms.values())
      .filter((room) => room.gameState === "lobby" && room.players.size < 8)
      .map((room) => ({
         code: room.code,
         playerCount: room.players.size,
         redCount: getTeamCount(room, "red"),
         blueCount: getTeamCount(room, "blue"),
      }));

   // Emit to ALL connected sockets
   io.emit("lobbies-list", publicLobbies);
}
// ------------------------------------------------------------------

io.on("connection", (socket) => {
   console.log("User connected:", socket.id);

   // Update: This is still here for initial load, but now we'll rely on the broadcast
   socket.on("get-lobbies", () => {
      // The logic is moved into broadcastLobbiesList, so we call that
      broadcastLobbiesList();
   });

   socket.on("set-name", (name) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode);
      const player = room.players.get(socket.id);

      if (!player) return;

      // Sanitize and limit name length
      const sanitizedName = name.trim().substring(0, 20);
      if (sanitizedName.length === 0) return;

      player.name = sanitizedName;

      io.to(socket.roomCode).emit("player-updated", Array.from(room.players.values()));
   });

   socket.on("send-chat", (message) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode);
      const player = room.players.get(socket.id);

      if (!player || !message.trim()) return;

      const chatMessage = {
         id: Date.now(),
         playerId: socket.id,
         playerName: player.name || `Player ${socket.id.substring(0, 6)}`,
         message: message.trim().substring(0, 200), // Limit message length
         timestamp: Date.now(),
      };

      room.chatMessages.push(chatMessage);

      // Keep only last 50 messages
      if (room.chatMessages.length > 50) {
         room.chatMessages = room.chatMessages.slice(-50);
      }

      io.to(socket.roomCode).emit("chat-message", chatMessage);
   });

   socket.on("create-room", () => {
      // If all 4 alphanumeric characters are used, stop creating new rooms
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
         name: null,
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

      // NEW: Broadcast the updated lobby list
      broadcastLobbiesList();
   });

   socket.on("join-room", (roomCode) => {
      roomCode = roomCode.toUpperCase();

      if (!rooms.has(roomCode)) {
         socket.emit("room-error", "Room not found");
         return;
      }

      const room = rooms.get(roomCode);

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
         name: null,
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

      // NEW: Broadcast the updated lobby list only if the player count changed a lobby's status
      if (room.players.size === 1 || (wasJoinable && room.players.size === 8) || room.gameState !== "lobby") {
         broadcastLobbiesList();
      }
   });

   socket.on("change-team", (team) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode);
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

      const room = rooms.get(socket.roomCode);
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

   socket.on("player-move", (data) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode);
      const player = room.players.get(socket.id);

      if (!player || room.gameState !== "playing") return;

      // Update player position with bounds checking
      player.x = Math.max(15, Math.min(785, data.x));
      player.y = Math.max(15, Math.min(585, data.y));

      // Broadcast to all players in room
      socket.to(socket.roomCode).emit("player-moved", {
         id: socket.id,
         x: player.x,
         y: player.y,
      });
   });

   socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (socket.roomCode && rooms.has(socket.roomCode)) {
         const room = rooms.get(socket.roomCode);
         const wasFull = room.players.size === 8;
         const wasLobby = room.gameState === "lobby";

         room.players.delete(socket.id);
         room.startVotes.delete(socket.id);

         if (room.players.size === 0) {
            rooms.delete(socket.roomCode);
            console.log(`Room ${socket.roomCode} deleted (empty)`);
            // NEW: Broadcast because a room was deleted
            broadcastLobbiesList();
         } else if (teamsIngame() === 1) {
            console.log(`Game ${socket.roomCode} Finished`);
            socket.to(socket.roomCode).emit("game-ended", Array.from(room.players.values()));
         } else {
            socket.to(socket.roomCode).emit("player-left", Array.from(room.players.values()));
            // NEW: Broadcast if the room was a lobby and is now joinable (was full)
            if (wasLobby && wasFull) {
               broadcastLobbiesList();
            }
         }
      }
   });

   function teamsIngame() {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return 0;
      const room = rooms.get(socket.roomCode);
      const redCount = getTeamCount(room, "red");
      const blueCount = getTeamCount(room, "blue");
      return (redCount > 0 ? 1 : 0) + (blueCount > 0 ? 1 : 0);
   }

   function startGame(room) {
      const wasLobby = room.gameState === "lobby"; // Check before changing
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

      // NEW: Broadcast the updated lobby list because a room is no longer in "lobby" state
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

   // NEW: Broadcast the updated list if any rooms were removed
   if (roomsRemoved) {
      broadcastLobbiesList();
   }
}, 60000); // Check every minute
