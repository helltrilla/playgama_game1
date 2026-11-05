import { ACHIEVEMENTS, ACHIEVEMENTS_PER_TOKEN, type AchievementDef } from '../data/achievements';
import type { GameEngine } from '../core/game';
import { ICONS } from './icons';
import { t } from '../i18n';

export interface AchievementsModalOptions {
  container: HTMLElement;
  engine: GameEngine;
  onClose: () => void;
}

const ACH_ICON_MAP: Record<string, keyof typeof ICONS> = {
  coin: 'coin',
  hand: 'autoTosser',
  speed: 'speed',
  multi: 'multi',
  clover: 'luckyCoin',
  vault: 'offlineVault',
  sun: 'goldenHour',
  bolt: 'frenzy',
  diamond: 'diamondCoins',
};

export function showAchievementsModal(options: AchievementsModalOptions): void {
  const { container, engine, onClose } = options;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog ach-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'ach-modal-title');

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
  title.id = 'ach-modal-title';
  title.className = 'modal-title';
  title.style.marginBottom = '4px';
  title.textContent = t('ach.title');

  const subtitle = document.createElement('p');
  subtitle.className = 'upgrade-desc';
  subtitle.style.marginBottom = '10px';
  subtitle.textContent = t('ach.subtitle');

  headerWrap.appendChild(title);
  headerWrap.appendChild(subtitle);

  // Milestone Banner (Every 5 completed achievements = +1 Token)
  const milestoneCard = document.createElement('div');
  milestoneCard.className = 'ach-milestone-card';

  const milestoneTop = document.createElement('div');
  milestoneTop.className = 'ach-milestone-top';

  const milestoneLabel = document.createElement('span');
  milestoneLabel.className = 'ach-milestone-label tabular';

  const milestoneEarned = document.createElement('span');
  milestoneEarned.className = 'ach-milestone-earned tabular';

  milestoneTop.appendChild(milestoneLabel);
  milestoneTop.appendChild(milestoneEarned);

  const pipsRow = document.createElement('div');
  pipsRow.className = 'ach-pips-row';
  const pips: HTMLElement[] = [];
  for (let i = 0; i < ACHIEVEMENTS_PER_TOKEN; i++) {
    const pip = document.createElement('div');
    pip.className = 'ach-pip';
    pips.push(pip);
    pipsRow.appendChild(pip);
  }

  milestoneCard.appendChild(milestoneTop);
  milestoneCard.appendChild(pipsRow);

  // Scrollable Achievements List
  const listWrap = document.createElement('div');
  listWrap.className = 'ach-list';

  interface AchCardRefs {
    def: AchievementDef;
    card: HTMLElement;
    badge: HTMLSpanElement;
    barFill: HTMLElement;
  }

  const cardRefs: AchCardRefs[] = [];

  for (const def of ACHIEVEMENTS) {
    const card = document.createElement('div');
    card.className = 'upgrade-card ach-card';
    card.dataset.achId = def.id;

    const left = document.createElement('div');
    left.className = 'upgrade-left';
    left.style.width = '100%';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'upgrade-icon-wrap';
    const iconKey = ACH_ICON_MAP[def.icon] || 'coin';
    iconWrap.innerHTML = ICONS[iconKey] || ICONS.coin;

    const info = document.createElement('div');
    info.className = 'upgrade-info';
    info.style.flex = '1';

    const titleRow = document.createElement('div');
    titleRow.className = 'upgrade-title-row';
    titleRow.style.justifyContent = 'space-between';

    const name = document.createElement('span');
    name.className = 'upgrade-name';
    name.textContent = t(def.nameKey as 'ach.bronze5.name');

    const badge = document.createElement('span');
    badge.className = 'upgrade-badge tabular';

    titleRow.appendChild(name);
    titleRow.appendChild(badge);

    const desc = document.createElement('div');
    desc.className = 'upgrade-desc';
    desc.textContent = t(def.descKey as 'ach.bronze5.desc');

    const barTrack = document.createElement('div');
    barTrack.className = 'ach-bar-track';

    const barFill = document.createElement('div');
    barFill.className = 'ach-bar-fill';
    barTrack.appendChild(barFill);

    info.appendChild(titleRow);
    info.appendChild(desc);
    info.appendChild(barTrack);

    left.appendChild(iconWrap);
    left.appendChild(info);
    card.appendChild(left);
    listWrap.appendChild(card);

    cardRefs.push({ def, card, badge, barFill });
  }

  function refreshModal(): void {
    engine.checkAchievements();
    const state = engine.state;
    const unlockedSet = new Set(state.achievements || []);
    let doneCount = 0;

    for (const ref of cardRefs) {
      const prog = ref.def.evaluate(state);
      const isUnlocked = unlockedSet.has(ref.def.id) || prog.done;
      if (isUnlocked) doneCount++;

      ref.card.classList.toggle('ach-completed', isUnlocked);
      ref.barFill.style.width = `${Math.round(prog.ratio * 100)}%`;

      if (isUnlocked) {
        ref.badge.textContent = `✓ ${t('ach.done')}`;
        ref.badge.className = 'upgrade-badge ach-badge-done tabular';
      } else {
        ref.badge.textContent = `${prog.current} / ${prog.target}`;
        ref.badge.className = 'upgrade-badge tabular';
      }
    }

    const cycleDone =
      doneCount === ACHIEVEMENTS.length && doneCount > 0
        ? ACHIEVEMENTS_PER_TOKEN
        : doneCount % ACHIEVEMENTS_PER_TOKEN;
    const tokensFromAch = Math.floor(doneCount / ACHIEVEMENTS_PER_TOKEN);

    milestoneLabel.textContent = t('ach.milestone', {
      rem: String(cycleDone),
      tokens: String(tokensFromAch),
    });
    milestoneEarned.textContent = t('token.balance', { n: String(engine.state.tokens || 0) });

    for (let i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('filled', i < cycleDone);
    }
  }

  refreshModal();

  dialog.appendChild(closeBtn);
  dialog.appendChild(headerWrap);
  dialog.appendChild(milestoneCard);
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
