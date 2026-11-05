import * as THREE from 'three';
import { formatBig } from '../core/bignum';
import { GameEngine, type CoinKind, type BuyMode, type AlchemyOutcome } from '../core/game';
import { SystemClock } from '../core/clock';
import { MathRng } from '../core/rng';
import { deserializeState, SAVE_KEYS, type GameState } from '../core/save';
import { TABLES, TABLE_W, TABLE_D, TABLE_SPACING } from '../data/tables';
import {
  ALCHEMY_SPEED_CLICKS_PER_SEC,
  type UpgradeId,
  type AdBoostId,
  type CoinTier,
  type TokenUpgradeId,
} from '../data/upgrades';
import { ACHIEVEMENTS } from '../data/achievements';
import { AudioController, audio } from '../audio/audio';
import { GameScene } from '../scene/scene';
import { setLang, t, type Lang } from '../i18n';
import {
  createHud,
  createPanel,
  createFloatingTextManager,
  showWelcomeBackModal,
  showSettingsModal,
  showTokenBranchModal,
  showRebirthModal,
  showAchievementsModal,
  startOnboarding,
  showToast,
  type HudComponent,
  type PanelComponent,
  type FloatingTextManager,
} from '../ui';
import type { Platform } from '../platform/platform';
import { setupDebug } from '../debug/debug';

export class App {
  private engine!: GameEngine;
  private scene!: GameScene;
  private audio: AudioController = audio;
  private hud!: HudComponent;
  private panel!: PanelComponent;
  private floatingText!: FloatingTextManager;

  private holdIntervalId: number | null = null;
  private hasTapped = false;
  private isAdPlaying = false;
  private gameReadySent = false;
  private buyMode: 'x1' | 'x10' | 'max' = 'x1';
  private viewedTableIndex = 0;
  private saveTimer = 0;
  private alchemySpeedAccum = 0;
  private uiDirty = false;
  private lastUiUpdateAt = 0;

  constructor(
    private readonly platform: Platform,
    private readonly uiRoot: HTMLElement,
    private readonly canvasContainer: HTMLElement,
    private readonly loadingScreen: HTMLElement | null,
  ) {}

  async start(): Promise<void> {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) loadingBar.style.width = '15%';

    // 1. Initialize Platform
    try {
      await this.platform.init();
    } catch (err) {
      console.warn('[App] Platform initialization fallback:', err);
    }
    if (loadingBar) loadingBar.style.width = '35%';

    // 2. Set Language from Platform or fallback
    const platLang = this.platform.language;
    const initialLang: Lang = platLang === 'ru' ? 'ru' : 'en';
    setLang(initialLang);

    // 3. Load Storage
    let savedState: GameState | null = null;
    try {
      const data = await this.platform.storage.get([...SAVE_KEYS]);
      if (data && Object.keys(data).length > 0) {
        savedState = deserializeState(data);
      }
    } catch (err) {
      console.warn('[App] Failed to load saved data, starting fresh:', err);
    }
    if (loadingBar) loadingBar.style.width = '55%';

    // 4. Create Core Engine, Clock, and RNG
    const clock = new SystemClock();
    const rng = new MathRng();
    this.engine = new GameEngine(savedState || undefined, this.platform.storage, clock, rng);
    this.engine.sceneDrivenHelpers = true;
    this.engine.state.stats.sessions++;
    this.engine.save.mark('stats');

    this.viewedTableIndex = TABLES.findIndex((t) => t.id === this.engine.state.activeTable);
    if (this.viewedTableIndex < 0) this.viewedTableIndex = 0;

    // Apply settings if present
    const lang = this.engine.state.settings.lang;
    if (lang === 'ru' || lang === 'en') {
      setLang(lang);
    }

    // 5. Setup Audio & Preload Progress
    this.audio.set('platformMuted', !this.platform.isAudioEnabled);
    this.audio.set('manualMute', this.engine.state.settings.muted);
    this.audio
      .preload((done, total) => {
        if (loadingBar && total > 0) {
          const pct = 55 + Math.round((done / total) * 35);
          loadingBar.style.width = `${pct}%`;
        }
      })
      .catch(() => {});

    // 6. Setup 3D Scene
    this.scene = new GameScene(this.canvasContainer);
    this.scene.switchTable(this.engine.state.activeTable);
    if (loadingBar) loadingBar.style.width = '100%';

    // 7. Setup Floating Text Manager
    this.floatingText = createFloatingTextManager(this.uiRoot, this.scene.camera);

