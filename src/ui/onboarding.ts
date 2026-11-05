import { t } from '../i18n';
import { ICONS } from './icons';

export interface OnboardingOptions {
  container: HTMLElement;
  onSelectTab: (tab: 'upgrades' | 'coins' | 'minions' | 'ads') => void;
  onStepSound: () => void;
  onComplete: () => void;
}

interface StepConfig {
  titleKey:
    | 'onb.s1.title'
    | 'onb.s2.title'
    | 'onb.s3.title'
    | 'onb.s4.title'
    | 'onb.s5.title'
    | 'onb.s6.title'
    | 'onb.s7.title';
  descKey:
    | 'onb.s1.desc'
    | 'onb.s2.desc'
    | 'onb.s3.desc'
    | 'onb.s4.desc'
    | 'onb.s5.desc'
    | 'onb.s6.desc'
    | 'onb.s7.desc';
  icon: keyof typeof ICONS;
  getTarget: () => HTMLElement | null;
  onEnter?: () => void;
  isFinal?: boolean;
}

export function startOnboarding(options: OnboardingOptions): { destroy: () => void } {
  const { container, onSelectTab, onStepSound, onComplete } = options;

  document.body.classList.add('onboarding-active');

  const overlay = document.createElement('div');
  overlay.className = 'onb-overlay';

  // 4 invisible pointer blockers around the spotlight hole
  const blockerTop = document.createElement('div');
  blockerTop.className = 'onb-blocker';
  const blockerBottom = document.createElement('div');
  blockerBottom.className = 'onb-blocker';
  const blockerLeft = document.createElement('div');
  blockerLeft.className = 'onb-blocker';
  const blockerRight = document.createElement('div');
  blockerRight.className = 'onb-blocker';

  // Glowing spotlight frame + clickable hole
  const spotlight = document.createElement('div');
  spotlight.className = 'onb-spotlight';

  const hole = document.createElement('button');
  hole.type = 'button';
  hole.className = 'onb-hole';
  hole.setAttribute('aria-label', t('onb.tapPrompt'));

  // Floating callout card near the glowing button
  const card = document.createElement('div');
  card.className = 'onb-card';

  const cardTopRow = document.createElement('div');
  cardTopRow.className = 'onb-card-top';

  const stepBadge = document.createElement('span');
  stepBadge.className = 'onb-step-badge tabular';

  const iconBadge = document.createElement('span');
  iconBadge.className = 'onb-icon-badge';

  cardTopRow.appendChild(iconBadge);
  cardTopRow.appendChild(stepBadge);

  const titleEl = document.createElement('h3');
  titleEl.className = 'onb-title';

  const descEl = document.createElement('p');
  descEl.className = 'onb-desc';

  const promptEl = document.createElement('div');
  promptEl.className = 'onb-prompt';

  const finishBtn = document.createElement('button');
  finishBtn.type = 'button';
  finishBtn.className = 'btn btn-primary onb-finish-btn';
  finishBtn.style.display = 'none';

  card.appendChild(cardTopRow);
  card.appendChild(titleEl);
  card.appendChild(descEl);
  card.appendChild(promptEl);
  card.appendChild(finishBtn);

  overlay.appendChild(blockerTop);
  overlay.appendChild(blockerBottom);
  overlay.appendChild(blockerLeft);
  overlay.appendChild(blockerRight);
  overlay.appendChild(spotlight);
  overlay.appendChild(hole);
  overlay.appendChild(card);
  container.appendChild(overlay);

  const steps: StepConfig[] = [
    {
      titleKey: 'onb.s1.title',
      descKey: 'onb.s1.desc',
      icon: 'coinValue',
      onEnter: () => {
        onSelectTab('upgrades');
      },
      getTarget: () => document.querySelector<HTMLElement>('.panel-tab[data-tab="upgrades"]'),
    },
    {
      titleKey: 'onb.s2.title',
      descKey: 'onb.s2.desc',
      icon: 'speed',
      getTarget: () => document.querySelector<HTMLElement>('.panel-tab[data-tab="coins"]'),
    },
    {
      titleKey: 'onb.s3.title',
      descKey: 'onb.s3.desc',
      icon: 'autoTosser',
      getTarget: () => document.querySelector<HTMLElement>('.panel-tab[data-tab="minions"]'),
    },
    {
      titleKey: 'onb.s4.title',
      descKey: 'onb.s4.desc',
      icon: 'goldenHour',
      getTarget: () => document.querySelector<HTMLElement>('.panel-tab[data-tab="ads"]'),
    },
    {
      titleKey: 'onb.s5.title',
      descKey: 'onb.s5.desc',
      icon: 'diamondCoins',
      getTarget: () => document.querySelector<HTMLElement>('.hud-token-btn'),
    },
    {
      titleKey: 'onb.s6.title',
      descKey: 'onb.s6.desc',
      icon: 'coin',
      getTarget: () =>
        document.querySelector<HTMLElement>('[data-token-upgrade-id="tokenUp1"] .upgrade-buy-btn'),
    },
    {
      titleKey: 'onb.s7.title',
      descKey: 'onb.s7.desc',
      icon: 'offlineVault',
      isFinal: true,
      onEnter: () => {
        // Close token modal if open and return to Upgrades tab to show Offline Vault
        const modalClose = document.querySelector<HTMLButtonElement>(
          '.token-modal-dialog .modal-close',
        );
        if (modalClose) {
          modalClose.click();
        }
        onSelectTab('upgrades');
      },
      getTarget: () => {
        const vaultCard = document.querySelector<HTMLElement>('[data-upgrade-id="offlineVault"]');
        return vaultCard || finishBtn;
      },
    },
  ];

  let currentStep = 0;
  let rafId = 0;
  let destroyed = false;
  let stepTransitioning = false;

  const pulseCard = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    card.classList.remove('onb-card-shake');
    void card.offsetWidth;
    card.classList.add('onb-card-shake');
  };

  [blockerTop, blockerBottom, blockerLeft, blockerRight].forEach((b) => {
    b.addEventListener('pointerdown', pulseCard);
    b.addEventListener('click', pulseCard);
  });

  function renderStep(idx: number): void {
    if (destroyed) return;
    currentStep = idx;
    const step = steps[idx];
    if (!step) {
      finishOnboarding();
      return;
    }

    step.onEnter?.();

    stepBadge.textContent = t('onb.step', {
      cur: String(idx + 1),
      total: String(steps.length),
    });
    iconBadge.innerHTML = ICONS[step.icon] || ICONS.coin;
    titleEl.textContent = t(step.titleKey);
    descEl.textContent = t(step.descKey);
    promptEl.innerHTML = `<span class="onb-prompt-dot"></span><span>${t('onb.tapPrompt')}</span>`;

    if (step.isFinal) {
      promptEl.style.display = 'none';
      finishBtn.style.display = 'inline-flex';
      finishBtn.textContent = t('onb.finishBtn');
    } else {
      promptEl.style.display = 'inline-flex';
      finishBtn.style.display = 'none';
    }

    const target = step.getTarget();
    if (target) {
      try {
        target.scrollIntoView({ block: 'nearest', inline: 'center' });
      } catch {
        // ignore
      }
    }

    updateLayout();
  }

  function advanceFromClick(): void {
    if (destroyed || stepTransitioning) return;
    const step = steps[currentStep];
    if (!step) return;

    if (step.isFinal) {
      onStepSound();
      finishOnboarding();
      return;
    }

    const target = step.getTarget();
    stepTransitioning = true;

    if (target) {
      target.click();
    } else {
      onStepSound();
    }

    // Wait briefly if opening/closing modal (steps 5 & 6), otherwise advance quickly
    const delayMs = currentStep === 5 ? 260 : currentStep === 4 ? 80 : 40;
    setTimeout(() => {
      stepTransitioning = false;
      renderStep(currentStep + 1);
    }, delayMs);
  }

  hole.onclick = (e) => {
    e.stopPropagation();
    advanceFromClick();
  };

  finishBtn.onclick = (e) => {
    e.stopPropagation();
    onStepSound();
    finishOnboarding();
  };

  function updateLayout(): void {
    if (destroyed) return;
    const step = steps[currentStep];
    if (!step) return;

    const vw = window.innerWidth || 800;
    const vh = window.innerHeight || 600;
    const target = step.getTarget();
    const pad = 6;

    let holeLeft = vw / 2 - 70;
    let holeTop = vh / 2 - 24;
    let holeW = 140;
    let holeH = 48;

    if (target) {
      const r = target.getBoundingClientRect();
      if (r.width > 4 && r.height > 4) {
        holeLeft = Math.max(4, r.left - pad);
        holeTop = Math.max(4, r.top - pad);
        holeW = Math.min(vw - holeLeft - 4, r.width + pad * 2);
        holeH = Math.min(vh - holeTop - 4, r.height + pad * 2);
      }
    }

    const holeRight = holeLeft + holeW;
    const holeBottom = holeTop + holeH;

    // Position spotlight ring & clickable hole
    spotlight.style.left = `${holeLeft}px`;
    spotlight.style.top = `${holeTop}px`;
    spotlight.style.width = `${holeW}px`;
    spotlight.style.height = `${holeH}px`;

    hole.style.left = `${holeLeft}px`;
    hole.style.top = `${holeTop}px`;
    hole.style.width = `${holeW}px`;
    hole.style.height = `${holeH}px`;

    // Position 4 surrounding pointer blockers
    blockerTop.style.left = '0px';
    blockerTop.style.top = '0px';
    blockerTop.style.width = `${vw}px`;
    blockerTop.style.height = `${Math.max(0, holeTop)}px`;

    blockerBottom.style.left = '0px';
    blockerBottom.style.top = `${holeBottom}px`;
    blockerBottom.style.width = `${vw}px`;
    blockerBottom.style.height = `${Math.max(0, vh - holeBottom)}px`;

    blockerLeft.style.left = '0px';
    blockerLeft.style.top = `${holeTop}px`;
    blockerLeft.style.width = `${Math.max(0, holeLeft)}px`;
    blockerLeft.style.height = `${holeH}px`;

    blockerRight.style.left = `${holeRight}px`;
    blockerRight.style.top = `${holeTop}px`;
    blockerRight.style.width = `${Math.max(0, vw - holeRight)}px`;
    blockerRight.style.height = `${holeH}px`;

    // Position floating explanation card above or below the spotlight
    const cardW = Math.min(340, vw - 24);
    card.style.width = `${cardW}px`;
    const cardH = card.offsetHeight || 170;

    const targetCenterX = holeLeft + holeW / 2;
    const cardLeft = Math.max(12, Math.min(vw - cardW - 12, targetCenterX - cardW / 2));
    card.style.left = `${cardLeft}px`;

    const spaceAbove = holeTop;
    const spaceBelow = vh - holeBottom;

    if (spaceBelow >= cardH + 22 || spaceBelow >= spaceAbove) {
      const topPos = Math.min(vh - cardH - 12, holeBottom + 16);
      card.style.top = `${Math.max(12, topPos)}px`;
    } else {
      const topPos = Math.max(12, holeTop - cardH - 16);
      card.style.top = `${topPos}px`;
    }
  }

  function tickLayout(): void {
    if (destroyed) return;
    updateLayout();
    rafId = requestAnimationFrame(tickLayout);
  }

  function finishOnboarding(): void {
    if (destroyed) return;
    destroy();
    onComplete();
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    document.body.classList.remove('onboarding-active');
    overlay.remove();
  }

  renderStep(0);
  rafId = requestAnimationFrame(tickLayout);

  return { destroy };
}
