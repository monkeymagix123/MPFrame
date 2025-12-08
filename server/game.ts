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

/**
 * Starts the game for the first time, when the room first enters the "playing" state.
 * Will broadcast "game/start" to all clients in the room with the updated player objects.
 * @param room The room corresponding to this game
 * @param io The socket.io server instance to send updates from
 */
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


/**
 * Resets all players in the room and starts a new match.
 * Called when a new match is started (NOT when room first enters playing state)
 * Will broadcast "game/start-match" to all clients in the room with the updated player objects.
 * Will start the game loop if not already started.
 * @param {Room} room - The room to start the match in.
 * @param {Server} io - The socket.io server instance.
 */
export function startMatch(room: Room, io: Server): void {
	room.players.forEach((player) => {
		player.resetForMatch();
	});

	room.startGame();
	
	// update everything
	Serializer.emitToRoom(io, room.code, "game/start-match", room.players, "Map<string, Player>");

	// Start game loop
	if (room.roomState === "playing" && !gameLoops.has(room.code)) {
		const interval = games.get(room.code)!.startUpdateLoop(); // call startGame before startMatch so already initialized

		gameLoops.set(room.code, interval);
	}
}

// TODO: CURRENTLY UNUSED
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
					maxHealth: player.stats.maxHealth,
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

		let msg: EndGameMsg | null = null;
		if (teamStatus[TeamColor.red]) {
			if (teamStatus[TeamColor.blue]) {
				// Draw
				msg = { reason: EndGameResult.draw, winColor: "None" };
			} else {
				// Blue wins
				msg = { reason: EndGameResult.win, winColor: TeamColor.blue };
			}
		} else if (teamStatus[TeamColor.blue]) {
			// Red wins
			msg = { reason: EndGameResult.win, winColor: TeamColor.red };
		}

		// If game was ended (message not null), we end the match
		if (msg !== null) {
			this.endMatch(msg)
		}
	}

	startUpdateLoop(): NodeJS.Timeout {
		this.interval = setInterval(() => this.update(), 1000 / serverConfig.simulationRate);

		return this.interval;
	}

	endMatch(msg: EndGameMsg): void {
		// Set variables for easier access
		const room = this.room;
		const io = this.io;

		// Stop game loop
		const interval = gameLoops.get(room.code);
		if (interval) {
			clearInterval(interval);
			gameLoops.delete(room.code);
		}

		if (room.roomState !== "playing") {
			// THIS SHOULD NEVER OCCUR
			throw new Error("Room is not in playing state!");
		}

		// Broadcast end match message
		Serializer.emitToRoom(io, room.code, "game/end-match", msg);

		room.endMatch();

		for (const player of room.gameState.players) {
			player.endMatch();

			// console.log(player);
		}

		// Debug info
		// console.log("End Match data:");
		// for (const player of room.gameState.players) {
		// 	console.log(player);
		// }

		// broadcast player data to all players
		Serializer.emitToRoom(io, room.code, "game/player-all-data", room.gameState.players, "Player[]");
	}
}