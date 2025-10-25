import { Server } from "socket.io";
import { GameSocket } from "./types";
import { Room } from "../shared/room";
import { Player } from "../shared/player";
import { rooms, playerNames } from "./server";
import { broadcastLobbiesList, generateRoomCode } from "./misc";
import { PlayerS } from "player";

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

		// Add player to room, use stored name if available
		const p: Player = new PlayerS(
			room,
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

		// Add player to room, use stored name if available
		const p: Player = new PlayerS(
			room,
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

		console.log(`${playerNames.get(socket.id) || "[unnamed]"} joined room ${roomCode}`);

		if (room.players.size === 1 || room.roomState !== "lobby") {
			broadcastLobbiesList(io);
		}
	});
}