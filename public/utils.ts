import * as state from "./state";
import * as ui from "./ui";
import { stopGameLoop } from "./game";

export function checkURLForRoom(): void {
  // Extract room code from path like /games/ABCD
  const pathParts = window.location.pathname.split("/");
  const roomCode = pathParts[2]; // Assuming /games/ROOMCODE structure

  if (roomCode && roomCode.length === 4) {
    const input = document.getElementById("room-code-input") as HTMLInputElement;
    if (input) {
      input.value = roomCode;
    }
    state.socket.emit("join-room", roomCode);
  }
}

export function updateURL(roomCode: string): void {
  // Create new path-based URL
  const newPath = `/games/${roomCode}`;

  // Update the URL without page reload
  window.history.replaceState({}, "", newPath);

  // Update the shareable link display
  const fullURL = `${window.location.origin}${newPath}`;
  const lobbyUrlElement = document.getElementById("lobby-url");
  if (lobbyUrlElement) {
    lobbyUrlElement.textContent = `Share this link: ${fullURL}`;
  }
}

export function sendChatMessage(): void {
  const chatInput = document.getElementById("chat-input") as HTMLInputElement;
  if (!chatInput) return;

  const message = chatInput.value.trim();
  if (message.length > 0) {
    state.socket.emit("send-chat", message);
    chatInput.value = "";
  }
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function leaveRoom(): void {
  stopGameLoop();
  state.resetState();

  window.history.replaceState({}, "", window.location.pathname);

  state.socket.disconnect();
  state.socket.connect();

  ui.showMenu();
}