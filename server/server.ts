import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { setupSocketHandlers } from "./socket";
import { Room } from "../shared/room";
// import rateLimit from "express-rate-limit";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

export const rooms = new Map<string, Room>();
export const playerNames = new Map<string, string>();

// Serve static files
app.use(express.static(path.join(__dirname, "..", "..", "public")));
app.use("/dist", express.static(path.join(__dirname, "..", "..", "public", "dist")));
app.get("/games/:roomCode", (req, res) => {
	const roomCode = req.params.roomCode as string;
	if (!/^[A-Z0-9]{4}$/.test(roomCode)) {
		return res.status(404).send("Invalid room code format");
	}
	res.sendFile(path.join(__dirname, "..", "..", "public", "index.html"));
});

// app.use(rateLimit({ windowMs: 60000, max: 10 })); // 10 requests per minute

setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});