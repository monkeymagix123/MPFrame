import { config } from "../shared/config";
import { intersectCircleLine } from "../shared/math";
import { Player } from "../shared/player";
import { state } from "./state";
import { v2, Vec2 } from "../shared/v2";
import { PlayerData } from "../shared/types";
import { settings } from "./settings";

export class PlayerC extends Player {
    serverDiff: Vec2; // used for interpolation

    constructor(id: string, team: string, x: number, y: number, name: string = "Player", ready: boolean = false) {
        super(id, team, x, y, name, ready);
        this.serverDiff = new Vec2();
    }

    /**
     * Apply server diff slowly
     */
    interpolate(): void {
        // ignore if small difference
        const epsilon = 0.01;
        if (v2.lengthSqr(this.serverDiff) < epsilon) {
            return;
        }

        const a = settings.interpolatingFactor;
        this.pos = v2.add(this.pos, v2.mul(this.serverDiff, a));
        this.serverDiff = v2.mul(this.serverDiff, 1.0 - a);
    }

    loadData(data: PlayerData): void {
        this.serverDiff = v2.sub(data.pos, this.pos);
        super.loadData(data);
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