    // 8. Setup UI (HUD and Panel)
    this.setupUI();

    // 9. Wire Events
    this.wireEvents();

    // 10. Wire Input (Taps, Parallax, Hold-toss, Audio unlock)
    this.wireInput();

    // 11. Check Offline Earnings (captures offline state before updating lastSeen)
    this.checkOfflineEarnings();

    // 12. Setup Debug API
    setupDebug(this.engine, this.scene, this.audio, this.platform, async () => {
      await this.resetProgress();
    });

    // 13. Connect scene tick
    this.scene.onTick = (dt: number) => {
      this.onTick(dt);
    };

    // 14. First playable frame & game_ready
    this.onFirstPlayableFrame();
    this.platform.analytics('session_start', { session: this.engine.state.stats.sessions });
  }

  private setupUI(): void {
    const isMuted = !this.audio.audible;

    this.hud = createHud(
      this.uiRoot,
      {
        onPrevTable: () => {
          this.audio.sfx('click');
          this.navigateTable(-1);
        },
        onNextTable: () => {
          this.audio.sfx('click');
          this.navigateTable(1);
        },
        onToggleSound: () => this.toggleSound(),
        onOpenSettings: () => {
          this.audio.sfx('click');
          this.openSettings();
        },
        onOpenTokenBranch: () => {
          this.audio.sfx('click');
          this.openTokenBranch();
        },
        onOpenRebirth: () => {
          this.audio.sfx('click');
          this.openRebirth();
        },
        onOpenAchievements: () => {
          this.audio.sfx('click');
          this.openAchievements();
        },
        onUnlockTable: (tableId) => this.unlockTable(tableId),
      },
      isMuted,
    );

    this.panel = createPanel(this.uiRoot, {
      onBuyUpgrade: (id: UpgradeId) => {
        const mode: BuyMode = this.buyMode === 'x1' ? 1 : this.buyMode === 'x10' ? 10 : 'max';
        this.engine.buyUpgrade(id, mode);
      },
      onSetBuyMode: (mode) => {
        this.audio.sfx('click');
        this.buyMode = mode;
        this.updateUI();
      },
      onWatchAdBoost: (id: AdBoostId) => {
        this.audio.sfx('click');
        void this.watchAdBoost(id);
      },
      onActivateFrenzy: () => {
        this.audio.sfx('click');
        if ((this.engine.state.ad.frenzy ?? 0) === 0) {
          void this.watchAdBoost('frenzy');
        } else {
          this.engine.activateFrenzy();
        }
      },
      onStartAlchemyBrew: () => {
        const ok = this.engine.payAlchemyCost();
        if (ok) {
          this.audio.sfx('buy');
          this.updateUI();
        } else {
          this.audio.sfx('error');
        }
        return ok;
      },
      onFinishAlchemyBrew: () => {
        const outcome = this.engine.rollAlchemyOutcome();
        if (outcome === 'elixir') {
          this.audio.sfx('unlock');
          this.audio.sfx('big');
        } else if (outcome === 'speed') {
          this.audio.sfx('big');
        } else {
          this.audio.sfx('error');
        }
        this.showAlchemyFloatingBanner(outcome);
        this.updateUI();
        void this.engine.save.flush();
        this.platform.analytics('alchemy_brew', { outcome });
        return outcome;
      },
      onFuseCoinTier: (tier) => {
        const nextTier = this.engine.nextCoinTier(tier);
        const ok = this.engine.fuseCoinTier(tier);
        if (ok && nextTier) {
          this.audio.sfx('unlock');
          showToast(t('fuse.toast', { next: t(`tier.${nextTier}` as 'tier.silver') }), 'success');
          this.updateUI();
          void this.engine.save.flush();
          this.platform.analytics('coin_fuse', { from: tier, to: nextTier });
        } else {
          this.audio.sfx('error');
        }
      },
      onCollapseChange: (collapsed) => {
        this.scene.setPortraitDrawerCollapsed(collapsed);
        this.hud.setDrawerCollapsed(collapsed);
      },
    });

    this.updateUI();
  }

  private wireEvents(): void {
    // 3D Helper physically reached a coin on the table and tosses it
    this.scene.onHelperTossCoin = (coinIdx: number) => {
      const st = this.scene.coinSystem.getCoinState(coinIdx);
      const tier: CoinTier = st?.tier ?? 'bronze';
      const c = this.engine.helperTossCoin(tier);
      this.scene.tossCoinByIndex(coinIdx, c.kind);
      this.audio.coin(c.kind);
    };

    // 3D Heavy Minion (Titan) slams the table every 5s and tosses all resting coins at once
    this.scene.onMegaMinionSlam = () => {
      const restingIndices = this.scene.coinSystem.getAllRestingCoinIndices();
      if (restingIndices.length === 0) return;
      const tiers: CoinTier[] = restingIndices.map(
        (idx) => this.scene.coinSystem.getCoinState(idx)?.tier ?? 'bronze',
      );
      const coins = this.engine.megaMinionSlam(tiers);
      for (let i = 0; i < coins.length; i++) {
        const coinIdx = restingIndices[i];
        if (coinIdx !== undefined && coinIdx >= 0) {
          this.scene.tossCoinByIndex(coinIdx, coins[i].kind);
        }
      }
      if (coins.length > 0) {
        this.audio.sfx('big');
      }
    };

    // Core Engine Events (fallback if sceneDrivenHelpers is disabled)
    this.engine.events.on('coin_tossed', ({ coin, source }) => {
      if (source === 'auto' && !this.engine.sceneDrivenHelpers) {
        const activeTable = this.engine.activeTable();
        const tableIdx = TABLES.findIndex((t) => t.id === activeTable.id);
        const centerX = tableIdx >= 0 ? tableIdx * TABLE_SPACING : 0;

        const x = centerX + (Math.random() - 0.5) * (TABLE_W * 0.6);
        const z = (Math.random() - 0.5) * (TABLE_D * 0.6);
        this.scene.spawnCoin(x, z, coin.kind);
        this.audio.coin(coin.kind);
      }
    });

    this.engine.events.on('gold_added', () => {
      const nowPerf = performance.now();
      if (nowPerf - this.lastUiUpdateAt >= 90) {
        this.updateUI();
      } else {
        this.uiDirty = true;
      }
    });

    this.engine.events.on('upgrade_purchased', ({ upgradeId, newLevel }) => {
      this.audio.sfx('buy');
      this.updateUI();
      void this.engine.save.flush();
      this.platform.analytics('upgrade_buy', { id: upgradeId, level: newLevel });
    });

    this.engine.events.on('table_unlocked', ({ tableId }) => {
      this.audio.sfx('unlock');
      showToast(t('table.unlocked'), 'success');
      this.updateUI();
      void this.engine.save.flush();
      this.platform.analytics('table_unlock', { table: tableId });
      this.platform.showInterstitial().catch(() => {});
    });

    this.engine.events.on('table_switched', ({ tableId }) => {
      const idx = TABLES.findIndex((tb) => tb.id === tableId);
      if (idx >= 0) this.viewedTableIndex = idx;
      this.scene.switchTable(tableId);
      this.updateUI();
      void this.engine.save.flush();
      this.platform.showInterstitial().catch(() => {});
    });

    this.engine.events.on('ad_boost_granted', ({ boostId, newLevel }) => {
      this.audio.sfx('buy');
      showToast(t('ad.rewardOk'), 'success');
      this.updateUI();
      void this.engine.save.flush();
      this.platform.analytics('rewarded_complete', { boost: boostId, level: newLevel });
    });

    this.engine.events.on('frenzy_activated', () => {
      this.audio.sfx('big');
      this.updateUI();
      void this.engine.save.flush();
    });

    this.engine.events.on('achievement_unlocked', ({ achievementId, tokensAwarded }) => {
      const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
      if (def) {
        this.audio.sfx('unlock');
        showToast(
          t('ach.unlockedToast', { name: t(def.nameKey as 'ach.bronze5.name') }),
          'success',
        );
      }
      if (tokensAwarded > 0) {
        this.audio.sfx('big');
        showToast(t('ach.tokenBonusToast'), 'success');
      }
      this.updateUI();
      void this.engine.save.flush();
    });

    this.scene.onRelicSpawned = () => {
      this.audio.sfx('unlock');
    };

    // Scene Coin Landed Hook
    this.scene.onCoinLanded = (x: number, y: number, z: number, kind: CoinKind, tier: CoinTier) => {
      const combo = this.engine.rollHeadsStreak(kind === 3 ? true : undefined);
      this.hud.updateCombo(combo.streak, combo.mult);

      const coinVal = this.engine.calcCoinValue(kind, this.engine.state.activeTable, tier);
      const edgeMult = this.engine.edgeCoinMult();
      this.floatingText.spawn(
        new THREE.Vector3(x, y, z),
        coinVal,
        kind === 3 ? 'edge' : kind === 2 ? 'diamond' : kind === 1 ? 'lucky' : 'normal',
        edgeMult,
      );
      if (kind === 3) {
        this.audio.sfx('big');
        showToast(t('edge.toast', { m: String(edgeMult) }), 'success', 900);
      } else if (kind === 2) {
        this.audio.sfx('big');
      }
    };

    // Platform Pause & Audio
    this.platform.onPause((paused) => {
      this.audio.set('paused', paused);
      this.scene.setPaused(paused);
      if (paused) {
        this.engine.save.flush().catch(() => {});
      }
    });

    this.platform.onAudioChange((enabled) => {
      this.audio.set('platformMuted', !enabled);
      this.hud.updateSoundState(!this.audio.audible);
    });

    // Window Visibility & Unload Flush
    window.addEventListener('beforeunload', () => {
      if (!this.hasTapped) {
        this.platform.analytics('early_exit');
      }
      this.engine.save.flush().catch(() => {});
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.engine.save.flush().catch(() => {});
      }
    });
  }

  private wireInput(): void {
    const canvas = this.canvasContainer;
    let lastShockwaveTime = 0;

    // Unlock WebAudio context on any first pointer interaction
    window.addEventListener(
      'pointerdown',
      () => {
        this.audio.unlock();
      },
      { passive: true },
    );

    const performTap = (clientX: number, clientY: number, isSwipe = false): boolean => {
      this.audio.unlock();
      const hit = this.scene.raycastFelt(clientX, clientY);
      if (!hit) return false;

      if (!this.hasTapped) {
        this.hasTapped = true;
        this.hud.hideHint();
        this.platform.analytics('first_tap');
      }

      const nowPerf = performance.now();
      if (!isSwipe || nowPerf - lastShockwaveTime >= 55) {
        lastShockwaveTime = nowPerf;
        this.scene.spawnShockwave(hit.x, hit.z);
      }

      // Check if user tapped or swiped over a hopping Golden Relic
      const relicHit = this.scene.tryCollectRelicAt(hit.x, hit.z);
      if (relicHit) {
        const reward = this.engine.claimGoldenRelic();
        this.floatingText.spawn(
          new THREE.Vector3(relicHit.x, relicHit.y, relicHit.z),
          reward,
          'diamond',
        );
        this.audio.sfx('unlock');
        this.audio.sfx('big');
        showToast(t('relic.toast', { gold: formatBig(reward) }), 'success');
        this.updateUI();
        return true;
      }

      // Check how many coins are currently resting on the table ready to be tossed
      const restingCount = this.scene.coinSystem.countRestingCoins();
      if (restingCount <= 0) return false;

      const magnetBonus = this.engine.magnetExtra();
      const strikeRadius = (isSwipe ? 1.55 : 2.65) + 0.35 * magnetBonus;
      const desiredCount = Math.min(1 + magnetBonus, restingCount);
      const selectedIndices: number[] = [];
      const exclude = new Set<number>();
      for (let i = 0; i < desiredCount; i++) {
        const idx = this.scene.coinSystem.findRestingCoinNear(
          hit.x,
          hit.z,
          exclude,
          undefined,
          strikeRadius,
        );
        if (idx >= 0) {
          selectedIndices.push(idx);
          exclude.add(idx);
        }
      }
      if (selectedIndices.length === 0) return false;

      const tiers: CoinTier[] = selectedIndices.map(
        (idx) => this.scene.coinSystem.getCoinState(idx)?.tier ?? 'bronze',
      );
      const coins = this.engine.tap(undefined, selectedIndices.length, tiers, isSwipe);
      if (coins && coins.length > 0) {
        for (let i = 0; i < coins.length; i++) {
          const coinIdx = selectedIndices[i];
          if (coinIdx !== undefined && coinIdx >= 0) {
            this.scene.tossCoinByIndex(coinIdx, coins[i].kind);
          }
        }
        this.audio.coin(coins[0].kind);
        return true;
      }
      return false;
    };

    let activePointerId: number | null = null;
    let lastClientX = 0;
    let lastClientY = 0;
    let lastSwipeX = 0;
    let lastSwipeY = 0;
    let lastSwipeTime = 0;

    canvas.addEventListener('pointerdown', (e) => {
      activePointerId = e.pointerId;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      lastSwipeX = e.clientX;
      lastSwipeY = e.clientY;
      lastSwipeTime = performance.now();

      performTap(e.clientX, e.clientY, false);
      this.stopHoldToss();
      this.holdIntervalId = window.setInterval(() => {
        performTap(lastClientX, lastClientY, false);
      }, 125);
    });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerId === activePointerId) {
        lastClientX = e.clientX;
        lastClientY = e.clientY;

        const dx = e.clientX - lastSwipeX;
        const dy = e.clientY - lastSwipeY;
        const nowPerf = performance.now();
        if (dx * dx + dy * dy >= 144 && nowPerf - lastSwipeTime >= 32) {
          lastSwipeX = e.clientX;
          lastSwipeY = e.clientY;
          lastSwipeTime = nowPerf;
          performTap(e.clientX, e.clientY, true);
        }
      }
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;
      this.scene.setPointerParallax(normX, normY);
    });

    const stopHold = (e: PointerEvent) => {
      if (e.pointerId === activePointerId) {
        activePointerId = null;
        this.stopHoldToss();
      }
    };

    window.addEventListener('pointerup', stopHold);
    window.addEventListener('pointercancel', stopHold);
  }

  private stopHoldToss(): void {
    if (this.holdIntervalId !== null) {
      clearInterval(this.holdIntervalId);
      this.holdIntervalId = null;
    }
  }

  private onTick(dt: number): void {
    if (this.isAdPlaying) return;

    this.engine.step(dt);

    // Alchemy Speed Potion: +10 auto-clicks per second for 30s
    if (this.engine.alchemySpeedActive()) {
      this.alchemySpeedAccum += dt * ALCHEMY_SPEED_CLICKS_PER_SEC;
      const clicks = Math.min(5, Math.floor(this.alchemySpeedAccum));
      if (clicks > 0) {
        this.alchemySpeedAccum -= clicks;
        const restingIndices = this.scene.coinSystem.getAllRestingCoinIndices();
        for (let c = 0; c < clicks; c++) {
          const pickedIdx =
            restingIndices.length > 0
              ? restingIndices[Math.floor(Math.random() * restingIndices.length)]
              : -1;
          const tier: CoinTier =
            pickedIdx !== undefined && pickedIdx >= 0
              ? (this.scene.coinSystem.getCoinState(pickedIdx)?.tier ?? 'bronze')
              : 'bronze';
          const tossed = this.engine.tap(undefined, 1, [tier], true);
          if (tossed && tossed.length > 0) {
            if (pickedIdx !== undefined && pickedIdx >= 0) {
              this.scene.tossCoinByIndex(pickedIdx, tossed[0].kind);
            } else {
              const activeTable = this.engine.activeTable();
              const tableIdx = TABLES.findIndex((tb) => tb.id === activeTable.id);
              const centerX = tableIdx >= 0 ? tableIdx * TABLE_SPACING : 0;
              this.floatingText.spawn(
                new THREE.Vector3(
                  centerX + (Math.random() - 0.5) * 2.2,
                  0.9,
                  (Math.random() - 0.5) * 1.4,
                ),
                tossed[0].value,
                tossed[0].kind === 2 ? 'diamond' : tossed[0].kind === 1 ? 'lucky' : 'normal',
              );
            }
            this.audio.coin(tossed[0].kind);
          }
        }
      }
    } else {
      this.alchemySpeedAccum = 0;
    }

    this.floatingText.update();

    const nowPerf = performance.now();
    if (
      (this.uiDirty && nowPerf - this.lastUiUpdateAt >= 90) ||
      nowPerf - this.lastUiUpdateAt >= 120
    ) {
      this.updateUI();
    }

    // Debounced periodic save every 5 seconds (AC-SAVE-3)
    this.saveTimer += dt;
    if (this.saveTimer >= 5.0) {
      this.saveTimer = 0;
      void this.engine.save.flush();
    }
  }

  private showAlchemyFloatingBanner(outcome: AlchemyOutcome): void {
    const existing = this.uiRoot.querySelector('.alchemy-floating-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = `alchemy-floating-banner ${outcome}`;

    const icon = outcome === 'elixir' ? '✨' : outcome === 'speed' ? '⚡' : '💨';
    const title =
      outcome === 'elixir'
        ? t('alchemy.resElixirTitle')
        : outcome === 'speed'
          ? t('alchemy.resSpeedTitle')
          : t('alchemy.resFailTitle');
    const desc =
      outcome === 'elixir'
        ? t('alchemy.resElixirDesc')
        : outcome === 'speed'
          ? t('alchemy.resSpeedDesc')
          : t('alchemy.resFailDesc');

    const titleEl = document.createElement('div');
    titleEl.className = 'alchemy-floating-title';
    titleEl.textContent = `${icon} ${title}`;

    const descEl = document.createElement('div');
    descEl.className = 'alchemy-floating-desc';
    descEl.textContent = desc;

    banner.appendChild(titleEl);
    banner.appendChild(descEl);
    this.uiRoot.appendChild(banner);

    setTimeout(() => {
      banner.classList.add('fade-out');
      setTimeout(() => banner.remove(), 350);
    }, 3200);
  }

  private updateUI(): void {
    this.lastUiUpdateAt = performance.now();
    this.uiDirty = false;
    const state = this.engine.state;
    const nowMs = this.engine.clock.now();
    const nowSec = nowMs / 1000;

    // Sync persistent coins & 3D helpers on the table
    if (this.scene) {
      const counts = this.engine.coinCountsByTier();
      const fallSpeeds = this.engine.fallSpeedByTier();
      const helperLvl = this.engine.totalMinionCount();
      const speedMult = this.engine.minionSpeedMultiplier();
      const maxMinionTier = this.engine.minionMaxTier();
      const megaMinions = this.engine.megaMinionCount();
      this.scene.syncTableState(
        counts,
        fallSpeeds,
        helperLvl,
        speedMult,
        maxMinionTier,
        megaMinions,
      );
    }

    // Update HUD — Gold/sec calculated directly from coins that paid out gold
    const incomePerSec = this.engine.actualIncomePerSecond(nowMs);
    const achDone = (state.achievements || []).length;
    this.hud.updateGold(state.gold, incomePerSec, state.tokens || 0, achDone);
    this.hud.updateRebirth(
      this.engine.totalRebirthPoints(),
      this.engine.rebirthProgress(),
      this.engine.rebirthPointPassiveBonus(),
    );

    const viewedTable = TABLES[this.viewedTableIndex] || this.engine.activeTable();
    const isUnlocked = this.engine.isTableUnlocked(viewedTable.id);
    const unlockCost = this.engine.tableUnlockCost(viewedTable.id);
    const canUnlock = state.gold >= unlockCost;
    const hasPrev = this.viewedTableIndex > 0;
    const hasNext = this.viewedTableIndex < TABLES.length - 1;

    this.hud.updateTable(viewedTable, isUnlocked, canUnlock, hasPrev, hasNext, unlockCost);

    const frenzyRemainingSec = Math.max(0, (state.frenzyUntil - nowMs) / 1000);
    this.hud.updateFrenzy(frenzyRemainingSec);
    this.hud.updateCombo(this.engine.headsStreak, this.engine.headsComboMultiplier());

    // Update Panel
    this.panel.update(state, this.engine, this.platform.isRewardedSupported, nowSec);
  }

  private navigateTable(direction: -1 | 1): void {
    const targetIdx = this.viewedTableIndex + direction;

    if (targetIdx >= 0 && targetIdx < TABLES.length) {
      this.viewedTableIndex = targetIdx;
      const targetTable = TABLES[targetIdx];

      if (this.engine.isTableUnlocked(targetTable.id)) {
        this.engine.setActiveTable(targetTable.id);
      }
      this.scene.switchTable(targetTable.id);
      this.updateUI();
    }
  }

  private unlockTable(tableId: string): void {
    const success = this.engine.unlockTable(tableId);
    if (!success) {
      this.audio.sfx('error');
      showToast(t('table.notEnough'), 'error');
    } else {
      this.engine.setActiveTable(tableId);
      this.scene.switchTable(tableId);
      this.updateUI();
    }
  }

  private toggleSound(): boolean {
    this.audio.unlock();
    const newMuted = this.audio.audible;
    this.audio.set('manualMute', newMuted);
    this.engine.state.settings.muted = newMuted;
    this.engine.save.mark('settings');
    void this.engine.save.flush();
    this.hud.updateSoundState(!this.audio.audible);
    return newMuted;
  }

  private openSettings(): void {
    showSettingsModal({
      container: this.uiRoot,
      isMuted: !this.audio.audible,
      onToggleSound: () => this.toggleSound(),
      onChangeLanguage: (newLang) => {
        this.audio.sfx('click');
        setLang(newLang);
        this.engine.state.settings.lang = newLang;
        this.engine.save.mark('settings');
        void this.engine.save.flush();
        this.updateUI();
      },
      onResetProgress: async () => {
        await this.resetProgress();
      },
      onClose: () => {
        this.audio.sfx('click');
      },
    });
  }

  private openTokenBranch(): void {
    showTokenBranchModal({
      container: this.uiRoot,
      engine: this.engine,
      isRewardedSupported: this.platform.isRewardedSupported,
      onWatchAdForToken: async () => {
        return await this.watchAdForToken();
      },
      onWatchAdForX2: async () => {
        return await this.watchAdForX2();
      },
      onBuyTokenUpgrade: (id: TokenUpgradeId) => {
        const ok = this.engine.buyTokenUpgrade(id);
        if (ok) {
          this.audio.sfx('buy');
          this.updateUI();
          void this.engine.save.flush();
        } else {
          this.audio.sfx('error');
        }
        return ok;
      },
      onClose: () => {
        this.audio.sfx('click');
      },
    });
  }

  private openRebirth(): void {
    showRebirthModal({
      container: this.uiRoot,
      engine: this.engine,
      onPerformRebirth: (allocations) => {
        const pts = this.engine.performRebirth(allocations);
        if (pts > 0) {
          this.audio.sfx('big');
          this.viewedTableIndex = 0;
          this.scene.switchTable('wooden');
          showToast(t('rebirth.toast', { n: String(pts) }), 'success');
          this.updateUI();
          void this.engine.save.flush();
          this.platform.analytics('rebirth', {
            rebirths: this.engine.state.rebirths,
            points: pts,
          });
        } else {
          this.audio.sfx('error');
        }
        return pts;
      },
      onBuyTokenUpgrade: (id: TokenUpgradeId) => {
        const ok = this.engine.buyTokenUpgrade(id);
        if (ok) {
          this.audio.sfx('buy');
          this.updateUI();
          void this.engine.save.flush();
        } else {
          this.audio.sfx('error');
        }
        return ok;
      },
      onClose: () => {
        this.audio.sfx('click');
      },
    });
  }

  private openAchievements(): void {
    showAchievementsModal({
      container: this.uiRoot,
      engine: this.engine,
      onClose: () => {
        this.audio.sfx('click');
        this.updateUI();
      },
    });
  }

  private async watchAdForToken(): Promise<boolean> {
    if (this.isAdPlaying) return false;
    this.isAdPlaying = true;
    this.audio.set('ad', true);
    this.platform.analytics('rewarded_offer', { boost: 'token_branch' });

    try {
      const result = await this.platform.showRewarded('token_branch');
      if (result === 'rewarded') {
        const newTokens = this.engine.grantAdToken(1);
        this.audio.sfx('buy');
        showToast(t('ad.rewardOk'), 'success');
        void this.engine.save.flush();
        this.platform.analytics('rewarded_complete', { boost: 'token_branch', tokens: newTokens });
        return true;
      } else if (result === 'failed') {
        showToast(t('ad.unavailable'), 'error');
      } else {
        showToast(t('ad.cancelled'), 'info');
      }
      return false;
    } catch (err) {
      console.warn('[App] Rewarded ad exception:', err);
      showToast(t('ad.unavailable'), 'error');
      return false;
    } finally {
      this.isAdPlaying = false;
      this.audio.set('ad', false);
      this.updateUI();
    }
  }

  private async watchAdForX2(): Promise<boolean> {
    if (this.isAdPlaying) return false;
    this.isAdPlaying = true;
    this.audio.set('ad', true);
    this.platform.analytics('rewarded_offer', { boost: 'token_x2_gold' });

    try {
      const result = await this.platform.showRewarded('token_x2_gold');
      if (result === 'rewarded') {
        this.engine.activateAdX2();
        this.audio.sfx('big');
        showToast(t('ad.rewardOk'), 'success');
        void this.engine.save.flush();
        this.platform.analytics('rewarded_complete', { boost: 'token_x2_gold' });
        return true;
      } else if (result === 'failed') {
        showToast(t('ad.unavailable'), 'error');
      } else {
        showToast(t('ad.cancelled'), 'info');
      }
      return false;
    } catch (err) {
      console.warn('[App] Rewarded ad exception:', err);
      showToast(t('ad.unavailable'), 'error');
      return false;
    } finally {
      this.isAdPlaying = false;
      this.audio.set('ad', false);
      this.updateUI();
    }
  }

  private async resetProgress(): Promise<void> {
    try {
      await this.engine.save.reset();
      await this.platform.storage.delete([...SAVE_KEYS]);
      window.location.reload();
    } catch (err) {
      console.error('[App] Failed to reset progress:', err);
    }
  }

  private async watchAdBoost(boostId: AdBoostId): Promise<void> {
    if (this.isAdPlaying) return;
    this.isAdPlaying = true;
    this.audio.set('ad', true);
    this.platform.analytics('rewarded_offer', { boost: boostId });
    const placement = boostId === 'timeWarp' ? 'time_warp' : 'ad_boost';

    try {
      const result = await this.platform.showRewarded(placement);
      if (result === 'rewarded') {
        this.engine.grantReward(boostId);
      } else if (result === 'failed') {
        showToast(t('ad.unavailable'), 'error');
      } else {
        showToast(t('ad.cancelled'), 'info');
      }
    } catch (err) {
      console.warn('[App] Rewarded ad exception:', err);
      showToast(t('ad.unavailable'), 'error');
    } finally {
      this.isAdPlaying = false;
      this.audio.set('ad', false);
      this.updateUI();
    }
  }

  private checkOfflineEarnings(): void {
    const off = this.engine.calculateOffline();
    // Always record current session timestamp so future offline checks have a baseline
    this.engine.state.lastSeen = this.engine.clock.now();
    this.engine.save.mark('lastSeen');

    if (off && off.seconds >= 30 && off.earned > 0n) {
      showWelcomeBackModal({
        container: this.uiRoot,
        earnedGold: off.earned,
        awaySeconds: off.seconds,
        maxHours: off.capHours,
        efficiencyPercent: off.efficiency,
        isRewardedSupported: this.platform.isRewardedSupported,
        onCollect: async (double) => {
          if (double) {
            this.isAdPlaying = true;
            this.audio.set('ad', true);
            this.platform.analytics('rewarded_offer', { boost: 'offline_x2' });
            try {
              const res = await this.platform.showRewarded('offline_x2');
              if (res === 'rewarded') {
                this.engine.collectOffline(2, off);
                showToast(t('ad.rewardOk'), 'success');
                this.platform.analytics('offline_collect', { mult: 2 });
              } else {
                this.engine.collectOffline(1, off);
                this.platform.analytics('offline_collect', { mult: 1 });
              }
            } catch {
              this.engine.collectOffline(1, off);
            } finally {
              this.isAdPlaying = false;
              this.audio.set('ad', false);
            }
          } else {
            this.engine.collectOffline(1, off);
            this.platform.analytics('offline_collect', { mult: 1 });
            this.platform.showInterstitial().catch(() => {});
          }
          void this.engine.save.flush();
          this.audio.sfx('buy');
          this.updateUI();
        },
      });
    }
  }

  private checkOnboarding(): void {
    const isDebugSkip =
      typeof window !== 'undefined' &&
      window.location.search.includes('debug=1') &&
      !window.location.search.includes('onboarding=1');
    if (isDebugSkip) return;

    const st = this.engine.state;
    if (
      st.settings.onboardingDone ||
      st.totalEarned > 0n ||
      st.rebirths > 0 ||
      (st.tokenUpgrades.tokenUp1 ?? 0) > 0
    ) {
      return;
    }

    // Grant 1 starter Ad Token on first launch so player can buy -10% shop discount
    if ((st.tokens ?? 0) < 1) {
      this.engine.grantAdToken(1 - (st.tokens ?? 0));
      this.updateUI();
      void this.engine.save.flush();
    }

    startOnboarding({
      container: this.uiRoot,
      onSelectTab: (tab) => {
        this.panel.selectTab(tab);
      },
      onStepSound: () => {
        this.audio.sfx('click');
      },
      onComplete: () => {
        this.engine.state.settings.onboardingDone = true;
        this.engine.save.mark('settings');
        void this.engine.save.flush();
        this.platform.analytics('onboarding_complete');
      },
    });
  }

  private onFirstPlayableFrame(): void {
    if (this.gameReadySent) return;
    this.gameReadySent = true;

    requestAnimationFrame(() => {
      if (this.loadingScreen) {
        this.loadingScreen.classList.add('hidden');
        setTimeout(() => {
          if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
          }
        }, 450);
      }
      this.platform.sendGameReady();
      this.platform.showBanner?.('gameplay');
      setTimeout(() => {
        this.platform.showBanner?.('gameplay');
      }, 450);
      this.checkOnboarding();
    });
  }

  dispose(): void {
    this.stopHoldToss();
    this.scene.dispose();
    this.hud.destroy();
    this.panel.destroy();
    this.floatingText.dispose();
  }
}
