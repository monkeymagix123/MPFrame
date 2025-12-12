import { config } from "./config";
import { GameObject } from "./gameObjects";
import { clampPos } from "./math";
import { PlayerFlags, PlayerStats } from "./playerStats";
import { Effect, skillData, treeUtil } from "./skillTree";
import { PlayerSegment } from "./state";
import { TeamColor } from "./types";
import { v2, Vec2 } from "./v2";

/**
 * Represents a player instance in the game.
 * Used for both the server and the client.
 */
export class Player {
   id: string;
   name: string;
   team: TeamColor; // red or blue
   ready: boolean;

   skillReady: boolean = false;

   pos: Vec2;

   moveVel: Vec2;

   dashing: boolean;
   dashProgress: number;
   dashVel: Vec2;

   health: number = config.maxHealth;

   // Stats, fully refreshed at the start and end of each match
   stats: PlayerStats = new PlayerStats();
   flags: PlayerFlags = new PlayerFlags();

   unlockedSkills: string[] = [];
   skillPoints: number = 0;

   killCount: number = 0;
   deathCount: number = 0;

   constructor(id: string, team: TeamColor, pos: Vec2, name: string = "Player", ready: boolean = false) {
      this.id = id;
      this.name = name;
      this.team = team;
      this.ready = ready;

      this.pos = pos;
      this.moveVel = new Vec2(0, 0);

      this.dashing = false;
      this.dashProgress = this.stats.dashCooldown;
      this.dashVel = new Vec2(0, 0);
   }

   attemptDash(v: Vec2): boolean {
      if (!this.isAlive()) return false;

      if (this.dashProgress < this.stats.dashCooldown) {
         return false; // Dash is on cooldown
      }

      this.dashing = true;
      this.dashProgress = 0;
      this.dashVel = v2.mul(v2.normalize(v2.sub(v, this.pos)), this.stats.dashSpeed);

      return true;
   }

   takeDamage(amount: number, source?: Player): void {
      if (!this.isAlive()) return;
      if (this.isInvulnerable()) return;

      this.health -= amount;
      if (this.health <= 0) {
         // update round stats
         this.deathCount++;
         if (source) source.killCount++;

         this.health = 0;
      }
   }

   /**
    * Heals the player for a given amount of health.
    * If the player's health exceeds their maximum health, caps their health at their maximum health.
    * @param {number} amount - The amount of health to heal by.
    * @returns {boolean} True if the player has healed, false otherwise.
    */
   heal(amount: number): boolean {
      if (!this.isAlive()) return false;

      this.health += amount;
      if (this.health > this.stats.maxHealth) this.health = this.stats.maxHealth;

      return true;
   }

   interact(object: GameObject): void {
      const effects = object.effects;

      if (effects === undefined) return;

      if (effects.baseDamage !== undefined) {
         this.takeDamage(effects.baseDamage);
      }

      if (effects.baseHeal !== undefined) {
         this.heal(effects.baseHeal);
      }
   }

   // Status getters
   /**
    * Check if the player is invulnerable to damage.
    * A player is invulnerable if they are currently dashing and the dashInvulnerable flag is true.
    * @returns {boolean} True if the player is invulnerable to damage, false otherwise.
    */
   isInvulnerable(): boolean {
      if (!this.dashing) return false;

      return this.flags.dashInvulnerable;
   }

   /**
    * Check if the player is alive.
    * @returns {boolean} True if player is alive, false otherwise.
    */
   isAlive(): boolean {
      return this.health > 0;
      // TODO: also add check for if disconnected
   }

   // Move Data (network utilities)
   /**
    * Returns the current move data of the player.
    * This data contains information about the player's position, velocity, dashing status, dashing progress, and dashing velocity.
    * @return {PlayerDelta} The current move data of the player.
    */
   getMoveData(): PlayerDelta {
      return {
         time: performance.now(), // TODO: Maybe return time since start of game
         pos: this.pos,
         moveVel: this.moveVel,
         dashing: this.dashing,
         dashProgress: this.dashProgress,
         dashVel: this.dashVel,
      };
   }

   applyPlayerDelta(move: PlayerDelta): void {
      // Movement
      this.pos = move.pos ?? this.pos;
      this.moveVel = move.moveVel ?? this.moveVel;
      this.dashing = move.dashing ?? this.dashing;
      this.dashProgress = move.dashProgress ?? this.dashProgress;
      this.dashVel = move.dashVel ?? this.dashVel;
      // console.log(move.health);
      this.health = (move.health ?? this.health) /*- this.stats.damageOverTime * (performance.now() - move.time)*/;
   }

   // Update
   
