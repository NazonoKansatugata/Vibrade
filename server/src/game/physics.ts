import type { BeybladeState, GameState, Vector2 } from './gameState.js';
import type { PlayerInput } from '../input/inputHandler.js';

const FRICTION = 0.98;      // Velocity decay per tick
const SPIN_DECAY = 0.05;    // Spin power loss per tick
const BASE_SPEED = 1.5;     // Base acceleration from tilting
const MAX_SPEED = 20;

export class PhysicsEngine {
  
  /**
   * Applies physics updates to a single Beyblade
   * @param bey The beyblade state to mutate
   * @param input The latest player input (tiltX, tiltY)
   * @param arenaRadius To check for walls / ring out
   */
  static updateBeyPhysics(bey: BeybladeState, input: PlayerInput, arenaRadius: number) {
    if (!bey.isActive) return;

    // 1. Apply Spin Decay
    bey.spinPower = Math.max(0, bey.spinPower - SPIN_DECAY);
    
    // If spin completely stops, Bey is eliminated
    if (bey.spinPower <= 0) {
      bey.energy = 0;
      bey.isActive = false;
      return;
    }

    // 2. Calculate Control Factor
    // The faster it spins, the harder it is to control (slightly)
    // Formula: 1.0 (full control) when spin is low, scales down to ~0.5 when spin is high.
    const controlFactor = Math.max(0.3, 1 - (bey.spinPower / 200));

    // 3. Apply Tilt Acceleration
    // input.tilt is between -1 and 1
    bey.velocity.x += input.tiltX * BASE_SPEED * controlFactor;
    bey.velocity.y += input.tiltY * BASE_SPEED * controlFactor; // Note: Y axis might need inversion depending on client mapping

    // 4. Clamp Max Speed
    const speedSq = bey.velocity.x ** 2 + bey.velocity.y ** 2;
    if (speedSq > MAX_SPEED ** 2) {
      const speed = Math.sqrt(speedSq);
      bey.velocity.x = (bey.velocity.x / speed) * MAX_SPEED;
      bey.velocity.y = (bey.velocity.y / speed) * MAX_SPEED;
    }

    // 5. Update Position
    bey.position.x += bey.velocity.x;
    bey.position.y += bey.velocity.y;

    // 6. Apply Friction
    bey.velocity.x *= FRICTION;
    bey.velocity.y *= FRICTION;

    // 7. Arena Boundaries (Wall Bounce & Ring Out)
    const distFromCenterSq = bey.position.x ** 2 + bey.position.y ** 2;
    // Assuming the arena is a circle centered at (0,0) with `arenaRadius`
    if (distFromCenterSq > arenaRadius ** 2) {
      // Ring Out!
      bey.energy = 0;
      bey.spinPower = 0;
      bey.isActive = false;
    }
  }

}
