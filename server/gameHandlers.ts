import { Server } from "socket.io";
import { GameSocket } from "./types";
import { config } from "../shared/config";
import { PlayerMoveData } from "../shared/types";
import { rooms } from "./server";

export function setupGameHandlers(socket: GameSocket, io: Server): void {
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

		socket.to(socket.roomCode).emit("game/player-moved", {
			id: socket.id,
			x: player.x,
			y: player.y,
			dashX: player.dashX,
			dashY: player.dashY,
		});
	});
}