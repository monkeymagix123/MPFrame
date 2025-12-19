import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { setupSocketHandlers } from "./socket";
import { Room } from "@shared/room";
import { serverConfig } from "./serverConfig";

const isDev = process.env.NODE_ENV === "development";

const app = express();
const server = http.createServer(app);
export const io = new Server(server);

export const rooms = new Map<string, Room>();
export const playerNames = new Map<string, string>();

// Serve static files in production only
if (!isDev) {
   const clientPath = path.join(__dirname, "..", "..", "public", "dist");
   console.log(`Serving static files from ${clientPath}`);

   app.use(express.static(clientPath));
   app.get("/games/:roomCode", (req, res) => {
      const roomCode = req.params.roomCode as string;
      if (!/^[A-Z0-9]{4}$/.test(roomCode)) {
         return res.status(404).send("Invalid room code format");
      }
      res.sendFile(path.join(clientPath, "index.html"));
   });
}

setupSocketHandlers(io);

const PORT = process.env.PORT || serverConfig.port;
server.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
});
