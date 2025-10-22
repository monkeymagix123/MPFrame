import { Server } from "socket.io";
import { GameSocket } from "./types";
import { rooms, playerNames } from "./server";
import { broadcastLobbiesList } from "./misc";

export function setupDisconnectHandler(socket: GameSocket, io: Server): void {
	socket.on("disconnect", () => {
		console.log("User disconnected:", playerNames.get(socket.id) || "[unnamed]");

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
					socket.to(socket.roomCode).emit("game/game-ended", Array.from(room.players.values()));
				} else {
					socket.to(socket.roomCode).emit("room/player-list", Array.from(room.players.values()));
					if (wasLobby) {
						broadcastLobbiesList(io);
					}
				}
			}
		}
	});
}