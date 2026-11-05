import { ICONS } from './icons';
import { t, getLang, type Lang } from '../i18n';

export interface SettingsModalOptions {
  container: HTMLElement;
  isMuted: boolean;
  onToggleSound: () => boolean;
  onChangeLanguage: (lang: Lang) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export function showSettingsModal(options: SettingsModalOptions): void {
  const {
    container,
    isMuted: initialMuted,
    onToggleSound,
    onChangeLanguage,
    onResetProgress,
    onClose,
  } = options;

  let currentMuted = initialMuted;
  let currentLang = getLang();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'settings-title');

  // Close cross
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', t('common.close'));
  closeBtn.innerHTML = ICONS.close;
  closeBtn.onclick = () => {
    cleanup();
    onClose();
  };

  // Title
  const title = document.createElement('h2');
  title.id = 'settings-title';
  title.className = 'modal-title';
  title.textContent = t('settings.title');

  // Rows container
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.style.marginBottom = '16px';

  // Sound row
  const soundRow = document.createElement('div');
  soundRow.className = 'settings-row';

  const soundLabel = document.createElement('span');
  soundLabel.className = 'settings-label';
  soundLabel.textContent = currentMuted ? t('sound.unmute') : t('sound.mute');

  const soundBtn = document.createElement('button');
  soundBtn.className = 'btn btn-icon';
  soundBtn.innerHTML = currentMuted ? ICONS.mute : ICONS.sound;
  soundBtn.onclick = () => {
    currentMuted = onToggleSound();
    soundBtn.innerHTML = currentMuted ? ICONS.mute : ICONS.sound;
    soundLabel.textContent = currentMuted ? t('sound.unmute') : t('sound.mute');
  };

  soundRow.appendChild(soundLabel);
  soundRow.appendChild(soundBtn);

  // Language row
  const langRow = document.createElement('div');
  langRow.className = 'settings-row';

  const langLabelWrap = document.createElement('div');
  langLabelWrap.style.display = 'flex';
  langLabelWrap.style.alignItems = 'center';
  langLabelWrap.style.gap = '8px';

  const langIcon = document.createElement('span');
  langIcon.style.display = 'inline-flex';
  langIcon.style.width = '20px';
  langIcon.style.height = '20px';
  langIcon.style.color = 'var(--text-1)';
  langIcon.innerHTML = ICONS.globe;

  const langLabel = document.createElement('span');
  langLabel.className = 'settings-label';
  langLabel.textContent = t('settings.language');

  langLabelWrap.appendChild(langIcon);
  langLabelWrap.appendChild(langLabel);

  const langButtons = document.createElement('div');
  langButtons.className = 'lang-buttons';

  const enBtn = document.createElement('button');
  enBtn.className = `lang-btn ${currentLang === 'en' ? 'active' : ''}`;
  enBtn.textContent = 'English';

  const ruBtn = document.createElement('button');
  ruBtn.className = `lang-btn ${currentLang === 'ru' ? 'active' : ''}`;
  ruBtn.textContent = 'Русский';

  enBtn.onclick = () => {
    if (currentLang !== 'en') {
      currentLang = 'en';
      enBtn.classList.add('active');
      ruBtn.classList.remove('active');
      onChangeLanguage('en');
      cleanup();
      // Re-open with new language
      showSettingsModal({
        ...options,
        isMuted: currentMuted,
      });
    }
  };

  ruBtn.onclick = () => {
    if (currentLang !== 'ru') {
      currentLang = 'ru';
      ruBtn.classList.add('active');
      enBtn.classList.remove('active');
      onChangeLanguage('ru');
      cleanup();
      // Re-open with new language
      showSettingsModal({
        ...options,
        isMuted: currentMuted,
      });
    }
  };

  langButtons.appendChild(enBtn);
  langButtons.appendChild(ruBtn);

  langRow.appendChild(langLabelWrap);
  langRow.appendChild(langButtons);

  // Reset progress row
  const resetRow = document.createElement('div');
  resetRow.className = 'settings-row';
  resetRow.style.borderBottom = 'none';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-secondary';
  resetBtn.style.color = 'var(--danger)';
  resetBtn.style.borderColor = 'rgba(229, 96, 77, 0.4)';
  resetBtn.textContent = t('settings.reset');
  resetBtn.onclick = () => {
    showResetConfirm();
  };

  const versionBtn = document.createElement('button');
  versionBtn.className = 'btn btn-secondary tabular';
  versionBtn.style.fontSize = 'var(--fs-12)';
  versionBtn.style.padding = '8px 12px';
  versionBtn.textContent = t('settings.versionBtn', { v: '1.7.1' });
  versionBtn.onclick = () => {
    showChangelogModal();
  };

