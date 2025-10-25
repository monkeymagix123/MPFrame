import { PlayerData } from "../shared/types";
import { v2 } from "../shared/v2";
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
			this.interpolateDum(player, data);
		}

		// console.log(player);
	}

	interpolateDum(player: PlayerC, data: PlayerData): void {
		const ahead = player.pos;
		const behind = data.pos;
		player.loadData(data);
		const diff = v2.sub(ahead, behind);
		player.pos = v2.add(player.pos, v2.mul(diff, 0.1)); // interpolate slightly forward
	}
}

export const state = new State();