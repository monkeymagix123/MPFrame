import { Server } from "socket.io";
import { ChatMessage } from "../shared/chat";
import { GameSocket } from "./types";
import { rooms, playerNames } from "./server";

export function setupMiscHandlers(socket: GameSocket, io: Server): void {
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
}