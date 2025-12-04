// --- 1. Player State ---
import { session } from "./session";
import { skillData, treeUtil } from "../shared/skillTree";
import { Player } from "../shared/player";

let player: Player;
let interval: number;

const skillPointsContainer = document.getElementById('skill-points-container') as HTMLDivElement;
const skillPointsElement = document.getElementById('skill-points') as HTMLSpanElement;
const skillsElement = document.getElementById('skill-tree') as HTMLDivElement;

export function drawUI() {
    // set the player
    player = session.player!;

    // unhide points container
    skillPointsContainer.className = '';

    // show points
    skillPointsElement.innerText = player.skillPoints.toString();

    // show skill tree
    skillsElement.className = 'skill-tree';

    for (const skillId in skillData) {
        const skill = skillData[skillId];

        const buttonElement = document.createElement('button');
        buttonElement.textContent = skill.name;
        buttonElement.id = skillId;
        buttonElement.dataset.skillId = skillId;
        buttonElement.dataset.cost = skill.cost.toString();
        buttonElement.dataset.prereq = skill.prereq.join(',');

        buttonElement.className = 'skill tooltip';
        buttonElement.addEventListener('click', () => requestUnlock(skillId));

        buttonElement.classList.add(...getClass(skillId));

        skillsElement.appendChild(buttonElement);

        const tooltipElement = document.createElement('span');
        tooltipElement.className = 'tooltiptext';
        tooltipElement.innerHTML = `
            ${skill.desc} <br>
            Cost: ${skill.cost} <br>
            Prereq: ${skill.prereq.map(prereq => skillData[prereq].name).join(', ')}
        `;
        buttonElement.appendChild(tooltipElement);
    }

    startUpdateLoop();
}

function startUpdateLoop() {
    interval = requestAnimationFrame(gameLoop);
}

function cancelUpdateLoop() {
    cancelAnimationFrame(interval);
}

function gameLoop() {
    redrawUI();
    requestAnimationFrame(gameLoop);
}

export function redrawUI() {
    // refresh player
    player = session.player!;

    // show points
    skillPointsElement.innerText = player.skillPoints.toString();

    // update skill tree
    for (const skillId in skillData) {
        const skill = skillData[skillId];

        const buttonElement = document.getElementById(skillId)! as HTMLButtonElement;

        const classList = buttonElement.classList;
        // clear all classes
        classList.remove(...classList);
        classList.add('skill', 'tooltip');
        classList.add(...getClass(skillId));
    }
}

function getClass(skillId: string): string[] {
    // already unlocked
    if (player.unlockedSkills.includes(skillId)) {
        return ['unlocked'];
    }

    // don't have all prereqs
    if (!hasPrereqs(skillId)) {
        return ['hidden'];
    }
    
    // have all prereqs, but can't buy it
    if (player.skillPoints < skillData[skillId].cost) {
        return ['locked'];
    }
    
    return ['available'];
}

// --- 2. Logic to Check/Unlock ---


/**
 * Emits a socket event to the server to unlock a skill.
 * @param {string} skillId - The ID of the skill to unlock.
 */
export function requestUnlock(skillId: string): void {
    session.socket.emit('game/player-buy-upgrade', skillId);
}

function hasPrereqs(skillId: string): boolean {
    return treeUtil.hasPrereqs(skillId, player.unlockedSkills);
}

// // --- 3. Event Listener Setup ---
// document.querySelectorAll('.skill').forEach(button => {
//     button.addEventListener('click', (event) => {
//         attemptUnlock(event.target as HTMLButtonElement);
//     });
// });

// Initial setup to show available points
// console.log(`Initial Skill Points: ${player.skillPoints}`);