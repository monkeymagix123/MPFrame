import { PlayerData } from "../shared/types";
import { PlayerC } from "./player";

export class State {
	players: PlayerC[];

	constructor() {
		this.players = [];
	}

	changeState(newState: State): void {
		this.players = newState.players;
	}

	resetState(): void {
		this.players = [];
	}

	updatePlayerPosition(data: PlayerData): void {
		const player = this.players.find((p) => p.id === data.id);
		if (player) {
			player.loadData(data);
		}

		// console.log(player);
	}	
}

export const state = new State();