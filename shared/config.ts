export const config = {
   devMode: false,

   mapWidth: 900,
   mapHeight: 600,

   playerLength: 30,
   headLength: 30,

   moveSpeed: 180,

   dashCooldown: 2.5,
   dashDistance: 250,
   dashDuration: 0.5, // includes part of cooldown
   get dashSpeed() { // use for computed property
	  return this.dashDistance / this.dashDuration;
   },
   get dashDamage() { // dev mode makes 1 dash deal entire hp
      return this.devMode ? this.maxHealth : 25;
   },

   maxHealth: 100,

   points: {
      base: 5,
      perKill: 2,
   }
};
