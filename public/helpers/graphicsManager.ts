import { config } from "../../shared/config";
import { Vec2 } from "../../shared/v2";
import { settings } from "../settings";


export class GraphicsManager {
    canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    }

    getCoordsFromMouse(mouseX: number, mouseY: number): Vec2 {
        const canvas = this.canvas;

        const rect = canvas.getBoundingClientRect();

        let x = (mouseX - rect.left) * config.width / canvas.width * settings.resolutionScale;
        let y = (mouseY - rect.top) * config.height / canvas.height * settings.resolutionScale;

        return new Vec2(x, y);
    }
}

export function hasCanvas(): boolean {
    const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
	
    return (canvas !== null);
}