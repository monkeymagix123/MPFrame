# Design

## Client



## Server
### Game (stored in games)
- Room
    - Code
    - Players: Map id -> player
    - roomState: waiting / playing / etc
    - gameState: state of every player
    - chat
- IO
- Interval
    - Update interval starts when roomState becomes playing from lobby
        - Intervals stored in gameLoops
    - Calls update(), fps simulationSpeed
        - Stores previous healths
        - room.gameState updates all players by dt
            - player.update(dt) gives player segments
            - Calc damage from player segments
    - When match ends, update interval canceled

### Socket
Receive
- Receive 'game/player-moved'
    - Calculates it
    - Sends move data to all players


## Client
### Session
- room

## Socket
- Has a lot of the handlers

### Canvas
- renderGame(): automatically gets the dt, stores fps history
    - should probably rename to canvas.updateCanvas() or smth

### Input
- Loads user input
- Has startGameLoop(), stopGameLoop()
- Calls renderGame() using gameLoop, requestAnimationFrame
    - This doesn't rly make sense lol


Tree (uses session player)