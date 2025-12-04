import { Server } from "socket.io";
import { Room } from "../shared/room";
import { DamageData } from "../shared/moveData";
import { serverConfig } from "serverConfig";

import { broadcastLobbiesList } from "./misc";
import { config } from "../shared/config";
import { Serializer } from "../shared/serializer";
import { EndGameMsg, EndGameResult, TeamColor, type WinColor } from "../shared/types";

const gameLoops = new Map<string, NodeJS.Timeout>();

// map room code to game object
const games = new Map<string, Game>();

export function startGame(room: Room, io: Server): void {
	const wasWaiting = room.roomState === "waiting";

	room.players.forEach((player) => {
		player.resetForMatch();
	});

	room.startGame();
	Serializer.emitToRoom(io, room.code, "game/start", room.players, "Map<string, Player>");

	if (wasWaiting) {
		broadcastLobbiesList(io);
	}

	// Start game loop
	if (room.roomState === "playing" && !gameLoops.has(room.code)) {
		const game = new Game(room, io);
		// games.set(room.code, game);

		const interval = game.startUpdateLoop();

		games.set(room.code, game);

		gameLoops.set(room.code, interval);
	}
}

export function startMatch(room: Room, io: Server): void {
	const wasWaiting = room.roomState === "waiting";

	room.players.forEach((player) => {
		player.resetForMatch();
	});

	room.startGame();
	
	// update everything
	Serializer.emitToRoom(io, room.code, "game/start-match", room.players, "Map<string, Player>");

	if (wasWaiting) {
		broadcastLobbiesList(io);
	}

	// Start game loop
	if (room.roomState === "playing" && !gameLoops.has(room.code)) {
		const interval = games.get(room.code)!.startUpdateLoop(); // call startGame before startMatch so already initialized

		gameLoops.set(room.code, interval);
	}
}

function endGame(room: Room, io: Server, msg: EndGameMsg): void {
	const wasWaiting = room.roomState === "waiting";

	// Stop game loop
	const interval = gameLoops.get(room.code);
	if (interval) {
		clearInterval(interval);
		gameLoops.delete(room.code);
	}

	// if was playing, broadcast end message
	if (room.roomState === "playing") {
		Serializer.emitToRoom(io, room.code, "game/end", msg);
	}

	// technically still "playing" although just choosing the tree
	// room.endGame();
	room.endMatch();

	for (const player of room.gameState.players) {
		player.endMatch();

		// console.log(player);
	}

	// this works correctly
	// console.log("End Game data:");
	// for (const player of room.gameState.players) {
	// 	console.log(player);
	// }

	// broadcast player data to all players
	Serializer.emitToRoom(io, room.code, "game/player-all-data", room.gameState.players, "Player[]");

	if (wasWaiting) {
		broadcastLobbiesList(io);
	}
}

export class Game {
	room: Room;
	io: Server;

	interval?: NodeJS.Timeout;

	lastTime: number;

	constructor(room: Room, io: Server) {
		this.room = room;
		this.io = io;

		this.lastTime = performance.now();

		// this.startUpdateLoop();
		// this.interval = setTimeout(() => this.update(), 1000 / serverConfig.simulationRate);
	}

	update() {
		const currentTime = performance.now();
		const dt = (currentTime - this.lastTime) / 1000;
		this.lastTime = currentTime;

		const players = this.room.gameState.players;

		const previousHealths = new Map<string, number>();
		for (const player of players) {
			previousHealths.set(player.id, player.health);
		}

		this.room.gameState.updateAll(dt, true);

		for (const player of players) {
			const prevHealth = previousHealths.get(player.id)!;
			if (player.health < prevHealth) {
				const damageData: DamageData = {
					playerId: player.id,
					health: player.health,
					maxHealth: player.maxHealth,
					damage: prevHealth - player.health,
					timestamp: currentTime,
				};

				this.io.to(this.room.code).emit("game/player-damage", damageData);
			}
		}

		// Determine whether game is over
		this.checkGameOver();
	}
	
	/**
	 * Checks if the game is over.
	 * If all players of a team are dead, the opposing team wins.
	 * If all players of both teams are dead, the game is a draw.
	 * If the game is over, end the game loop and broadcast an end game message to all players.
	 */
	checkGameOver() {
		const players = this.room.gameState.players;

		// Make a record of whether there is no alive player in each team
		let teamStatus: Record<TeamColor, boolean> = Object.fromEntries(
			Object.values(TeamColor).map((color) => [color, true])
		) as Record<TeamColor, boolean>;


		for (const player of players) {
			// check if player still alive
			if (!player.isAlive()) continue;

			teamStatus[player.team] = false;
		}

		if (teamStatus[TeamColor.red]) {
			if (teamStatus[TeamColor.blue]) {
				// Draw
				const msg: EndGameMsg = { reason: EndGameResult.draw, winColor: "None" };
				endGame(this.room, this.io, msg);
			} else {
				// Blue wins
				const msg: EndGameMsg = { reason: EndGameResult.win, winColor: TeamColor.blue };
				endGame(this.room, this.io, msg);
			}
		} else if (teamStatus[TeamColor.blue]) {
			// Red wins
			const msg: EndGameMsg = { reason: EndGameResult.win, winColor: TeamColor.red };
			endGame(this.room, this.io, msg);
		}
	}

	// async startUpdateLoop(): Promise<void> {
	//     while (true) {
	//         await this.update();
	//         await new Promise(r => this.interval = setTimeout(r, 1000 / serverConfig.simulationRate));
	//     }
	// }

	startUpdateLoop(): NodeJS.Timeout {
		this.interval = setInterval(() => this.update(), 1000 / serverConfig.simulationRate);

		return this.interval;
	}
}