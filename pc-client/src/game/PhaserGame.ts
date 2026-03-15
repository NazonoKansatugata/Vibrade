import Phaser from 'phaser'
import GameScene from './scenes/GameScene'
import type { GameState } from '../types'

export interface PhaserGameHandle {
  game: Phaser.Game
  updateGameState: (gameState: GameState) => void
}

export const createPhaserGame = (
  parent: HTMLElement,
  roomId: string,
): PhaserGameHandle => {
  const scene = new GameScene(roomId)

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
    updateGameState: (gameState) => {
      scene.applyGameState(gameState)
    },
  }
}

export const destroyPhaserGame = (game: PhaserGameHandle) => {
  game?.game.destroy(true)
}
