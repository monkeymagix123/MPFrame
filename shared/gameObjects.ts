import objectDataRaw from "./objectData.json";
import { v2, Vec2 } from "./v2";
import * as math from "./math";
import { config } from "./config";

export interface ObjectData {
    // Base stats for object generation
    baseMax: number;
    baseSpawnTime: number;

    hasVelocity?: boolean; // determine whether object has velocity

    radius: number;

    // Player-related
    playerEffects?: PlayerEffects;
}

interface PlayerEffects {
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
    isActive: boolean = true;

    type: string;

    // movement
    pos: Vec2;
    vel: Vec2;
    
    // used for bounds
    radius: number;

    // effects
    isHostile: boolean = false;
    effects?: PlayerEffects;

    // export stuff
    static baseMaxCount: Record<string, number> = extractedData.maxCounts;
    static baseSpawnTime: Record<string, number> = extractedData.spawnRates;

    // Construct new random game object
    constructor(type: string, pos: Vec2, radius?: number, vel: Vec2 = new Vec2(0, 0)) {
        this.type = type;
        this.pos = pos;
        this.vel = vel;
        this.radius = radius ?? objectData[type].radius;

        this.effects = objectData[type].playerEffects;
    }

    hasVelocity(): boolean {
        return objectData[this.type].hasVelocity === true;
    }

    hasEffects(): boolean {
        return this.effects !== undefined;
    }

    update(dt: number): void {
        if (!this.isActive) {
            return;
        }

        if (!this.hasVelocity()) {
            return;
        }

        this.pos = v2.add(this.pos, v2.mul(this.vel, dt));
        this.pos = math.clampPos(this.pos);
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
            if (!gameObject.isActive) {
                continue;
            }

            counts[gameObject.type]++;
        }

        return counts;
    }

    // For GameObject arrays
    static getActiveObjects(objects: GameObject[]): GameObject[] {
        return objects.filter((o) => o.isActive);
    }

    // use object pooling
    static addObject(objects: GameObject[], object: GameObject): void {
        const obj = objects.find((o) => !o.isActive);

        if (!obj) {
            objects.push(object);
            return;
        }

        obj.isActive = true;

        Object.assign(obj, object);
    }
}