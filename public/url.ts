import { session } from "./session";

export function checkURLForRoom(): void {
  // Extract room code from path like /games/ABCD
  const pathParts = window.location.pathname.split("/");
  const roomCode = pathParts[2]; // Assuming /games/ROOMCODE structure

  if (roomCode && roomCode.length === 4) {
    const input = document.getElementById("room-code-input") as HTMLInputElement;
    if (input) {
      input.value = roomCode;
    }
    session.socket.emit("menu/join-room", roomCode);
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
    lobbyUrlElement.innerHTML = `
    Share this link: 
    <a href="${fullURL}" target="_blank" style="color: #3b82f6; text-decoration: underline;">${fullURL}</a>
  `;
  }
}