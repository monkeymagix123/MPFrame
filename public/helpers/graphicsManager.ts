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

export function getCanvas(): HTMLCanvasElement {
    return document.getElementById("game-canvas") as HTMLCanvasElement;
}

export function hasCanvas(): boolean {
    const canvas = getCanvas();
	
    return (canvas !== null);
}