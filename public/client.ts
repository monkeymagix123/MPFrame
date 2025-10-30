import { initializeSession as initSession } from "./session";
import { initSocket } from "./socket";
import { initUI } from "./ui";
import { checkURLForRoom } from "./url";

document.addEventListener("DOMContentLoaded", () => {
   (function () {
      initSession();
      initUI();
      initSocket();
      checkURLForRoom();
   })();
});
