// --- 1. Player State ---
import { session } from "./session";
import { Effect, skillData, treeUtil } from "../shared/skillTree";
import { Player } from "../shared/player";

let player: Player;
let interval: number;

// check if initialized UI
let hasInitUI = false;

const skillPointsContainer = document.getElementById('skill-points-container') as HTMLDivElement;
const skillPointsElement = document.getElementById('skill-points') as HTMLSpanElement;
const skillsElement = document.getElementById('skill-tree') as HTMLDivElement;
const skillReadyBtn = document.getElementById('skill-ready-btn') as HTMLButtonElement;

export function drawUI() {
    if (!hasInitUI) {
        initTreeUI();
        hasInitUI = true;
        return;
    }

    // unhide everything
    skillPointsContainer.classList.remove('hidden');
    skillsElement.classList.remove('hidden');
    skillReadyBtn.classList.remove('hidden');

    // start loop
    startUpdateLoop();
}

function effectsString(skillEffects?: Effect): string {
    if (!skillEffects) {
        return "";
    }

    if (!player) {
        return "";
    }

    let s = `<br> Effects: <br>
        ${treeUtil.getEffectsString(player.previewEffects(skillEffects))}
    `

    return s;
}

/**
 * Draw the UI for the player's skill tree.
 * This function sets up the DOM elements for the skill tree,
 * and adds event listeners for the buttons.
 * It also starts the update loop, which updates the UI every frame.
 */
export function initTreeUI() {
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
        tooltipElement.id = `tooltip-${skillId}`;
        tooltipElement.innerHTML = `
            ${skill.desc} <br>
            Cost: ${skill.cost} <br>
            Prereq: ${skill.prereq.map(prereq => skillData[prereq].name).join(', ')}
            ${ effectsString(skill.effects) }
        `;
        buttonElement.appendChild(tooltipElement);
    }

    // show ready button
    skillReadyBtn.classList.remove('hidden');
    skillReadyBtn.addEventListener('click', () => {
        // Send to server
        session.socket.emit('game/player-skill-ready');

        // Update button
        if (skillReadyBtn.classList.contains('ready')) {
            skillReadyBtn.classList.remove('ready');
            skillReadyBtn.innerText = 'Ready';
        } else {
            skillReadyBtn.classList.add('ready');
            skillReadyBtn.innerText = 'Not Ready';
        }
    });

    startUpdateLoop();
}

export function hideUI() {
    // If haven't initialized UI, don't do anything
    if (!hasInitUI) return;

    // Hide elements
    skillPointsContainer.classList.add('hidden');
    skillsElement.classList.add('hidden');
    skillReadyBtn.classList.add('hidden');

    // Reset button status
    skillReadyBtn.classList.remove('ready');
    skillReadyBtn.innerText = 'Ready';

    cancelUpdateLoop();
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

        // update tooltip only if its not bought (so effects change)
        if (player.unlockedSkills.includes(skillId)) {
            continue;
        }
        
        const tooltipElement = document.getElementById(`tooltip-${skillId}`)! as HTMLSpanElement;
        tooltipElement.innerHTML = `
            ${skill.desc} <br>
            Cost: ${skill.cost} <br>
            Prereq: ${skill.prereq.map(prereq => skillData[prereq].name).join(', ')}
            ${ effectsString(skill.effects) }
        `;
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