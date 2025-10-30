import { Server } from "socket.io";
import { GameSocket } from "./types";
import { setupMenuHandlers } from "./menuHandlers";
import { setupLobbyHandlers } from "./lobbyHandlers";
import { setupGameHandlers } from "./gameHandlers";
import { setupMiscHandlers } from "./miscHandlers";
import { setupDisconnectHandler } from "./disconnectHandler";
import { playerNames } from "server";

export function setupSocketHandlers(io: Server): void {
   io.on("connection", (socket: GameSocket) => {
      console.log("User connected:", playerNames.get(socket.id) || "[unnamed]");

      // Setup all handler categories
      setupMenuHandlers(socket, io);
      setupLobbyHandlers(socket, io);
      setupGameHandlers(socket, io);
      setupMiscHandlers(socket, io);
      setupDisconnectHandler(socket, io);
   });
}
