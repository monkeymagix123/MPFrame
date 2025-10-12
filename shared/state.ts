import { Player } from "./player";

export class State {
	players: Player[];

	constructor() {
		this.players = [];
	}

	changeState(newState: State): void {
		this.players = newState.players;
	}

	resetState(): void {
		this.players = [];
	}

	updatePlayerPosition(data: { id: string; x: number; y: number; dashX?: number; dashY?: number }): void {
		const player = this.players.find((p) => p.id === data.id);
		if (player) {
			player.x = data.x;
			player.y = data.y;
			if (data.dashX !== undefined) player.dashX = data.dashX;
			if (data.dashY !== undefined) player.dashY = data.dashY;
		}
	}	
}

export let state = new State();