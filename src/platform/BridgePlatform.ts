/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Platform, RewardedStatus } from './platform';
import type { StorageAdapter } from '../core/storage';

declare global {
  interface Window {
    bridge?: any;
    __gameReadySent?: number;
  }
}

export class BridgePlatform implements Platform {
  language = 'en';
  isAudioEnabled = true;
  isRewardedSupported = false;
  isInterstitialSupported = false;
  isBannerSupported = false;
  isExternalLinksAllowed = false;
  isRateSupported = false;

  private bridge: any = null;
  private gameReadySent = false;
  private pauseListeners: ((paused: boolean) => void)[] = [];
  private audioListeners: ((enabled: boolean) => void)[] = [];
  private memoryStorage = new Map<string, string>();

  storage: StorageAdapter = {
    get: async (keys: string[]): Promise<Record<string, string | null>> => {
      const res: Record<string, string | null> = {};
      for (const k of keys) res[k] = null;

      if (this.bridge?.storage?.get) {
        try {
          const data = await this.bridge.storage.get(keys);
          keys.forEach((k, i) => {
            const v = Array.isArray(data) ? data[i] : data?.[k];
            res[k] =
              v === undefined || v === null ? null : typeof v === 'string' ? v : JSON.stringify(v);
          });
          return res;
        } catch (err) {
          console.warn('[BridgePlatform] storage.get failed, using memory fallback:', err);
        }
      }

      // Memory fallback if bridge storage fails or not initialized
      for (const k of keys) {
        res[k] = this.memoryStorage.get(k) ?? null;
      }
      return res;
    },

    set: async (keys: string[], values: string[]): Promise<boolean> => {
      if (keys.length === 0) return true;

      // Always update memory copy
      for (let i = 0; i < keys.length; i++) {
        this.memoryStorage.set(keys[i], values[i]);
      }

      if (this.bridge?.storage?.set) {
        try {
          await this.bridge.storage.set(keys, values);
          return true;
        } catch (err) {
          console.warn('[BridgePlatform] storage.set failed:', err);
          return false;
        }
      }
      return true;
    },

    delete: async (keys: string[]): Promise<void> => {
      for (const k of keys) {
        this.memoryStorage.delete(k);
      }
      if (this.bridge?.storage?.delete) {
        try {
          await this.bridge.storage.delete(keys);
        } catch (err) {
          console.warn('[BridgePlatform] storage.delete failed:', err);
        }
      }
    },
  };

