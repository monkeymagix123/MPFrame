export const config = {
   devMode: false,

   mapWidth: 900,
   mapHeight: 600,

   playerLength: 30,
   headLength: 30,

   moveSpeed: 180,

   dashCooldown: 2.5,
   dashDistance: 250,
   get dashDuration() { // includes part of cooldown, use for computed property
      return this.dashDistance / (this.moveSpeed * this.dashSpeedMultiplier);
   },
   dashSpeedMultiplier: 5, // 5x faster while dashing
   get dashDamage() { // dev mode makes 1 dash deal entire hp
      return this.devMode ? this.maxHealth : 25;
   },

   maxHealth: 100,

   damageOverTimeBase: 1,
   damageOverTimeScaling: 0.1,

   points: {
      base: 1,
      perKill: 2,
      perDeath: 1, // kinda helps ensure dont just sit there
   }
};
