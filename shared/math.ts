import { config } from "../shared/config";

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
	const playerRadius = config.playerLength / 2;
	const clampedX = clamp(x, playerRadius, config.width - playerRadius);
	const clampedY = clamp(y, playerRadius, config.height - playerRadius);

	return { x: clampedX, y: clampedY };
}

// this is from chatgpt idk if it works
export function intersectCircleLine(x1: number, y1: number, x2: number, y2: number, x: number, y: number, radius: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;

    const fx = x1 - x;
    const fy = y1 - y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - radius * radius;

    let discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        return false; // No real solutions, line does not intersect circle
    } else {
        discriminant = Math.sqrt(discriminant);

        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);

        // Check if either intersection point lies within the line segment
        if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
            return true;
        }

        // Check if the circle's center is within the line segment and the segment endpoints are outside the circle.
        // This covers cases where the line segment passes *through* the circle without an intersection point
        // being on the segment (e.g., segment entirely inside the circle).
        // However, the quadratic formula already handles this if the segment is truly intersecting.
        // A more robust check for this case is to check if the closest point on the line *to the circle's center*
        // falls within the segment, and if that distance is less than the radius.

        // Calculate the closest point on the line to the circle's center
        const t = ((x - x1) * dx + (y - y1) * dy) / a;

        if (t >= 0 && t <= 1) {
            const closestX = x1 + t * dx;
            const closestY = y1 + t * dy;
            const distSq = (closestX - x) * (closestX - x) + (closestY - y) * (closestY - y);
            if (distSq <= radius * radius) {
                return true;
            }
        } else {
            // If the closest point on the infinite line is outside the segment,
            // then we need to check the distance from the circle's center to the segment endpoints.
            const dist1Sq = (x1 - x) * (x1 - x) + (y1 - y) * (y1 - y);
            const dist2Sq = (x2 - x) * (x2 - x) + (y2 - y) * (y2 - y);

            if (dist1Sq <= radius * radius || dist2Sq <= radius * radius) {
                return true;
            }
        }
    }

    return false;
}