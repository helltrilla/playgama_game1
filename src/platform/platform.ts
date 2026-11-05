import type { StorageAdapter } from '../core/storage';

export type RewardedStatus = 'rewarded' | 'closed' | 'failed';

export interface Platform {
  init(): Promise<void>;
  language: string;
  isAudioEnabled: boolean;
  isRewardedSupported: boolean;
  isInterstitialSupported: boolean;
  isBannerSupported?: boolean;
  isExternalLinksAllowed: boolean;
  isRateSupported?: boolean;
  storage: StorageAdapter;
  showInterstitial(placement?: string): Promise<void>;
  showRewarded(placement?: string): Promise<RewardedStatus>;
  showBanner?(placement?: string): void;
  hideBanner?(): void;
  rateGame?(): Promise<boolean>;
  sendGameReady(): void;
  analytics(event: string, params?: Record<string, string | number | boolean>): void;
  onPause(cb: (paused: boolean) => void): void;
  onAudioChange(cb: (enabled: boolean) => void): void;
}

/**
 * FakePlatform for unit/integration testing and fallback when Bridge is absent.
 */
export class FakePlatform implements Platform {
  language = 'en';
  isAudioEnabled = true;
  isRewardedSupported = true;
  isInterstitialSupported = true;
  isBannerSupported = true;
  isExternalLinksAllowed = false;
  isRateSupported = false;
  gameReadyCalls = 0;
  interstitialCalls: string[] = [];
  rewardedCalls: string[] = [];
  bannerShown = false;
  analyticsEvents: { event: string; params?: Record<string, string | number | boolean> }[] = [];
  mockRewardedResult: RewardedStatus = 'rewarded';

  private pauseListeners: ((paused: boolean) => void)[] = [];
  private audioListeners: ((enabled: boolean) => void)[] = [];
  private storageData = new Map<string, string>();

  storage: StorageAdapter = {
    get: async (keys: string[]) => {
      const res: Record<string, string | null> = {};
      for (const k of keys) {
        res[k] = this.storageData.has(k) ? this.storageData.get(k)! : null;
      }
      return res;
    },
    set: async (keys: string[], values: string[]) => {
      for (let i = 0; i < keys.length; i++) {
        this.storageData.set(keys[i], values[i]);
      }
      return true;
    },
    delete: async (keys: string[]) => {
      for (const k of keys) {
        this.storageData.delete(k);
      }
    },
  };

  async init(): Promise<void> {
    // immediate success
  }

  async showInterstitial(placement = 'default'): Promise<void> {
    this.interstitialCalls.push(placement);
  }

  async showRewarded(placement = 'default'): Promise<RewardedStatus> {
    this.rewardedCalls.push(placement);
    return this.mockRewardedResult;
  }

  async rateGame(): Promise<boolean> {
    return this.isRateSupported;
  }

  sendGameReady(): void {
    this.gameReadyCalls++;
  }

  analytics(event: string, params?: Record<string, string | number | boolean>): void {
    this.analyticsEvents.push({ event, params });
  }

  onPause(cb: (paused: boolean) => void): void {
    this.pauseListeners.push(cb);
  }

  onAudioChange(cb: (enabled: boolean) => void): void {
    this.audioListeners.push(cb);
  }

  // Test helpers
  triggerPause(paused: boolean): void {
    this.pauseListeners.forEach((cb) => cb(paused));
  }

  triggerAudioChange(enabled: boolean): void {
    this.isAudioEnabled = enabled;
    this.audioListeners.forEach((cb) => cb(enabled));
  }
}
