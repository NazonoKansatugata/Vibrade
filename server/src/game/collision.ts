import type { BeybladeState, GameState, Vector2 } from './gameState.js';
import { ServerEvents } from '../socket/events.js';
import type { Broadcaster } from '../sync/broadcaster.js';

const COLLISION_RESTITUTION = 0.8; // Bounciness factor
const BASE_DAMAGE = 10;
const IMPACT_MULTIPLIER = 0.5;

export class CollisionEngine {
  
  static handleCollisions(roomId: string, beys: Record<string, BeybladeState>, broadcaster: Broadcaster) {
    const beyIds = Object.keys(beys);

    // O(N^2) checks, N is small (2-8)
    for (let i = 0; i < beyIds.length; i++) {
      for (let j = i + 1; j < beyIds.length; j++) {
        const id1 = beyIds[i];
        const id2 = beyIds[j];
        if (!id1 || !id2) continue;

        const bey1 = beys[id1];
        const bey2 = beys[id2];

        if (!bey1 || !bey2 || !bey1.isActive || !bey2.isActive) continue;

        // Check distance
        const dx = bey2.position.x - bey1.position.x;
        const dy = bey2.position.y - bey1.position.y;
        const distSq = dx * dx + dy * dy;
        const minDistance = (bey1.radius + bey2.radius);

        if (distSq < minDistance * minDistance && distSq > 0) {
          // Circle Collision detected!
          const dist = Math.sqrt(distSq);
          
          // Collision Normal
          const nx = dx / dist;
          const ny = dy / dist;

          // Relative Velocity
          const rvx = bey2.velocity.x - bey1.velocity.x;
          const rvy = bey2.velocity.y - bey1.velocity.y;

          // Velocity along normal
          const velAlongNormal = rvx * nx + rvy * ny;

          // Do not resolve if velocities are separating
          if (velAlongNormal > 0) continue;

          // Calculate impulse scalar
          // Assume masses are roughly equal initially, or tied to spinPower? 
          // For simplicity, mass = 1 
          const j = -(1 + COLLISION_RESTITUTION) * velAlongNormal;
          const impulse = j / 2; // Divide by sum of masses (1+1)

          // Apply impulse to velocities (Bounce)
          bey1.velocity.x -= impulse * nx;
          bey1.velocity.y -= impulse * ny;
          bey2.velocity.x += impulse * nx;
          bey2.velocity.y += impulse * ny;

          // Separate them so they don't stick (Position Correction)
          const percent = 0.2; // Penetration allowance
          const slop = 0.1; 
          const penetration = minDistance - dist;
          const correction = Math.max(penetration - slop, 0.0) / 2 * percent;
          
          bey1.position.x -= nx * correction;
          bey1.position.y -= ny * correction;
          bey2.position.x += nx * correction;
          bey2.position.y += ny * correction;

          // Calculate Damage based on relative impact + spin power differences
          const impactForce = Math.abs(impulse);
          
          // Higher spin power = deals more damage, takes less
          const bey1Advantage = bey1.spinPower / (bey2.spinPower || 1);
          
          const dmgTo1 = BASE_DAMAGE + (impactForce * IMPACT_MULTIPLIER) / bey1Advantage;
          const dmgTo2 = BASE_DAMAGE + (impactForce * IMPACT_MULTIPLIER) * bey1Advantage;

          bey1.energy = Math.max(0, bey1.energy - dmgTo1);
          bey2.energy = Math.max(0, bey2.energy - dmgTo2);

          if(bey1.energy <= 0){
             bey1.isActive = false;
          }
          if(bey2.energy <= 0){
             bey2.isActive = false;
          }

          // Emit collision event to the room so mobile clients can VIBRATE
          broadcaster.broadcastCollision(roomId, [bey1.id, bey2.id], impactForce);
        }
      }
    }
  }

}
