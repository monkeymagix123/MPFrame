import { Server } from "socket.io";
import { Room } from "../shared/room";
import { DamageData } from "../shared/moveData";
import { serverConfig } from "serverConfig";

import { broadcastLobbiesList } from "./misc";
import { config } from "../shared/config";
import { Serializer } from "../shared/serializer";
import { EndGameResult, TeamColor } from "../shared/types";

const gameLoops = new Map<string, NodeJS.Timeout>();

// const games = new Map<string, Game>();

export function startGame(room: Room, io: Server): void {
	const wasWaiting = room.roomState === "waiting";

	room.players.forEach((player) => {
		player.ready = true;
		player.pos.x = Math.random() * config.mapWidth;
		player.pos.y = Math.random() * config.mapHeight;
		player.health = config.maxHealth;
		player.dashProgress = config.dashCooldown;
		player.dashing = false;
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

		gameLoops.set(room.code, interval);
	}
}

function endGame(room: Room, io: Server, msg: EndGameResult): void {
	const wasWaiting = room.roomState === "waiting";

	// Stop game loop
	const interval = gameLoops.get(room.code);
	if (interval) {
		clearInterval(interval);
		gameLoops.delete(room.code);
	}


	console.log(`Game ${room.code} Finished`, msg); // this shows

	// if was playing, broadcast end message
	if (room.roomState === "playing") {
		console.log(`Game ${room.code} Finished, sending message`, msg);
		Serializer.emitToRoom(io, room.code, "game/end", msg, "EndGameResult");
	}

	room.endGame();

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
		let redLost = true;
		let blueLost = true;

		for (const player of players) {
			// check if player still alive
			if (!player.isAlive()) continue;

			switch (player.team) {
				case TeamColor.red:
					redLost = false;
					break;
				case TeamColor.blue:
					blueLost = false;
					break;
			}
		}

		if (redLost) {
			if (blueLost) {
				endGame(this.room, this.io, EndGameResult.draw);
			} else {
				endGame(this.room, this.io, EndGameResult.blueWin);
			}
		} else if (blueLost) {
			endGame(this.room, this.io, EndGameResult.redWin);
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