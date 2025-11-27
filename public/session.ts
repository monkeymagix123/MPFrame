import { io, Socket } from "socket.io-client";
import { EndGameMsg, EndGameResult, Keys } from "../shared/types";
import { Player } from "../shared/player";
import { Vec2 } from "../shared/v2";
import { config } from "../shared/config";
import { Room } from "../shared/room";
import { colorSettings, Settings } from "./settings";
import { MoveData } from "../shared/moveData";
import { drawEndScreen } from "./canvas";
import { stopGameLoop } from "./input";

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

   recentInput: Map<number, MoveData> = new Map();

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

   /**
    * Ends the current game session and displays a message based on the end result
    * @param {EndGameResult} result - the result of the game, either red win, blue win, draw or disconnect
    */
   endGame(msg: EndGameMsg): void {
      // const endGameModal = document.getElementById("end-game-modal");
      // if (endGameModal) {
      //    endGameModal.style.display = "flex";
      // }

      // stop updating graphics
      stopGameLoop();

      const result = msg.reason;

      switch (result) {
         case EndGameResult.win:
            // check if team color is same as win color
            if (msg.winColor === this.player?.team) {
               alert("You win!");
               drawEndScreen(this.ctx, "You win!", colorSettings.good);
               // TODO: show better win screen
            } else {
               alert("You lose!");
               drawEndScreen(this.ctx, "You lost.", colorSettings.bad);
            }
            break;
         case EndGameResult.draw:
            alert("Draw!");
            drawEndScreen(this.ctx, "Draw", colorSettings.neutral);
            break;
         case EndGameResult.disconnect:
            alert("Disconnected / Game Over");
            drawEndScreen(this.ctx, "Disconnected", colorSettings.neutral);
            break;
         default:
            drawEndScreen(this.ctx, "Game Over", colorSettings.neutral);
            break;
      }
   }
}

export function initializeSession() {
   const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   session = new Session(canvas);
}

export let session: Session;
