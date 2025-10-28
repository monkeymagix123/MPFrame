import { Server } from "socket.io";
import { GameSocket } from "./types";
import { Room } from "../shared/room";
import { rooms } from "./server";
import { broadcastLobbiesList } from "./misc";
import { config } from "../shared/config";

function startGame(room: Room, io: Server): void {
	const wasLobby = room.roomState === "lobby";
	room.roomState = "playing";
	room.startVotes.clear();

	// Reset all players to not ready
	for (const player of room.players.values()) {
		player.ready = false;
		
		// Randomize starting positions
		player.pos.x = Math.random() * 760 + 20;
		player.pos.y = Math.random() * 560 + 20;
	}

	io.to(room.code).emit("game/start", Array.from(room.players.values()));

	// Broadcast the updated lobby list because a room is no longer in "lobby" state
	if (wasLobby) {
		broadcastLobbiesList(io);
	}

	// Update the game every frame
	const delay = 1000 / config.fps; // in milliseconds
	const dt = 1 / config.fps; // in seconds
	setInterval(() => room.updateGame(dt, io), delay);
}

export function setupLobbyHandlers(socket: GameSocket, io: Server): void {
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

	socket.on("lobby/ready-toggle", () => {
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
}