   /**
    * Updates the player's state based on the given delta time.
    * If the player is currently dashing, it will check if the dash should end during this frame.
    * If the dash should end, it will split the movement into two segments: one for the dash and one for the normal movement.
    * If the dash should not end, it will simply update the player's position based on the dash velocity.
    * If the player is not dashing, it will simply update the player's position based on the normal velocity.
    * @param {number} dt - The delta time to update the player by.
    * @returns {PlayerSegment[]} An array of player segments, each representing a portion of the player's movement over the given delta time.
    */
   update(dt: number, startTime: number): PlayerSegment[] {
      this.dashProgress = Math.min(this.dashProgress + dt, this.stats.dashCooldown);
      
      let vel = this.moveVel;

      if (this.dashing) {
         vel = this.dashVel;

         // Check if dash should end during this frame
         const dashTimeRemaining = config.dashDuration - (this.dashProgress - dt);

         if (dashTimeRemaining <= 0) {
            this.dashing = false;
            vel = this.moveVel;
         } else if (dashTimeRemaining < dt) {
            const dashPortion = dashTimeRemaining;
            const movePortion = dt - dashTimeRemaining;

            const dashMovement = v2.mul(this.dashVel, dashPortion);
            const normalMovement = v2.mul(this.moveVel, movePortion);

            let segments: PlayerSegment[] = [];

            segments.push({
               player: this,
               startPos: this.pos,
               velocity: this.dashVel,
               dashing: true,
               startTime: 0,
               endTime: dashTimeRemaining,
            });

            this.pos = clampPos(v2.add(this.pos, dashMovement));

            segments.push({
               player: this,
               startPos: this.pos,
               velocity: this.moveVel,
               dashing: false,
               startTime: dashTimeRemaining,
               endTime: dt,
            });

            this.pos = clampPos(v2.add(this.pos, normalMovement));
            this.dashing = false;

            return segments;
         }
      }

      const startPos: Vec2 = this.pos;
      this.pos = clampPos(v2.add(this.pos, v2.mul(vel, dt)));

      // Damage Over Time
      if (this.isAlive()) {
         // Do at end of the loop
         this.damageOverTime(startTime - dt, startTime);
      }

      return [
         {
            player: this,
            startPos: startPos,
            velocity: vel,
            dashing: this.dashing,
            startTime: 0,
            endTime: dt,
         },
      ];
   }
   damageOverTime(startTime: number, endTime: number) {
      const dmg = this.totalDmg(endTime) - this.totalDmg(startTime);
      this.takeDamage(dmg);
   }

   private totalDmg(t: number) {
      return this.stats.damageOverTimeBase * t + 0.5 * this.stats.damageOverTimeScaling * t * t;
   }

   // Skill Tree
   buyUpgrade(skillId: string): boolean {
      // Can't afford
      if (this.skillPoints < skillData[skillId].cost) {
         return false;
      }

      // Already unlocked
      if (this.unlockedSkills.includes(skillId)) {
         return false;
      }

      // No prerequisites
      if (!treeUtil.hasPrereqs(skillId, this.unlockedSkills)) {
         return false;
      }

      // process upgrade
      const skill = skillData[skillId];

      // buy the upgrades
      this.skillPoints -= skill.cost;
      this.unlockedSkills.push(skillId);

      // actually do the upgrade
      if (skill.effects !== undefined) {
         this.applyEffects(skill.effects);
      }

      return true;
   }

   applyEffects(effect: Effect): void {
      const statData = effect.stats as Partial<PlayerStats>;
      const flagData = effect.flags as Partial<PlayerFlags>;

      // console.log(statData);
      // console.log(flagData);

      if (statData) {
         for (const [stat, value] of Object.entries(statData)) {
            const key = treeUtil.parseEffectKey(stat) as keyof PlayerStats;

            this.stats[key] += value;
         }
      }

      if (flagData) {
         for (const [flag, value] of Object.entries(flagData)) {
            const key = flag as keyof PlayerFlags;

            this.flags[key] = value;
         }
      }

      console.log(this);
   }

   previewEffects(effect: Effect): Partial<PlayerStats>[] {
      // TODO
      const oldStats = {} as Partial<PlayerStats>;
      const newStats = {} as Partial<PlayerStats>;

      const statData = effect.stats as Partial<PlayerStats>;

      if (statData) {
         for (const [stat, value] of Object.entries(statData)) {
            const key = treeUtil.parseEffectKey(stat) as keyof PlayerStats;

            oldStats[key] = this.stats[key];
            newStats[key] = oldStats[key] + value;
         }
      }
      
      return [oldStats, newStats];
   }

   // match utilities
   endMatch(): void {
      // calculate how many skill points gained
      this.skillPoints += config.points.base
         + this.killCount * config.points.perKill
         + this.deathCount * config.points.perDeath;
   }
   
   /**
    * Resets the player's state at the start of a match.
    * This will reset the player's position, health, dash progress, and skill ready state.
    */
   resetForMatch(): void {
      // reset skill ready
		this.skillReady = false;

		this.ready = true;
		this.pos.x = Math.random() * config.mapWidth;
		this.pos.y = Math.random() * config.mapHeight;
		this.health = this.stats.maxHealth;
		this.dashProgress = this.stats.dashCooldown;
		this.dashing = false;

      // reset match stats
      this.killCount = 0;
      this.deathCount = 0;
   }
}

export interface PlayerDelta extends Partial<Player> {
   time: number;
}