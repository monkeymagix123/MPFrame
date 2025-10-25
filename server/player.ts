import { config } from "../shared/config";
import { intersectCircleLine } from "../shared/math";
import { Player } from "../shared/player";
import { Room } from "../shared/room";

export class PlayerS extends Player {
    room: Room;

    constructor(room: Room, id: string, team: string, x: number, y: number, name: string = "Player", ready: boolean = false) {
        super(id, team, x, y, name, ready);
        this.room = room;
    }

    dmgOtherPlayers(dmg: number): void {
        // deal damage to other players
        for (const p of this.room.players.values()) {
            let player: Player = p as Player;
            if (intersectCircleLine(this.pos, this.dashPos, player.pos, config.playerLength)) {
                this.doDamage(dmg, p);
            }
        }
    }
}