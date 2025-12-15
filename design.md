# Design

## Player
- PlayerStats: only change when unlock upgrades
    - moveSpeed: movement speed of player
    - dashDistance: max distance you can dash
    - ~~dashSpeedMultiplier: 5x movement~~ this is a constant currently
- Computed properties:
    - getDashDuration(): returns how long it takes to complete the dash
    - getDashSpeed(): returns dash speed using dashSpeedMultiplier and moveSpeed

- dashProgress - How far along the dash is (clamped from 0 to dashCooldown)
    - When not dashing: increases 0 to dashCooldown
    - When dashing: decreases dashProgress from dashCooldown to 0 in getDashDuration() time?
        - surely it makes more sense if ur doing it this way to do [0, 1]
        - yea that makes more sense ngl
        - wait there is a bug
        - dashDistance may change so duration may change cuz bounds exist
- dashCooldown - How much your dashProgress needs to be at to trigger a dash
- dashTime     - How long it takes for dashProgress to go back down to 0 after a dash

## Server

One IO instance (entire server does everything for multiple games)
- Exported from server.ts

One massive interval, fps simulationSpeed
- activeGames[] stores games that are currently running loops
    - Add when roomState becomes playing from lobby
    - When match ends, remove game from activeGames
- For each game, calls update()

### Game (stored in games)
- **What is a Game?**
    - Controller for one room
    - So, when multiple rooms are running simultaneously, there is an array of games
- Room
    - Code
    - Players: Map id -> player
        - TODO: Should consolidate this & roomState's player array
    - roomState: waiting / playing / etc
    - gameState
        - Time of match start
        - State of every player
        - State of game objects (array, using object pooling)
    - chat
- Game objects
    - Stores object generation variables (spawn time, max count, which are in generation, *etc.*)
- Functions
    - startGame(): starts game for first time, when room becomes playing state, usually from lobby
    - startMatch(): not first time, after skill selection
    - update()
        - Stores previous healths
        - room.gameState updates all players by dt
            - player.update(dt, time since game start) gives player segments
                - Also calculates energy over time
            - Calc damage from player segments
    - this.endMatch(): ends match, makes skill selection
        - This is an instance function because game must have been initialized
        - Clears local game creation array, tells room to endMatch(), room tells state to reset game object creation
    - endGame(): ends game
        - TODO: we have not done this yet
        - This is not an instance function because maybe we haven't even started playing yet

### Socket
Receive
- Receive 'game/player-move'
    - Feeds moveData into corresponding player
        - TODO: maybe leave up to game to do this?
    - Sends move data in 'game/player-delta' to all players
- GOAL: Should have very basic functionality: mostly coordinate game, etc to do stuff

### GameObjects
- Multiple static vars & methods
    - Help with game object related calculations


## Client
### Session
- room
- Instance Functions
- keysPressed
- settings

## Socket
- Has a lot of the handlers, does most of coordinating
- updatePlayerList()
    - Updates it for session
        - TODO: make session accept it instead
    - Tells ui to update

### Canvas
- renderGame(): automatically gets the dt, stores fps history
    - TODO: should probably rename to canvas.updateCanvas()
- all the random drawing utilities

### Input
- Loads user input
- Has startGameLoop(), stopGameLoop()
- Calls renderGame() using gameLoop, requestAnimationFrame
    - TODO: This doesn't rly make sense lol that this is in this section


Tree (uses session player)


## Game Design
Constant damage
- damageOverTimeBase, damageOverTimeScaling
- ddmg/dt = damageOverTime + damageOverTimeScaling * t
- damageOverTime * t + damageOverTimeScaling * t^2 / 2 | ti to tf