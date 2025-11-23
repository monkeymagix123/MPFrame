import { Player } from "../../shared/player";
import { session } from "../session";

export const util = {
    isCurPlayer(player: Player) {
        return player.id === session.gameNetManager.gameSocket.id;
    }
}