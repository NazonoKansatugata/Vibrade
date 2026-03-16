import Phaser from 'phaser'
import BeySprite from '../sprites/Bey'
import type { GameState } from '../../types'

const SERVER_ARENA_RADIUS = 500

class GameScene extends Phaser.Scene {
  private readonly roomId: string
  private arena?: Phaser.GameObjects.Arc
  private arenaRing?: Phaser.GameObjects.Arc
  private roomLabel?: Phaser.GameObjects.Text
  private infoLabel?: Phaser.GameObjects.Text
  private beySprites = new Map<string, BeySprite>()
  private currentGameState?: GameState

  constructor(roomId: string) {
    super({ key: 'game-scene' })
    this.roomId = roomId
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a')
    this.buildScene(this.scale.width, this.scale.height)
    this.renderGameState()

    this.scale.on('resize', this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.beySprites.forEach((bey) => bey.destroy())
      this.beySprites.clear()
      this.scale.off('resize', this.handleResize, this)
    })
  }

  update() {
    this.beySprites.forEach((bey) => bey.tick())
  }

  applyGameState(gameState: GameState) {
    this.currentGameState = gameState

    if (this.sys.isActive()) {
      this.renderGameState()
    }
  }

  private buildScene(width: number, height: number) {
    this.arena?.destroy()
    this.arenaRing?.destroy()
    this.roomLabel?.destroy()
    this.infoLabel?.destroy()

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.34

    this.add.rectangle(centerX, centerY, width, height, 0x0b1120, 1)

    this.arena = this.add.circle(centerX, centerY, radius, 0x132238, 0.95)
    this.arena.setStrokeStyle(8, 0x38bdf8, 0.35)

    this.arenaRing = this.add.circle(centerX, centerY, radius * 0.72, 0x0f172a, 0)
    this.arenaRing.setStrokeStyle(3, 0xe2e8f0, 0.25)

    this.roomLabel = this.add.text(centerX, 36, `ROOM ${this.roomId}`, {
      fontFamily: 'Segoe UI',
      fontSize: '24px',
      color: '#e2e8f0',
      fontStyle: 'bold',
    })
    this.roomLabel.setOrigin(0.5, 0)

    this.infoLabel = this.add.text(centerX, height - 44, 'Phaser minimal scene: waiting for server gameState', {
      fontFamily: 'Segoe UI',
      fontSize: '18px',
      color: '#94a3b8',
    })
    this.infoLabel.setOrigin(0.5, 1)
  }

  private renderGameState() {
    if (!this.currentGameState) {
      return
    }

    this.infoLabel?.setText(
      this.currentGameState.isGameActive
        ? `Tick ${this.currentGameState.tick} • ${this.currentGameState.beys.length} beys rendering`
        : 'Waiting for players to start',
    )

    const activeIds = new Set(this.currentGameState.beys.map((bey) => bey.id))

    this.beySprites.forEach((sprite, id) => {
      if (!activeIds.has(id)) {
        sprite.destroy()
        this.beySprites.delete(id)
      }
    })

    this.currentGameState.beys.forEach((beyState, index) => {
      let sprite = this.beySprites.get(beyState.id)

      if (!sprite) {
        const playerName = this.currentGameState?.players.find(
          (player) => player.id === beyState.playerId,
        )?.name
        sprite = new BeySprite(this, beyState.id, playerName ?? `P${index + 1}`)
        this.beySprites.set(beyState.id, sprite)
      }

      sprite.applyState(this.projectX(beyState.x), this.projectY(beyState.y), beyState)
    })
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.buildScene(gameSize.width, gameSize.height)
    this.renderGameState()
  }

  private projectX(x: number) {
    const centerX = this.scale.width / 2
    const arenaPixelRadius = Math.min(this.scale.width, this.scale.height) * 0.34 * 0.9
    return centerX + (x / SERVER_ARENA_RADIUS) * arenaPixelRadius
  }

  private projectY(y: number) {
    const centerY = this.scale.height / 2
    const arenaPixelRadius = Math.min(this.scale.width, this.scale.height) * 0.34 * 0.9
    return centerY + (y / SERVER_ARENA_RADIUS) * arenaPixelRadius
  }
}

export default GameScene
