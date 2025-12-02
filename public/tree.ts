// --- 1. Player State ---
let player = {
    skillPoints: 5,
    unlockedSkills: [] as string[]
};

const skillData = {
    a1: { name: "Power Attack", cost: 1, prereq: [] },
    b1: { name: "Cleave", cost: 2, prereq: ["a1"] },
    b2: { name: "Defensive Stance", cost: 2, prereq: ["a1"] },
    c1: { name: "Execution", cost: 3, prereq: ["b1"] }
} as Record<string, Skill>;

type Skill = {
    name: string,
    cost: number,
    prereq: string[]
}

const skillPointsContainer = document.getElementById('skill-points-container') as HTMLDivElement;
const skillPointsElement = document.getElementById('skill-points') as HTMLSpanElement;
const skillsElement = document.getElementById('skill-tree') as HTMLDivElement;

export function drawUI() {
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

        buttonElement.className = 'skill';
        buttonElement.addEventListener('click', () => attemptUnlock(skillId));

        buttonElement.classList.add(...getClass(skillId));

        skillsElement.appendChild(buttonElement);
    }
}

export function redrawUI() {
    // show points
    skillPointsElement.innerText = player.skillPoints.toString();

    // update skill tree
    for (const skillId in skillData) {
        const skill = skillData[skillId];

        const buttonElement = document.getElementById(skillId)! as HTMLButtonElement;

        buttonElement.classList.remove('unlocked', 'locked');
        buttonElement.classList.add(...getClass(skillId));
    }
}

function getClass(skillId: string): string[] {
    if (player.unlockedSkills.includes(skillId)) {
        return ['unlocked'];
    } else if (!hasPrereqs(skillId)) {
        return ['locked'];
    } else {
        return [];
    }
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
console.log(`Initial Skill Points: ${player.skillPoints}`);