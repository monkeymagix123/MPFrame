import { Config } from "../shared/config";

export function clamp(n: number, min: number, max: number): number {
	if (n < min) {
		return min;
	}

	if (n > max) {
		return max;
	}

	return n;
}

export function clampPos(x: number, y: number): { x: number; y: number } {
	const playerRadius = Config.playerRadius;
	const clampedX = clamp(x, playerRadius, Config.canvasWidth - playerRadius);
	const clampedY = clamp(y, playerRadius, Config.canvasHeight - playerRadius);

	return { x: clampedX, y: clampedY };
}