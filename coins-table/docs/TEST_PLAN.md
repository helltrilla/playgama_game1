# TEST_PLAN — стратегия TDD

## 1. Пирамида
| Уровень | Инструмент | Что | Где |
|---|---|---|---|
| Unit | Vitest | `core`, `data`, `i18n`, `platform` (на FakePlatform) | `tests/unit/**` |
| Property | fast-check | инварианты экономики и сейвов | `tests/unit/**.prop.test.ts` |
| Integration | Vitest | `Engine` + `Save` + `FakePlatform` + `FakeClock` | `tests/unit/save.roundtrip.test.ts` |
| E2E | Playwright | собранная игра, реальный браузер, mock Bridge | `tests/e2e/game.spec.ts` |
| Visual | Playwright screenshots | матрица размеров | `tests/e2e/visual.spec.ts` |
| Compliance | Node.js скрипт | чеклист Playgama | `scripts/compliance-scan.mjs` |
| Balance sim | Vitest runner | симуляция темпа прогресса | `tests/unit/sim-economy.test.ts` |

## 2. Правила TDD
1. Сначала тест, он красный по правильной причине (сообщение теста читаемо).
2. Один критерий `AC-*` на тест или группу, имя теста начинается с ID: `AC-ECO-1: cost grows geometrically`.
3. Без реального времени и случайности: `FakeClock`, `SeededRng`.
4. Без сети и без three.js в unit-тестах.
5. Тесты не зависят от порядка, не делят состояние.
6. Покрытие: `core` и `data` ≥ 90% строк и веток.
7. Баг = сначала регрессионный тест, потом правка.

## 3. Тестовые двойники
- `FakeClock` (ручное продвижение), `SeededRng`.
- `FakePlatform`: настраиваемые `language`, `isAudioEnabled`, `isRewardedSupported`, исход `showRewarded()` (`rewarded|closed|failed`), счётчики вызовов `storage.get/set`, `showInterstitial`, эмиттеры `pause` и `audio`.
- Для e2e: Mock Bridge внедряется в `tests/e2e/game.spec.ts` и `tests/e2e/visual.spec.ts`, имитируя поведение Playgama Bridge SDK v2 со сохранением в `window.name`.

## 4. Матрица размеров (visual и layout)
Размеры viewport:
- 360×640 (mobile compact portrait)
- 390×844 (iPhone standard portrait)
- 915×412 (mobile landscape)
- 1280×720 (desktop HD landscape)
- 800×800 (square 1:1)

Для каждого размера: скриншоты главного экрана, развёрнутой панели Upgrades, панели Ad Boosts и настроек. Проверки: нет скролла страницы, элементы внутри экрана, отсутствие перекрытий.

## 5. Compliance-тесты (авто)
- Bridge-скрипт первый в `<head>`, без `async`/`defer`.
- `playgama-bridge-config.json` рядом с `index.html`, валиден.
- Статический скан сборки: нет `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, внешних `http(s)://` кроме `bridge.playgama.com`.
- Нет использования `Esc` (`keydown` с `Escape` не перехватывается).
- `game.zip`: `index.html` в корне, имена только латиницей, размер 0.40 МБ (≤ 10 МБ).
- Строки локализации: нет запрещённых слов гемблинга.

## 6. Сценарии E2E
1. Загрузка → `game_ready` один раз → первый тап → Gold вырос.
2. Покупка апгрейда → число изменилось → после reload сохранено.
3. Открытие стола при достатке Gold; блок при нехватке.
4. Viewport matrix: проверка отсутствия скролла и переполнений во всех разрешениях.
5. Visual matrix: захват скриншотов во всех ключевых разрешениях.

## 7. Трассировка AC → тесты

