import { rooms } from "./server";
import { Server } from "socket.io";
import { TeamColor } from "../shared/types";

export function generateRoomCode(): string {
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

export function broadcastLobbiesList(io: Server): void {
	const publicLobbies = Array.from(rooms.values())
		.filter((room) => room.roomState === "waiting")
		.map((room) => ({
			code: room.code,
			playerCount: room.players.size,
			redCount: room.getTeamCount(TeamColor.red),
			blueCount: room.getTeamCount(TeamColor.blue),
		}));

	io.emit("menu/lobbies-list", publicLobbies);
}
