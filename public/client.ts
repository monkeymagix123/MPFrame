import { initSocket } from "./socket";
import { initUI } from "./ui";
import { checkURLForRoom } from "./url";

document.addEventListener("DOMContentLoaded", () => {
  (function () {
    initSocket();
    initUI();
    checkURLForRoom();
  })();
});