import Phaser from 'phaser'
import GameScene from './scenes/GameScene'
import type { GameState } from '../types'
import type { GameStartPayload, PlayerInputPayload, LaunchBeyPayload } from '../hooks/useGameSocket'

export interface PhaserGameHandle {
  game: Phaser.Game
  startGame: (payload: GameStartPayload) => void
  applyPlayerInput: (payload: PlayerInputPayload) => void
  applyLaunch: (payload: LaunchBeyPayload) => void
}

export const createPhaserGame = (
  parent: HTMLElement,
  roomId: string,
  onStateChange?: (gameState: GameState) => void,
): PhaserGameHandle => {
  const scene = new GameScene(roomId, onStateChange)

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#0f172a',
    render: {
      antialias: true,
      pixelArt: false,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    scene: [scene],
  }

  const game = new Phaser.Game(config)

  return {
    game,
    startGame: (payload) => {
      scene.startSimulation(payload)
    },
    applyPlayerInput: (payload) => {
      scene.applyPlayerInput(payload)
    },
    applyLaunch: (payload) => {
      scene.applyLaunch(payload)
    },
  }
}

export const destroyPhaserGame = (game: PhaserGameHandle) => {
  game?.game.destroy(true)
}
