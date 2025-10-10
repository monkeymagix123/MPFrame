import * as state from "./state";
import { Config } from "../shared/config";
import { clamp } from "../shared/math";

export function clampPos(x: number, y: number): { x: number; y: number } {
    if (!state.canvas) return { x, y };

    const playerRadius = Config.playerRadius;
    const clampedX = clamp(x, playerRadius, state.canvas.width - playerRadius);
    const clampedY = clamp(y, playerRadius, state.canvas.height - playerRadius);

    return { x: clampedX, y: clampedY };
}