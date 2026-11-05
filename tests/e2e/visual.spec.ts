import { test, expect } from '@playwright/test';

test.describe('Coins Table Visual Matrix', () => {
  const viewports = [
    { name: 'mobile_portrait_360x640', width: 360, height: 640 },
    { name: 'iphone_portrait_390x844', width: 390, height: 844 },
    { name: 'mobile_landscape_915x412', width: 915, height: 412 },
    { name: 'desktop_hd_1280x720', width: 1280, height: 720 },
    { name: 'square_800x800', width: 800, height: 800 },
  ];

  test.beforeEach(async ({ page }) => {
    await page.route('**/playgama-bridge.js', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    );
    await page.addInitScript(() => {
      const storageData: Record<string, string> = {};
      (window as unknown as Record<string, unknown>).bridge = {
        initialize: () => Promise.resolve(),
        platform: {
          id: 'mock',
          language: 'en',
          isAudioEnabled: true,
          sendMessage: () => {},
        },
        storage: {
          get: (keys: string[]) => {
            const res: Record<string, string | null> = {};
            for (const k of keys) res[k] = storageData[k] ?? null;
            return Promise.resolve(res);
          },
          set: (keysOrObj: unknown, values?: unknown) => {
            if (Array.isArray(keysOrObj) && Array.isArray(values)) {
              for (let i = 0; i < keysOrObj.length; i++) {
                storageData[keysOrObj[i]] = String(values[i]);
              }
            } else if (keysOrObj && typeof keysOrObj === 'object') {
              Object.assign(storageData, keysOrObj);
            }
            return Promise.resolve();
          },
          delete: (keys: string[]) => {
            for (const k of keys) delete storageData[k];
            return Promise.resolve();
          },
        },
        advertisement: {
          isRewardedSupported: true,
          isInterstitialSupported: true,
          showInterstitial: () => Promise.resolve(),
          showRewarded: () => Promise.resolve(),
          checkAdBlock: () => Promise.resolve(false),
        },
        analytics: {
          send: () => {},
        },
        on: () => {},
        EVENT_NAME: { REWARDED_STATE_CHANGED: 'rewarded_state_changed' },
        REWARDED_STATE: { REWARDED: 'rewarded', CLOSED: 'closed', FAILED: 'failed' },
      };
    });
  });

  for (const vp of viewports) {
    test(`Visual capture for ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/?debug=1');

      // Wait for loading screen to hide
      await expect(page.locator('#loading-screen')).toHaveClass(/hidden/, { timeout: 10000 });

      // Add gold and toss a couple coins for a rich visual state
      await page.evaluate(() => {
        window.__game?.addGold('15000');
      });

      // Toss coin
      const canvas = page.locator('#canvas-container canvas');
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.waitForTimeout(600);

      // Screenshot main view
      await page.screenshot({
        path: `output/screenshots/${vp.name}_main.png`,
        fullPage: false,
      });

      // If mobile portrait, expand bottom drawer
      if (vp.width < 900) {
        const handle = page.locator('.panel-handle');
        if (await handle.isVisible()) {
          await handle.click();
          await page.waitForTimeout(300);
          await page.screenshot({
            path: `output/screenshots/${vp.name}_panel_expanded.png`,
          });
        }
      }

      // Switch to Ad Boosts tab
      const tabAd = page.locator('.panel-tab.tab-ad');
      if (await tabAd.isVisible()) {
        await tabAd.click();
        await page.waitForTimeout(200);
        await page.screenshot({
          path: `output/screenshots/${vp.name}_ad_boosts.png`,
        });
      }

      // Open settings modal
      const settingsBtn = page.locator('.hud-actions button').last();
      if (await settingsBtn.isVisible()) {
        await settingsBtn.click();
        await page.waitForTimeout(200);
        await page.screenshot({
          path: `output/screenshots/${vp.name}_settings.png`,
        });
        // Close settings
        const closeBtn = page.locator('.modal-close');
        await closeBtn.click();
        await page.waitForTimeout(200);
      }
    });
  }
});
