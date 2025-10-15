import { Server } from "socket.io";
import { ChatMessage } from "../shared/chat";
import { GameSocket } from "./types";
import { Room } from "../shared/room";
import { Player } from "../shared/player";
import { config } from "../shared/config";
import { PlayerMoveData } from "../shared/types";
import { rooms, playerNames } from "./server";
import { broadcastLobbiesList, generateRoomCode } from "misc";

function startGame(room: Room, io: Server): void {
	const wasLobby = room.roomState === "lobby";
	room.roomState = "playing";
	room.startVotes.clear();

	// Reset all players to not ready
	room.players.forEach((player) => {
		player.ready = false;
		// Randomize starting positions
		player.x = Math.random() * 760 + 20;
		player.y = Math.random() * 560 + 20;
	});

	io.to(room.code).emit("game/start", Array.from(room.players.values()));

	// Broadcast the updated lobby list because a room is no longer in "lobby" state
	if (wasLobby) {
		broadcastLobbiesList(io);
	}
}

export function setupSocketHandlers(io: Server): void {
	io.on("connection", (socket: GameSocket) => {
		console.log("User connected:", socket.id);

		socket.on("menu/list-lobbies", () => {
			broadcastLobbiesList(io);
		});

		socket.on("set-name", (name: string) => {
			const sanitizedName = name.trim().substring(0, 20);

			// Store name globally
			playerNames.set(socket.id, sanitizedName);
			socket.emit("name-updated", sanitizedName);

			// If player is in a room, update their name in the room too
			if (socket.roomCode && rooms.has(socket.roomCode)) {
				const room = rooms.get(socket.roomCode)!;
				const player = room.players.get(socket.id);

				if (player) {
					player.name = sanitizedName;
					io.to(socket.roomCode).emit("room/player-list", Array.from(room.players.values()));
				}
			}
		});

		socket.on("misc/send-chat", (message: string) => {
			if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

			const room = rooms.get(socket.roomCode)!;
			const player = room.players.get(socket.id);

			if (!player || !message.trim()) return;

			const chatMessage: ChatMessage = {
				playerId: socket.id,
				playerName: player.name,
				message: message.trim().substring(0, 200), // Limit message length
			};

			room.chatMessages.push(chatMessage);

			if (room.chatMessages.length > 50) {
				room.chatMessages.shift(); // Remove oldest message if exceeding limit
			}

			io.to(socket.roomCode).emit("game/chat-message", chatMessage);
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

			// Add player to room, use stored name if available
			const p: Player = new Player(
				socket.id,
				"red",
				Math.random() * 760 + 20,
				Math.random() * 560 + 20,
				playerNames.get(socket.id),
				false
			);
			room.players.set(socket.id, p);

			socket.emit("room/joined", {
				roomCode,
				players: Array.from(room.players.values()),
				gameState: room.roomState,
				chatMessages: room.chatMessages,
			});

			console.log(`Room ${roomCode} created by ${socket.id}`);

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

			// Add player to room, use stored name if available
			const p: Player = new Player(
				socket.id,
				room.getTeamCount("red") > room.getTeamCount("blue") ? "blue" : "red",
				Math.random() * 760 + 20,
				Math.random() * 560 + 20,
				playerNames.get(socket.id),
				false
			);
			room.players.set(socket.id, p);

			socket.emit("room/joined", {
				roomCode,
				players: Array.from(room.players.values()),
				gameState: room.roomState,
				chatMessages: room.chatMessages,
			});

			// Notify other players
			socket.to(roomCode).emit("room/player-list", Array.from(room.players.values()));

			console.log(`${socket.id} joined room ${roomCode}`);

			if (room.players.size === 1 || room.roomState !== "lobby") {
				broadcastLobbiesList(io);
			}
		});

		socket.on("lobby/change-team", (team: "red" | "blue") => {
			if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

			const room = rooms.get(socket.roomCode)!;
			const player = room.players.get(socket.id);

			if (!player || room.roomState !== "lobby") return;

			player.team = team;
			player.ready = false; // Reset ready state when changing teams
			room.startVotes.delete(socket.id);

			io.to(socket.roomCode).emit("room/player-list", Array.from(room.players.values()));
		});

		socket.on("ready-toggle", () => {
			if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

			const room = rooms.get(socket.roomCode)!;
			const player = room.players.get(socket.id);

			if (!player || room.roomState !== "lobby") return;

			player.ready = !player.ready;

			if (player.ready) {
				room.startVotes.add(socket.id);
			} else {
				room.startVotes.delete(socket.id);
			}

			io.to(socket.roomCode).emit("room/player-list", Array.from(room.players.values()));

			// Check if all players are ready and there's at least one player per team
			const redCount = room.getTeamCount("red");
			const blueCount = room.getTeamCount("blue");

			if (room.startVotes.size === room.players.size && room.players.size >= 2 && redCount > 0 && blueCount > 0) {
				startGame(room, io);
			}
		});

		socket.on("game/player-move", (data: PlayerMoveData) => {
			if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

			const room = rooms.get(socket.roomCode)!;
			const player = room.players.get(socket.id);

			if (!player || room.roomState !== "playing") return;

			// Update player position with bounds checking
			player.x = Math.max(config.playerLength, Math.min(800 - config.playerLength, data.x));
			player.y = Math.max(config.playerLength, Math.min(600 - config.playerLength, data.y));

			player.dashX = data.dashX;
			player.dashY = data.dashY;

			// Broadcast to all players in room
			socket.to(socket.roomCode).emit("game/player-moved", {
				id: socket.id,
				x: player.x,
				y: player.y,
				dashX: player.dashX,
				dashY: player.dashY,
			});
		});

		socket.on("disconnect", () => {
			console.log("User disconnected:", socket.id);

			// Clean up player name
			playerNames.delete(socket.id);

			if (socket.roomCode && rooms.has(socket.roomCode)) {
				const room = rooms.get(socket.roomCode)!;
				const wasLobby = room.roomState === "lobby";

				room.players.delete(socket.id);
				room.startVotes.delete(socket.id);

				if (room.players.size === 0) {
					rooms.delete(socket.roomCode);
					console.log(`Room ${socket.roomCode} deleted (empty)`);
					broadcastLobbiesList(io);
				} else {
					const redCount = room.getTeamCount("red");
					const blueCount = room.getTeamCount("blue");
					const teamsRemaining = (redCount > 0 ? 1 : 0) + (blueCount > 0 ? 1 : 0);

					if (teamsRemaining === 1) {
						console.log(`Game ${socket.roomCode} Finished`);
						socket.to(socket.roomCode).emit("game-ended", Array.from(room.players.values()));
					} else {
						socket.to(socket.roomCode).emit("room/player-list", Array.from(room.players.values()));
						if (wasLobby) {
							broadcastLobbiesList(io);
						}
					}
				}
			}
		});
	});
}