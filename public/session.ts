import { io, Socket } from "socket.io-client";
import { Keys } from "../shared/types";
import { Player } from "../shared/player";
import { Vec2 } from "../shared/v2";
import { config } from "../shared/config";
import { Room } from "../shared/room";
import { Settings } from "./settings";

export class Session {
   socket: Socket;
   room: Room | null;
   player: Player | null;
   keys: Keys;
   settings: Settings;
   canvas: HTMLCanvasElement;
   ctx: CanvasRenderingContext2D;
   gameLoop: number | null;
   mousePos: Vec2;

   constructor(canvas: HTMLCanvasElement, ctx?: CanvasRenderingContext2D) {
      this.socket = io();
      this.room = null;
      this.player = null;
      this.keys = {} as Keys;
      this.settings = new Settings();
      this.canvas = canvas;
      this.ctx = ctx ?? canvas.getContext("2d") as CanvasRenderingContext2D;
      this.gameLoop = null;
      this.mousePos = new Vec2();
   }

   resetSession(): void {
      this.room = null;
      this.player = null;
      this.keys = {} as Keys;
      this.gameLoop = null;
      this.mousePos = new Vec2();
   }

   saveMouseCoords(mouseX: number, mouseY: number): void {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = (config.mapWidth * this.settings.resScale) / this.canvas.width;
      const scaleY = (config.mapHeight * this.settings.resScale) / this.canvas.height;

      this.mousePos.x = (mouseX - rect.left) * scaleX;
      this.mousePos.y = (mouseY - rect.top) * scaleY;
   }
}

export function initializeSession() {
   const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   session = new Session(canvas);
}

export let session: Session;
