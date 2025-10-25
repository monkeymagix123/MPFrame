import { Server } from "socket.io";
import { GameSocket } from "./types";
import { config } from "../shared/config";
import { ClientInput } from "../shared/types";
import { rooms } from "./server";

export function setupGameHandlers(socket: GameSocket, io: Server): void {
	socket.on("game/client-input", (input: ClientInput) => {
		if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

		const room = rooms.get(socket.roomCode)!;
		const player = room.players.get(socket.id);

		if (!player || room.roomState !== "playing") return;

		player.doInput(input);
	});
}