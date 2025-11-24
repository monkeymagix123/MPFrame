import { PlayerData } from "../shared/types";
import { v2 } from "../shared/v2";
import { util } from "./helpers/util";
import { PlayerC } from "./player";
import { settings } from "./settings";

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

	getCurrentPlayer(): PlayerC | undefined {
		return this.players.find((p) => util.isCurPlayer(p));
	}

	getPlayerFromId(id: string): PlayerC | undefined {
		return this.players.find((p) => p.id === id);
	}

	updatePlayer(data: PlayerData): void {
		const player = this.getPlayerFromId(data.id);
		if (player) {
			// this.interpolateDum(player, data);
			player.loadData(data);
		}

		// console.log(player);
	}

	interpolateDum(player: PlayerC, data: PlayerData): void {
		const ahead = player.pos;
		const behind = data.pos;
		player.loadData(data);
		const diff = v2.sub(ahead, behind);
		player.pos = v2.add(player.pos, v2.mul(diff, settings.interpolatingFactor)); // interpolate slightly forward
	}
}

export const state = new State();