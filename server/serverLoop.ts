import { Game } from "game";
import { serverConfig } from "serverConfig";

const activeGames = new Map<string, Game>();

const interval = setInterval(() => {
    update();
}, 1000 / serverConfig.simulationRate);

function update() {
    for (const game of activeGames.values()) {
        game.update();
    }
}

/**
 * Checks if a game exists in the active game loop.
 * @param { string } roomCode - Room code of game to check.
 * @returns True if it exists, false otherwiswe
 */
export function hasGame(roomCode: string): boolean {
    return activeGames.has(roomCode);
}


/**
 * Adds a game to the active game loop.
 * @param {Game} game - The game to add.
 */
export function addGame(game: Game) {
    activeGames.set(game.room.code, game);
}

/**
 * Removes a game from the active game loop.
 * @param {string} roomCode - Room code of game to remove.
 */
export function removeGame(roomCode: string) {
    activeGames.delete(roomCode);
}