import { initSocket } from "./socket.js";
import { initUI } from "./ui.js";
import { initGame } from "./game.js";
import { checkURLForRoom } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
   (function () {
      initSocket();
      initUI();
      initGame();
      checkURLForRoom();
   })();
});
