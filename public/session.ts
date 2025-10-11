import { io, Socket } from "socket.io-client";
import { Keys } from "../shared/types";

export const session = {
	socket: io() as Socket,
	keys: {} as Keys,
	canvas: null as HTMLCanvasElement | null,
	ctx: null as CanvasRenderingContext2D | null,
	gameLoop: null as number | null,
	mouseX: 0,
	mouseY: 0,
};

export function setCanvas(canvasElement: HTMLCanvasElement): void {
	session.canvas = canvasElement;
	session.ctx = canvasElement.getContext("2d");
}

export function setGameLoop(loop: number | null): void {
	session.gameLoop = loop;
}

export function setMousePosition(x: number, y: number): void {
	session.mouseX = x;
	session.mouseY = y;
}