  async init(): Promise<void> {
    const b = typeof window !== 'undefined' ? window.bridge : undefined;
    if (!b) {
      console.warn('[BridgePlatform] window.bridge not found. Running in standalone mock mode.');
      this.isRewardedSupported = true;
      this.isBannerSupported = true;
      return;
    }

    try {
      const inIframe = (() => {
        try {
          return window.self !== window.top;
        } catch {
          return true;
        }
      })();
      const hasPlatformParam =
        typeof window !== 'undefined' && window.location.search.includes('platform');
      const timeoutMs = inIframe || hasPlatformParam ? 10000 : 1500;

      const applyBridgeSetup = () => {
        this.bridge = b;

        // 1. Language read once after init
        const rawLang = String(b.platform?.language || 'en')
          .toLowerCase()
          .slice(0, 2);
        this.language = rawLang === 'ru' ? 'ru' : 'en';

        // 2. Audio and advertising flags
        const isStandaloneMock =
          b.platform?.id === 'mock' &&
          typeof window !== 'undefined' &&
          !('__bridgeMessages' in window);
        this.isAudioEnabled = b.platform?.isAudioEnabled !== false;
        this.isRewardedSupported =
          isStandaloneMock || b.advertisement?.isRewardedSupported !== false;
        this.isInterstitialSupported = b.advertisement?.isInterstitialSupported !== false;
        this.isBannerSupported =
          isStandaloneMock ||
          b.advertisement?.isAdvancedBannersSupported === true ||
          b.advertisement?.isBannerSupported === true;
        this.isExternalLinksAllowed = b.platform?.isExternalLinksAllowed === true;
        this.isRateSupported = b.social?.isRateSupported === true;

        // 3. Event subscriptions
        const EV = b.EVENT_NAME;
        if (EV) {
          b.platform?.on?.(EV.PAUSE_STATE_CHANGED, (isPaused: boolean) => {
            this.pauseListeners.forEach((cb) => cb(!!isPaused));
          });
          b.platform?.on?.(EV.AUDIO_STATE_CHANGED, (isEnabled: boolean) => {
            this.isAudioEnabled = !!isEnabled;
            this.audioListeners.forEach((cb) => cb(!!isEnabled));
          });
          if (EV.INTERSTITIAL_STATE_CHANGED) {
            b.advertisement?.on?.(EV.INTERSTITIAL_STATE_CHANGED, (state: string) => {
              if (state === 'opened') {
                this.pauseListeners.forEach((cb) => cb(true));
              } else if (state === 'closed' || state === 'failed') {
                this.pauseListeners.forEach((cb) => cb(false));
              }
            });
          }
        }
      };

      const initPromise = Promise.resolve(
        b.initialize({ configFilePath: './playgama-bridge-config.json?v=1.7.0' }),
      );
      initPromise
        .then(() => {
          if (!this.bridge) {
            applyBridgeSetup();
            if (this.gameReadySent) {
              try {
                b.platform?.sendMessage?.('game_ready');
              } catch {
                // ignore
              }
              setTimeout(() => this.showBanner('gameplay'), 350);
            }
          }
        })
        .catch(() => {});

      await Promise.race([
        initPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error('Bridge init timeout')), timeoutMs)),
      ]);
      applyBridgeSetup();
    } catch (err) {
      console.warn('[BridgePlatform] Bridge initialization failed, running in fallback mode:', err);
      this.bridge = null;
      this.isRewardedSupported = true;
      this.isBannerSupported = true;
    }
  }

  private syncAdvancedBannerConfig(placement: string): void {
    try {
      const opts = this.bridge?.options;
      if (!opts || typeof opts !== 'object') return;
      const vw = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1280;
      const vh = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 720;
      const slot =
        typeof document !== 'undefined' ? document.getElementById('hud-ad-banner-slot') : null;
      const rect = slot ? slot.getBoundingClientRect() : null;

      const topPctNum =
        rect && rect.top > 0
          ? Math.max(1, Math.min(80, Math.round((rect.top / vh) * 100)))
          : vh > vw
            ? 15
            : 11;
      const rawLeftPct =
        rect && rect.left >= 0 ? Math.max(0, Math.min(80, Math.round((rect.left / vw) * 100))) : 1;
      const widthPctNum = Math.min(96, Math.max(25, Math.ceil((325 / Math.max(325, vw)) * 100)));
      const heightPctNum = Math.min(25, Math.max(10, Math.ceil((54 / Math.max(200, vh)) * 100)));
      const leftPctNum = Math.max(0, Math.min(rawLeftPct, 100 - widthPctNum));

      const dynamicBanner = [
        {
          width: `${widthPctNum}%`,
          height: `${heightPctNum}%`,
          top: `${topPctNum}%`,
          left: `${leftPctNum}%`,
        },
      ];

      if (!opts.advertisement || typeof opts.advertisement !== 'object') {
        opts.advertisement = {};
      }
      if (
        !opts.advertisement.advancedBanners ||
        typeof opts.advertisement.advancedBanners !== 'object'
      ) {
        opts.advertisement.advancedBanners = {
          disable: false,
          placementFallback: placement,
        };
      }
      opts.advertisement.advancedBanners.disable = false;
      opts.advertisement.advancedBanners.placementFallback = placement;
      opts.advertisement.advancedBanners[placement] = {
        action: 'show',
        default: dynamicBanner,
      };
    } catch {
      // ignore
    }
  }

  showBanner(placement = 'gameplay'): void {
    const adv = this.bridge?.advertisement;
    if (!adv) return;
    try {
      const showRegularBanner = () => {
        if (adv.isBannerSupported && typeof adv.showBanner === 'function') {
          const pos = this.bridge?.BANNER_POSITION?.TOP || 'top';
          adv.showBanner(pos, placement);
        }
      };

      if (adv.isAdvancedBannersSupported && typeof adv.showAdvancedBanners === 'function') {
        this.syncAdvancedBannerConfig(placement);
        const evName =
          this.bridge?.EVENT_NAME?.ADVANCED_BANNERS_STATE_CHANGED ||
          'advanced_banners_state_changed';
        const onAdvBannerState = (state: string) => {
          if (state === 'failed') {
            try {
              adv.off?.(evName, onAdvBannerState);
            } catch {
              // ignore
            }
            showRegularBanner();
          } else if (state === 'shown') {
            try {
              adv.off?.(evName, onAdvBannerState);
            } catch {
              // ignore
            }
          }
        };
        adv.on?.(evName, onAdvBannerState);
        adv.showAdvancedBanners(placement);
        if (this.bridge?.platform?.id === 'qa_tool') {
          showRegularBanner();
        }
      } else {
        showRegularBanner();
      }
    } catch (err) {
      console.warn('[BridgePlatform] showBanner error:', err);
    }
  }

  hideBanner(): void {
    const adv = this.bridge?.advertisement;
    if (!adv) return;
    try {
      if (typeof adv.hideAdvancedBanners === 'function') {
        adv.hideAdvancedBanners();
      }
      if (typeof adv.hideBanner === 'function') {
        adv.hideBanner();
      }
    } catch (err) {
      console.warn('[BridgePlatform] hideBanner error:', err);
    }
  }

  async showInterstitial(placement = 'default'): Promise<void> {
    if (!this.bridge?.advertisement?.showInterstitial || !this.isInterstitialSupported) {
      return;
    }
    try {
      const res = this.bridge.advertisement.showInterstitial(placement);
      if (res && typeof res.catch === 'function') {
        res.catch(() => undefined);
      }
    } catch (err) {
      console.warn('[BridgePlatform] showInterstitial error:', err);
    }
  }

  async showRewarded(placement = 'default'): Promise<RewardedStatus> {
    if (!this.isRewardedSupported) {
      return 'failed';
    }
    const isStandaloneMock =
      this.bridge?.platform?.id === 'mock' &&
      typeof window !== 'undefined' &&
      !('__bridgeMessages' in window);
    if (!this.bridge?.advertisement?.showRewarded || isStandaloneMock) {
      await new Promise((r) => setTimeout(r, 250));
      return 'rewarded';
    }

    return new Promise<RewardedStatus>((resolve) => {
      const adv = this.bridge.advertisement;
      const EV = this.bridge.EVENT_NAME;
      const ST = this.bridge.REWARDED_STATE || {
        LOADING: 'loading',
        OPENED: 'opened',
        REWARDED: 'rewarded',
        CLOSED: 'closed',
        FAILED: 'failed',
      };
      const eventName = EV?.REWARDED_STATE_CHANGED || 'rewarded_state_changed';
      let settled = false;
      let gotReward = false;
      let rewardTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = (status: RewardedStatus) => {
        if (settled) return;
        settled = true;
        if (rewardTimer !== null) clearTimeout(rewardTimer);
        this.pauseListeners.forEach((cb) => cb(false));
        try {
          adv.off?.(eventName, onStateChanged);
        } catch {
          // ignore
        }
        resolve(status);
      };

      const onStateChanged = (state: string) => {
        if (state === ST.OPENED || state === 'opened') {
          this.pauseListeners.forEach((cb) => cb(true));
        } else if (state === ST.REWARDED || state === 'rewarded') {
          gotReward = true;
          // Wait for 'closed' event on real SDK, or resolve after short delay for simple mocks
          rewardTimer = setTimeout(() => finish('rewarded'), 150);
        } else if (state === ST.CLOSED || state === 'closed') {
          finish(gotReward ? 'rewarded' : 'closed');
        } else if (state === ST.FAILED || state === 'failed') {
          finish('failed');
        }
      };

      try {
        adv.on?.(eventName, onStateChanged);
        const p = adv.showRewarded(placement);
        if (p && typeof p.then === 'function') {
          p.then(() => {
            if (!settled && this.bridge?.platform?.id === 'mock') {
              rewardTimer = setTimeout(() => finish('rewarded'), 200);
            }
          }).catch(() => finish('failed'));
        }
      } catch (err) {
        console.warn('[BridgePlatform] showRewarded error:', err);
        finish('failed');
      }
    });
  }

  async rateGame(): Promise<boolean> {
    if (!this.bridge?.social?.rate || !this.isRateSupported) {
      return false;
    }
    try {
      await this.bridge.social.rate();
      return true;
    } catch (err) {
      console.warn('[BridgePlatform] social.rate error:', err);
      return false;
    }
  }

  sendGameReady(): void {
    if (this.gameReadySent) return;
    this.gameReadySent = true;
    try {
      this.bridge?.platform?.sendMessage?.('game_ready');
    } catch (err) {
      console.warn('[BridgePlatform] sendGameReady error:', err);
    }
    if (typeof window !== 'undefined') {
      window.__gameReadySent = (window.__gameReadySent || 0) + 1;
    }
  }

  analytics(event: string, params?: Record<string, string | number | boolean>): void {
    try {
      if (this.bridge?.analytics?.send) {
        this.bridge.analytics.send(event, params);
      }
    } catch (err) {
      console.warn('[BridgePlatform] analytics.send error:', err);
    }
  }

  onPause(cb: (paused: boolean) => void): void {
    this.pauseListeners.push(cb);
  }

  onAudioChange(cb: (enabled: boolean) => void): void {
    this.audioListeners.push(cb);
  }
}