  resetRow.appendChild(resetBtn);
  resetRow.appendChild(versionBtn);

  body.appendChild(soundRow);
  body.appendChild(langRow);
  body.appendChild(resetRow);

  dialog.appendChild(closeBtn);
  dialog.appendChild(title);
  dialog.appendChild(body);

  backdrop.appendChild(dialog);
  container.appendChild(backdrop);

  // Backdrop click closes modal
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      cleanup();
      onClose();
    }
  };

  function showChangelogModal(): void {
    const logBackdrop = document.createElement('div');
    logBackdrop.className = 'modal-backdrop';
    logBackdrop.style.zIndex = 'calc(var(--z-modal) + 1)';

    const logDialog = document.createElement('div');
    logDialog.className = 'modal-dialog';
    logDialog.style.maxWidth = '500px';
    logDialog.style.maxHeight = '82vh';
    logDialog.style.display = 'flex';
    logDialog.style.flexDirection = 'column';

    const logClose = document.createElement('button');
    logClose.className = 'modal-close';
    logClose.setAttribute('aria-label', t('common.close'));
    logClose.innerHTML = ICONS.close;
    logClose.onclick = () => {
      logBackdrop.remove();
    };

    const logTitle = document.createElement('h3');
    logTitle.className = 'modal-title';
    logTitle.textContent = t('settings.changelogTitle');

    const logList = document.createElement('div');
    logList.style.overflowY = 'auto';
    logList.style.display = 'flex';
    logList.style.flexDirection = 'column';
    logList.style.gap = '10px';
    logList.style.paddingRight = '4px';
    logList.style.marginTop = '6px';

    const changelogEntries =
      currentLang === 'ru'
        ? [
            {
              ver: 'v1.7.1',
              items: [
                'Горизонтальное дерево Перерождения: все 33 узла теперь одноуровневые (Макс. ур. 1). Слева — ветка миньонов, по центру — хаб, вправо — цепочка из 7 эксклюзивных монет (Рубин → Небесная) с уникальными навыками ценности (x2 сверху) и скорости (снизу).',
                'Исправлена прокрутка дерева талантов Перерождения: увеличены границы и внутренние отступы поля дерева, чтобы все колонки свободно прокручивались до самого верха и краёв.',
                'Ребаланс цен миньонов и прогрессии монет: обучение миньонов следующему тиру монет привязано к стоимости открытия соответствующей монеты (x1.5), замедлена инфляция для плавной прогрессии.',
              ],
            },
            {
              ver: 'v1.6.8',
              items: [
                'Конвертер «Слияние монет» (5 → 1): возможность слить 5 монет младшего тира со стола в +1 монету следующего тира бесплатно, а также слить остаток (< 5 шт.) до нуля за доплату золотом.',
                'Добавлена вкладка «Статистика»: подробный расчёт дохода в секунду по каждому тиру монет (реальный доход за последние 10с, оценка авто-дохода миньонов и ценность 1 броска).',
                'Исправлен расчёт бафа за рекламу «Прыжок во времени» (+10 минут дохода): теперь награда рассчитывается строго по среднему реальному доходу за последние 10 секунд.',
              ],
            },
            {
              ver: 'v1.6.7',
              items: [
                'Новый баланс экономики: единая формула стоимости BasePrice * (1.15 ^ Level), быстрый старт (1-й клик = 1 монета, 1-й апгрейд клика = 15, 1-й авто-помощник = 60 и даёт 1 монету/сек).',
                'Глобальные множители при открытии новых монет: Серебряная монета (2 000) даёт x5 ко всем доходам, Золотая (50 000) даёт x10, и далее по тирам.',
                'Добавлена вкладка «Алхимия» (Алхимическая лаборатория): варка случайного зелья с анимацией бурления колбы и выплывающими плашками эффектов (60% неудача, 30% Зелье скорости +10 авто-кликов/сек на 30с, 10% Золотой эликсир x10 к доходу на 15с).',
              ],
            },
            {
              ver: 'v1.6.6',
              items: [
                'Добавлен пошаговый интерактивный онбординг при первом запуске игры с подсветкой кнопок: 1) Улучшения (покупка монет), 2) Улучшения монет (ценность и скорость падения), 3) Покупка миньонов, 4) Крутые бафы за рекламу.',
                'При первом запуске выдаётся 1 подарочный Жетон рекламы и показывается прокачка скидки -10% на весь магазин, а также объяснение офлайн-дохода миньонов.',
              ],
            },
            {
              ver: 'v1.6.5',
              items: [
                'Возвращена плашка баннера слева под счётчиком монет и добавлена динамическая синхронизация размеров (320×50 IAB в %) и защита от кэширования конфига Playgama Bridge v2.',
              ],
            },
            {
              ver: 'v1.6.4',
              items: [
                'Исправлено отображение рекламного баннера Playgama SDK (перевод координат и размеров advancedBanners в строгие проценты % по спецификации Bridge v2).',
              ],
            },
            {
              ver: 'v1.6.3',
              items: [
                'Новые 3D-модели миньонов (как на обложке: загнутый колпак с помпоном, ушки, щёчки, мешочек с золотом, а у Титанов — золотой молот и наплечники).',
                'Обновлённый рельеф и размер монет: корона, лавровый венок и 5 звёзд внутри каждой монеты, более аккуратный масштаб монет.',
                'Улучшенные 3D-столы с узором сукна, угловыми медальонами и уникальным 3D-окружением/фоном под каждый из 5 столов.',
                'Добавлен лимитер громкости и смягчены звуки при массовом падении монет.',
              ],
            },
            {
              ver: 'v1.6.2',
              items: [
                'Смягчена прогрессия цены очков Ребиртха (рост цены снижен с x1.85).',
                'Уведомление падения монеты на Ребро сделано компактным («x25!» над монетой и без наслоения плашек на пол-экрана).',
                'В настройках добавлена кнопка версии с полной историей всех обновлений.',
                'Добавлен компактный рекламный баннер слева под счётчиком монет.',
              ],
            },
            {
              ver: 'v1.6.1',
              items: [
                'Вкладка «Бонусы» за просмотр рекламы расширена до 70 суммарных уровней (8 вечных перманентных прокачек, которые не сбрасываются при Ребиртхе).',
                'Прокачка ранга подбрасываемых монет миньонов теперь всегда покупается строго по 1 уровню.',
              ],
            },
            {
              ver: 'v1.6.0',
              items: [
                'Древо талантов Ребиртха расширено до 12 тиров (33 уникальных таланта).',
                'Добавлены 7 новых рангов монет между тирами Ребиртха: Рубиновая, Аметистовая, Обсидиановая, Мифриловая, Астральная, Солнечная и Небесная (всего 14 рангов монет, по 1 шт. сразу при открытии).',
                'Добавлены Усиленные миньоны-Титаны (открываются в 5-м тире древа, до 3 шт.): бьют по столу раз в 5 секунд и подбрасывают все монеты сразу.',
                'Добавлено отображение «Ур. X/Макс» на всех карточках и отдельная вкладка «Макс.» для полностью прокачанных улучшений.',
                'Глубокая оптимизация 3D-рендера, физики и памяти для защиты телефонов от нагрева при большом числе монет.',
              ],
            },
            {
              ver: 'v1.5.0',
              items: [
                'Цена следующего очка Ребиртха теперь сохраняется между перерождениями и продолжает расти дальше.',
                'Древо талантов Ребиртха расширено с 3 до 7 тиров (20 талантов).',
                'Сбалансирован стартовый капитал и цены улучшений.',
              ],
            },
            {
              ver: 'v1.4.0',
              items: [
                'Введено интерактивное древо талантов Ребиртха по тирам с предварительным распределением очков.',
                'Каждое полученное очко Ребиртха навсегда даёт +5% ко всему доходу монет.',
              ],
            },
            {
              ver: 'v1.3.0',
              items: [
                'Механика свайпа по монетам (Swipe-to-Flip) и ударной волна от клика.',
                'Комбо-множитель «Серия Орлов подряд» и редкое падение монеты на Ребро (x25 золота).',
                'Золотая Реликвия на столе (мгновенное золото + Ажиотаж x5 на 15 секунд).',
                'Индикаторы доступных покупок на вкладках и расширение до 25 достижений.',
              ],
            },
            {
              ver: 'v1.2.0',
              items: [
                'Добавлена система Перерождений (Ребиртх) и нижняя шкала прогресса очков Ребиртха.',
              ],
            },
            {
              ver: 'v1.1.0',
              items: [
                '7 базовых рангов монет (Бронза, Серебро, Золото, Платина, Сапфир, Изумруд, Алмаз) со своими ветками прокачки.',
                '3D-миньоны на столе, которые бегают от монеты к монете и подбрасывают их.',
                'Система достижений и бонусная ветка за Жетоны.',
              ],
            },
            {
              ver: 'v1.0.0',
              items: [
                'Первый релиз «Coins Table»: 3D-сцена на Three.js, физика подбрасывания монет, 5 коллекционных столов и офлайн-доход.',
              ],
            },
          ]
        : [
            {
              ver: 'v1.7.1',
              items: [
                'Horizontal Rebirth Talent Tree: all 33 nodes are now single-level (Max Lv. 1). Left wing for Minions, central Core Hub, and a 7-coin progression spine to the right (Ruby → Celestial) with unique x2 value skills above and +30% speed skills below.',
                'Fixed Rebirth Talent Tree scroll boundaries: expanded outer padding and aligned columns so the tree smoothly scrolls all the way to the top and edges.',
                'Rebalanced minion pricing and coin progression: Minion Coin Training now scales with the target coin unlock price (1.5x), and overall inflation has been tuned for smoother pacing.',
              ],
            },
            {
              ver: 'v1.6.8',
              items: [
                'Added 5-to-1 Coin Fusion converter: fuse 5 lower-tier coins on the table into +1 next-tier coin for free, or fuse leftover (< 5) coins down to zero for a proportional gold cost.',
                'Added "Statistics" tab showing per-coin-tier income per second (10s actual average, estimated minion auto-income, and single toss value).',
                'Fixed "Time Warp" (+10m income) Ad Boost to use the real average income over the last 10 seconds.',
              ],
            },
            {
              ver: 'v1.6.7',
              items: [
                'Economy overhaul: unified BasePrice * (1.15 ^ Level) upgrade formula, fast start (1st click = 1 coin, 1st click upgrade = 15, 1st auto-helper = 60 and yields 1 coin/sec).',
                'Global income multipliers on new coin unlocks: Silver Coin (2,000) grants x5 global income, Gold Coin (50,000) grants x10, and higher tiers scale further.',
                'Added the Alchemical Laboratory ("Alchemy" tab): brew random potions with a bubbling flask animation and slide-out effect banners (60% failed experiment, 30% Speed Potion +10 auto-clicks/sec for 30s, 10% Golden Elixir x10 income for 15s).',
              ],
            },
            {
              ver: 'v1.6.6',
              items: [
                'Added interactive spotlight onboarding on first launch covering: 1) Upgrades (Buy Coins), 2) Coin Upgrades (value & fall speed), 3) Hiring Minions, 4) Permanent Ad Boosts.',
                'Granted +1 starter Ad Token on first launch with guided -10% Shop Discount purchase and offline minion earnings explanation.',
              ],
            },
            {
              ver: 'v1.6.5',
              items: [
                'Restored the top-left HUD banner slot and added dynamic IAB 320×50 (%) coordinate syncing & cache-busting for Playgama Bridge v2.',
              ],
            },
            {
              ver: 'v1.6.4',
              items: [
                'Fixed Playgama SDK Advanced Banners rendering by converting all layout dimensions & offsets in playgama-bridge-config.json from px to strict percentage (%) values.',
              ],
            },
            {
              ver: 'v1.6.3',
              items: [
                'New 3D Minion models matching cover art (curved gnome cap with pom-pom, pointed ears, rosy cheeks, coin pouch, plus golden warhammers for Titans).',
                'Detailed Royal Crown, Laurel Wreath & 5-Star coin relief emblem with refined coin proportions.',
                'Ornate tables with filigree baize patterns, corner medallions, and unique 3D hall backdrops per table.',
                'Added audio compressor & rate-limiting for smooth sound during rapid coin cascades.',
              ],
            },
            {
              ver: 'v1.6.2',
              items: [
                'Lowered Rebirth point cost progression multiplier from x2.35 to x1.85 per step.',
                'Compact "x25!" Edge landing badge without stacking large toast banners on screen.',
                'Added interactive Version History button & full changelog modal in Settings.',
                'Added compact top-left Ad Banner slot under the gold counter.',
              ],
            },
            {
              ver: 'v1.6.1',
              items: [
                'Expanded permanent Ad Boosts tab to 70 total levels across 8 non-resetting upgrades.',
                'Locked Minion Coin Tier upgrade to always purchase 1 level at a time.',
              ],
            },
            {
              ver: 'v1.6.0',
              items: [
                'Expanded Rebirth Talent Tree to 12 Tiers (33 talents total).',
                'Added 7 new Coin Tiers unlocked across Rebirth tiers: Ruby, Amethyst, Obsidian, Mythril, Astral, Solar, and Celestial (14 coin tiers total).',
                'Added Heavy Minions / Titans (unlocked in Tier 5, max 3): slam the table every 5s to toss all resting coins at once.',
                'Added "Lv. X/Max" display on upgrade cards and a dedicated "Maxed" tab.',
                'Major mobile thermal & GPU optimization for high coin counts.',
              ],
            },
            {
              ver: 'v1.5.0',
              items: [
                'Rebirth point cost progression now persists across Rebirths.',
                'Expanded Rebirth Talent Tree from 3 to 7 tiers (20 talents).',
                'Rebalanced starting economy and upgrade cost scaling.',
              ],
            },
            {
              ver: 'v1.4.0',
              items: [
                'Introduced tiered Rebirth Talent Tree modal with point allocation preview.',
                'Every earned Rebirth Point permanently grants +5% passive gold income.',
              ],
            },
            {
              ver: 'v1.3.0',
              items: [
                'Added Swipe-to-Flip coin gesture and tap shockwave ring.',
                'Added Heads Streak combo multiplier and rare Edge coin landing (x25 gold).',
                'Added Golden Relic events on the table and 25 achievements.',
              ],
            },
            {
              ver: 'v1.2.0',
              items: ['Added Rebirth prestige system and bottom Rebirth progress bar.'],
            },
            {
              ver: 'v1.1.0',
              items: [
                'Added 7 base coin tiers (Bronze to Diamond), 3D table Minions, Achievements, and Token upgrades.',
              ],
            },
            {
              ver: 'v1.0.0',
              items: [
                'Initial release of Coins Table: Three.js 3D coin physics, 5 tables, and offline earnings.',
              ],
            },
          ];

    for (const entry of changelogEntries) {
      const card = document.createElement('div');
      card.style.background = 'rgba(255, 255, 255, 0.04)';
      card.style.border = '1px solid var(--line)';
      card.style.borderRadius = 'var(--r-md)';
      card.style.padding = '10px 12px';

      const verHeader = document.createElement('div');
      verHeader.className = 'tabular';
      verHeader.style.fontWeight = '800';
      verHeader.style.fontSize = 'var(--fs-14)';
      verHeader.style.color = 'var(--gold-0)';
      verHeader.style.marginBottom = '6px';
      verHeader.textContent = entry.ver;
      card.appendChild(verHeader);

      const ul = document.createElement('ul');
      ul.style.margin = '0';
      ul.style.paddingLeft = '18px';
      ul.style.display = 'flex';
      ul.style.flexDirection = 'column';
      ul.style.gap = '4px';

      for (const line of entry.items) {
        const li = document.createElement('li');
        li.style.fontSize = 'var(--fs-12)';
        li.style.color = 'var(--text-1)';
        li.style.lineHeight = '1.35';
        li.textContent = line;
        ul.appendChild(li);
      }

      card.appendChild(ul);
      logList.appendChild(card);
    }

    logDialog.appendChild(logClose);
    logDialog.appendChild(logTitle);
    logDialog.appendChild(logList);
    logBackdrop.appendChild(logDialog);
    container.appendChild(logBackdrop);

    logBackdrop.onclick = (e) => {
      if (e.target === logBackdrop) {
        logBackdrop.remove();
      }
    };
  }

  function showResetConfirm(): void {
    const confirmBackdrop = document.createElement('div');
    confirmBackdrop.className = 'modal-backdrop';
    confirmBackdrop.style.zIndex = 'calc(var(--z-modal) + 1)';

    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'modal-dialog';

    const confirmTitle = document.createElement('h3');
    confirmTitle.className = 'modal-title';
    confirmTitle.textContent = t('settings.reset');

    const confirmText = document.createElement('p');
    confirmText.className = 'modal-body';
    confirmText.textContent = t('settings.resetConfirm');

    const confirmActions = document.createElement('div');
    confirmActions.className = 'modal-actions';

    const doResetBtn = document.createElement('button');
    doResetBtn.className = 'btn btn-secondary';
    doResetBtn.style.color = '#fff';
    doResetBtn.style.backgroundColor = 'var(--danger)';
    doResetBtn.textContent = t('settings.resetOk');
    doResetBtn.onclick = () => {
      confirmBackdrop.remove();
      cleanup();
      onResetProgress();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-primary';
    cancelBtn.textContent = t('settings.resetCancel');
    cancelBtn.onclick = () => {
      confirmBackdrop.remove();
    };

    confirmActions.appendChild(doResetBtn);
    confirmActions.appendChild(cancelBtn);

    confirmDialog.appendChild(confirmTitle);
    confirmDialog.appendChild(confirmText);
    confirmDialog.appendChild(confirmActions);

    confirmBackdrop.appendChild(confirmDialog);
    container.appendChild(confirmBackdrop);
  }

  function cleanup(): void {
    backdrop.remove();
  }
}
