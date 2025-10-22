import { Server } from "socket.io";
import { GameSocket } from "./types";
import { config } from "../shared/config";
import { PlayerMoveData } from "../shared/types";
import { rooms } from "./server";
import { clampPosV } from "../shared/math";

export function setupGameHandlers(socket: GameSocket, io: Server): void {
	socket.on("game/player-move", (data: PlayerMoveData) => {
		if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

		const room = rooms.get(socket.roomCode)!;
		const player = room.players.get(socket.id);

		if (!player || room.roomState !== "playing") return;

		// Update player position with bounds checking
		player.pos.x = Math.max(config.playerLength, Math.min(800 - config.playerLength, data.pos.x));
		player.pos.y = Math.max(config.playerLength, Math.min(600 - config.playerLength, data.pos.y));

		if (data.dashPos) {
			player.dashPos = data.dashPos;
		}

		socket.to(socket.roomCode).emit("game/player-moved", {
			id: socket.id,
			pos: player.pos,
			dashPos: player.dashPos,
		});
	});
}