import { ChatMessage, PlayerMoveData } from "./types";
import { Player } from "./player";

export const state = {
	currentRoom: null as string | null,
	players: new Map<string, Player>(),
	currentPlayer: undefined as Player | undefined,
	chatMessages: [] as ChatMessage[],
};

export function setCurrentRoom(roomCode: string): void {
	state.currentRoom = roomCode;
}

export function addPlayer(player: Player): void {
	state.players.set(player.id, player);
}

export function removePlayer(playerId: string): void {
	state.players.delete(playerId);
}

export function clearPlayers(): void {
	state.players.clear();
}

export function updatePlayerPosition(data: PlayerMoveData): void {
	const player = state.players.get(data.id);
	if (player) {
		player.x = data.x;
		player.y = data.y;
		player.dashX = data.dashX;
		player.dashY = data.dashY;

		player.health = data.health;
		player.maxHealth = data.maxHealth;
	}
}

export function addChatMessage(message: ChatMessage): void {
	state.chatMessages.push(message);
}

export function resetState(): void {
	// Reset game state
	state.currentRoom = null;
	state.players.clear();
	state.currentPlayer = undefined;
	state.chatMessages = [];
}