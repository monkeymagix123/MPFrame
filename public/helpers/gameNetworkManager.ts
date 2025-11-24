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

    // LOBBY STUFF
    createRoom() {
        this.gameSocket.emit("menu/create-room");
    }

    joinRoom(roomCode: string) {
        // this.currentRoom = roomCode;
        this.gameSocket.emit("menu/join-room", roomCode);
    }

    showLobbies() {
        this.gameSocket.emit("menu/list-lobbies");
    }

    setName(name: string) {
        this.gameSocket.emit("misc/set-name", name);
    }

    changeTeam(team: string) {
        this.gameSocket.emit("lobby/change-team", team);
    }

    toggleReady() {
        this.gameSocket.emit("lobby/ready-toggle");
    }

    // Chat
    sendChatMessage(message: string) {
        this.gameSocket.emit("misc/send-chat", message);
    }
    
    // GAME STUFF
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