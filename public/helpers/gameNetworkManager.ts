import { io, Socket } from "socket.io-client";
import { ClientInput } from "../../shared/types";

export class GameNetworkManager {
    // Network info
    gameSocket: Socket;
    currentRoom?: string;

    constructor() {
        this.gameSocket = io();
        this.currentRoom = undefined;
    }
    
    /**
     * Sends the given ClientInput to the server.
     * @param input - The ClientInput to send to the server.
     */
    sendInput(input: ClientInput) {
        this.gameSocket.emit("game/client-input", input);
    }

    resetSession() {
        this.currentRoom = undefined;
    }
}