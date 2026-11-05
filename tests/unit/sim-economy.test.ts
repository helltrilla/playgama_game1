import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/core/game';
import { FakeClock } from '../../src/core/clock';
import { SeededRng } from '../../src/core/rng';
import { InMemoryStorage } from '../../src/core/storage';
import { REBIRTH_UPGRADES, UPGRADES } from '../../src/data/upgrades';
import { TABLES } from '../../src/data/tables';

describe('ECONOMY_SPEC §9: Full Progression & 3-Hour Rebirth Branch Benchmark', () => {
  it('reaches the end of the 12-tier Rebirth Talent Tree (1 level in all 33 nodes) in ~3 hours', () => {
    const clock = new FakeClock(0);
    const rng = new SeededRng(42);
    const storage = new InMemoryStorage();
    const engine = new GameEngine(undefined, storage, clock, rng);

    // Grant the 1 starter Ad Token from first-launch onboarding and buy -10% shop discount (tokenUp1)
    engine.grantAdToken(1);
    engine.buyTokenUpgrade('tokenUp1');

    let firstCoinValueSec = -1;
    let firstMinionSec = -1;
    let silverUnlockSec = -1;
    let goldUnlockSec = -1;
    let firstRebirthSec = -1;
    let branchCompleteSec = -1;
    let purchasesFirst3Min = 0;

    // Order of all 33 Rebirth Talent Tree nodes (Tier 1 -> Tier 12), buying 1 level in each
    const branchOrder = REBIRTH_UPGRADES.map((u) => u.id);
    let nextBranchIdx = 0;

    const STEP = 1.0; // 1 second per simulation tick
    const MAX_SIM_SECONDS = 5 * 3600; // 5 hours max ceiling

    for (let s = 1; s <= MAX_SIM_SECONDS; s += STEP) {
      clock.advance(STEP * 1000);
      const now = clock.now();

      // Player taps ~3 times per second on average across a 3-hour session + passive minions in step()
      for (let t = 0; t < 3; t++) {
        engine.tap(now, undefined, undefined, true);
      }
      engine.step(STEP);

      // Spend any earned Ad Tokens from achievements on tokenUp1 / tokenUp2 / tokenUp3
      if ((engine.state.tokens || 0) >= 3 && engine.tokenUpgradeLevel('tokenUp2') === 0) {
        engine.buyTokenUpgrade('tokenUp2');
      } else if ((engine.state.tokens || 0) >= 2 && engine.tokenUpgradeLevel('tokenUp3') < 3) {
        engine.buyTokenUpgrade('tokenUp3');
      } else if ((engine.state.tokens || 0) >= 1 && engine.tokenUpgradeLevel('tokenUp1') < 5) {
        engine.buyTokenUpgrade('tokenUp1');
      }

      // Check if we can unlock & switch to a better table (spend if table cost <= 60% of current gold)
      for (let tbIdx = TABLES.length - 1; tbIdx >= 1; tbIdx--) {
        const tb = TABLES[tbIdx];
        if (!engine.isTableUnlocked(tb.id)) {
          const tbCost = engine.tableUnlockCost(tb.id);
          if (engine.state.gold >= tbCost) {
            engine.unlockTable(tb.id);
            engine.setActiveTable(tb.id);
          }
        } else if (engine.state.activeTable !== tb.id) {
          engine.setActiveTable(tb.id);
          break;
        } else {
          break;
        }
      }

      // Buy affordable upgrades greedily (every 1s in first 3 minutes, every 5s afterwards)
      if (s <= 180 || s % 5 === 0) {
        let boughtSomething = true;
        let safety = 0;
        while (boughtSomething && safety++ < 30) {
          boughtSomething = false;

          // Find best affordable upgrade
          let bestUid: (typeof UPGRADES)[number]['id'] | null = null;
          let bestScore = Infinity;

          for (const def of UPGRADES) {
            if (!engine.isUpgradeUnlocked(def.id)) continue;
            const lvl = engine.upgradeLevel(def.id);
            if (lvl >= def.maxLevel) continue;
            const cost = engine.costForLevel(def.id, lvl);
            if (cost <= 0n || engine.state.gold < cost) continue;

            // Priority weights: first level of a new coin unlock or minionTier or autoTosser gets high priority
            let weight = Number(cost);
            if (def.category === 'upgrades' && def.coinTier && lvl === 0) {
              weight *= 0.15;
            } else if (def.id === 'autoTosser' || def.id === 'megaMinion') {
              weight *= 0.25;
            } else if (def.id === 'minionTier') {
              weight *= 0.2;
            } else if (def.id.endsWith('Value') && lvl < 15) {
              weight *= 0.5;
            }

            if (weight < bestScore) {
              bestScore = weight;
              bestUid = def.id;
            }
          }

          if (bestUid) {
            if (engine.buyUpgrade(bestUid, 1)) {
              boughtSomething = true;
              if (s <= 180) purchasesFirst3Min++;
              if (bestUid === 'coinValue' && firstCoinValueSec === -1) firstCoinValueSec = s;
              if (bestUid === 'autoTosser' && firstMinionSec === -1) firstMinionSec = s;
              if (bestUid === 'silverCoins' && silverUnlockSec === -1) silverUnlockSec = s;
              if (bestUid === 'goldCoins' && goldUnlockSec === -1) goldUnlockSec = s;
            }
          }
        }
      }

      // Check if we have enough pending Rebirth Points to buy the next batch of Rebirth Talent Tree nodes (1 level per node)
      if (nextBranchIdx < branchOrder.length && (s <= 180 || s % 5 === 0)) {
        const prog = engine.rebirthProgress();
        const availPool = (engine.state.rebirthPoints || 0) + prog.pendingPoints;

        // Calculate cost of buying the next 1..4 nodes in the branch (so we rebirth roughly every 2-4 nodes)
        let neededForNextNode = 0;
        let nodesCanBuy = 0;
        let tempPool = availPool;
        const allocations: Partial<Record<(typeof branchOrder)[number], number>> = {};

        for (let idx = nextBranchIdx; idx < branchOrder.length; idx++) {
          const nodeId = branchOrder[idx];
          const nodeDef = REBIRTH_UPGRADES.find((u) => u.id === nodeId)!;
          if (idx === nextBranchIdx) neededForNextNode = nodeDef.tokenCost;
          if (tempPool >= nodeDef.tokenCost) {
            tempPool -= nodeDef.tokenCost;
            allocations[nodeId] = 1;
            nodesCanBuy++;
          } else {
            break;
          }
        }

        const remainingNodes = branchOrder.length - nextBranchIdx;
        const minBatch =
          nextBranchIdx >= 24 ? Math.min(2, remainingNodes) : Math.min(3, remainingNodes);
        const shouldRebirth =
          prog.pendingPoints > 0 &&
          (nodesCanBuy >= minBatch || (nextBranchIdx === 0 && nodesCanBuy >= 2));

        if (shouldRebirth && availPool >= neededForNextNode) {
          const runGoldBefore = engine.state.runEarned;
          const multBefore = engine.totalMultiplier();
          const gainedPts = engine.performRebirth(allocations);
          if (firstRebirthSec === -1) firstRebirthSec = s;
          while (
            nextBranchIdx < branchOrder.length &&
            engine.tokenUpgradeLevel(branchOrder[nextBranchIdx]) >= 1
          ) {
            nextBranchIdx++;
          }
          console.log(
            `[Rebirth #${engine.state.rebirths} at ${(s / 60).toFixed(1)}m] +${gainedPts} pts (total ${engine.totalRebirthPoints()}) | nodes: ${nextBranchIdx}/${branchOrder.length} | runGold: ${runGoldBefore.toString()} | mult: ${multBefore.toFixed(1)}`,
          );
          if (nextBranchIdx >= branchOrder.length && branchCompleteSec === -1) {
            branchCompleteSec = s;
            break;
          }
        }
      }
    }

    console.log('[SIM BENCHMARK]', {
      firstCoinValueSec,
      firstMinionSec,
      silverUnlockMin: (silverUnlockSec / 60).toFixed(1),
      goldUnlockMin: (goldUnlockSec / 60).toFixed(1),
      firstRebirthMin: (firstRebirthSec / 60).toFixed(1),
      purchasesFirst3Min,
      nodesUnlocked: `${nextBranchIdx}/${branchOrder.length}`,
      totalRebirthPoints: engine.totalRebirthPoints(),
      branchCompleteHours:
        branchCompleteSec > 0 ? (branchCompleteSec / 3600).toFixed(2) : 'NOT FINISHED',
    });

    const branchHours = branchCompleteSec / 3600;
    expect(firstCoinValueSec).toBeGreaterThan(0);
    expect(firstCoinValueSec).toBeLessThanOrEqual(20);
    expect(firstMinionSec).toBeGreaterThan(0);
    expect(firstMinionSec).toBeLessThanOrEqual(60);
    expect(purchasesFirst3Min).toBeGreaterThanOrEqual(30);
    expect(nextBranchIdx).toBe(branchOrder.length);
    expect(branchHours).toBeGreaterThanOrEqual(2.75);
    expect(branchHours).toBeLessThanOrEqual(3.25);
  });
});
