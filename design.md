# Design

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
            - player.update(dt) gives player segments
            - Calc damage from player segments
    - this.endMatch(): ends match, makes skill selection
        - This is an instance function because game must have been initialized
    - endGame(): ends game
        - TODO: we have not done this yet
        - This is not an instance function because maybe we haven't even started playing yet

### Socket
Receive
- Receive 'game/player-move'
    - Feeds moveData into corresponding player
        - TODO: maybe leave up to game to do this?
    - Sends move data in 'game/player-moved' to all players
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