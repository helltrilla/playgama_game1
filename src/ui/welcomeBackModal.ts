import { formatBig } from '../core/bignum';
import { ICONS } from './icons';
import { t } from '../i18n';

export interface WelcomeBackModalOptions {
  container: HTMLElement;
  earnedGold: bigint;
  awaySeconds: number;
  maxHours: number;
  efficiencyPercent: number;
  isRewardedSupported: boolean;
  onCollect: (double: boolean) => void;
}

export function showWelcomeBackModal(options: WelcomeBackModalOptions): void {
  const {
    container,
    earnedGold,
    awaySeconds,
    maxHours,
    efficiencyPercent,
    isRewardedSupported,
    onCollect,
  } = options;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'welcome-title');

  // Close cross (acts as normal collect)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', t('common.close'));
  closeBtn.innerHTML = ICONS.close;
  closeBtn.onclick = () => {
    cleanup();
    onCollect(false);
  };

  // Title
  const title = document.createElement('h2');
  title.id = 'welcome-title';
  title.className = 'modal-title';
  title.textContent = t('offline.title');

  // Time away
  const timeAwayText = formatAwayTime(awaySeconds);
  const awayEl = document.createElement('p');
  awayEl.className = 'modal-body';
  awayEl.style.marginBottom = '8px';
  awayEl.textContent = t('offline.away', { time: timeAwayText });

  // Earned box
  const statBox = document.createElement('div');
  statBox.className = 'offline-stat-box';

  const earnedLabel = document.createElement('div');
  earnedLabel.className = 'upgrade-desc';
  earnedLabel.textContent = t('offline.earned');

  const amountRow = document.createElement('div');
  amountRow.className = 'offline-earned-amount tabular';
  amountRow.innerHTML = `<span style="width:28px;height:28px;color:var(--gold-1);display:inline-flex;">${ICONS.coin}</span> +${formatBig(earnedGold)}`;

  statBox.appendChild(earnedLabel);
  statBox.appendChild(amountRow);

  // Capped note
  const cappedEl = document.createElement('div');
  cappedEl.className = 'upgrade-desc';
  cappedEl.style.textAlign = 'center';
  cappedEl.style.marginBottom = '16px';
  cappedEl.textContent = t('offline.capped', {
    h: String(maxHours),
    p: String(Math.round(efficiencyPercent * 100)),
  });

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  if (isRewardedSupported && earnedGold > 0n) {
    const x2Btn = document.createElement('button');
    x2Btn.className = 'btn btn-rewarded';
    x2Btn.innerHTML = `${ICONS.adPlay} ${t('offline.collectX2')}`;
    x2Btn.onclick = () => {
      cleanup();
      onCollect(true);
    };
    actions.appendChild(x2Btn);
  }

  const collectBtn = document.createElement('button');
  collectBtn.className = 'btn btn-primary';
  collectBtn.textContent = t('offline.collect');
  collectBtn.onclick = () => {
    cleanup();
    onCollect(false);
  };
  actions.appendChild(collectBtn);

  dialog.appendChild(closeBtn);
  dialog.appendChild(title);
  dialog.appendChild(awayEl);
  dialog.appendChild(statBox);
  dialog.appendChild(cappedEl);
  dialog.appendChild(actions);

  backdrop.appendChild(dialog);
  container.appendChild(backdrop);

  function cleanup(): void {
    backdrop.remove();
  }
}

function formatAwayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (h > 0) parts.push(t('time.h', { n: String(h) }));
  if (m > 0) parts.push(t('time.m', { n: String(m) }));
  if (parts.length === 0 || (h === 0 && s > 0)) {
    parts.push(t('time.s', { n: String(s) }));
  }
  return parts.join(' ');
}
