import { formatBig } from '../core/bignum';
import { ICONS } from './icons';
import { t } from '../i18n';
import type { TableDef } from '../data/tables';
import { ACHIEVEMENTS } from '../data/achievements';
import { REBIRTH_PASSIVE_BONUS } from '../data/upgrades';
import type { RebirthProgress } from '../core/game';

export interface HudCallbacks {
  onPrevTable: () => void;
  onNextTable: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenTokenBranch: () => void;
  onOpenRebirth: () => void;
  onOpenAchievements: () => void;
  onUnlockTable: (tableId: string) => void;
}

export interface HudComponent {
  element: HTMLElement;
  updateGold(gold: bigint, incomePerSec: bigint, tokens?: number, achDone?: number): void;
  updateRebirth(rebirths: number, prog: RebirthProgress, bonusPerPoint?: number): void;
  updateCombo(streak: number, mult: number): void;
  setDrawerCollapsed(collapsed: boolean): void;
  updateTable(
    table: TableDef,
    isUnlocked: boolean,
    canUnlock: boolean,
    hasPrev: boolean,
    hasNext: boolean,
    unlockCost?: bigint,
  ): void;
  updateSoundState(isMuted: boolean): void;
  updateFrenzy(remainingSeconds: number): void;
  hideHint(): void;
  destroy(): void;
}

