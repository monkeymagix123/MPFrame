import { Server } from "socket.io";
import { GameSocket } from "./types";
import { config } from "../shared/config";
import { ClientInput, PlayerMoveData } from "../shared/types";
import { rooms } from "./server";
import { clampPosV } from "../shared/math";

export function setupGameHandlers(socket: GameSocket, io: Server): void {
	// socket.on("game/player-move", (data: PlayerMoveData) => {
	// 	if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

	// 	const room = rooms.get(socket.roomCode)!;
	// 	const player = room.players.get(socket.id);

	// 	if (!player || room.roomState !== "playing") return;

	// 	// Update player position with bounds checking
	// 	player.pos.x = Math.max(config.playerLength, Math.min(800 - config.playerLength, data.pos.x));
	// 	player.pos.y = Math.max(config.playerLength, Math.min(600 - config.playerLength, data.pos.y));

	// 	if (data.dashPos) {
	// 		player.dashPos = data.dashPos;
	// 	}

	// 	socket.to(socket.roomCode).emit("game/player-moved", {
	// 		id: socket.id,
	// 		pos: player.pos,
	// 		dashPos: player.dashPos,
	// 	});
	// });

	socket.on("game/client-input", (input: ClientInput) => {
		if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

		const room = rooms.get(socket.roomCode)!;
		const player = room.players.get(socket.id);

		if (!player || room.roomState !== "playing") return;

		const dt = input.interval;
		if (input.keys["down"]) player.moveDown(dt * config.speedPerSecond);
		if (input.keys["up"]) player.moveUp(dt * config.speedPerSecond);
		if (input.keys["left"]) player.moveLeft(dt * config.speedPerSecond);
		if (input.keys["right"]) player.moveRight(dt * config.speedPerSecond);

		if (input.mouseClick) {
			player.attemptDash(input.mousePos);
		}

		socket.to(socket.roomCode).emit("game/player-moved", {
			id: socket.id,
			pos: player.pos,
			dashPos: player.dashPos,
		});
	});
}