import { GameObject } from "./gameObjects";
import { Player } from "./player";
import { TeamColor } from "./types";
import { Vec2 } from "./v2";

export const networkUtil = {
    serializePlayer(player: Player): Record<string, any> {
        const data = {} as Record<string, unknown>;

        for (const [key, value] of Object.entries(player)) {
            data[key] = (value instanceof Vec2) ? this.serializeVec2(value) : value;
        }

        return data;
    },

    serializeVec2(v: Vec2): Record<string, number> {
        return { x: v.x, y: v.y }
    },

    deserializePlayer(data: Record<string, unknown>): Player {
        const id = data.id as string;
        const team = data.team as TeamColor;
        const posData = data.pos as Record<string, number>;
        const pos = new Vec2(posData.x, posData.y);

        const player = new Player(id, team, pos)

        Object.assign(player, data);

        return player;
    },

    deserializeGameObject(data: Record<string, unknown>): GameObject {
        const type = data.type as string;
        const posData = data.pos as Record<string, number>;
        const pos = new Vec2(posData.x, posData.y);
        const radius = data.radius as number;

        const object = new GameObject(type, pos, radius);

        Object.assign(object, data);

        return object;
    }
}