import { config } from "../shared/config";
import { intersectCircleLine } from "../shared/math";
import { Player } from "../shared/player";
import { state } from "./state";

export class PlayerC extends Player {
    constructor(id: string, team: string, x: number, y: number, name: string = "Player", ready: boolean = false) {
        super(id, team, x, y, name, ready);
    }

    dmgOtherPlayers(dmg: number): void {
        // deal damage to other players
        for (const p of state.players.values()) {
            let player: Player = p as Player;
            if (intersectCircleLine(this.pos, this.dashPos, player.pos, config.playerLength)) {
                this.doDamage(dmg, p);
            }
        }
    }

    static copyData(player: Player): PlayerC {
        let p: PlayerC = new PlayerC(player.id, player.team, player.pos.x, player.pos.y, player.name, player.ready);
        p = Object.assign(p, player);

        return p;
    }
}