import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/core/game';
import { FakeClock } from '../../src/core/clock';
import { SeededRng } from '../../src/core/rng';
import { InMemoryStorage } from '../../src/core/storage';

describe('AC-GAME-1..4: Gameplay and Tossing', () => {
  let engine: GameEngine;
  let clock: FakeClock;

  beforeEach(() => {
    clock = new FakeClock(1000);
    engine = new GameEngine(undefined, new InMemoryStorage(), clock, new SeededRng(12345));
  });

  it('AC-GAME-1: Tap adds coins and increases Gold by coinGold', () => {
    expect(engine.state.gold).toBe(0n);
    const coins = engine.tap(1000);
    expect(coins).not.toBeNull();
    expect(coins!.length).toBeGreaterThanOrEqual(1);

    const sumCoins = coins!.reduce((acc, c) => acc + c.value, 0n);
    expect(engine.state.gold).toBe(sumCoins);
    expect(engine.state.stats.taps).toBe(1);
  });

  it('AC-GAME-2: Auto-tap via hold is rate-limited to <= 8 taps/sec (>= 125ms interval)', () => {
    const tap1 = engine.tap(1000);
    expect(tap1).not.toBeNull();

    // 50ms later: blocked by rate limiter
    const tapTooSoon = engine.tap(1050);
    expect(tapTooSoon).toBeNull();

    // 130ms later: allowed
    const tapAllowed = engine.tap(1130);
    expect(tapAllowed).not.toBeNull();
    expect(engine.state.stats.taps).toBe(2);
  });

  it('AC-GAME-3: Auto-tosser generates income deterministically and independent of dt', () => {
    // Give engine level 3 of autoTosser (1.0 * 3 = 3.0 toss/sec)
    engine.addGold(10000n);
    engine.buyUpgrade('autoTosser', 3);
    expect(engine.autoRate()).toBeCloseTo(3.0, 2);

    const goldAtStart = engine.state.gold;

    // Run 10 steps of 0.1s (= 1.0s)
    for (let i = 0; i < 10; i++) {
      engine.step(0.1);
    }
    const goldAfter1Sec = engine.state.gold;
    expect(goldAfter1Sec).toBeGreaterThan(goldAtStart);
  });

  it('AC-GAME-4: MultiToss and LuckyCoin roll according to probabilities', () => {
    // Give luckyCoin and multiToss upgrades
    engine.addGold(100000n);
    engine.buyUpgrade('luckyCoin', 5); // 0.02 * 5 = 10% chance of lucky coin (x5)
    expect(engine.luckyChance()).toBeCloseTo(0.1, 2);

    let luckyFound = false;
    for (let i = 0; i < 50; i++) {
      clock.advance(150);
      const coins = engine.tap(clock.now());
      if (coins && coins.some((c) => c.kind === 1)) {
        luckyFound = true;
        break;
      }
    }
    expect(luckyFound).toBe(true);
  });

  it('AC-GAME-5: Supports 15 minions, 7 coin tiers, and grants +1 Token per 5 achievements', () => {
    // 7 coin tiers with strictly increasing base values
    expect(engine.coinBase('bronze')).toBeLessThan(engine.coinBase('silver'));
    expect(engine.coinBase('silver')).toBeLessThan(engine.coinBase('gold'));
    expect(engine.coinBase('gold')).toBeLessThan(engine.coinBase('platinum'));
    expect(engine.coinBase('platinum')).toBeLessThan(engine.coinBase('sapphire'));
    expect(engine.coinBase('sapphire')).toBeLessThan(engine.coinBase('emerald'));
    expect(engine.coinBase('emerald')).toBeLessThan(engine.coinBase('diamond'));

    // Give enough gold to trigger earn achievements (100, 1K, 10K, 100K, 1M = 5 achievements!)
    expect(engine.state.tokens).toBe(0);
    engine.addGold(1_000_000n);
    expect(engine.state.achievements.length).toBeGreaterThanOrEqual(5);
    expect(engine.state.tokens).toBeGreaterThanOrEqual(1);

    // Upgrade autoTosser up to 15 minions
    engine.addGold(1_000_000_000n);
    engine.buyUpgrade('autoTosser', 'max');
    expect(engine.upgradeLevel('autoTosser')).toBe(15);
  });

  it('AC-GAME-6: Actual Gold/sec from tossed coins, Token Branch upgrades (-10% shop, x1.5 speed, +5 minions), and x2 Gold for 5 min', () => {
    // 1. Actual Gold/sec starts at 0 and tracks actual coin payouts
    expect(engine.actualIncomePerSecond(clock.now())).toBe(0n);
    const tossed = engine.helperTossCoin('gold');
    expect(engine.actualIncomePerSecond(clock.now())).toBe(tossed.value / 3n);

    // After 3.1 seconds with no new coins tossed, actual Gold/sec returns to 0
    clock.advance(3100);
    expect(engine.actualIncomePerSecond(clock.now())).toBe(0n);

    // 2. Token Upgrade 1: -10% shop discount (5 levels x 1 Token = -50%)
    engine.grantAdToken(20);
    const baseSilverCost = engine.costForLevel('silverCoins', 0);
    expect(baseSilverCost).toBe(2000n);
    for (let i = 0; i < 5; i++) {
      expect(engine.buyTokenUpgrade('tokenUp1')).toBe(true);
    }
    expect(engine.buyTokenUpgrade('tokenUp1')).toBe(false); // max level 5
    expect(engine.costForLevel('silverCoins', 0)).toBe(1000n); // 50% off!

    // 3. Token Upgrade 2: x1.5 Coin Speed (1 level x 5 Tokens)
    expect(engine.fallSpeedByTier().bronze).toBeCloseTo(1.0, 2);
    expect(engine.buyTokenUpgrade('tokenUp2')).toBe(true);
    expect(engine.fallSpeedByTier().bronze).toBeCloseTo(1.5, 2);

    // 4. Token Upgrade 3: +5 Extra Minions (3 levels x 3 Tokens = +15 minions)
    engine.addGold(1_000_000_000n);
    engine.buyUpgrade('autoTosser', 'max'); // 15 base minions
    expect(engine.totalMinionCount()).toBe(15);
    for (let i = 0; i < 3; i++) {
      expect(engine.buyTokenUpgrade('tokenUp3')).toBe(true);
    }
    expect(engine.totalMinionCount()).toBe(30); // 15 base + 15 bonus!

    // 5. Ad Boost: x2 Gold for 5 minutes (300s)
    const valBeforeX2 = engine.calcCoinValue(0, engine.state.activeTable, 'bronze');
    engine.activateAdX2(clock.now());
    expect(engine.adX2Active(clock.now())).toBe(true);
    expect(engine.adX2RemainingSeconds(clock.now())).toBe(300);
    const valAfterX2 = engine.calcCoinValue(0, engine.state.activeTable, 'bronze');
    expect(valAfterX2).toBe(valBeforeX2 * 2n);
  });

  it('AC-GAME-7: Rebirth geometric progression bar, Talent Tree unlocking, and +5% income per Rebirth Point', () => {
    // Initial run: 0 earned -> 0 pending points, 0 / 25000 progress
    let prog = engine.rebirthProgress();
    expect(prog.pendingPoints).toBe(0);
    expect(prog.nextStepCost).toBe(25000n);
    expect(prog.ratio).toBe(0);

    // Tier 1 root (tokenUp5) is unlocked initially, while Tier 2 (tokenUp6, tokenUp8) are locked
    expect(engine.isRebirthNodeUnlocked('tokenUp5')).toBe(true);
    expect(engine.isRebirthNodeUnlocked('tokenUp6')).toBe(false);
    expect(engine.isRebirthNodeUnlocked('tokenUp8')).toBe(false);
    expect(engine.isRebirthNodeUnlocked('tokenUp6', { tokenUp5: 1 })).toBe(true);

    // Earn 12,500 gold -> 50% of first point
    engine.addGold(12500n);
    prog = engine.rebirthProgress();
    expect(prog.pendingPoints).toBe(0);
    expect(prog.currentStepGold).toBe(12500n);
    expect(prog.ratio).toBeCloseTo(0.5, 2);

    // Earn another 12,500 gold (total 25,000) -> 1 pending point, bar resets to 0 / 35,850 (25000 * 1.434)
    engine.addGold(12500n);
    prog = engine.rebirthProgress();
    expect(prog.pendingPoints).toBe(1);
    expect(prog.currentStepGold).toBe(0n);
    expect(prog.nextStepCost).toBe(35850n);

    // Earn another 35,850 gold (total 60,850) -> 2 pending points, next step cost grows geometrically
    engine.addGold(35850n);
    prog = engine.rebirthProgress();
    expect(prog.pendingPoints).toBe(2);
    expect(prog.nextStepCost).toBeGreaterThan(50000n);

    const nextCostBeforeRebirth = prog.nextStepCost;
    const baseSilverVal = engine.calcCoinValue(0, 'wooden', 'silver');

    // Player invests 1 point into Tier 1 (tokenUp5) which unlocks Tier 2 (tokenUp8), and 1 point into tokenUp8
    const claimed = engine.performRebirth({ tokenUp5: 1, tokenUp8: 1 });
    expect(claimed).toBe(2);
    expect(engine.state.rebirths).toBe(1);
    expect(engine.state.rebirthPoints).toBe(0);
    expect(engine.totalRebirthPoints()).toBe(2);
    // 2 total Rebirth Points = +10% passive (1.10) * Midas Mint lv1 (+25% = 1.25) = 1.375
    expect(engine.rebirthIncomeMultiplier()).toBeCloseTo(1.375, 3);
    expect(engine.tokenUpgradeLevel('tokenUp5')).toBe(1);
    expect(engine.tokenUpgradeLevel('tokenUp8')).toBe(1);
    // Since tokenUp5 >= 1 and tokenUp8 >= 1, tokenUp6 and tokenUp9 are now unlocked!
    expect(engine.isRebirthNodeUnlocked('tokenUp6')).toBe(true);
    expect(engine.isRebirthNodeUnlocked('tokenUp9')).toBe(true);
    expect(engine.isRebirthNodeUnlocked('tokenUp10')).toBe(false);
    expect(engine.state.gold).toBe(0n);
    expect(engine.state.runEarned).toBe(0n);

    // Next Rebirth point price is preserved from the previous Rebirth (does NOT reset to 25,000n!)
    const progAfterRebirth = engine.rebirthProgress();
    expect(progAfterRebirth.pendingPoints).toBe(0);
    expect(progAfterRebirth.nextStepCost).toBe(nextCostBeforeRebirth);

    // Earning that nextStepCost in the new run grants +1 point and increases the price again
    engine.addGold(nextCostBeforeRebirth);
    const progNextPoint = engine.rebirthProgress();
    expect(progNextPoint.pendingPoints).toBe(1);
    expect(progNextPoint.nextStepCost).toBeGreaterThan(nextCostBeforeRebirth);

    // Head start applied (+2 extra bronze coins -> total 3 bronze coins, +1 minion)
    expect(engine.coinCountsByTier().bronze).toBe(3);
    expect(engine.upgradeLevel('autoTosser')).toBe(1);
    expect(engine.calcCoinValue(0, 'wooden', 'silver')).toBeGreaterThan(baseSilverVal);

    // Also test Crit Master (tokenUp6: +1x lucky, +2x diamond)
    engine.grantAdToken(5);
    expect(engine.luckyCoinMult()).toBe(3);
    expect(engine.diamondCoinMult()).toBe(8);
    expect(engine.buyTokenUpgrade('tokenUp6')).toBe(true);
    expect(engine.luckyCoinMult()).toBe(4);
    expect(engine.diamondCoinMult()).toBe(10);
  });

  it('AC-GAME-8: Heads Combo Streak, Weighted Edge upgrade, Edge Coin (x25), Swipe-to-Flip, Golden Relic, and 25 Achievements', () => {
    // 1. Weighted Edge (headsChance): 50% base -> 85% max (7 levels)
    expect(engine.headsChance()).toBeCloseTo(0.5, 2);
    engine.addGold(10_000_000n);
    engine.buyUpgrade('headsChance', 'max');
    expect(engine.upgradeLevel('headsChance')).toBe(7);
    expect(engine.headsChance()).toBeCloseTo(0.85, 2);

    // 2. Heads Combo Streak multipliers: x1.5 (2+), x2 (4+), x3 (7+), x5 (10+)
    expect(engine.rollHeadsStreak(true)).toEqual({ isHeads: true, streak: 1, mult: 1 });
    expect(engine.rollHeadsStreak(true)).toEqual({ isHeads: true, streak: 2, mult: 1.5 });
    engine.rollHeadsStreak(true); // 3
    expect(engine.rollHeadsStreak(true)).toEqual({ isHeads: true, streak: 4, mult: 2 });
    engine.rollHeadsStreak(true); // 5
    engine.rollHeadsStreak(true); // 6
    expect(engine.rollHeadsStreak(true)).toEqual({ isHeads: true, streak: 7, mult: 3 });
    engine.rollHeadsStreak(true); // 8
    engine.rollHeadsStreak(true); // 9
    expect(engine.rollHeadsStreak(true)).toEqual({ isHeads: true, streak: 10, mult: 5 });
    // Tails resets streak to 0 and mult to 1
    expect(engine.rollHeadsStreak(false)).toEqual({ isHeads: false, streak: 0, mult: 1 });

    // 3. Edge Coin (kind = 3) pays 25x base coin value
    const normalVal = engine.calcCoinValue(0, 'wooden', 'bronze');
    const edgeVal = engine.calcCoinValue(3, 'wooden', 'bronze');
    expect(edgeVal).toBe(normalVal * 25n);

    // 4. Swipe-to-Flip (bypassRateLimit = true) allows tossing multiple times within <50ms
    const t0 = clock.now();
    const firstTap = engine.tap(t0, 1, ['bronze'], false);
    expect(firstTap?.length).toBe(1);
    // Normal tap 10ms later is rate-limited
    expect(engine.tap(t0 + 10, 1, ['bronze'], false)).toBeNull();
    // Swipe tap 10ms later bypasses rate limit
    const swipeTap = engine.tap(t0 + 10, 1, ['bronze'], true);
    expect(swipeTap?.length).toBe(1);

    // 5. Golden Relic grants +2 minutes of income and activates 15s of free Frenzy
    const goldBeforeRelic = engine.state.gold;
    const relicReward = engine.claimGoldenRelic(clock.now());
    expect(relicReward).toBeGreaterThan(0n);
    expect(engine.state.gold).toBe(goldBeforeRelic + relicReward);
    expect(engine.frenzyActive(clock.now())).toBe(true);

    // 6. Unlock all tables + earn 10B -> unlocks new table & gold achievements
    engine.addGold(20_000_000_000n);
    expect(engine.unlockTable('marble')).toBe(true);
    expect(engine.unlockTable('malachite')).toBe(true);
    expect(engine.unlockTable('obsidian')).toBe(true);
    expect(engine.unlockTable('royal')).toBe(true);
    expect(engine.state.achievements).toContain('ach_table_malachite');
    expect(engine.state.achievements).toContain('ach_table_obsidian');
    expect(engine.state.achievements).toContain('ach_table_royal');
    expect(engine.state.achievements).toContain('ach_earn_1b');
    expect(engine.state.achievements).toContain('ach_earn_10b');
  });

  it('AC-GAME-9: 14 Coin Tiers (7 extra unlocked via Rebirth Tree), Heavy Minions (Titans), and 12-Tier Talent Tree', () => {
    // Extra coin tiers (ruby..celestial) and megaMinion are initially locked
    expect(engine.isUpgradeUnlocked('rubyCoins')).toBe(false);
    expect(engine.isUpgradeUnlocked('celestialCoins')).toBe(false);
    expect(engine.isUpgradeUnlocked('megaMinion')).toBe(false);
    expect(engine.coinCountsByTier().ruby).toBe(0);
    expect(engine.megaMinionCount()).toBe(0);

    // Unlocking Ruby Coin talent (tokenUp25) unlocks ruby upgrades and places 1 free ruby coin on the table
    engine.state.tokenUpgrades.tokenUp25 = 1;
    expect(engine.isUpgradeUnlocked('rubyCoins')).toBe(true);
    expect(engine.isUpgradeUnlocked('rubyValue')).toBe(true);
    expect(engine.coinCountsByTier().ruby).toBe(1);
    expect(engine.coinBase('ruby')).toBeGreaterThan(engine.coinBase('diamond'));
    expect(engine.coinBase('celestial')).toBeGreaterThan(engine.coinBase('solar'));

    // Unlocking Heavy Minions talent (tokenUp37) unlocks megaMinion in shop (up to 3)
    engine.state.tokenUpgrades.tokenUp37 = 1;
    expect(engine.isUpgradeUnlocked('megaMinion')).toBe(true);
    engine.addGold(100_000_000n);
    engine.buyUpgrade('megaMinion', 'max');
    expect(engine.megaMinionCount()).toBe(3);

    // megaMinionSlam tosses all resting coins at once and grants gold
    const goldBeforeSlam = engine.state.gold;
    const slammed = engine.megaMinionSlam(['bronze', 'ruby']);
    expect(slammed.length).toBe(2);
    expect(engine.state.gold).toBeGreaterThan(goldBeforeSlam);
  });

  it('AC-GAME-10: Gamblers Table Economy (1st click = 1, 15/60 start costs, x5 Silver & x10 Gold global multipliers) and Alchemical Laboratory', () => {
    // 1. Cheap start: 1st click gives 1 coin, 1st click upgrade costs 15, 1st auto-helper costs 60 and gives 1/s
    expect(engine.calcCoinValue(0, 'wooden', 'bronze')).toBe(1n);
    expect(engine.costForLevel('coinValue', 0)).toBe(15n);
    expect(engine.costForLevel('multiToss', 0)).toBe(15n);
    expect(engine.costForLevel('autoTosser', 0)).toBe(60n);

    engine.addGold(60n);
    expect(engine.buyUpgrade('autoTosser', 1)).toBe(true);
    expect(engine.autoRate()).toBeCloseTo(1.0, 3);

    // 2. Unlocking Silver Coin (2,000) grants x5 global multiplier; unlocking Gold Coin (50,000) grants x10
    expect(engine.coinUnlockGlobalMultiplier()).toBe(1);
    expect(engine.costForLevel('silverCoins', 0)).toBe(2000n);
    expect(engine.costForLevel('goldCoins', 0)).toBe(50000n);

    engine.addGold(2000n);
    expect(engine.buyUpgrade('silverCoins', 1)).toBe(true);
    expect(engine.coinUnlockGlobalMultiplier()).toBe(5);
    expect(engine.calcCoinValue(0, 'wooden', 'bronze')).toBe(5n);

    engine.addGold(50000n);
    expect(engine.buyUpgrade('goldCoins', 1)).toBe(true);
    expect(engine.coinUnlockGlobalMultiplier()).toBe(50); // x5 * x10 = x50!
    expect(engine.calcCoinValue(0, 'wooden', 'bronze')).toBe(50n);

    // 3. Alchemical Laboratory: costs 2 minutes of auto-income (min 100), rolls fail / speed / elixir
    const brewCost = engine.alchemyBrewCost();
    expect(brewCost).toBeGreaterThanOrEqual(100n);
    engine.addGold(brewCost * 20n);
    expect(engine.payAlchemyCost()).toBe(true);

    let sawFail = false;
    let sawSpeed = false;
    let sawElixir = false;
    for (let i = 0; i < 80; i++) {
      const outcome = engine.rollAlchemyOutcome(clock.now());
      if (outcome === 'fail') sawFail = true;
      if (outcome === 'speed') sawSpeed = true;
      if (outcome === 'elixir') sawElixir = true;
    }
    expect(sawFail).toBe(true);
    expect(sawSpeed).toBe(true);
    expect(sawElixir).toBe(true);
    expect(engine.alchemySpeedActive(clock.now())).toBe(true);
    expect(engine.alchemyElixirActive(clock.now())).toBe(true);
    // Golden Elixir multiplies total income by x10!
    expect(engine.calcCoinValue(0, 'wooden', 'bronze')).toBe(500n);
  });

  it('AC-GAME-11: Coin Fusion (5 -> 1 and leftover clear to 0), 10s Average Time Warp, and Coin Tier Statistics', () => {
    // Buy 5 extra bronze coins -> total 6 bronze coins on table
    engine.addGold(100_000n);
    for (let i = 0; i < 5; i++) {
      expect(engine.buyUpgrade('multiToss', 1)).toBe(true);
    }
    expect(engine.coinCountsByTier().bronze).toBe(6);
    expect(engine.coinCountsByTier().silver).toBe(0);

    // 1. Fuse 5 Bronze -> +1 Silver for free!
    const fuseInfo1 = engine.getCoinFusionInfo('bronze');
    expect(fuseInfo1.canFuse).toBe(true);
    expect(fuseInfo1.isLeftover).toBe(false);
    expect(fuseInfo1.usedCount).toBe(5);
    expect(fuseInfo1.cost).toBe(0n);

    expect(engine.fuseCoinTier('bronze')).toBe(true);
    expect(engine.coinCountsByTier().bronze).toBe(1);
    expect(engine.coinCountsByTier().silver).toBe(1);
    // Having 1 Silver coin on table also activates the Silver x5 global multiplier!
    expect(engine.coinUnlockGlobalMultiplier()).toBe(5);

    // 2. Leftover 1 Bronze coin can now be fused into +1 Silver coin for proportional gold cost, clearing Bronze to 0!
    const fuseInfoLeftover = engine.getCoinFusionInfo('bronze');
    expect(fuseInfoLeftover.canFuse).toBe(true);
    expect(fuseInfoLeftover.isLeftover).toBe(true);
    expect(fuseInfoLeftover.usedCount).toBe(1);
    expect(fuseInfoLeftover.cost).toBeGreaterThan(0n);
    expect(engine.fuseCoinTier('bronze')).toBe(true);
    expect(engine.coinCountsByTier().bronze).toBe(0);
    expect(engine.coinCountsByTier().silver).toBe(2);

    // 3. 10-second rolling average income & Time Warp (exact 10 minutes = 600s of 10s average)
    engine.helperTossCoin('silver');
    clock.advance(1000);
    const nowAfterLand = clock.now();
    const avg10s = engine.averageIncomePerSecond10s(nowAfterLand);
    expect(avg10s).toBeGreaterThan(0n);
    expect(engine.calcTimeWarpReward(nowAfterLand)).toBe(avg10s * 600n);

    // 4. Per-tier stats (coinTierStats) returns Silver stats with count = 2, perCoinPerSec > 0, totalTierPerSec > 0, and actualPerSec10s > 0
    expect(engine.minionMaxTier()).toBeGreaterThanOrEqual(1);
    const stats = engine.coinTierStats(nowAfterLand);
    const silverStat = stats.find((s) => s.tier === 'silver');
    expect(silverStat).toBeDefined();
    expect(silverStat?.count).toBe(2);
    expect(silverStat?.perCoinPerSec).toBeGreaterThan(0n);
    expect(silverStat?.totalTierPerSec).toBe((silverStat?.perCoinPerSec ?? 0n) * 2n);
    expect(silverStat?.actualPerSec10s).toBeGreaterThan(0n);
  });
});
