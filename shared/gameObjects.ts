import objectDataRaw from "./objectData.json";
import { Vec2 } from "./v2";
import * as math from "./math";
import { config } from "./config";

export interface ObjectData {
    // Base stats for object generation
    baseMax: number;
    baseSpawnTime: number;

    hasVelocity?: boolean; // determine whether object has velocity

    radius: number;

    // Player-related
    baseHeal?: number;
    baseDamage?: number;
}

export const objectData = objectDataRaw as Record<string, ObjectData>;

export const objectTypes = Object.keys(objectData);

function extract(): Record<string, Record<string, number>> {
    const maxCounts: Record<string, number> = {};
    const spawnRates: Record<string, number> = {};

    for (const type of objectTypes) {
        maxCounts[type] = objectData[type].baseMax;
        spawnRates[type] = objectData[type].baseSpawnTime;
    }

    return { maxCounts, spawnRates };
}

const extractedData = extract();

export class GameObject {
    type: string;
    pos: Vec2;
    vel: Vec2;
    
    // used for bounds
    radius: number;

    isHostile: boolean = false;

    // export stuff
    static baseMaxCount: Record<string, number> = extractedData.maxCounts;
    static baseSpawnTime: Record<string, number> = extractedData.spawnRates;

    // Construct new random game object
    constructor(type: string, pos: Vec2, radius: number, vel: Vec2 = new Vec2(0, 0)) {
        this.type = type;
        this.pos = pos;
        this.vel = vel;
        this.radius = radius;
    }

    // Creator methods
    static create(type: string): GameObject {
        const radius = objectData[type].radius;
        const pos = new Vec2(math.rand(radius, config.mapWidth - radius), math.rand(radius, config.mapHeight - radius));

        return new GameObject(type, pos, radius);
    }

    // Other static helper methods
    static countAll(objects: GameObject[]): Record<string, number> {
        const counts: Record<string, number> = {};

        for (const type of objectTypes) {
            counts[type] = 0;
        }

        for (const gameObject of objects) {
            counts[gameObject.type]++;
        }

        return counts;
    }
}