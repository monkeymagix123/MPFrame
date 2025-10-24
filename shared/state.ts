import { Player } from "./player";
import { PlayerMoveData } from "./types";

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

	updatePlayerPosition(data: PlayerMoveData): void {
		const player = this.players.find((p) => p.id === data.id);
		if (player) {
			player.pos = data.pos;

			if (data.dashPos) {
				player.dashPos = data.dashPos;
			}
		}

		// console.log(player);
	}	
}

export const state = new State();