export const config = {
   mapWidth: 900,
   mapHeight: 600,

   playerLength: 30,
   headLength: 30,

   moveSpeed: 180,

   dashCooldown: 1.5,
   dashDistance: 250,
   dashDuration: 0.5, // includes part of cooldown
   get dashSpeed() { // use for computed property
	  return this.dashDistance / this.dashDuration;
   },
   dashDamage: 25,

   maxHealth: 100,
};
