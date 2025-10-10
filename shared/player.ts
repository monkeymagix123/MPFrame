export interface Player {
	id: string;
	name?: string;
	team: "red" | "blue";
	ready: boolean;
	x: number;
	y: number;
	dashX?: number;
	dashY?: number;
}

// export class CurrentPlayer extends Player {
//     startDash: boolean = false;
//     dashX: number = 0;
//     dashY: number = 0;
//     dashCooldown: number = 0;

//     mouseX: number = 0;
//     mouseY: number = 0;

//     constructor(p: Player) {
//         //
//     }
// }