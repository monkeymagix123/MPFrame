import { Player } from "../../shared/player";
import { session } from "../session";

// Ready button
const readyBtn = document.getElementById('skill-ready-btn') as HTMLButtonElement;
let player: Player;

// ready button
export function initReadyBtn(): void {
    player = session.player!;
    readyBtn.onclick = () => { toggleReadyBtn() };
}

function toggleReadyBtn(): void {
    const curState: boolean = player.skillReady;

    // toggle state
    player.skillReady = !player.skillReady;

    // change button content
    setBtnState(curState);

    // emit player ready to server
    session.socket.emit('game/player-skill-ready');
}

// helper

/**
 * Sets the button state to 'status'.
 * If 'status' is true, gives it default status (click to ready up)
 * If 'status' is false, gives it status of click to not ready
 */
function setBtnState(status: boolean = true) {
    switch (status) {
        case false:
            // now ready
            readyBtn.classList.add('ready');
            readyBtn.innerText = 'Not Ready';
            break;
        case true:
            // now not ready
            readyBtn.classList.remove('ready');
            readyBtn.innerText = 'Ready';
            break;
    }
}

export function resetReadyBtn(): void {
    setBtnState();
    player.skillReady = false;
}