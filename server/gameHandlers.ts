import { Server } from "socket.io";
import { GameSocket } from "./types";
import { config } from "../shared/config";
import { ClientInput, PlayerMoveData } from "../shared/types";
import { rooms } from "./server";

export function setupGameHandlers(socket: GameSocket, io: Server): void {
	socket.on("game/client-input", (input: ClientInput) => {
		if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

		const room = rooms.get(socket.roomCode)!;
		const player = room.players.get(socket.id);

		if (!player || room.roomState !== "playing") return;

		const dt = input.interval;
		if (input.keys["arrowdown"] || input.keys["s"]) player.moveDown(dt * config.speedPerSecond);
		if (input.keys["arrowup"] || input.keys["w"]) player.moveUp(dt * config.speedPerSecond);
		if (input.keys["arrowleft"] || input.keys["a"]) player.moveLeft(dt * config.speedPerSecond);
		if (input.keys["arrowright"] || input.keys["d"]) player.moveRight(dt * config.speedPerSecond);

		if (input.mouseClick) {
			player.attemptDash(input.mousePos);
		}

		// socket.to(socket.roomCode).emit("game/player-moved", {
		// 	id: socket.id,
		// 	pos: player.pos,
		// 	dashPos: player.dashPos,
		// });

		// console.log(input);

		// console.log("updated player position " + Date.now());
		// console.log(player);
	});
}