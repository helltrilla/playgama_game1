import { AD_TOKEN_UPGRADES, type TokenUpgradeDef, type TokenUpgradeId } from '../data/upgrades';
import type { GameEngine } from '../core/game';
import { ICONS } from './icons';
import { t } from '../i18n';

export interface TokenModalOptions {
  container: HTMLElement;
  engine: GameEngine;
  isRewardedSupported: boolean;
  onWatchAdForToken: () => Promise<boolean>;
  onWatchAdForX2: () => Promise<boolean>;
  onBuyTokenUpgrade: (id: TokenUpgradeId) => boolean;
  onClose: () => void;
}

const TOKEN_ICON_MAP: Record<string, keyof typeof ICONS> = {
  sun: 'goldenHour',
  diamond: 'diamondCoins',
  magnet: 'magnetTouch',
  bolt: 'frenzy',
  coin: 'coin',
  speed: 'speed',
  hand: 'autoTosser',
  multi: 'multi',
};

export function showTokenBranchModal(options: TokenModalOptions): void {
  const {
    container,
    engine,
    isRewardedSupported,
    onWatchAdForToken,
    onWatchAdForX2,
    onBuyTokenUpgrade,
    onClose,
  } = options;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog token-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'token-modal-title');

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
  title.id = 'token-modal-title';
  title.className = 'modal-title';
  title.style.marginBottom = '4px';
  title.textContent = t('token.title');

  const subtitle = document.createElement('p');
  subtitle.className = 'upgrade-desc';
  subtitle.style.marginBottom = '10px';
  subtitle.textContent = t('token.subtitle');

  const balancePill = document.createElement('div');
  balancePill.className = 'token-balance-pill tabular';

  headerWrap.appendChild(title);
  headerWrap.appendChild(subtitle);
  headerWrap.appendChild(balancePill);

  // Earn Tokens Banner Card (Watch Ad -> +1 Token)
  const earnCard = document.createElement('div');
  earnCard.className = 'token-earn-card';

  const earnInfo = document.createElement('div');
  earnInfo.className = 'upgrade-info';

  const earnTitle = document.createElement('div');
  earnTitle.className = 'upgrade-name';
  earnTitle.textContent = t('token.earnTitle');

  const earnDesc = document.createElement('div');
  earnDesc.className = 'upgrade-desc';
  earnDesc.textContent = t('token.earnDesc');

  earnInfo.appendChild(earnTitle);
  earnInfo.appendChild(earnDesc);

  const watchAdBtn = document.createElement('button');
  watchAdBtn.className = 'btn btn-rewarded token-watch-btn';
  watchAdBtn.innerHTML = `<span class="ad-btn-icon">${ICONS.adPlay}</span><span>${t('token.watchAd')}</span>`;

  let watching = false;
  watchAdBtn.onclick = async () => {
    if (watching) return;
    watching = true;
    watchAdBtn.disabled = true;
    try {
      await onWatchAdForToken();
    } finally {
      watching = false;
      watchAdBtn.disabled = false;
      refreshModal();
    }
  };

  earnCard.appendChild(earnInfo);
  if (isRewardedSupported) {
    earnCard.appendChild(watchAdBtn);
  }

  // Upgrade List (4 Ad/Token Upgrades: tokenUp1..tokenUp4)
  const listWrap = document.createElement('div');
  listWrap.className = 'token-upgrade-list';

  interface TokenCardRefs {
    def: TokenUpgradeDef;
    badge: HTMLSpanElement;
    buyBtn: HTMLButtonElement;
    buyLabel: HTMLSpanElement;
    buyCost: HTMLSpanElement;
  }

  const cardRefs: TokenCardRefs[] = [];

  for (const def of AD_TOKEN_UPGRADES) {
    const card = document.createElement('div');
    card.className = 'upgrade-card token-upgrade-card';
    card.dataset.tokenUpgradeId = def.id;

    const left = document.createElement('div');
    left.className = 'upgrade-left';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'upgrade-icon-wrap ad-icon';
    const iconKey = TOKEN_ICON_MAP[def.icon] || 'coin';
    iconWrap.innerHTML = ICONS[iconKey] || ICONS.coin;

    const info = document.createElement('div');
    info.className = 'upgrade-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'upgrade-title-row';

    const name = document.createElement('span');
    name.className = 'upgrade-name';
    name.textContent = t(def.nameKey as 'token.up1.name');

    const badge = document.createElement('span');
    badge.className = 'upgrade-badge tabular';

    titleRow.appendChild(name);
    titleRow.appendChild(badge);

    const desc = document.createElement('div');
    desc.className = 'upgrade-desc';
    desc.textContent = t(def.descKey as 'token.up1.desc');

    info.appendChild(titleRow);
    info.appendChild(desc);

    left.appendChild(iconWrap);
    left.appendChild(info);

    const buyBtn = document.createElement('button');
    buyBtn.className = def.isAdBoost
      ? 'btn btn-rewarded upgrade-buy-btn'
      : 'btn btn-primary upgrade-buy-btn';

    const buyLabel = document.createElement('span');
    buyLabel.className = 'upgrade-buy-label';

    const buyCost = document.createElement('span');
    buyCost.className = 'upgrade-buy-cost tabular';

    buyBtn.appendChild(buyLabel);
    buyBtn.appendChild(buyCost);

    buyBtn.onclick = async () => {
      if (def.isAdBoost) {
        if (watching) return;
        watching = true;
        buyBtn.disabled = true;
        try {
          const ok = await onWatchAdForX2();
          if (ok) {
            card.classList.add('highlight');
            setTimeout(() => card.classList.remove('highlight'), 400);
          }
        } finally {
          watching = false;
          refreshModal();
        }
        return;
      }
      const ok = onBuyTokenUpgrade(def.id);
      if (ok) {
        card.classList.add('highlight');
        setTimeout(() => card.classList.remove('highlight'), 400);
        refreshModal();
      }
    };

    card.appendChild(left);
    card.appendChild(buyBtn);
    listWrap.appendChild(card);

    cardRefs.push({ def, badge, buyBtn, buyLabel, buyCost });
  }

  function refreshModal(): void {
    const tokens = engine.state.tokens || 0;
    balancePill.innerHTML = `${ICONS.coin} <span>${t('token.balance', { n: String(tokens) })}</span>`;

    for (const ref of cardRefs) {
      if (ref.def.isAdBoost) {
        const remSec = engine.adX2RemainingSeconds();
        ref.badge.textContent = remSec > 0 ? t('token.x2Active', { s: String(remSec) }) : 'x2 (5m)';
        ref.buyBtn.disabled = !isRewardedSupported || watching;
        ref.buyLabel.textContent = t('token.watchAdX2');
        ref.buyCost.textContent = '';
        continue;
      }

      const lvl = engine.tokenUpgradeLevel(ref.def.id);
      const isMaxed = lvl >= ref.def.maxLevel;
      ref.badge.textContent = `${t('up.level', { n: String(lvl) })}/${ref.def.maxLevel}`;

      if (isMaxed) {
        ref.buyBtn.disabled = true;
        ref.buyLabel.textContent = t('up.maxed');
        ref.buyCost.textContent = '';
      } else {
        const canAfford = tokens >= ref.def.tokenCost;
        ref.buyBtn.disabled = !canAfford;
        ref.buyLabel.textContent = t('up.buy');
        ref.buyCost.textContent = t('token.buyCost', { n: String(ref.def.tokenCost) });
      }
    }
  }

  refreshModal();

  dialog.appendChild(closeBtn);
  dialog.appendChild(headerWrap);
  dialog.appendChild(earnCard);
  dialog.appendChild(listWrap);
  backdrop.appendChild(dialog);
  container.appendChild(backdrop);

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