export function createHud(
  container: HTMLElement,
  callbacks: HudCallbacks,
  initialMuted = false,
): HudComponent {
  const root = document.createElement('header');
  root.className = 'hud-bar';

  // Left group: Gold counter + Token Branch (Ad/Token buffs) + Achievements
  const leftGroup = document.createElement('div');
  leftGroup.className = 'hud-left-group';

  const goldContainer = document.createElement('div');
  goldContainer.className = 'hud-gold-container';

  const goldRow = document.createElement('div');
  goldRow.className = 'hud-gold-row';

  const goldIcon = document.createElement('div');
  goldIcon.className = 'hud-gold-icon';
  goldIcon.innerHTML = ICONS.coin;

  const goldVal = document.createElement('span');
  goldVal.className = 'hud-gold-value tabular';
  goldVal.textContent = '0';

  goldRow.appendChild(goldIcon);
  goldRow.appendChild(goldVal);

  const goldRate = document.createElement('div');
  goldRate.className = 'hud-gold-rate tabular';
  goldRate.textContent = t('hud.perSec', { v: '0' });

  goldContainer.appendChild(goldRow);
  goldContainer.appendChild(goldRate);

  const tokenBtn = document.createElement('button');
  tokenBtn.type = 'button';
  tokenBtn.className = 'btn hud-token-btn tabular';
  tokenBtn.setAttribute('aria-label', t('token.title'));

  const tokenBtnIcon = document.createElement('span');
  tokenBtnIcon.className = 'hud-token-icon';
  tokenBtnIcon.innerHTML = ICONS.diamondCoins;

  const tokenBtnLabel = document.createElement('span');
  tokenBtnLabel.className = 'hud-token-label';
  tokenBtnLabel.textContent = t('token.btn', { n: '0' });

  tokenBtn.appendChild(tokenBtnIcon);
  tokenBtn.appendChild(tokenBtnLabel);
  tokenBtn.onclick = (e) => {
    e.stopPropagation();
    callbacks.onOpenTokenBranch();
  };

  const achBtn = document.createElement('button');
  achBtn.type = 'button';
  achBtn.className = 'btn hud-ach-btn tabular';
  achBtn.setAttribute('aria-label', t('ach.title'));

  const achBtnIcon = document.createElement('span');
  achBtnIcon.className = 'hud-ach-icon';
  achBtnIcon.innerHTML = ICONS.goldenHour;

  const achBtnLabel = document.createElement('span');
  achBtnLabel.className = 'hud-ach-label';
  achBtnLabel.textContent = t('ach.btn', { done: '0', total: String(ACHIEVEMENTS.length) });

  achBtn.appendChild(achBtnIcon);
  achBtn.appendChild(achBtnLabel);
  achBtn.onclick = (e) => {
    e.stopPropagation();
    callbacks.onOpenAchievements();
  };

  leftGroup.appendChild(goldContainer);
  leftGroup.appendChild(tokenBtn);
  leftGroup.appendChild(achBtn);

  // Center: Table navigation
  const centerWrap = document.createElement('div');
  centerWrap.className = 'hud-center';

  let lastNavAt = 0;
  const triggerPrev = (e: Event) => {
    e.stopPropagation();
    if (prevBtn.disabled) return;
    const now = performance.now();
    if (now - lastNavAt < 220) return;
    lastNavAt = now;
    callbacks.onPrevTable();
  };
  const triggerNext = (e: Event) => {
    e.stopPropagation();
    if (nextBtn.disabled) return;
    const now = performance.now();
    if (now - lastNavAt < 220) return;
    lastNavAt = now;
    callbacks.onNextTable();
  };

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'table-nav-btn';
  prevBtn.setAttribute('aria-label', t('table.prev'));
  prevBtn.innerHTML = ICONS.arrowL;
  prevBtn.addEventListener('pointerup', triggerPrev);
  prevBtn.onclick = triggerPrev;

  const tableTitleWrap = document.createElement('div');
  tableTitleWrap.className = 'table-title-wrap';

  const tableName = document.createElement('div');
  tableName.className = 'table-current-name';
  tableName.textContent = '…';

  const tableBadge = document.createElement('div');
  tableBadge.className = 'table-current-badge';
  tableBadge.textContent = 'x1';

  tableTitleWrap.appendChild(tableName);
  tableTitleWrap.appendChild(tableBadge);

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'table-nav-btn';
  nextBtn.setAttribute('aria-label', t('table.next'));
  nextBtn.innerHTML = ICONS.arrowR;
  nextBtn.addEventListener('pointerup', triggerNext);
  nextBtn.onclick = triggerNext;

  centerWrap.appendChild(prevBtn);
  centerWrap.appendChild(tableTitleWrap);
  centerWrap.appendChild(nextBtn);

  // Right: Sound & Settings buttons
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'hud-actions';

  const soundBtn = document.createElement('button');
  soundBtn.type = 'button';
  soundBtn.className = 'btn btn-icon';
  soundBtn.setAttribute('aria-label', initialMuted ? t('sound.unmute') : t('sound.mute'));
  soundBtn.innerHTML = initialMuted ? ICONS.mute : ICONS.sound;
  soundBtn.onclick = (e) => {
    e.stopPropagation();
    callbacks.onToggleSound();
  };

  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.className = 'btn btn-icon';
  settingsBtn.setAttribute('aria-label', t('settings.title'));
  settingsBtn.innerHTML = ICONS.settings;
  settingsBtn.onclick = (e) => {
    e.stopPropagation();
    callbacks.onOpenSettings();
  };

  actionsWrap.appendChild(soundBtn);
  actionsWrap.appendChild(settingsBtn);

  root.appendChild(leftGroup);
  root.appendChild(centerWrap);
  root.appendChild(actionsWrap);
  container.appendChild(root);

  // Bottom Rebirth Progress Bar Button
  const rebirthBarBtn = document.createElement('button');
  rebirthBarBtn.type = 'button';
  rebirthBarBtn.className = 'rebirth-bar-btn tabular';
  rebirthBarBtn.setAttribute('aria-label', t('rebirth.modalTitle'));

  const rebirthBarTrack = document.createElement('div');
  rebirthBarTrack.className = 'rebirth-bar-track';

  const rebirthBarFill = document.createElement('div');
  rebirthBarFill.className = 'rebirth-bar-fill';
  rebirthBarFill.style.width = '0%';
  rebirthBarTrack.appendChild(rebirthBarFill);

  const rebirthBarContent = document.createElement('div');
  rebirthBarContent.className = 'rebirth-bar-content';

  const rebirthBarLeft = document.createElement('div');
  rebirthBarLeft.className = 'rebirth-bar-left';

  const rebirthBarIcon = document.createElement('span');
  rebirthBarIcon.className = 'rebirth-bar-icon';
  rebirthBarIcon.innerHTML = ICONS.diamondCoins;

  const rebirthBarTexts = document.createElement('div');
  rebirthBarTexts.className = 'rebirth-bar-texts';

  const rebirthBarTitle = document.createElement('span');
  rebirthBarTitle.className = 'rebirth-bar-title';
  rebirthBarTitle.textContent = t('rebirth.barTitle');

  const rebirthBarSub = document.createElement('span');
  rebirthBarSub.className = 'rebirth-bar-sub';
  rebirthBarSub.textContent = '';

  rebirthBarTexts.appendChild(rebirthBarTitle);
  rebirthBarTexts.appendChild(rebirthBarSub);

  rebirthBarLeft.appendChild(rebirthBarIcon);
  rebirthBarLeft.appendChild(rebirthBarTexts);

  const rebirthBarBadge = document.createElement('span');
  rebirthBarBadge.className = 'rebirth-bar-badge';
  rebirthBarBadge.textContent = t('rebirth.barPoints', { n: '0' });

  rebirthBarContent.appendChild(rebirthBarLeft);
  rebirthBarContent.appendChild(rebirthBarBadge);

  rebirthBarBtn.appendChild(rebirthBarTrack);
  rebirthBarBtn.appendChild(rebirthBarContent);
  rebirthBarBtn.onclick = (e) => {
    e.stopPropagation();
    callbacks.onOpenRebirth();
  };
  container.appendChild(rebirthBarBtn);

  // Tap hint
  const hintEl = document.createElement('div');
  hintEl.className = 'tap-hint';
  hintEl.textContent = t('toss.hint');
  container.appendChild(hintEl);

  // Frenzy banner
  const frenzyBanner = document.createElement('div');
  frenzyBanner.className = 'frenzy-banner';
  frenzyBanner.style.display = 'none';
  container.appendChild(frenzyBanner);

  // Heads Combo streak banner
  const comboBanner = document.createElement('div');
  comboBanner.className = 'combo-banner tabular';
  comboBanner.style.display = 'none';
  container.appendChild(comboBanner);

  let currentTableDef: TableDef | null = null;
  let lastTokens = 0;
  let lastAchDone = 0;
  let lastRebirths = 0;
  let lastBonusPerPoint = REBIRTH_PASSIVE_BONUS;
  let lastRebirthProg: RebirthProgress = {
    pendingPoints: 0,
    currentStepGold: 0n,
    nextStepCost: 25000n,
    ratio: 0,
  };

  function updateGold(gold: bigint, incomePerSec: bigint, tokens = 0, achDone = 0): void {
    goldVal.textContent = formatBig(gold);
    goldRate.textContent = t('hud.perSec', { v: formatBig(incomePerSec) });
    lastTokens = tokens;
    lastAchDone = achDone;
    tokenBtnLabel.textContent = t('token.btn', { n: String(tokens) });
    achBtnLabel.textContent = t('ach.btn', {
      done: String(achDone),
      total: String(ACHIEVEMENTS.length),
    });
  }

  function updateRebirth(
    rebirths: number,
    prog: RebirthProgress,
    bonusPerPoint = REBIRTH_PASSIVE_BONUS,
  ): void {
    lastRebirths = rebirths;
    lastBonusPerPoint = bonusPerPoint;
    lastRebirthProg = prog;
    const pctInt = Math.min(100, Math.max(0, Math.floor(prog.ratio * 100)));
    rebirthBarFill.style.width = `${pctInt}%`;

    if (rebirths > 0) {
      const bonusPct = Math.round(rebirths * bonusPerPoint * 100);
      rebirthBarTitle.textContent = t('rebirth.barTitleCount', {
        n: String(rebirths),
        pct: String(bonusPct),
      });
    } else {
      rebirthBarTitle.textContent = t('rebirth.barTitle');
    }

    rebirthBarSub.textContent = t('rebirth.barSub', {
      cur: formatBig(prog.currentStepGold),
      next: formatBig(prog.nextStepCost),
      pct: String(pctInt),
    });

    if (prog.pendingPoints > 0) {
      rebirthBarBadge.textContent = t('rebirth.barPointsReady', { n: String(prog.pendingPoints) });
      rebirthBarBtn.classList.add('is-ready');
      rebirthBarBadge.classList.add('is-ready');
    } else {
      rebirthBarBadge.textContent = t('rebirth.barPoints', { n: '0' });
      rebirthBarBtn.classList.remove('is-ready');
      rebirthBarBadge.classList.remove('is-ready');
    }
  }

  function updateCombo(streak: number, mult: number): void {
    if (streak >= 2) {
      comboBanner.style.display = 'block';
      comboBanner.textContent = t('combo.banner', {
        s: String(streak),
        m: String(mult),
      });
    } else {
      comboBanner.style.display = 'none';
    }
  }

  function setDrawerCollapsed(collapsed: boolean): void {
    rebirthBarBtn.classList.toggle('drawer-collapsed', collapsed);
  }

  function updateTable(
    table: TableDef,
    isUnlocked: boolean,
    canUnlock: boolean,
    hasPrev: boolean,
    hasNext: boolean,
    unlockCost?: bigint,
  ): void {
    currentTableDef = table;
    tableName.textContent = t(table.nameKey as 'table.wooden');
    hintEl.textContent = t('toss.hint');
    prevBtn.setAttribute('aria-label', t('table.prev'));
    nextBtn.setAttribute('aria-label', t('table.next'));
    settingsBtn.setAttribute('aria-label', t('settings.title'));
    tokenBtn.setAttribute('aria-label', t('token.title'));
    tokenBtnLabel.textContent = t('token.btn', { n: String(lastTokens) });
    rebirthBarBtn.setAttribute('aria-label', t('rebirth.modalTitle'));
    updateRebirth(lastRebirths, lastRebirthProg, lastBonusPerPoint);
    achBtn.setAttribute('aria-label', t('ach.title'));
    achBtnLabel.textContent = t('ach.btn', {
      done: String(lastAchDone),
      total: String(ACHIEVEMENTS.length),
    });

    if (isUnlocked) {
      tableBadge.textContent = t('table.mult', { v: String(table.incomeMult) });
      tableBadge.classList.remove('can-unlock', 'is-locked');
      tableBadge.style.color = 'var(--gold-1)';
      tableBadge.onclick = null;
      tableTitleWrap.onclick = null;
      tableBadge.style.cursor = 'default';
      tableTitleWrap.style.cursor = 'default';
    } else {
      const effectiveCost = unlockCost !== undefined ? unlockCost : BigInt(table.unlockCost);
      const costStr = formatBig(effectiveCost);
      tableBadge.textContent = canUnlock
        ? t('table.unlock', { price: costStr })
        : `${t('table.locked')} (${costStr})`;
      tableBadge.classList.toggle('can-unlock', canUnlock);
      tableBadge.classList.toggle('is-locked', !canUnlock);
      tableBadge.style.color = canUnlock ? '#0e0b08' : 'var(--text-1)';
      tableBadge.style.cursor = canUnlock ? 'pointer' : 'not-allowed';
      tableTitleWrap.style.cursor = canUnlock ? 'pointer' : 'default';
      const handleUnlock = canUnlock
        ? (e: MouseEvent) => {
            e.stopPropagation();
            if (currentTableDef) {
              callbacks.onUnlockTable(currentTableDef.id);
            }
          }
        : null;
      tableBadge.onclick = handleUnlock;
      tableTitleWrap.onclick = handleUnlock;
    }

    prevBtn.disabled = !hasPrev;
    nextBtn.disabled = !hasNext;
    prevBtn.style.opacity = hasPrev ? '1' : '0.3';
    nextBtn.style.opacity = hasNext ? '1' : '0.3';
  }

  function updateSoundState(isMuted: boolean): void {
    soundBtn.innerHTML = isMuted ? ICONS.mute : ICONS.sound;
    soundBtn.setAttribute('aria-label', isMuted ? t('sound.unmute') : t('sound.mute'));
  }

  function updateFrenzy(remainingSeconds: number): void {
    if (remainingSeconds > 0) {
      frenzyBanner.style.display = 'block';
      frenzyBanner.textContent = t('frenzy.active', {
        s: String(Math.ceil(remainingSeconds)),
      });
    } else {
      frenzyBanner.style.display = 'none';
    }
  }

  function hideHint(): void {
    hintEl.classList.add('hidden');
    setTimeout(() => {
      hintEl.remove();
    }, 500);
  }

  function destroy(): void {
    root.remove();
    rebirthBarBtn.remove();
    hintEl.remove();
    frenzyBanner.remove();
    comboBanner.remove();
  }

  return {
    element: root,
    updateGold,
    updateRebirth,
    updateCombo,
    setDrawerCollapsed,
    updateTable,
    updateSoundState,
    updateFrenzy,
    hideHint,
    destroy,
  };
}
