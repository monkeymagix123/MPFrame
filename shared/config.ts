const devMode = false;
export const addBots = false;

export const config = {
   devMode: devMode,

   mapWidth: 900,
   mapHeight: 600,

   playerLength: 30,
   headLength: 30,

   moveSpeed: 80,

   dashCooldown: 5.0,
   dashDistance: 100,
   get dashDuration() { // includes part of cooldown, use for computed property
      return this.dashDistance / (this.moveSpeed * this.dashSpeedMultiplier);
   },
   dashSpeedMultiplier: 3.67, // 5x faster while dashing
   get dashDamage() { // dev mode makes 1 dash deal entire hp
      return this.devMode ? this.maxHealth : 25;
   },

   maxHealth: devMode ? 0.1 : 100,

   damageOverTimeBase: 1,
   damageOverTimeScaling: 0.1,

   points: {
      base: devMode ? 67 : 1,
      perKill: 2,
      perDeath: 0, // kinda helps ensure dont just sit there
   }
};
