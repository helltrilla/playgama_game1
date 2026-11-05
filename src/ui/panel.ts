import { formatBig } from '../core/bignum';
import { ICONS, type IconKey } from './icons';
import { t } from '../i18n';
import {
  UPGRADES,
  AD_BOOSTS,
  ALCHEMY_BREW_DURATION_MS,
  COIN_TIERS,
  type UpgradeId,
  type AdBoostId,
  type UpgradeDef,
  type AdBoostDef,
  type CoinTier,
} from '../data/upgrades';
import type { GameState } from '../core/save';
import type { GameEngine, AlchemyOutcome } from '../core/game';

export interface PanelCallbacks {
  onBuyUpgrade: (id: UpgradeId) => void;
  onSetBuyMode: (mode: 'x1' | 'x10' | 'max') => void;
  onWatchAdBoost: (id: AdBoostId) => void;
  onActivateFrenzy: () => void;
  onStartAlchemyBrew?: () => boolean;
  onFinishAlchemyBrew?: () => AlchemyOutcome;
  onFuseCoinTier?: (tier: CoinTier) => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export interface PanelComponent {
  element: HTMLElement;
  update: (
    state: GameState,
    engine: GameEngine,
    isRewardedSupported: boolean,
    nowSec: number,
  ) => void;
  selectTab: (tab: 'upgrades' | 'coins' | 'minions' | 'alchemy' | 'stats' | 'ads') => void;
  destroy: () => void;
}

const UPGRADE_ICON_MAP: Record<string, IconKey> = {
  coin: 'coinValue',
  hand: 'autoTosser',
  speed: 'speed',
  multi: 'multi',
  clover: 'luckyCoin',
  vault: 'offlineVault',
  sun: 'goldenHour',
  bolt: 'frenzy',
  diamond: 'diamondCoins',
};

const AD_ICON_MAP: Record<string, IconKey> = {
  sun: 'goldenHour',
  diamond: 'diamondCoins',
  magnet: 'magnetTouch',
  clock: 'timeWarp',
  bolt: 'frenzy',
  hand: 'autoTosser',
  clover: 'luckyCoin',
  coin: 'coinValue',
  speed: 'speed',
};

const TIER_COLORS: Record<CoinTier, { border: string; bg: string; color: string }> = {
  bronze: {
    border: 'rgba(205, 127, 50, 0.55)',
    bg: 'rgba(205, 127, 50, 0.16)',
    color: '#e59856',
  },
  silver: {
    border: 'rgba(200, 214, 229, 0.6)',
    bg: 'rgba(200, 214, 229, 0.16)',
    color: '#e2e8f0',
  },
  gold: {
    border: 'rgba(251, 191, 36, 0.65)',
    bg: 'rgba(251, 191, 36, 0.18)',
    color: '#fbbf24',
  },
  platinum: {
    border: 'rgba(199, 210, 254, 0.68)',
    bg: 'rgba(199, 210, 254, 0.18)',
    color: '#c7d2fe',
  },
  sapphire: {
    border: 'rgba(59, 130, 246, 0.68)',
    bg: 'rgba(59, 130, 246, 0.18)',
    color: '#60a5fa',
  },
  emerald: {
    border: 'rgba(16, 185, 129, 0.68)',
    bg: 'rgba(16, 185, 129, 0.18)',
    color: '#34d399',
  },
  diamond: {
    border: 'rgba(56, 189, 248, 0.72)',
    bg: 'rgba(56, 189, 248, 0.2)',
    color: '#7dd3fc',
  },
  ruby: {
    border: 'rgba(244, 63, 94, 0.72)',
    bg: 'rgba(244, 63, 94, 0.18)',
    color: '#fb7185',
  },
  amethyst: {
    border: 'rgba(168, 85, 247, 0.72)',
    bg: 'rgba(168, 85, 247, 0.18)',
    color: '#c084fc',
  },
  obsidian: {
    border: 'rgba(148, 163, 184, 0.68)',
    bg: 'rgba(30, 41, 59, 0.45)',
    color: '#cbd5e1',
  },
  mythril: {
    border: 'rgba(45, 212, 191, 0.72)',
    bg: 'rgba(45, 212, 191, 0.18)',
    color: '#5eead4',
  },
  astral: {
    border: 'rgba(129, 140, 248, 0.72)',
    bg: 'rgba(129, 140, 248, 0.2)',
    color: '#a5b4fc',
  },
  solar: {
    border: 'rgba(249, 115, 22, 0.75)',
    bg: 'rgba(249, 115, 22, 0.2)',
    color: '#fdba74',
  },
  celestial: {
    border: 'rgba(244, 114, 182, 0.78)',
    bg: 'rgba(244, 114, 182, 0.22)',
    color: '#f9a8d4',
  },
};

const COUNT_UPGRADE_TO_TIER: Partial<Record<UpgradeId, CoinTier>> = {
  multiToss: 'bronze',
  silverCoins: 'silver',
  goldCoins: 'gold',
  platinumCoins: 'platinum',
  sapphireCoins: 'sapphire',
  emeraldCoins: 'emerald',
  diamondTierCoins: 'diamond',
  rubyCoins: 'ruby',
  amethystCoins: 'amethyst',
  obsidianCoins: 'obsidian',
  mythrilCoins: 'mythril',
  astralCoins: 'astral',
  solarCoins: 'solar',
  celestialCoins: 'celestial',
};

interface UpgradeCardElements {
  card: HTMLElement;
  homeParent: HTMLElement;
  homeAnchor: Comment;
  name: HTMLElement;
  desc: HTMLElement;
  badge: HTMLElement;
  effect: HTMLElement;
  buyBtn: HTMLButtonElement;
  buyLabel: HTMLElement;
  buyCost: HTMLElement;
  fuseBtn?: HTMLButtonElement;
  fuseTier?: CoinTier;
}

interface CoinSectionHeaderElements {
  root: HTMLElement;
  titleEl: HTMLElement;
  countEl: HTMLElement;
  fuseBtn: HTMLButtonElement | null;
}

interface StatsTierCardElements {
  root: HTMLElement;
  titleEl: HTMLElement;
  countBadge: HTMLElement;
  perCoinEl: HTMLElement;
  totalTierEl: HTMLElement;
  singleValEl: HTMLElement;
  actual10sEl: HTMLElement;
  estAutoEl: HTMLElement;
  fuseBtn: HTMLButtonElement | null;
}

interface AdCardElements {
  card: HTMLElement;
  name: HTMLElement;
  desc: HTMLElement;
  badge?: HTMLElement;
  effect: HTMLElement;
  actionBtn: HTMLButtonElement;
}

export function createPanel(container: HTMLElement, callbacks: PanelCallbacks): PanelComponent {
  let buyMode: 'x1' | 'x10' | 'max' = 'x1';
  let isCollapsed = false;

  const root = document.createElement('aside');
  root.className = 'panel-container';

  // Mobile drawer handle (supports both tap and vertical swipe/drag)
  const handleEl = document.createElement('div');
  handleEl.className = 'panel-handle';
  handleEl.setAttribute('role', 'button');
  handleEl.setAttribute('aria-label', t('panel.collapse'));

  const handleBar = document.createElement('div');
  handleBar.className = 'panel-handle-bar';

  const handleLabelWrap = document.createElement('div');
  handleLabelWrap.className = 'panel-handle-label-wrap';

  const handleLabel = document.createElement('span');
  handleLabel.className = 'panel-handle-label';
  handleLabel.textContent = t('panel.collapse');

  const handleChevron = document.createElement('span');
  handleChevron.className = 'panel-handle-chevron';
  handleChevron.innerHTML = ICONS.arrowL;

  handleLabelWrap.appendChild(handleLabel);
  handleLabelWrap.appendChild(handleChevron);
  handleEl.appendChild(handleBar);
  handleEl.appendChild(handleLabelWrap);

  function setCollapsed(nextCollapsed: boolean): void {
    isCollapsed = nextCollapsed;
    root.style.transition = '';
    root.style.transform = '';
    root.classList.toggle('collapsed', isCollapsed);
    handleLabel.textContent = isCollapsed ? t('panel.expand') : t('panel.collapse');
    handleEl.setAttribute('aria-label', isCollapsed ? t('panel.expand') : t('panel.collapse'));
    callbacks.onCollapseChange?.(isCollapsed);
  }

  let dragPointerId: number | null = null;
  let dragStartY = 0;
  let isDraggingHandle = false;
  let lastPointerToggleAt = 0;

  handleEl.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    dragPointerId = e.pointerId;
    dragStartY = e.clientY;
    isDraggingHandle = false;
    try {
      handleEl.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  });

  handleEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragPointerId) return;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dy) > 8) {
      isDraggingHandle = true;
      const panelH = root.offsetHeight || 300;
      const collapsedOffset = Math.max(0, panelH - 76);
      const baseOffset = isCollapsed ? collapsedOffset : 0;
      const clampedOffset = Math.min(collapsedOffset, Math.max(0, baseOffset + dy));
      root.style.transition = 'none';
      root.style.transform = `translateY(${clampedOffset}px)`;
    }
  });

  const finishHandlePointer = (e: PointerEvent, cancelled = false) => {
    if (e.pointerId !== dragPointerId) return;
    dragPointerId = null;
    try {
      handleEl.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const dy = e.clientY - dragStartY;
    if (cancelled) {
      setCollapsed(isCollapsed);
      return;
    }
    lastPointerToggleAt = performance.now();
    if (isDraggingHandle) {
      if (!isCollapsed && dy > 26) {
        setCollapsed(true);
      } else if (isCollapsed && dy < -26) {
        setCollapsed(false);
      } else {
        setCollapsed(isCollapsed);
      }
    } else {
      setCollapsed(!isCollapsed);
    }
    isDraggingHandle = false;
  };

  handleEl.addEventListener('pointerup', (e) => finishHandlePointer(e, false));
  handleEl.addEventListener('pointercancel', (e) => finishHandlePointer(e, true));

  handleEl.onclick = (e) => {
    e.stopPropagation();
    if (performance.now() - lastPointerToggleAt < 350) return;
    setCollapsed(!isCollapsed);
  };
  root.appendChild(handleEl);

  // Panel header
  const header = document.createElement('div');
  header.className = 'panel-header';

  // Top Tabs: Upgrades | Coins | Minions | Alchemy | Stats | Maxed | Ad Boosts
  const tabsWrap = document.createElement('div');
  tabsWrap.className = 'panel-tabs';

  function makeTabBtn(
    className: string,
    initialLabel: string,
    badgeClass: 'panel-tab-dot' | 'panel-tab-badge' | null,
  ): { btn: HTMLButtonElement; labelEl: HTMLSpanElement; dotEl: HTMLSpanElement | null } {
    const btn = document.createElement('button');
    btn.className = className;
    const labelEl = document.createElement('span');
    labelEl.textContent = initialLabel;
    btn.appendChild(labelEl);
    let dotEl: HTMLSpanElement | null = null;
    if (badgeClass) {
      dotEl = document.createElement('span');
      dotEl.className = badgeClass;
      btn.appendChild(dotEl);
    }
    return { btn, labelEl, dotEl };
  }

  const tabUpgradesObj = makeTabBtn('panel-tab active', t('tab.upgrades'), 'panel-tab-dot');
  const tabCoinsObj = makeTabBtn('panel-tab', t('tab.coins'), 'panel-tab-dot');
  const tabMinionsObj = makeTabBtn('panel-tab', t('tab.minions'), 'panel-tab-dot');
  const tabAlchemyObj = makeTabBtn('panel-tab tab-alchemy', t('tab.alchemy'), 'panel-tab-dot');
  const tabStatsObj = makeTabBtn('panel-tab tab-stats', t('tab.stats'), null);
  const tabMaxedObj = makeTabBtn('panel-tab tab-maxed', t('tab.maxed'), null);
  tabMaxedObj.btn.style.display = 'none';
  const tabAdsObj = makeTabBtn('panel-tab tab-ad', t('tab.ads'), 'panel-tab-badge');

  const tabUpgrades = tabUpgradesObj.btn;
  const tabCoins = tabCoinsObj.btn;
  const tabMinions = tabMinionsObj.btn;
  const tabAlchemy = tabAlchemyObj.btn;
  const tabStats = tabStatsObj.btn;
  const tabMaxed = tabMaxedObj.btn;
  const tabAds = tabAdsObj.btn;

  tabUpgrades.dataset.tab = 'upgrades';
  tabCoins.dataset.tab = 'coins';
  tabMinions.dataset.tab = 'minions';
  tabAlchemy.dataset.tab = 'alchemy';
  tabStats.dataset.tab = 'stats';
  tabMaxed.dataset.tab = 'maxed';
  tabAds.dataset.tab = 'ads';

  const allTabBtns = [tabUpgrades, tabCoins, tabMinions, tabAlchemy, tabStats, tabMaxed, tabAds];

  function activateTab(
    activeBtn: HTMLButtonElement,
    activeView: HTMLElement,
    showMode: boolean,
    forceOpen = false,
  ) {
    const isAlreadyActive = activeBtn.classList.contains('active');
    const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    const isOnboarding =
      typeof document !== 'undefined' && document.body.classList.contains('onboarding-active');
    if (!forceOpen && !isOnboarding && isPortrait && isAlreadyActive && !isCollapsed) {
      setCollapsed(true);
      return;
    }
    setCollapsed(false);
    for (const btn of allTabBtns) {
      btn.classList.toggle('active', btn === activeBtn);
    }
    upgradesContainer.style.display = activeView === upgradesContainer ? 'flex' : 'none';
    coinsContainer.style.display = activeView === coinsContainer ? 'flex' : 'none';
    minionsContainer.style.display = activeView === minionsContainer ? 'flex' : 'none';
    alchemyContainer.style.display = activeView === alchemyContainer ? 'flex' : 'none';
    statsContainer.style.display = activeView === statsContainer ? 'flex' : 'none';
    maxedContainer.style.display = activeView === maxedContainer ? 'flex' : 'none';
    adsContainer.style.display = activeView === adsContainer ? 'flex' : 'none';
    modeWrap.style.display = showMode ? 'flex' : 'none';
  }

  function selectTab(tab: 'upgrades' | 'coins' | 'minions' | 'alchemy' | 'stats' | 'ads'): void {
    if (tab === 'upgrades') activateTab(tabUpgrades, upgradesContainer, true, true);
    else if (tab === 'coins') activateTab(tabCoins, coinsContainer, true, true);
    else if (tab === 'minions') activateTab(tabMinions, minionsContainer, true, true);
    else if (tab === 'alchemy') activateTab(tabAlchemy, alchemyContainer, false, true);
    else if (tab === 'stats') activateTab(tabStats, statsContainer, false, true);
    else if (tab === 'ads') activateTab(tabAds, adsContainer, false, true);
  }

  tabUpgrades.onclick = () => activateTab(tabUpgrades, upgradesContainer, true);
  tabCoins.onclick = () => activateTab(tabCoins, coinsContainer, true);
  tabMinions.onclick = () => activateTab(tabMinions, minionsContainer, true);
  tabAlchemy.onclick = () => activateTab(tabAlchemy, alchemyContainer, false);
  tabStats.onclick = () => activateTab(tabStats, statsContainer, false);
  tabMaxed.onclick = () => activateTab(tabMaxed, maxedContainer, false);
  tabAds.onclick = () => activateTab(tabAds, adsContainer, false);

  tabsWrap.appendChild(tabUpgrades);
  tabsWrap.appendChild(tabCoins);
  tabsWrap.appendChild(tabMinions);
  tabsWrap.appendChild(tabAlchemy);
  tabsWrap.appendChild(tabStats);
  tabsWrap.appendChild(tabMaxed);
  tabsWrap.appendChild(tabAds);

  // Buy Mode switcher (x1 / x10 / Max)
  const modeWrap = document.createElement('div');
  modeWrap.className = 'mode-switcher';

  const modeButtons: Record<'x1' | 'x10' | 'max', HTMLButtonElement> = {
    x1: document.createElement('button'),
    x10: document.createElement('button'),
    max: document.createElement('button'),
  };

  const modes: ('x1' | 'x10' | 'max')[] = ['x1', 'x10', 'max'];
  for (const m of modes) {
    const btn = modeButtons[m];
    btn.className = `mode-btn ${m === buyMode ? 'active' : ''}`;
    btn.textContent = t(`mode.${m}` as 'mode.x1');
    btn.onclick = () => {
      buyMode = m;
      for (const other of modes) {
        modeButtons[other].classList.toggle('active', other === m);
      }
      callbacks.onSetBuyMode(m);
    };
    modeWrap.appendChild(btn);
  }

  header.appendChild(tabsWrap);
  header.appendChild(modeWrap);
  root.appendChild(header);

  // Panel content scrollable list
  const content = document.createElement('div');
  content.className = 'panel-content';

  const upgradesContainer = document.createElement('div');
  upgradesContainer.style.display = 'flex';
  upgradesContainer.style.flexDirection = 'column';
  upgradesContainer.style.gap = '10px';

  const coinsContainer = document.createElement('div');
  coinsContainer.style.display = 'none';
  coinsContainer.style.flexDirection = 'column';
  coinsContainer.style.gap = '10px';

  const minionsContainer = document.createElement('div');
  minionsContainer.style.display = 'none';
  minionsContainer.style.flexDirection = 'column';
  minionsContainer.style.gap = '10px';

  const alchemyContainer = document.createElement('div');
  alchemyContainer.style.display = 'none';
  alchemyContainer.style.flexDirection = 'column';
  alchemyContainer.style.gap = '12px';

  const statsContainer = document.createElement('div');
  statsContainer.style.display = 'none';
  statsContainer.style.flexDirection = 'column';
  statsContainer.style.gap = '10px';

  const maxedContainer = document.createElement('div');
  maxedContainer.style.display = 'none';
  maxedContainer.style.flexDirection = 'column';
  maxedContainer.style.gap = '10px';

  const adsContainer = document.createElement('div');
  adsContainer.style.display = 'none';
  adsContainer.style.flexDirection = 'column';
  adsContainer.style.gap = '10px';

  content.appendChild(upgradesContainer);
  content.appendChild(coinsContainer);
  content.appendChild(minionsContainer);
  content.appendChild(alchemyContainer);
  content.appendChild(statsContainer);
  content.appendChild(maxedContainer);
  content.appendChild(adsContainer);
  root.appendChild(content);

  container.appendChild(root);

  // Category Type Banners (Active Income / Passive Income / Global Multiplier Coin Unlocks)
  const unlockCategoryBanner = document.createElement('div');
  unlockCategoryBanner.className = 'up-category-banner unlock';
  unlockCategoryBanner.textContent = t('up.type.unlock');
  upgradesContainer.appendChild(unlockCategoryBanner);

  const activeCategoryBanner = document.createElement('div');
  activeCategoryBanner.className = 'up-category-banner active-income';
  activeCategoryBanner.textContent = t('up.type.active');
  coinsContainer.appendChild(activeCategoryBanner);

  const passiveCategoryBanner = document.createElement('div');
  passiveCategoryBanner.className = 'up-category-banner passive-income';
  passiveCategoryBanner.textContent = t('up.type.passive');
  minionsContainer.appendChild(passiveCategoryBanner);

  // Section headers for the Coins tab (all 14 tiers) with 5 -> 1 Coin Fusion button
  const coinSectionHeaders: Record<CoinTier, CoinSectionHeaderElements> = {
    bronze: createSectionHeader('bronze'),
    silver: createSectionHeader('silver'),
    gold: createSectionHeader('gold'),
    platinum: createSectionHeader('platinum'),
    sapphire: createSectionHeader('sapphire'),
    emerald: createSectionHeader('emerald'),
    diamond: createSectionHeader('diamond'),
    ruby: createSectionHeader('ruby'),
    amethyst: createSectionHeader('amethyst'),
    obsidian: createSectionHeader('obsidian'),
    mythril: createSectionHeader('mythril'),
    astral: createSectionHeader('astral'),
    solar: createSectionHeader('solar'),
    celestial: createSectionHeader('celestial'),
  };
  const addedCoinSections = new Set<CoinTier>();

  function createSectionHeader(tier: CoinTier): CoinSectionHeaderElements {
    const el = document.createElement('div');
    el.className = 'upgrade-section-header';
    const style = TIER_COLORS[tier];
    el.style.padding = '8px 10px';
    el.style.borderRadius = '8px';
    el.style.color = style.color;
    el.style.background = style.bg;
    el.style.border = `1px solid ${style.border}`;
    el.style.marginTop = tier === 'bronze' ? '0px' : '6px';

    const topRow = document.createElement('div');
    topRow.className = 'coin-section-header-row';

    const leftWrap = document.createElement('div');
    leftWrap.className = 'coin-section-header-left';

    const titleEl = document.createElement('span');
    titleEl.className = 'coin-section-header-title';
    titleEl.textContent = t(`up.section.${tier}` as 'up.section.bronze');

    const countEl = document.createElement('span');
    countEl.className = 'coin-section-header-count tabular';

    leftWrap.appendChild(titleEl);
    leftWrap.appendChild(countEl);
    topRow.appendChild(leftWrap);

    let fuseBtn: HTMLButtonElement | null = null;
    if (tier !== 'celestial') {
      fuseBtn = document.createElement('button');
      fuseBtn.className = 'btn coin-fuse-btn';
      fuseBtn.onclick = (e) => {
        e.stopPropagation();
        callbacks.onFuseCoinTier?.(tier);
      };
      topRow.appendChild(fuseBtn);
    }

    el.appendChild(topRow);
    return { root: el, titleEl, countEl, fuseBtn };
  }

  // Create cards once and place into their respective tab container with a homeAnchor
  const upgradeCards = new Map<UpgradeId, UpgradeCardElements>();
  for (const def of UPGRADES) {
    let targetParent = upgradesContainer;
    if (def.category === 'coins') {
      targetParent = coinsContainer;
      if (def.coinTier && !addedCoinSections.has(def.coinTier)) {
        addedCoinSections.add(def.coinTier);
        coinsContainer.appendChild(coinSectionHeaders[def.coinTier].root);
      }
    } else if (def.category === 'minions') {
      targetParent = minionsContainer;
    }
    const cardEl = buildUpgradeCard(def, callbacks, targetParent);
    targetParent.appendChild(cardEl.card);
    targetParent.appendChild(cardEl.homeAnchor);
    upgradeCards.set(def.id, cardEl);
  }

  // Build Alchemical Laboratory UI inside alchemyContainer
  let isAlchemyBrewing = false;
  const alchemyLabCard = document.createElement('div');
  alchemyLabCard.className = 'alchemy-lab-card';

  const alchemyHeader = document.createElement('div');
  alchemyHeader.className = 'alchemy-lab-header';

  const alchemyTitleEl = document.createElement('div');
  alchemyTitleEl.className = 'alchemy-lab-title';
  alchemyTitleEl.textContent = t('alchemy.title');

  const alchemySubEl = document.createElement('div');
  alchemySubEl.className = 'alchemy-lab-sub';
  alchemySubEl.textContent = t('alchemy.subtitle');

  alchemyHeader.appendChild(alchemyTitleEl);
  alchemyHeader.appendChild(alchemySubEl);
  alchemyLabCard.appendChild(alchemyHeader);

  // Active potion buffs row
  const alchemyActiveRow = document.createElement('div');
  alchemyActiveRow.className = 'alchemy-active-row';
  alchemyActiveRow.style.display = 'none';

  const alchemySpeedPill = document.createElement('div');
  alchemySpeedPill.className = 'alchemy-buff-pill speed';
  alchemySpeedPill.style.display = 'none';

  const alchemyElixirPill = document.createElement('div');
  alchemyElixirPill.className = 'alchemy-buff-pill elixir';
  alchemyElixirPill.style.display = 'none';

  alchemyActiveRow.appendChild(alchemySpeedPill);
  alchemyActiveRow.appendChild(alchemyElixirPill);
  alchemyLabCard.appendChild(alchemyActiveRow);

  // Flask Stage + Boiling Animation
  const alchemyStage = document.createElement('div');
  alchemyStage.className = 'alchemy-flask-stage';

  const flaskWrap = document.createElement('div');
  flaskWrap.className = 'alchemy-flask-wrap';
  flaskWrap.innerHTML = `
    <svg class="alchemy-flask-svg" viewBox="0 0 120 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="flaskLiquidGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#a855f7" />
          <stop offset="50%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#fbbf24" />
        </linearGradient>
        <radialGradient id="flaskGlowGrad" cx="50%" cy="68%" r="48%">
          <stop offset="0%" stop-color="rgba(168, 85, 247, 0.45)" />
          <stop offset="100%" stop-color="rgba(168, 85, 247, 0)" />
        </radialGradient>
      </defs>
      <circle class="alchemy-flask-glow" cx="60" cy="84" r="46" fill="url(#flaskGlowGrad)" />
      <!-- Bubbles rising from neck -->
      <circle class="alchemy-bubble b1" cx="54" cy="48" r="3.5" fill="#7dd3fc" />
      <circle class="alchemy-bubble b2" cx="66" cy="40" r="4.5" fill="#fbbf24" />
      <circle class="alchemy-bubble b3" cx="58" cy="30" r="3.0" fill="#c084fc" />
      <circle class="alchemy-bubble b4" cx="63" cy="58" r="5.0" fill="#34d399" />
      <!-- Liquid inside flask -->
      <path class="alchemy-flask-liquid" d="M31 85 C42 81, 52 89, 60 85 C68 81, 78 89, 89 85 L97 101 C101 109, 95 117, 86 117 L34 117 C25 117, 19 109, 23 101 Z" fill="url(#flaskLiquidGrad)" opacity="0.92" />
      <!-- Glass Flask Body -->
      <path d="M48 22 H72 M51 22 V48 L21 99 C16 108, 22 120, 33 120 H87 C98 120, 104 108, 99 99 L69 48 V22" stroke="rgba(226, 232, 240, 0.88)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="rgba(255, 255, 255, 0.04)" />
      <!-- Glass Highlight -->
      <path d="M33 96 L52 62" stroke="rgba(255, 255, 255, 0.45)" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  `;
  alchemyStage.appendChild(flaskWrap);

  // Progress bar shown during 1.5s brewing
  const brewProgressWrap = document.createElement('div');
  brewProgressWrap.className = 'alchemy-progress-wrap';
  brewProgressWrap.style.display = 'none';
  const brewProgressBar = document.createElement('div');
  brewProgressBar.className = 'alchemy-progress-bar';
  brewProgressWrap.appendChild(brewProgressBar);
  alchemyStage.appendChild(brewProgressWrap);

  // Slide-out Effect Banner (shows result after brewing!)
  const alchemyEffectBanner = document.createElement('div');
  alchemyEffectBanner.className = 'alchemy-effect-banner';
  alchemyEffectBanner.style.display = 'none';

  const alchemyEffectTitle = document.createElement('div');
  alchemyEffectTitle.className = 'alchemy-effect-title';

  const alchemyEffectDesc = document.createElement('div');
  alchemyEffectDesc.className = 'alchemy-effect-desc';

  alchemyEffectBanner.appendChild(alchemyEffectTitle);
  alchemyEffectBanner.appendChild(alchemyEffectDesc);
  alchemyStage.appendChild(alchemyEffectBanner);

  alchemyLabCard.appendChild(alchemyStage);

  // Brew Button
  const alchemyBrewBtn = document.createElement('button');
  alchemyBrewBtn.className = 'btn btn-primary alchemy-brew-btn';

  const alchemyBrewBtnTitle = document.createElement('span');
  alchemyBrewBtnTitle.className = 'alchemy-brew-btn-title';
  alchemyBrewBtnTitle.textContent = t('alchemy.brewBtn');

  const alchemyBrewBtnCost = document.createElement('span');
  alchemyBrewBtnCost.className = 'alchemy-brew-btn-cost tabular';

  alchemyBrewBtn.appendChild(alchemyBrewBtnTitle);
  alchemyBrewBtn.appendChild(alchemyBrewBtnCost);

  alchemyBrewBtn.onclick = (e) => {
    e.stopPropagation();
    if (isAlchemyBrewing) return;
    const paid = callbacks.onStartAlchemyBrew ? callbacks.onStartAlchemyBrew() : false;
    if (!paid) return;

    isAlchemyBrewing = true;
    alchemyBrewBtn.disabled = true;
    alchemyBrewBtnTitle.textContent = t('alchemy.brewing');
    flaskWrap.classList.add('boiling');
    alchemyEffectBanner.style.display = 'none';
    alchemyEffectBanner.className = 'alchemy-effect-banner';

    brewProgressWrap.style.display = 'block';
    brewProgressBar.style.transition = 'none';
    brewProgressBar.style.width = '0%';
    void brewProgressBar.offsetWidth;
    brewProgressBar.style.transition = `width ${ALCHEMY_BREW_DURATION_MS}ms linear`;
    brewProgressBar.style.width = '100%';

    setTimeout(() => {
      isAlchemyBrewing = false;
      flaskWrap.classList.remove('boiling');
      brewProgressWrap.style.display = 'none';

      const outcome: AlchemyOutcome = callbacks.onFinishAlchemyBrew
        ? callbacks.onFinishAlchemyBrew()
        : 'fail';

      alchemyEffectBanner.style.display = 'flex';
      alchemyEffectBanner.className = `alchemy-effect-banner ${outcome} pop-in`;
      if (outcome === 'elixir') {
        alchemyEffectTitle.textContent = `✨ ${t('alchemy.resElixirTitle')}`;
        alchemyEffectDesc.textContent = t('alchemy.resElixirDesc');
      } else if (outcome === 'speed') {
        alchemyEffectTitle.textContent = `⚡ ${t('alchemy.resSpeedTitle')}`;
        alchemyEffectDesc.textContent = t('alchemy.resSpeedDesc');
      } else {
        alchemyEffectTitle.textContent = `💨 ${t('alchemy.resFailTitle')}`;
        alchemyEffectDesc.textContent = t('alchemy.resFailDesc');
      }
      alchemyBrewBtnTitle.textContent = t('alchemy.brewBtn');
    }, ALCHEMY_BREW_DURATION_MS);
  };

  alchemyLabCard.appendChild(alchemyBrewBtn);

  // Probability Breakdown Cards (60% / 30% / 10%)
  const alchemyOddsGrid = document.createElement('div');
  alchemyOddsGrid.className = 'alchemy-odds-grid';

  const oddsFail = document.createElement('div');
  oddsFail.className = 'alchemy-odd-item fail';
  const oddsSpeed = document.createElement('div');
  oddsSpeed.className = 'alchemy-odd-item speed';
  const oddsElixir = document.createElement('div');
  oddsElixir.className = 'alchemy-odd-item elixir';

  alchemyOddsGrid.appendChild(oddsFail);
  alchemyOddsGrid.appendChild(oddsSpeed);
  alchemyOddsGrid.appendChild(oddsElixir);
  alchemyLabCard.appendChild(alchemyOddsGrid);

  alchemyContainer.appendChild(alchemyLabCard);

  // Build Coin Statistics UI inside statsContainer
  const statsSummaryCard = document.createElement('div');
  statsSummaryCard.className = 'stats-summary-card';

  const statsTitleEl = document.createElement('div');
  statsTitleEl.className = 'stats-summary-title';
  statsTitleEl.textContent = t('stats.title');

  const statsSubEl = document.createElement('div');
  statsSubEl.className = 'stats-summary-sub';
  statsSubEl.textContent = t('stats.subtitle');

  const statsSummaryMetrics = document.createElement('div');
  statsSummaryMetrics.className = 'stats-summary-metrics';

  const statsAvg10sPill = document.createElement('div');
  statsAvg10sPill.className = 'stats-metric-pill primary tabular';
  const statsCur3sPill = document.createElement('div');
  statsCur3sPill.className = 'stats-metric-pill tabular';
  const statsGlobalMultPill = document.createElement('div');
  statsGlobalMultPill.className = 'stats-metric-pill accent tabular';

  statsSummaryMetrics.appendChild(statsAvg10sPill);
  statsSummaryMetrics.appendChild(statsCur3sPill);
  statsSummaryMetrics.appendChild(statsGlobalMultPill);

  statsSummaryCard.appendChild(statsTitleEl);
  statsSummaryCard.appendChild(statsSubEl);
  statsSummaryCard.appendChild(statsSummaryMetrics);
  statsContainer.appendChild(statsSummaryCard);

  const statsTierCards = new Map<CoinTier, StatsTierCardElements>();
  for (const tier of COIN_TIERS) {
    const style = TIER_COLORS[tier];
    const card = document.createElement('div');
    card.className = 'stats-tier-card';
    card.style.borderColor = style.border;
    card.style.background = style.bg;

    const topRow = document.createElement('div');
    topRow.className = 'stats-tier-top';

    const leftTitleWrap = document.createElement('div');
    leftTitleWrap.className = 'stats-tier-title-wrap';

    const titleEl = document.createElement('span');
    titleEl.className = 'stats-tier-title';
    titleEl.style.color = style.color;
    titleEl.textContent = t(`tier.${tier}` as 'tier.bronze');

    const countBadge = document.createElement('span');
    countBadge.className = 'stats-tier-count tabular';

    leftTitleWrap.appendChild(titleEl);
    leftTitleWrap.appendChild(countBadge);
    topRow.appendChild(leftTitleWrap);

    let fuseBtn: HTMLButtonElement | null = null;
    if (tier !== 'celestial') {
      fuseBtn = document.createElement('button');
      fuseBtn.className = 'btn coin-fuse-btn';
      fuseBtn.onclick = (e) => {
        e.stopPropagation();
        callbacks.onFuseCoinTier?.(tier);
      };
      topRow.appendChild(fuseBtn);
    }

    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'stats-tier-grid tabular';

    const perCoinEl = document.createElement('div');
    perCoinEl.className = 'stats-tier-stat highlight';
    const totalTierEl = document.createElement('div');
    totalTierEl.className = 'stats-tier-stat highlight';
    const singleValEl = document.createElement('div');
    singleValEl.className = 'stats-tier-stat';
    const actual10sEl = document.createElement('div');
    actual10sEl.className = 'stats-tier-stat';
    const estAutoEl = document.createElement('div');
    estAutoEl.className = 'stats-tier-stat';

    metricsGrid.appendChild(perCoinEl);
    metricsGrid.appendChild(totalTierEl);
    metricsGrid.appendChild(singleValEl);
    metricsGrid.appendChild(actual10sEl);
    metricsGrid.appendChild(estAutoEl);

    card.appendChild(topRow);
    card.appendChild(metricsGrid);
    statsContainer.appendChild(card);

    statsTierCards.set(tier, {
      root: card,
      titleEl,
      countBadge,
      perCoinEl,
      totalTierEl,
      singleValEl,
      actual10sEl,
      estAutoEl,
      fuseBtn,
    });
  }

  const adCards = new Map<AdBoostId, AdCardElements>();
  for (const def of AD_BOOSTS) {
    const cardEl = buildAdBoostCard(def, callbacks);
    adsContainer.appendChild(cardEl.card);
    adCards.set(def.id, cardEl);
  }

  const noteEl = document.createElement('div');
  noteEl.className = 'ad-note';
  noteEl.textContent = t('ad.note');
  adsContainer.appendChild(noteEl);

  function updateFuseButton(btn: HTMLButtonElement, engine: GameEngine, tier: CoinTier): void {
    const info = engine.getCoinFusionInfo(tier);
    if (!info.nextTier) {
      btn.style.display = 'none';
      return;
    }
    const nextName = t(`tier.${info.nextTier}` as 'tier.silver');
    if (!info.isLeftover && info.usedCount === 5) {
      btn.disabled = !info.canFuse;
      btn.className = 'btn coin-fuse-btn ready';
      btn.textContent = `🔄 ${t('fuse.btn5to1', { next: nextName })}`;
    } else if (info.isLeftover && info.usedCount > 0) {
      btn.disabled = !info.canFuse;
      btn.className = `btn coin-fuse-btn ${info.canFuse ? 'leftover' : ''}`;
      btn.textContent = `🔄 ${t('fuse.btnLeftover', {
        n: String(info.usedCount),
        next: nextName,
        cost: formatBig(info.cost),
      })}`;
    } else {
      btn.disabled = true;
      btn.className = 'btn coin-fuse-btn';
      btn.textContent = `🔄 ${t('fuse.need5', {
        n: String(info.usedCount),
        next: nextName,
      })}`;
    }
  }

  function buildUpgradeCard(
    def: UpgradeDef,
    cbs: PanelCallbacks,
    homeParent: HTMLElement,
  ): UpgradeCardElements {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.dataset.upgradeId = def.id;
    const homeAnchor = document.createComment(def.id);

    const left = document.createElement('div');
    left.className = 'upgrade-left';

    const iconKey = UPGRADE_ICON_MAP[def.icon] || 'coin';
    const iconWrap = document.createElement('div');
    iconWrap.className = 'upgrade-icon-wrap';
    iconWrap.innerHTML = ICONS[iconKey] || ICONS.coin;

    const fuseTier = COUNT_UPGRADE_TO_TIER[def.id];
    const colorTier = def.coinTier ?? fuseTier;
    if (colorTier) {
      const st = TIER_COLORS[colorTier];
      iconWrap.style.borderColor = st.border;
      iconWrap.style.background = st.bg;
      iconWrap.style.color = st.color;
    }

    const info = document.createElement('div');
    info.className = 'upgrade-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'upgrade-title-row';

    const name = document.createElement('span');
    name.className = 'upgrade-name';
    name.textContent = t(def.nameKey as 'up.coinValue.name');

    const badge = document.createElement('span');
    badge.className = 'upgrade-badge';

    titleRow.appendChild(name);
    titleRow.appendChild(badge);

    const desc = document.createElement('div');
    desc.className = 'upgrade-desc';
    desc.textContent = t(def.descKey as 'up.coinValue.desc');

    const effect = document.createElement('div');
    effect.className = 'upgrade-effect tabular';

    info.appendChild(titleRow);
    info.appendChild(desc);
    info.appendChild(effect);

    let fuseBtn: HTMLButtonElement | undefined;
    if (fuseTier && fuseTier !== 'celestial') {
      fuseBtn = document.createElement('button');
      fuseBtn.className = 'btn coin-fuse-btn card-inline';
      fuseBtn.onclick = (e) => {
        e.stopPropagation();
        cbs.onFuseCoinTier?.(fuseTier);
      };
      info.appendChild(fuseBtn);
    }

    left.appendChild(iconWrap);
    left.appendChild(info);

    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn btn-primary upgrade-buy-btn';

    const buyLabel = document.createElement('span');
    buyLabel.className = 'upgrade-buy-label';

    const buyCost = document.createElement('span');
    buyCost.className = 'upgrade-buy-cost tabular';

    buyBtn.appendChild(buyLabel);
    buyBtn.appendChild(buyCost);

    buyBtn.onclick = (e) => {
      e.stopPropagation();
      cbs.onBuyUpgrade(def.id);
      card.classList.add('highlight');
      setTimeout(() => card.classList.remove('highlight'), 400);
    };

    card.appendChild(left);
    card.appendChild(buyBtn);

    return {
      card,
      homeParent,
      homeAnchor,
      name,
      desc,
      badge,
      effect,
      buyBtn,
      buyLabel,
      buyCost,
      fuseBtn,
      fuseTier,
    };
  }

  function buildAdBoostCard(def: AdBoostDef, cbs: PanelCallbacks): AdCardElements {
    const card = document.createElement('div');
    card.className = 'upgrade-card';

    const left = document.createElement('div');
    left.className = 'upgrade-left';

    const iconKey = AD_ICON_MAP[def.icon] || 'goldenHour';
    const iconWrap = document.createElement('div');
    iconWrap.className = 'upgrade-icon-wrap ad-icon';
    iconWrap.innerHTML = ICONS[iconKey] || ICONS.coin;

    const info = document.createElement('div');
    info.className = 'upgrade-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'upgrade-title-row';

    const name = document.createElement('span');
    name.className = 'upgrade-name';
    name.textContent = t(def.nameKey as 'ad.goldenHour.name');

    titleRow.appendChild(name);

    let badge: HTMLElement | undefined;
    if (def.id !== 'timeWarp' && def.id !== 'frenzy') {
      badge = document.createElement('span');
      badge.className = 'upgrade-badge';
      titleRow.appendChild(badge);
    }

    const desc = document.createElement('div');
    desc.className = 'upgrade-desc';
    desc.textContent = t(def.descKey as 'ad.goldenHour.desc');

    const effect = document.createElement('div');
    effect.className = 'upgrade-effect tabular';

    info.appendChild(titleRow);
    info.appendChild(desc);
    info.appendChild(effect);

    left.appendChild(iconWrap);
    left.appendChild(info);

    const actionBtn = document.createElement('button');
    actionBtn.onclick = (e) => {
      e.stopPropagation();
      if (def.id === 'frenzy') {
        cbs.onActivateFrenzy();
      } else {
        cbs.onWatchAdBoost(def.id);
      }
    };

    card.appendChild(left);
    card.appendChild(actionBtn);

    return { card, name, desc, badge, effect, actionBtn };
  }

  function update(
    state: GameState,
    engine: GameEngine,
    isRewardedSupported: boolean,
    nowSec: number,
  ): void {
    const nowMs = nowSec * 1000;
    tabAdsObj.labelEl.textContent = t('tab.ads');
    tabAds.style.display = isRewardedSupported ? 'block' : 'none';
    tabStatsObj.labelEl.textContent = t('tab.stats');
    noteEl.textContent = t('ad.note');
    handleLabel.textContent = isCollapsed ? t('panel.expand') : t('panel.collapse');
    handleEl.setAttribute('aria-label', isCollapsed ? t('panel.expand') : t('panel.collapse'));

    unlockCategoryBanner.textContent = t('up.type.unlock');
    activeCategoryBanner.textContent = t('up.type.active');
    passiveCategoryBanner.textContent = t('up.type.passive');

    const countsByTier = engine.coinCountsByTier();
    const tierStatsList = engine.coinTierStats(nowMs);
    const activeStatByTier = new Map(tierStatsList.map((s) => [s.tier, s]));

    for (const tier of Object.keys(coinSectionHeaders) as CoinTier[]) {
      const hdr = coinSectionHeaders[tier];
      const st = activeStatByTier.get(tier);
      hdr.titleEl.textContent = t(`up.section.${tier}` as 'up.section.bronze');
      const onTableStr = t('fuse.onTable', { n: String(countsByTier[tier] ?? 0) });
      const perSecStr = st ? ` • ${t('stats.perCoinSec', { v: formatBig(st.perCoinPerSec) })}` : '';
      hdr.countEl.textContent = `${onTableStr}${perSecStr}`;
      if (hdr.fuseBtn) {
        updateFuseButton(hdr.fuseBtn, engine, tier);
      }
    }

    for (const m of modes) {
      modeButtons[m].textContent = t(`mode.${m}` as 'mode.x1');
    }

    let canAffordUpgradesTab = false;
    let canAffordCoinsTab = false;
    let canAffordMinionsTab = false;
    let maxedCount = 0;

    const visibleCoinTiers = new Set<CoinTier>();

    // Update all Upgrades in-place
    for (const def of UPGRADES) {
      const els = upgradeCards.get(def.id);
      if (!els) continue;

      const unlocked = engine.isUpgradeUnlocked(def.id);
      const currentLevel = engine.upgradeLevel(def.id);
      const isMaxed = currentLevel >= def.maxLevel;

      if (!unlocked) {
        if (els.card.parentElement !== els.homeParent) {
          els.homeParent.insertBefore(els.card, els.homeAnchor);
        }
        els.card.style.display = 'none';
        continue;
      }

      els.card.style.display = '';
      if (isMaxed) {
        maxedCount++;
        if (els.card.parentElement !== maxedContainer) {
          maxedContainer.appendChild(els.card);
        }
      } else {
        if (els.card.parentElement !== els.homeParent) {
          els.homeParent.insertBefore(els.card, els.homeAnchor);
        }
        if (def.category === 'coins' && def.coinTier) {
          visibleCoinTiers.add(def.coinTier);
        }
      }

      els.name.textContent = t(def.nameKey as 'up.coinValue.name');
      els.desc.textContent = t(def.descKey as 'up.coinValue.desc');

      const { count, totalCost, displayCost } = engine.calcBuyInfo(def.id, buyMode);
      const canAfford = !isMaxed && count > 0 && state.gold >= totalCost;
      const canAffordSingle = !isMaxed && state.gold >= engine.costForLevel(def.id);

      if (canAffordSingle) {
        if (def.category === 'coins') {
          canAffordCoinsTab = true;
        } else if (def.category === 'minions') {
          canAffordMinionsTab = true;
        } else {
          canAffordUpgradesTab = true;
        }
      }

      const maxStr = Number.isFinite(def.maxLevel) ? String(def.maxLevel) : '∞';
      const lvlStr = isMaxed
        ? `${t('up.level', { n: String(currentLevel) })}/${maxStr} • ${t('up.maxed')}`
        : `${t('up.level', { n: String(currentLevel) })}/${maxStr}`;
      if (def.coinTier) {
        els.badge.textContent = `${lvlStr} • ${t(`tier.${def.coinTier}` as 'tier.bronze')}`;
      } else if (els.fuseTier) {
        const onTable = countsByTier[els.fuseTier] ?? 0;
        els.badge.textContent = `${lvlStr} • ${t('fuse.onTable', { n: String(onTable) })}`;
      } else {
        els.badge.textContent = lvlStr;
      }

      if (els.fuseBtn && els.fuseTier) {
        updateFuseButton(els.fuseBtn, engine, els.fuseTier);
      }

      els.effect.textContent = formatUpgradeEffect(def, currentLevel, count, isMaxed);

      els.buyBtn.disabled = !canAfford;
      els.buyLabel.textContent = isMaxed
        ? t('up.maxed')
        : count > 1
          ? t('up.buyN', { n: String(count) })
          : t('up.buy');
      // Always show the upgrade price even when unaffordable!
      els.buyCost.textContent = isMaxed ? '' : formatBig(displayCost);
    }

    // Show/hide Coin section headers based on whether that tier has unlocked & non-maxed upgrades
    for (const tier of Object.keys(coinSectionHeaders) as CoinTier[]) {
      const showHeader = visibleCoinTiers.has(tier);
      const hdr = coinSectionHeaders[tier].root;
      hdr.style.display = showHeader ? 'block' : 'none';
      hdr.className = showHeader ? 'upgrade-section-header' : 'upgrade-section-header-hidden';
    }

    // Update Statistics Tab in-place
    statsTitleEl.textContent = t('stats.title');
    statsSubEl.textContent = t('stats.subtitle');
    statsAvg10sPill.textContent = t('stats.avg10s', {
      v: formatBig(engine.averageIncomePerSecond10s(nowMs)),
    });
    statsCur3sPill.textContent = t('stats.cur3s', {
      v: formatBig(engine.actualIncomePerSecond(nowMs)),
    });
    statsGlobalMultPill.textContent = t('stats.globalMult', {
      v: formatBig(BigInt(Math.round(engine.totalMultiplier(state.activeTable, nowMs)))),
    });

    for (const tier of COIN_TIERS) {
      const cardEls = statsTierCards.get(tier);
      if (!cardEls) continue;
      const st = activeStatByTier.get(tier);
      if (!st) {
        cardEls.root.style.display = 'none';
        continue;
      }
      cardEls.root.style.display = 'flex';
      cardEls.titleEl.textContent = t(`tier.${tier}` as 'tier.bronze');
      cardEls.countBadge.textContent = t('fuse.onTable', { n: String(st.count) });
      cardEls.perCoinEl.textContent = t('stats.perCoinSec', {
        v: formatBig(st.perCoinPerSec),
      });
      cardEls.totalTierEl.textContent = t('stats.totalTierSec', {
        n: String(st.count),
        v: formatBig(st.totalTierPerSec),
      });
      cardEls.singleValEl.textContent = t('stats.singleVal', {
        v: formatBig(st.singleValue),
      });
      cardEls.actual10sEl.textContent = t('stats.actual10s', {
        v: formatBig(st.actualPerSec10s),
      });
      cardEls.estAutoEl.textContent = t('stats.estAuto', {
        v: formatBig(st.estimatedAutoPerSec),
      });
      if (cardEls.fuseBtn) {
        updateFuseButton(cardEls.fuseBtn, engine, tier);
      }
    }

    // Show/hide Maxed tab button based on whether any upgrade is maxed
    tabMaxedObj.labelEl.textContent = `${t('tab.maxed')} (${maxedCount})`;
    tabMaxed.style.display = maxedCount > 0 ? 'block' : 'none';
    if (maxedCount === 0 && tabMaxed.classList.contains('active')) {
      activateTab(tabUpgrades, upgradesContainer, true);
    }

    tabUpgradesObj.labelEl.textContent = t('tab.upgrades');
    tabUpgradesObj.dotEl?.classList.toggle('visible', canAffordUpgradesTab);

    tabCoinsObj.labelEl.textContent = t('tab.coins');
    tabCoinsObj.dotEl?.classList.toggle('visible', canAffordCoinsTab);

    tabMinionsObj.labelEl.textContent = t('tab.minions');
    tabMinionsObj.dotEl?.classList.toggle('visible', canAffordMinionsTab);

    // Update Alchemy tab & Alchemical Laboratory
    const brewCost = engine.alchemyBrewCost(nowMs);
    const canBrew = !isAlchemyBrewing && state.gold >= brewCost;

    tabAlchemyObj.labelEl.textContent = t('tab.alchemy');
    tabAlchemyObj.dotEl?.classList.toggle('visible', canBrew);

    alchemyTitleEl.textContent = t('alchemy.title');
    alchemySubEl.textContent = t('alchemy.subtitle');
    if (!isAlchemyBrewing) {
      alchemyBrewBtnTitle.textContent = t('alchemy.brewBtn');
    }
    alchemyBrewBtnCost.textContent = t('alchemy.costLabel', { cost: formatBig(brewCost) });
    alchemyBrewBtn.disabled = !canBrew;

    const speedRem = engine.alchemySpeedRemainingSeconds(nowMs);
    const elixirRem = engine.alchemyElixirRemainingSeconds(nowMs);
    if (speedRem > 0 || elixirRem > 0) {
      alchemyActiveRow.style.display = 'flex';
      if (speedRem > 0) {
        alchemySpeedPill.style.display = 'inline-flex';
        alchemySpeedPill.textContent = `⚡ ${t('alchemy.activeSpeed', { s: String(speedRem) })}`;
      } else {
        alchemySpeedPill.style.display = 'none';
      }
      if (elixirRem > 0) {
        alchemyElixirPill.style.display = 'inline-flex';
        alchemyElixirPill.textContent = `✨ ${t('alchemy.activeElixir', { s: String(elixirRem) })}`;
      } else {
        alchemyElixirPill.style.display = 'none';
      }
    } else {
      alchemyActiveRow.style.display = 'none';
    }

    oddsFail.textContent = `💨 ${t('alchemy.chanceFail')}`;
    oddsSpeed.textContent = `⚡ ${t('alchemy.chanceSpeed')}`;
    oddsElixir.textContent = `✨ ${t('alchemy.chanceElixir')}`;

    // Update Ad Boosts in-place
    if (isRewardedSupported) {
      for (const def of AD_BOOSTS) {
        const els = adCards.get(def.id);
        if (!els) continue;

        els.name.textContent = t(def.nameKey as 'ad.goldenHour.name');
        els.desc.textContent = t(def.descKey as 'ad.goldenHour.desc');

        if (def.id === 'frenzy') {
          const isUnlocked = (state.ad.frenzy ?? 0) > 0;
          const frenzyUntil = state.frenzyUntil;
          const frenzyReadyAt = state.frenzyReadyAt;

          if (!isUnlocked) {
            els.effect.textContent = t('ad.frenzy.reward');
            els.actionBtn.className = 'btn btn-rewarded';
            els.actionBtn.disabled = false;
            els.actionBtn.innerHTML = `${ICONS.adPlay} ${t('ad.watch')}`;
          } else if (nowMs < frenzyUntil) {
            const remaining = Math.ceil((frenzyUntil - nowMs) / 1000);
            els.effect.textContent = t('frenzy.active', { s: String(remaining) });
            els.actionBtn.className = 'btn btn-primary';
            els.actionBtn.disabled = true;
            els.actionBtn.textContent = `${remaining}s`;
          } else if (nowMs < frenzyReadyAt) {
            const remaining = Math.ceil((frenzyReadyAt - nowMs) / 1000);
            els.effect.textContent = t('frenzy.cooldown', { t: `${remaining}s` });
            els.actionBtn.className = 'btn btn-secondary';
            els.actionBtn.disabled = true;
            els.actionBtn.textContent = `${remaining}s`;
          } else {
            els.effect.textContent = t('ad.frenzy.desc');
            els.actionBtn.className = 'btn btn-primary';
            els.actionBtn.disabled = false;
            els.actionBtn.textContent = t('frenzy.activate');
          }
        } else if (def.id === 'timeWarp') {
          const instantGold = engine.calcTimeWarpReward(nowMs);
          els.effect.textContent = t('ad.timeWarp.reward', {
            gold: formatBig(instantGold),
          });
          els.actionBtn.className = 'btn btn-rewarded';
          els.actionBtn.disabled = false;
          els.actionBtn.innerHTML = `${ICONS.adPlay} ${t('ad.watch')}`;
        } else {
          const curLvl = state.ad[def.id] ?? 0;
          const isMaxed = curLvl >= def.maxLevel;

          if (els.badge) {
            els.badge.textContent = isMaxed
              ? `${t('up.level', { n: String(curLvl) })}/${def.maxLevel} • ${t('ad.maxed')}`
              : `${t('up.level', { n: String(curLvl) })}/${def.maxLevel}`;
          }

          const curVal = def.values[curLvl];
          const nextVal = def.values[Math.min(def.maxLevel, curLvl + 1)];

          if (def.id === 'goldenHour') {
            els.effect.textContent = t('ad.goldenHour.reward', {
              from: `x${curVal}`,
              to: isMaxed ? `x${curVal}` : `x${nextVal}`,
            });
          } else if (def.id === 'diamondCoins') {
            els.effect.textContent = t('ad.diamondCoins.reward', {
              from: `${Math.round(curVal * 100)}%`,
              to: isMaxed ? `${Math.round(curVal * 100)}%` : `${Math.round(nextVal * 100)}%`,
            });
          } else if (def.id === 'magnetTouch') {
            els.effect.textContent = t('ad.magnetTouch.reward', {
              from: `+${curVal}`,
              to: isMaxed ? `+${curVal}` : `+${nextVal}`,
            });
          } else if (def.id === 'minionRush') {
            els.effect.textContent = t('ad.minionRush.reward', {
              from: `+${Math.round(curVal * 100)}%`,
              to: isMaxed ? `+${Math.round(curVal * 100)}%` : `+${Math.round(nextVal * 100)}%`,
            });
          } else if (def.id === 'luckyCharm') {
            els.effect.textContent = t('ad.luckyCharm.reward', {
              from: `+${Math.round(curVal * 100)}%`,
              to: isMaxed ? `+${Math.round(curVal * 100)}%` : `+${Math.round(nextVal * 100)}%`,
            });
          } else if (def.id === 'vipDiscount') {
            els.effect.textContent = t('ad.vipDiscount.reward', {
              from: `-${Math.round(curVal * 100)}%`,
              to: isMaxed ? `-${Math.round(curVal * 100)}%` : `-${Math.round(nextVal * 100)}%`,
            });
          } else if (def.id === 'coinGravity') {
            els.effect.textContent = t('ad.coinGravity.reward', {
              from: `+${Math.round(curVal * 100)}%`,
              to: isMaxed ? `+${Math.round(curVal * 100)}%` : `+${Math.round(nextVal * 100)}%`,
            });
          }

          if (isMaxed) {
            els.actionBtn.className = 'btn btn-secondary';
            els.actionBtn.disabled = true;
            els.actionBtn.textContent = t('ad.maxed');
          } else {
            els.actionBtn.className = 'btn btn-rewarded';
            els.actionBtn.disabled = false;
            els.actionBtn.innerHTML = `${ICONS.adPlay} ${t('ad.watch')}`;
          }
        }
      }
    }
  }

  function formatUpgradeEffect(
    def: UpgradeDef,
    level: number,
    addLevels: number,
    isMaxed: boolean,
  ): string {
    const curVal = def.effect(level);
    if (isMaxed) {
      return formatUnit(curVal, def.unit);
    }
    const nextVal = def.effect(level + Math.max(1, addLevels));
    return `${formatUnit(curVal, def.unit)} → ${formatUnit(nextVal, def.unit)}`;
  }

  function formatUnit(
    val: number,
    unit: 'gold' | 'perSec' | 'times' | 'percent' | 'hours' | 'coins' | 'tier',
  ): string {
    switch (unit) {
      case 'gold':
        return t('unit.gold', { v: String(val) });
      case 'perSec':
        return t('unit.perSec', { v: val.toFixed(1) });
      case 'times':
        return t('unit.times', { v: val.toFixed(2).replace(/\.00$/, '.0') });
      case 'percent':
        return t('unit.percent', { v: String(Math.round(val * 100)) });
      case 'hours':
        return t('unit.hours', { v: val.toFixed(1) });
      case 'coins':
        return t('unit.coins', { v: String(Math.round(val)) });
      case 'tier': {
        const tierIdx = Math.min(13, Math.max(0, Math.round(val)));
        return t(`tier.minion.${tierIdx}` as 'tier.minion.0');
      }
    }
  }

  function destroy(): void {
    root.remove();
  }

  return {
    element: root,
    update,
    selectTab,
    destroy,
  };
}
