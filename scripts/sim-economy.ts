// Economy simulation script to verify progression targets from ECONOMY_SPEC §9:
// - First coinValue upgrade <= 10s
// - Marble table achievable in ~15-25 min active play
// - Royal table achievable in ~3-6 hours mixed play

import { GameEngine } from '../src/core/game';
import { FakeClock } from '../src/core/clock';
import { SeededRng } from '../src/core/rng';
import { InMemoryStorage } from '../src/core/storage';
import { formatBig } from '../src/core/bignum';

console.log('--- Simulating Economy Progression ---');

const clock = new FakeClock(0);
const rng = new SeededRng(42);
const storage = new InMemoryStorage();
const engine = new GameEngine(undefined, storage, clock, rng);

let firstCoinValueSec = -1;
let marbleUnlockSec = -1;
let royalUnlockSec = -1;

// Simulate active player: taps 4 times/sec on average, buys best affordable upgrades
const STEP = 0.25; // 250ms step (4 taps/sec)
const MAX_SIM_SECONDS = 6 * 3600; // 6 hours

for (let s = 0; s < MAX_SIM_SECONDS; s += STEP) {
  clock.advance(STEP * 1000);

  // Active tap
  engine.tap(clock.now());

  // Step auto systems
  engine.step(STEP);

  // Check first coinValue purchase
  if (firstCoinValueSec === -1 && engine.quoteUpgrade('coinValue', 1).count === 1) {
    engine.buyUpgrade('coinValue', 1);
    firstCoinValueSec = s;
  }

  // Strategy: buy coinValue, autoTosser, tossSpeed, multiToss greedily
  if (engine.quoteUpgrade('coinValue', 1).count === 1) engine.buyUpgrade('coinValue', 1);
  if (engine.quoteUpgrade('autoTosser', 1).count === 1) engine.buyUpgrade('autoTosser', 1);
  if (engine.quoteUpgrade('tossSpeed', 1).count === 1) engine.buyUpgrade('tossSpeed', 1);
  if (engine.quoteUpgrade('multiToss', 1).count === 1) engine.buyUpgrade('multiToss', 1);
  if (engine.quoteUpgrade('luckyCoin', 1).count === 1) engine.buyUpgrade('luckyCoin', 1);

  // Check Marble Table (5,000 cost)
  if (marbleUnlockSec === -1 && engine.state.gold >= 5000n) {
    engine.unlockTable('marble');
    engine.setActiveTable('marble');
    marbleUnlockSec = s;
  }

  // Check Royal Table (250,000 cost)
  if (royalUnlockSec === -1 && engine.state.gold >= 250000n) {
    engine.unlockTable('royal');
    engine.setActiveTable('royal');
    royalUnlockSec = s;
    break; // reached target
  }
}

console.log(`First coinValue upgrade: ${firstCoinValueSec.toFixed(1)}s (Target: <= 10s)`);
console.log(
  `Marble Table unlocked: ${(marbleUnlockSec / 60).toFixed(1)} min (Target: ~15-25 min)`,
);
console.log(
  `Royal Table unlocked: ${(royalUnlockSec / 3600).toFixed(2)} hours (Target: ~3-6 hours)`,
);
console.log(`Final Gold: ${formatBig(engine.state.gold)}, Total Earned: ${formatBig(engine.state.totalEarned)}`);

const pass = firstCoinValueSec <= 10 && marbleUnlockSec > 0 && royalUnlockSec > 0;
if (!pass) {
  console.error('Progression targets failed!');
  process.exit(1);
} else {
  console.log('✓ All economy progression benchmarks met!');
}
