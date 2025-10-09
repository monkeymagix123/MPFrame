import * as state from "./state.js";
import * as ui from "./ui.js";
import { stopGameLoop } from "./game.js";

export function checkURLForRoom() {
    // Extract room code from path like /games/ABCD
    const pathParts = window.location.pathname.split("/");
    const roomCode = pathParts[2]; // Assuming /games/ROOMCODE structure

    if (roomCode && roomCode.length === 4) {
        document.getElementById("room-code-input").value = roomCode;
        state.socket.emit("join-room", roomCode);
    }
}

export function updateURL(roomCode) {
    // Create new path-based URL
    const newPath = `/games/${roomCode}`;

    // Update the URL without page reload
    window.history.replaceState({}, "", newPath);

    // Update the shareable link display
    const fullURL = `${window.location.origin}${newPath}`;
    document.getElementById(
        "lobby-url"
    ).textContent = `Share this link: ${fullURL}`;
}

export function sendChatMessage() {
    const chatInput = document.getElementById("chat-input");
    const message = chatInput.value.trim();
    if (message.length > 0) {
        state.socket.emit("send-chat", message);
        chatInput.value = "";
    }
}

export function escapeHtml(text) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function leaveRoom() {
    stopGameLoop();
    state.resetState();

    window.history.replaceState({}, "", window.location.pathname);

    state.socket.disconnect();
    state.socket.connect();

    ui.showMenu();
}
