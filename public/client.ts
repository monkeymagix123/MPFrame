import { initSocket } from "./socket";
import { initUI } from "./ui";
import { initGame } from "./game";
import { checkURLForRoom } from "./utils";

document.addEventListener("DOMContentLoaded", () => {
  (function () {
    initSocket();
    initUI();
    initGame();
    checkURLForRoom();
  })();
});