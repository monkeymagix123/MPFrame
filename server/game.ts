import { Server } from "socket.io";
import { Room } from "../shared/room";
import { PlayerDelta } from "../shared/player";
import { serverConfig } from "serverConfig";

import { broadcastLobbiesList } from "./misc";
import { config } from "../shared/config";
import { Serializer } from "../shared/serializer";
import { EndGameMsg, EndGameResult, TeamColor, type WinColor } from "../shared/types";

import { io } from "./server";
import * as gameLoops from "serverLoop";

import { GameObject, objectTypes } from "../shared/gameObjects";

// map room code to game object
const games = new Map<string, Game>();

/**
 * Starts the game for the first time, when the room first enters the "playing" state.
 * Will broadcast "game/start" to all clients in the room with the updated player objects.
 * @param room The room corresponding to this game
 */
export function startGame(room: Room): void {
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
	if (room.roomState === "playing" && !gameLoops.hasGame(room.code)) {
		const game = new Game(room);

		games.set(room.code, game);

		gameLoops.addGame(game);
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
	if (room.roomState === "playing" && !gameLoops.hasGame(room.code)) {
		const game = games.get(room.code)!;

		gameLoops.addGame(game);
	}
}

// TODO: CURRENTLY UNUSED
export function endGame(room: Room, msg: EndGameMsg): void {
	const wasWaiting = room.roomState === "waiting";

	// Stop game loop
	gameLoops.removeGame(room.code);

	// if was playing, broadcast end message
	if (room.roomState === "playing") {
		Serializer.emitToRoom(io, room.code, "game/end", msg);
	}

	room.endGame();

	for (const player of room.gameState.players) {
		player.endMatch();
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

	// Game Object related
	gameObjectMaxCount: Record<string, number> = GameObject.baseMaxCount;
	gameObjectSpawnTime: Record<string, number> = GameObject.baseSpawnTime;

	gameObjectCreation: Set<string> = new Set(); // store which game objects are in creation

	interval?: NodeJS.Timeout;

	lastTime: number;

	constructor(room: Room) {
		this.room = room;

		this.lastTime = performance.now();
	}

	update() {
		// Get time data
		const currentTime = performance.now();
		const dt = (currentTime - this.lastTime) / 1000; // in seconds
		this.lastTime = currentTime;

		const players = this.room.gameState.players;

		// Track previous healths
		const previousHealths = new Map<string, number>();
		for (const player of players) {
			previousHealths.set(player.id, player.health);
		}

		this.room.gameState.updateAll(dt, true);

		// Send damage data if health of player has changed
		for (const player of players) {
			const prevHealth = previousHealths.get(player.id)!;
			if (player.health !== prevHealth) {
				const damageData: PlayerDelta = {
					id: player.id,
					health: player.health,
					time: currentTime,
				};
				// console.log("sent damage data", damageData);
				io.to(this.room.code).emit("game/player-delta", damageData);
			}
		}

		// Generate game objects
		this.generateGameObjects();
		io.to(this.room.code).emit(
			"game/game-objects",
			GameObject.getActiveObjects(this.room.gameState.gameObjects),
			"GameObject[]",
		);

		// Determine whether game is over
		this.checkGameOver();
	}

	generateGameObjects(): void {
		// Generate orbs
		const counts = GameObject.countAll(this.room.gameState.gameObjects);

		for (const type of objectTypes) {
			// Enough objects
			if (counts[type] >= this.gameObjectMaxCount[type]) {
				continue;
			}
			
			// Already creating object
			if (this.gameObjectCreation.has(type)) {
				continue;
			}

			const object = GameObject.create(type);

			// Mark object as in creation
			this.gameObjectCreation.add(type);

			// Add object after a delay
			setTimeout(() => {
				this.room.gameState.gameObjects.push(object);
				this.gameObjectCreation.delete(type);
			}, this.gameObjectSpawnTime[type] * 1000);
		}
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

			// there is an alive player on that team
			teamStatus[player.team] = false;
		}

		// Get end game message
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
			// console.log("Game Over!");

			this.endMatch(msg);
		}
	}

	endMatch(msg: EndGameMsg): void {
		// Set variables for easier access
		const room = this.room;

		// Stop game loop
		gameLoops.removeGame(room.code);

		// Reset object creation status

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