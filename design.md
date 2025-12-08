# Design

## Server

One IO instance (entire server does everything for multiple games)

### Game (stored in games)
- **What is a Game?**
    - Controller for one room
    - So, when multiple rooms are running simultaneously, there is an array of games
- Room
    - Code
    - Players: Map id -> player
        - TODO: Should consolidate this & roomState's player array
    - roomState: waiting / playing / etc
    - gameState: state of every player
    - chat
- Interval
    - Update interval starts when roomState becomes playing from lobby
        - Intervals stored in gameLoops
            - TODO: consolidate this & games array
    - Calls update(), fps simulationSpeed
        - Stores previous healths
        - room.gameState updates all players by dt
            - player.update(dt) gives player segments
            - Calc damage from player segments
    - When match ends, update interval canceled
    - TODO: make 1 single big interval for entire server
- Functions
    - startGame(): starts game for first time, when room becomes playing state, usually from lobby
    - startMatch(): not first time, after skill selection
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