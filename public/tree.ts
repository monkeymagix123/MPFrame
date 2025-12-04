// --- 1. Player State ---
import { session } from "./session";
import { skillData } from "../shared/skillTree";
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
        buttonElement.addEventListener('click', () => attemptUnlock(skillId));

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
function attemptUnlock(skillId: string) {
    const cost = skillData[skillId].cost;

    // Check if skill is already unlocked
    if (player.unlockedSkills.includes(skillId)) {
        console.log("Already unlocked.");
        return;
    }

    // 1. Check Prerequisites
    if (!hasPrereqs(skillId)) {
        alert("You must first unlock all prerequisites!");
        return;
    }

    // 2. Check Skill Points
    if (player.skillPoints < cost) {
        alert("Not enough skill points!");
        return;
    }

    // 3. SUCCESS: Apply changes
    player.skillPoints -= cost;
    player.unlockedSkills.push(skillId);

    // Dev log
    console.log(`Unlocked ${skillId}. Remaining points: ${player.skillPoints}`);

    // Update the UI
    redrawUI();

    // Update the next tier of skills' unlock state (optional, for visual feedback)
    // updateAllSkillsVisibility();
}

function hasPrereqs(skillId: string): boolean {
    const prereqs = skillData[skillId].prereq;
    return prereqs.every(prereq => player.unlockedSkills.includes(prereq));
}

// // --- 3. Event Listener Setup ---
// document.querySelectorAll('.skill').forEach(button => {
//     button.addEventListener('click', (event) => {
//         attemptUnlock(event.target as HTMLButtonElement);
//     });
// });

// Initial setup to show available points
// console.log(`Initial Skill Points: ${player.skillPoints}`);