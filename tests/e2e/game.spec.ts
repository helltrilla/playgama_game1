import { test, expect } from '@playwright/test';

test.describe('Coins Table E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept external bridge script so mock window.bridge from addInitScript is preserved
    await page.route('**/playgama-bridge.js', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    );
    await page.addInitScript(() => {
      let storageData: Record<string, string> = {};
      try {
        storageData = JSON.parse(window.name || '{}');
      } catch {
        storageData = {};
      }
      const messages: string[] = [];

      (window as unknown as Record<string, unknown>).bridge = {
        initialize: () => Promise.resolve(),
        platform: {
          id: 'mock',
          language: 'en',
          isAudioEnabled: true,
          sendMessage: (msg: string) => {
            messages.push(msg);
            (window as unknown as Record<string, unknown>).__lastBridgeMessage = msg;
          },
        },
        storage: {
          get: (keys: string[]) => {
            const res: Record<string, string | null> = {};
            for (const k of keys) {
              res[k] = storageData[k] ?? null;
            }
            return Promise.resolve(res);
          },
          set: (keysOrObj: unknown, values?: unknown) => {
            if (Array.isArray(keysOrObj) && Array.isArray(values)) {
              for (let i = 0; i < keysOrObj.length; i++) {
                storageData[keysOrObj[i]] = String(values[i]);
              }
            } else if (typeof keysOrObj === 'string') {
              storageData[keysOrObj] = String(values);
            } else if (keysOrObj && typeof keysOrObj === 'object') {
              Object.assign(storageData, keysOrObj);
            }
            try {
              window.name = JSON.stringify(storageData);
            } catch {
              // ignore
            }
            return Promise.resolve();
          },
          delete: (keys: string[]) => {
            for (const k of keys) {
              delete storageData[k];
            }
            try {
              window.name = JSON.stringify(storageData);
            } catch {
              // ignore
            }
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
        on: (_event: string, _callback: (...args: unknown[]) => void) => {},
        EVENT_NAME: {
          REWARDED_STATE_CHANGED: 'rewarded_state_changed',
        },
        REWARDED_STATE: {
          REWARDED: 'rewarded',
          CLOSED: 'closed',
          FAILED: 'failed',
        },
      };

      (window as unknown as Record<string, unknown>).__bridgeMessages = messages;
    });
  });

  test('AC-FLOW-1: Boot sequence, game_ready and first tap', async ({ page }) => {
    await page.goto('/?debug=1');

    // Loading screen hides
    await expect(page.locator('#loading-screen')).toHaveClass(/hidden/, { timeout: 10000 });

    // Verify debug API is available
    const hasDebug = await page.evaluate(() => Boolean(window.__game));
    expect(hasDebug).toBe(true);

    // Initial gold is 0
    const initialGold = await page.evaluate(() => window.__game?.getState());
    expect(initialGold).toBeDefined();

    // Tap canvas to toss coin
    const canvas = page.locator('#canvas-container canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    // Wait for coin to register gold
    await page.waitForTimeout(600);
    const goldAfter = await page.evaluate(() => {
      const s = window.__game?.getState() as { gold: string } | undefined;
      return s?.gold ?? '0';
    });

    expect(BigInt(goldAfter)).toBeGreaterThan(0n);
  });

  test('AC-FLOW-2: Buy upgrade and persist after reload', async ({ page }) => {
    await page.goto('/?debug=1');
    await expect(page.locator('#loading-screen')).toHaveClass(/hidden/, { timeout: 10000 });

    // Add gold to afford upgrade
    await page.evaluate(() => {
      window.__game?.addGold('1000');
    });

    // Find and click the first Buy button (multiToss - Bronze Coins)
    const buyButton = page.locator('.upgrade-card .upgrade-buy-btn').first();
    await expect(buyButton).toBeEnabled();
    await buyButton.click();

    // Verify upgrade level is now 1
    const stateBeforeReload = await page.evaluate(() => {
      const s = window.__game?.getState() as { tables: Record<string, Record<string, number>> };
      return s.tables.wooden.multiToss;
    });
    expect(stateBeforeReload).toBe(1);

    // Flush save and reload
    await page.evaluate(async () => {
      await window.__game?.flush();
    });
    await page.reload();
    await expect(page.locator('#loading-screen')).toHaveClass(/hidden/, { timeout: 10000 });

    const stateAfterReload = await page.evaluate(() => {
      const s = window.__game?.getState() as { tables: Record<string, Record<string, number>> };
      return s.tables.wooden.multiToss;
    });
    expect(stateAfterReload).toBe(1);
  });

  test('AC-FLOW-3: Table unlock and navigation', async ({ page }) => {
    await page.goto('/?debug=1');
    await expect(page.locator('#loading-screen')).toHaveClass(/hidden/, { timeout: 10000 });

    // Add gold to afford Marble table (5,000 gold)
    await page.evaluate(() => {
      window.__game?.addGold('10000');
    });

    // Navigate to next table (Marble)
    const nextBtn = page.locator('.hud-center .table-nav-btn').last();
    await nextBtn.click();
    await page.waitForTimeout(100);

    // Unlock badge is clickable
    const unlockBadge = page.locator('.table-current-badge');
    await expect(unlockBadge).toBeVisible();
    await unlockBadge.click();

    // Verify marble is unlocked
    const unlockedTables = await page.evaluate(() => {
      const s = window.__game?.getState() as { unlocked: string[]; activeTable: string };
      return s.unlocked;
    });
    expect(unlockedTables).toContain('marble');
  });

  test('AC-FLOW-4: Viewport matrix and no page scroll', async ({ page }) => {
    const viewports = [
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 915, height: 412 },
      { width: 1280, height: 720 },
      { width: 800, height: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto('/?debug=1');
      await expect(page.locator('#loading-screen')).toHaveClass(/hidden/, { timeout: 10000 });

      // Verify no body scroll
      const scrollable = await page.evaluate(() => {
        return (
          document.body.scrollHeight > window.innerHeight ||
          document.body.scrollWidth > window.innerWidth
        );
      });
      expect(scrollable).toBe(false);
    }
  });

  test('AC-FLOW-5: Language switching in Settings updates UI to Russian', async ({ page }) => {
    await page.goto('/?debug=1');
    await expect(page.locator('#loading-screen')).toHaveClass(/hidden/, { timeout: 10000 });

    // Open Settings modal
    const settingsBtn = page.locator('.hud-actions button').last();
    await settingsBtn.click();

    // Click Русский button
    const ruBtn = page.locator('.modal-dialog button', { hasText: 'Русский' });
    await expect(ruBtn).toBeVisible();
    await ruBtn.click();

    // Close modal
    await page.locator('.modal-close').click();

    // Verify UI updated to Russian
    await expect(page.locator('.panel-tab').first()).toHaveText('Улучшения');
    await expect(page.locator('.upgrade-name').first()).toHaveText('Бронзовые монеты');
  });

  test('AC-FLOW-6: Ad Boosts tab hidden when isRewardedSupported is false', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as {
        bridge?: { advertisement?: { isRewardedSupported?: boolean } };
      };
      if (w.bridge?.advertisement) {
        w.bridge.advertisement.isRewardedSupported = false;
      }
    });

    await page.goto('/?debug=1');
    await expect(page.locator('#loading-screen')).toHaveClass(/hidden/, { timeout: 10000 });

    const adTab = page.locator('.panel-tab.tab-ad');
    await expect(adTab).toBeHidden();
  });

  test('AC-FLOW-7: Coins tab, Minions tab, Left Ad Banner, Token Branch popup, and always-visible costs', async ({
    page,
  }) => {
    await page.goto('/?debug=1');
    await expect(page.locator('#loading-screen')).toHaveClass(/hidden/, { timeout: 10000 });

    // Even with 0 gold, upgrade costs must never show "0"
    const firstCostText = await page
      .locator('.upgrade-card .upgrade-buy-cost')
      .first()
      .textContent();
    expect(firstCostText).not.toBe('0');

    // Left ad banner slot was removed
    await expect(page.locator('#left-ad-banner')).toHaveCount(0);

    // Switch to Coins tab (7 coin tiers = 7 section headers and 21 coin upgrades)
    const tabs = page.locator('.panel-tab');
    await tabs.nth(1).click();
    await expect(page.locator('.upgrade-section-header')).toHaveCount(7);
    await expect(page.locator('.upgrade-card:visible')).toHaveCount(21);

    // Switch to Minions tab
    await tabs.nth(2).click();
    await expect(page.locator('.upgrade-card:visible')).toHaveCount(3);

    // Open Achievements Branch popup modal
    await page.locator('.hud-ach-btn').click();
    await expect(page.locator('.ach-modal-dialog')).toBeVisible();
    await expect(page.locator('.ach-card')).toHaveCount(25);
    await page.locator('.ach-modal-dialog .modal-close').click();

    // Open Token Branch popup modal via top HUD button
    await expect(page.locator('.hud-token-btn')).toBeVisible();
    await page.locator('.hud-token-btn').click();
    await expect(page.locator('.token-modal-dialog')).toBeVisible();
    await expect(page.locator('.token-earn-card')).toBeVisible();
    await expect(page.locator('.token-upgrade-card')).toHaveCount(4);
    await page.locator('.token-modal-dialog .modal-close').click();

    // Open Rebirth Branch popup modal via bottom Rebirth bar
    await expect(page.locator('.rebirth-bar-btn')).toBeVisible();
    await page.locator('.rebirth-bar-btn').click();
    await expect(page.locator('.rebirth-modal-dialog')).toBeVisible();
    await expect(page.locator('.rebirth-modal-card')).toBeVisible();
    await expect(page.locator('.rebirth-upgrade-card')).toHaveCount(33);
    await expect(page.locator('.rebirth-upgrade-card.rebirth-node-locked')).toHaveCount(32);
  });
});
