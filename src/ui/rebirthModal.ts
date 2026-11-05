import {
  REBIRTH_UPGRADES,
  TOKEN_UPGRADE_BY_ID,
  type TokenUpgradeDef,
  type TokenUpgradeId,
} from '../data/upgrades';
import type { GameEngine } from '../core/game';
import { formatBig } from '../core/bignum';
import { ICONS } from './icons';
import { t } from '../i18n';

export interface RebirthModalOptions {
  container: HTMLElement;
  engine: GameEngine;
  onPerformRebirth: (allocations: Partial<Record<TokenUpgradeId, number>>) => number;
  onBuyTokenUpgrade: (id: TokenUpgradeId) => boolean;
  onClose: () => void;
}

const REBIRTH_ICON_MAP: Record<string, keyof typeof ICONS> = {
  sun: 'goldenHour',
  diamond: 'diamondCoins',
  magnet: 'magnetTouch',
  bolt: 'frenzy',
  coin: 'coin',
  speed: 'speed',
  hand: 'autoTosser',
  multi: 'multi',
  clover: 'luckyCoin',
  vault: 'offlineVault',
};

export function showRebirthModal(options: RebirthModalOptions): void {
  const { container, engine, onPerformRebirth, onBuyTokenUpgrade, onClose } = options;

  const draft: Partial<Record<TokenUpgradeId, number>> = {};

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog rebirth-modal-dialog token-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'rebirth-modal-title');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', t('common.close'));
  closeBtn.innerHTML = ICONS.close;
  closeBtn.onclick = () => {
    cleanup();
    onClose();
  };

  // Header
  const headerWrap = document.createElement('div');
  headerWrap.className = 'token-modal-header';

  const title = document.createElement('h2');
  title.id = 'rebirth-modal-title';
  title.className = 'modal-title';
  title.style.marginBottom = '4px';
  title.textContent = t('rebirth.modalTitle');

  const subtitle = document.createElement('p');
  subtitle.className = 'upgrade-desc';
  subtitle.style.marginBottom = '10px';
  subtitle.textContent = t('rebirth.modalSubtitle');

  const balancePill = document.createElement('div');
  balancePill.className = 'token-balance-pill tabular';

  headerWrap.appendChild(title);
  headerWrap.appendChild(subtitle);
  headerWrap.appendChild(balancePill);

  // Rebirth Talent Tree Container
  const listWrap = document.createElement('div');
  listWrap.className = 'token-upgrade-list rebirth-tree-wrap';

  interface RebirthCardRefs {
    def: TokenUpgradeDef;
    card: HTMLElement;
    badge: HTMLSpanElement;
    reqEl: HTMLDivElement;
    undoBtn: HTMLButtonElement;
    investBtn: HTMLButtonElement;
    investLabel: HTMLSpanElement;
    investCost: HTMLSpanElement;
  }

  const cardRefs: RebirthCardRefs[] = [];

  function calcDraftSpent(): number {
    let sum = 0;
    for (const def of REBIRTH_UPGRADES) {
      const count = draft[def.id] || 0;
      sum += count * def.tokenCost;
    }
    return sum;
  }

  /**
   * If a parent node was undone below level 1, automatically refund any draft points
   * on child/descendant nodes that are no longer unlocked.
   */
  function pruneLockedDrafts(): void {
    for (const def of REBIRTH_UPGRADES) {
      if ((draft[def.id] || 0) > 0 && !engine.isRebirthNodeUnlocked(def.id, draft)) {
        draft[def.id] = 0;
      }
    }
  }

  function createNodeCard(def: TokenUpgradeDef): HTMLElement {
    const card = document.createElement('div');
    card.className = 'upgrade-card rebirth-upgrade-card token-upgrade-card rebirth-tree-node';
    card.dataset.rebirthUpgradeId = def.id;

    const left = document.createElement('div');
    left.className = 'upgrade-left';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'upgrade-icon-wrap';
    const iconKey = REBIRTH_ICON_MAP[def.icon] || 'coin';
    iconWrap.innerHTML = ICONS[iconKey] || ICONS.coin;

    const info = document.createElement('div');
    info.className = 'upgrade-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'upgrade-title-row';

    const name = document.createElement('span');
    name.className = 'upgrade-name';
    name.textContent = t(def.nameKey as 'token.up5.name');

    const badge = document.createElement('span');
    badge.className = 'upgrade-badge tabular';

    titleRow.appendChild(name);
    titleRow.appendChild(badge);

    const desc = document.createElement('div');
    desc.className = 'upgrade-desc';
    desc.textContent = t(def.descKey as 'token.up5.desc');

    const reqEl = document.createElement('div');
    reqEl.className = 'rebirth-node-req';
    reqEl.style.display = 'none';

    info.appendChild(titleRow);
    info.appendChild(desc);
    info.appendChild(reqEl);

    left.appendChild(iconWrap);
    left.appendChild(info);

    const actionsRight = document.createElement('div');
    actionsRight.className = 'rebirth-node-actions';

    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'btn btn-secondary';
    undoBtn.style.minWidth = '34px';
    undoBtn.style.padding = '6px 8px';
    undoBtn.style.display = 'none';
    undoBtn.textContent = '−';
    undoBtn.setAttribute('aria-label', t('rebirth.undoBtn'));
    undoBtn.onclick = () => {
      const curDraft = draft[def.id] || 0;
      if (curDraft > 0) {
        draft[def.id] = curDraft - 1;
        pruneLockedDrafts();
        refreshModal();
      }
    };

    const investBtn = document.createElement('button');
    investBtn.type = 'button';
    investBtn.className = 'btn btn-primary upgrade-buy-btn';

    const investLabel = document.createElement('span');
    investLabel.className = 'upgrade-buy-label';

    const investCost = document.createElement('span');
    investCost.className = 'upgrade-buy-cost tabular';

    investBtn.appendChild(investLabel);
    investBtn.appendChild(investCost);

    investBtn.onclick = () => {
      if (!engine.isRebirthNodeUnlocked(def.id, draft)) return;
      const prog = engine.rebirthProgress();
      // If player has unspent rebirthPoints from a previous rebirth and no pending rebirth run, apply directly
      if (
        prog.pendingPoints <= 0 &&
        engine.isRebirthNodeUnlocked(def.id) &&
        (engine.state.rebirthPoints || 0) >= def.tokenCost
      ) {
        if (onBuyTokenUpgrade(def.id)) {
          card.classList.add('highlight');
          setTimeout(() => card.classList.remove('highlight'), 400);
          refreshModal();
        }
        return;
      }

      const totalPool = (engine.state.rebirthPoints || 0) + prog.pendingPoints;
      const remaining = totalPool - calcDraftSpent();
      const baseLvl = engine.tokenUpgradeLevel(def.id);
      const curDraft = draft[def.id] || 0;
      if (baseLvl + curDraft < def.maxLevel && remaining >= def.tokenCost) {
        draft[def.id] = curDraft + 1;
        card.classList.add('highlight');
        setTimeout(() => card.classList.remove('highlight'), 350);
        refreshModal();
      }
    };

    actionsRight.appendChild(undoBtn);
    actionsRight.appendChild(investBtn);

    if (def.branchZone) {
      card.classList.add(`rebirth-zone-${def.branchZone}`);
    }
    card.appendChild(left);
    card.appendChild(actionsRight);

    cardRefs.push({ def, card, badge, reqEl, undoBtn, investBtn, investLabel, investCost });
    return card;
  }

  // Build Gamblers Table style horizontal talent map:
  // [LEFT: Minions Branch] <--- [CENTER: Core Hub] ---> [RIGHT: 7 Coin Columns (Top Skill / Center Coin Unlock / Bottom Skill)]
  const mapBoard = document.createElement('div');
  mapBoard.className = 'rebirth-gt-board';

  // 1. LEFT WING: MINIONS BRANCH
  const minionsCol = document.createElement('div');
  minionsCol.className = 'rebirth-gt-wing rebirth-gt-minions';

  const minionsHeader = document.createElement('div');
  minionsHeader.className = 'rebirth-tier-label rebirth-gt-header';
  minionsHeader.textContent = `← ${t('tab.minions')}`;
  minionsCol.appendChild(minionsHeader);

  const minionDefs = REBIRTH_UPGRADES.filter((u) => u.branchZone === 'minions');
  for (let i = 0; i < minionDefs.length; i++) {
    if (i > 0) {
      const vLink = document.createElement('div');
      vLink.className = 'rebirth-gt-vlink';
      vLink.textContent = '↓';
      minionsCol.appendChild(vLink);
    }
    minionsCol.appendChild(createNodeCard(minionDefs[i]));
  }
  mapBoard.appendChild(minionsCol);

  // Connector between Left Minions Wing and Center Hub
  const leftBridge = document.createElement('div');
  leftBridge.className = 'rebirth-gt-hbridge';
  leftBridge.textContent = '←';
  mapBoard.appendChild(leftBridge);

  // 2. CENTER HUB: ROOT & CORE UPGRADES
  const hubCol = document.createElement('div');
  hubCol.className = 'rebirth-gt-wing rebirth-gt-hub';

  const hubHeader = document.createElement('div');
  hubHeader.className = 'rebirth-tier-label rebirth-gt-header';
  hubHeader.textContent = `★ ${t('tab.upgrades')}`;
  hubCol.appendChild(hubHeader);

  const hubDefs = REBIRTH_UPGRADES.filter((u) => u.branchZone === 'hub');
  for (let i = 0; i < hubDefs.length; i++) {
    if (i > 0) {
      const vLink = document.createElement('div');
      vLink.className = 'rebirth-gt-vlink';
      vLink.textContent = '↓';
      hubCol.appendChild(vLink);
    }
    hubCol.appendChild(createNodeCard(hubDefs[i]));
  }
  mapBoard.appendChild(hubCol);

  // 3. RIGHTWARD HORIZONTAL COIN SPINE (Columns 0..6: Ruby -> Celestial)
  const coinSpineWrap = document.createElement('div');
  coinSpineWrap.className = 'rebirth-gt-spine';

  const coinTierKeys = [
    'tier.ruby',
    'tier.amethyst',
    'tier.obsidian',
    'tier.mythril',
    'tier.astral',
    'tier.solar',
    'tier.celestial',
  ] as const;

  for (let colIdx = 0; colIdx < 7; colIdx++) {
    const hBridge = document.createElement('div');
    hBridge.className = 'rebirth-gt-hbridge';
    hBridge.textContent = '→';
    coinSpineWrap.appendChild(hBridge);

    const colEl = document.createElement('div');
    colEl.className = 'rebirth-gt-coin-col';

    const colHeader = document.createElement('div');
    colHeader.className = 'rebirth-tier-label rebirth-gt-header';
    colHeader.textContent = t(coinTierKeys[colIdx]);
    colEl.appendChild(colHeader);

    const topDef = REBIRTH_UPGRADES.find((u) => u.coinCol === colIdx && u.branchZone === 'top');
    const centerDef = REBIRTH_UPGRADES.find((u) => u.coinCol === colIdx && u.branchZone === 'coin');
    const bottomDef = REBIRTH_UPGRADES.find(
      (u) => u.coinCol === colIdx && u.branchZone === 'bottom',
    );

    if (topDef) {
      colEl.appendChild(createNodeCard(topDef));
      const upArrow = document.createElement('div');
      upArrow.className = 'rebirth-gt-vlink is-up';
      upArrow.textContent = '↑';
      colEl.appendChild(upArrow);
    }

    if (centerDef) {
      colEl.appendChild(createNodeCard(centerDef));
    }

    if (bottomDef) {
      const downArrow = document.createElement('div');
      downArrow.className = 'rebirth-gt-vlink is-down';
      downArrow.textContent = '↓';
      colEl.appendChild(downArrow);
      colEl.appendChild(createNodeCard(bottomDef));
    }

    coinSpineWrap.appendChild(colEl);
  }

  mapBoard.appendChild(coinSpineWrap);
  listWrap.appendChild(mapBoard);

  // Enable smooth click-and-drag panning on the horizontal talent board
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let scrollLeftStart = 0;
  let scrollTopStart = 0;
  listWrap.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    scrollLeftStart = listWrap.scrollLeft;
    scrollTopStart = listWrap.scrollTop;
  });
  listWrap.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    listWrap.scrollLeft = scrollLeftStart - dx;
    listWrap.scrollTop = scrollTopStart - dy;
  });
  listWrap.addEventListener('pointerup', () => {
    isDragging = false;
  });
  listWrap.addEventListener('pointercancel', () => {
    isDragging = false;
  });

  // Bottom Rebirth Confirmation Card
  const rebirthCard = document.createElement('div');
  rebirthCard.className = 'rebirth-modal-card';

  const rebirthHeaderRow = document.createElement('div');
  rebirthHeaderRow.className = 'rebirth-modal-top';

  const rebirthCardTitle = document.createElement('div');
  rebirthCardTitle.className = 'upgrade-name';
  rebirthCardTitle.textContent = t('rebirth.cardTitle');

  const rebirthCardBadge = document.createElement('span');
  rebirthCardBadge.className = 'upgrade-badge tabular';

  rebirthHeaderRow.appendChild(rebirthCardTitle);
  rebirthHeaderRow.appendChild(rebirthCardBadge);

  const rebirthCardDesc = document.createElement('div');
  rebirthCardDesc.className = 'upgrade-desc';
  rebirthCardDesc.textContent = t('rebirth.cardDesc');

  const rebirthProgWrap = document.createElement('div');
  rebirthProgWrap.className = 'rebirth-modal-prog-wrap';

  const rebirthProgTrack = document.createElement('div');
  rebirthProgTrack.className = 'rebirth-modal-track';

  const rebirthProgFill = document.createElement('div');
  rebirthProgFill.className = 'rebirth-modal-fill';
  rebirthProgTrack.appendChild(rebirthProgFill);

  const rebirthProgLabel = document.createElement('div');
  rebirthProgLabel.className = 'rebirth-modal-prog-label tabular';

  rebirthProgWrap.appendChild(rebirthProgTrack);
  rebirthProgWrap.appendChild(rebirthProgLabel);

  const rebirthActionBtn = document.createElement('button');
  rebirthActionBtn.type = 'button';
  rebirthActionBtn.className = 'btn btn-primary rebirth-action-btn tabular';
  rebirthActionBtn.onclick = () => {
    const pts = onPerformRebirth(draft);
    if (pts > 0) {
      cleanup();
      onClose();
    }
  };

  rebirthCard.appendChild(rebirthHeaderRow);
  rebirthCard.appendChild(rebirthCardDesc);
  rebirthCard.appendChild(rebirthProgWrap);
  rebirthCard.appendChild(rebirthActionBtn);

  function refreshModal(): void {
    const prog = engine.rebirthProgress();
    const unspent = engine.state.rebirthPoints || 0;
    const totalPool = unspent + prog.pendingPoints;
    const spent = calcDraftSpent();
    const remaining = Math.max(0, totalPool - spent);

    balancePill.innerHTML = `${ICONS.diamondCoins} <span>${t('rebirth.pointsPool', {
      avail: String(remaining),
      pending: String(prog.pendingPoints),
    })}</span>`;

    const totalEarnedPts = engine.totalRebirthPoints();
    const bonusPct = Math.round(totalEarnedPts * engine.rebirthPointPassiveBonus() * 100);
    rebirthCardBadge.textContent = t('rebirth.cardBadge', {
      n: String(totalEarnedPts),
      pct: String(bonusPct),
    });

    const pctInt = Math.min(100, Math.max(0, Math.floor(prog.ratio * 100)));
    rebirthProgFill.style.width = `${pctInt}%`;
    rebirthProgLabel.textContent = t('rebirth.barSub', {
      cur: formatBig(prog.currentStepGold),
      next: formatBig(prog.nextStepCost),
      pct: String(pctInt),
    });

    if (prog.pendingPoints > 0) {
      rebirthActionBtn.disabled = false;
      rebirthActionBtn.textContent = t('rebirth.doRebirth', { n: String(prog.pendingPoints) });
    } else {
      rebirthActionBtn.disabled = true;
      const rem =
        prog.nextStepCost > prog.currentStepGold ? prog.nextStepCost - prog.currentStepGold : 0n;
      rebirthActionBtn.textContent = t('rebirth.needMore', { next: formatBig(rem) });
    }

    for (const ref of cardRefs) {
      const baseLvl = engine.tokenUpgradeLevel(ref.def.id);
      const draftAdd = draft[ref.def.id] || 0;
      const effectiveLvl = baseLvl + draftAdd;
      const isMaxed = effectiveLvl >= ref.def.maxLevel;
      const isUnlocked = engine.isRebirthNodeUnlocked(ref.def.id, draft);

      ref.card.classList.toggle('rebirth-node-locked', !isUnlocked);
      ref.card.classList.toggle('rebirth-node-active', isUnlocked && effectiveLvl >= 1);

      if (!isUnlocked && ref.def.requires && ref.def.requires.length > 0) {
        const parentNames = ref.def.requires
          .map((reqId) => {
            const pDef = TOKEN_UPGRADE_BY_ID[reqId];
            return pDef ? t(pDef.nameKey as 'token.up5.name').split(' (')[0] : reqId;
          })
          .join(' / ');
        ref.reqEl.style.display = 'block';
        ref.reqEl.textContent = t('rebirth.lockedReq', { name: parentNames });
      } else {
        ref.reqEl.style.display = 'none';
      }

      if (draftAdd > 0) {
        ref.badge.textContent = `${t('up.level', { n: String(baseLvl) })}/${ref.def.maxLevel} (${t('rebirth.selectedTag', { n: String(draftAdd) })})`;
        ref.undoBtn.style.display = 'inline-flex';
      } else {
        ref.badge.textContent = `${t('up.level', { n: String(baseLvl) })}/${ref.def.maxLevel}`;
        ref.undoBtn.style.display = 'none';
      }

      if (!isUnlocked) {
        ref.investBtn.disabled = true;
        ref.investLabel.textContent = t('table.locked');
        ref.investCost.textContent = t('rebirth.barPoints', { n: String(ref.def.tokenCost) });
      } else if (isMaxed) {
        ref.investBtn.disabled = true;
        ref.investLabel.textContent = t('up.maxed');
        ref.investCost.textContent = '';
      } else {
        const canAfford = remaining >= ref.def.tokenCost;
        ref.investBtn.disabled = !canAfford;
        ref.investLabel.textContent = t('up.buy');
        ref.investCost.textContent = t('rebirth.barPoints', { n: String(ref.def.tokenCost) });
      }
    }
  }

  refreshModal();

  dialog.appendChild(closeBtn);
  dialog.appendChild(headerWrap);
  dialog.appendChild(listWrap);
  dialog.appendChild(rebirthCard);
  backdrop.appendChild(dialog);
  container.appendChild(backdrop);

  requestAnimationFrame(() => {
    listWrap.scrollTop = 0;
    listWrap.scrollLeft = 0;
  });

  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      cleanup();
      onClose();
    }
  };

  function cleanup(): void {
    backdrop.remove();
  }
}