| AC | Описание | Тест / Проверка | Статус |
|---|---|---|---|
| AC-GAME-1 | Тап добавляет монету, Gold растёт | `tests/unit/gameplay.test.ts` | done |
| AC-GAME-2 | Авто-тапы при зажатии | `tests/unit/gameplay.test.ts` | done |
| AC-GAME-3 | Авто-подброс не зависит от dt | `tests/unit/gameplay.test.ts` | done |
| AC-GAME-4 | Вероятности Multi Toss и Lucky Coin | `tests/unit/gameplay.test.ts` | done |
| AC-GAME-5 | Анимация монеты и пул | `tests/e2e/game.spec.ts` | done |
| AC-GAME-6 | `+N` и звук монеты | `tests/e2e/game.spec.ts` | done |
| AC-ECO-1 | Формула стоимости cost(level) | `tests/unit/economy.cost.test.ts` | done |
| AC-ECO-2 | Блок покупки без средств / на макс уровне | `tests/unit/economy.buy.test.ts` | done |
| AC-ECO-3 | Режимы покупки x1 / x10 / Max | `tests/unit/economy.buy.test.ts` | done |
| AC-ECO-4 | Множители стола, Golden Hour, Frenzy | `tests/unit/economy.cost.test.ts` | done |
| AC-ECO-5 | Форматирование чисел (K/M/B... e+N) | `tests/unit/format.test.ts` | done |
| AC-ECO-6 | Property-тесты инвариантов экономики | `tests/unit/economy.prop.test.ts` | done |
| AC-TBL-1 | Wooden открыт, Marble/Royal закрыты | `tests/unit/tables.test.ts` | done |
| AC-TBL-2 | Открытие стола списывает Gold | `tests/unit/tables.test.ts` | done |
| AC-TBL-3 | Переключение стола в UI | `tests/e2e/game.spec.ts` | done |
| AC-TBL-4 | Добавление стола через данные | `tests/unit/tables.test.ts` | done |
| AC-ADS-1 | Награда только после rewarded | `tests/unit/ads.reward.test.ts` | done |
| AC-ADS-2 | Ошибка или закрытие не дают награду | `tests/unit/ads.reward.test.ts` | done |
| AC-ADS-3 | Последовательные уровни Ad Boosts | `tests/unit/ads.reward.test.ts` | done |
| AC-ADS-4 | Кулдауны и Frenzy по Clock | `tests/unit/ads.reward.test.ts` | done |
| AC-ADS-5 | Скрытие Ad Boosts при отсутствии rewarded | `tests/e2e/game.spec.ts` | done |
| AC-OFF-1 | Офлайн доход по формуле | `tests/unit/offline.test.ts` | done |
| AC-OFF-2 | Окно Welcome Back и Collect x2 | `tests/unit/offline.test.ts`, `tests/e2e/game.spec.ts` | done |
| AC-SAVE-1 | Сериализация и десериализация сейва | `tests/unit/save.roundtrip.test.ts` | done |
| AC-SAVE-2 | Одиночный get и debounce set | `tests/unit/save.roundtrip.test.ts` | done |
| AC-SAVE-3 | Принудительное сохранение при уходе в фон | `tests/unit/save.roundtrip.test.ts` | done |
| AC-SAVE-4 | Миграция версий сейва | `tests/unit/save.roundtrip.test.ts` | done |
| AC-SAVE-5 | Восстановление прогресса после reload | `tests/e2e/game.spec.ts` | done |
| AC-PG-1 | Bridge в head без async | `scripts/compliance-scan.mjs` | done |
| AC-PG-2 | playgama-bridge-config.json валиден | `scripts/compliance-scan.mjs` | done |
| AC-PG-3 | Язык из platform.language, en fallback | `tests/unit/localization.test.ts` | done |
| AC-PG-4 | Отсутствие localStorage/sessionStorage/cookies | `scripts/compliance-scan.mjs` | done |
| AC-PG-5 | Пауза и выключение звука | `tests/unit/volume.test.ts` | done |
| AC-PG-6 | game_ready ровно один раз после кадра | `tests/e2e/game.spec.ts` | done |
| AC-PG-7 | Interstitial на паузах | `tests/unit/gameplay.test.ts` | done |
| AC-PG-8 | Скрытие неподдерживаемого | `scripts/compliance-scan.mjs` | done |
| AC-PG-9 | Нет внешних URL кроме bridge.playgama.com | `scripts/compliance-scan.mjs` | done |
| AC-PG-10 | Аналитика через Bridge | `scripts/compliance-scan.mjs` | done |
| AC-PG-11 | Graceful fallback без Bridge | `tests/unit/gameplay.test.ts` | done |
| AC-UX-1 | Нет скролла страницы | `tests/e2e/game.spec.ts` | done |
| AC-UX-2 | Адаптивная матрица размеров без клиппинга | `tests/e2e/visual.spec.ts` | done |
| AC-UX-3 | Заполнение 1:1, соотношение сторон | `tests/e2e/visual.spec.ts` | done |
| AC-UX-4 | Запрет выделения текста и контекстного меню | `tests/e2e/game.spec.ts` | done |
| AC-UX-5 | Кнопки закрытия, нет Escape | `scripts/compliance-scan.mjs` | done |
| AC-UX-6 | Ресайз и поворот не ломают состояние | `tests/e2e/game.spec.ts` | done |
| AC-UX-7 | Мгновенный Mute звука | `tests/unit/volume.test.ts` | done |
| AC-PERF-1 | Draw calls ≤ 60 (факт: 7), Tris ≤ 150k (факт: 408) | `tests/e2e/visual.spec.ts` | done |
| AC-PERF-5 | Размер game.zip ≤ 10 МБ (факт: 0.40 МБ) | `scripts/compliance-scan.mjs` | done |
| AC-LOC-1 | Ключи en и ru совпадают | `tests/unit/localization.test.ts` | done |
| AC-LOC-2 | Запрет гемблинг лексики | `tests/unit/localization.test.ts`, `scripts/compliance-scan.mjs` | done |
| AC-LOC-3 | Переключение языка интерфейса | `tests/e2e/game.spec.ts` | done |

## 8. Команды
- `npm run test` — Vitest unit & property тесты.
- `npm run test:e2e` — Playwright E2E и визуальные тесты.
- `npm run test:compliance` — проверка соответствия правилам Playgama.
- `npm run verify` — полная верификация (lint + typecheck + test + package).
