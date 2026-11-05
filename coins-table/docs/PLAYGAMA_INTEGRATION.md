# PLAYGAMA_INTEGRATION — как интегрируем Bridge

Источник: https://wiki.playgama.com/playgama/ (Bridge SDK v2). Весь код Bridge живёт в `src/platform/BridgePlatform.ts`. Полные правила: `PLAYGAMA_COMPLIANCE.md`.

## index.html
```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <!-- ПЕРВЫЙ скрипт, обычная загрузка, без async/defer -->
  <script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>
  <title>Coins Table</title>
</head>
```
`playgama-bridge-config.json` лежит рядом с `index.html` (в `public/` Vite). Заполнить через https://playgama.github.io/bridge-config-editor/ (ID платформ и плейсменты). До получения ID оставляем валидный минимальный конфиг.

## Порядок старта
1. Скрипт Bridge загружен (в `<head>`).
2. `await bridge.initialize()` внутри `try/catch`. При ошибке: mock-режим (`FakePlatform`-подобные безопасные значения), игра стартует.
3. Читаем `platform.language`, `isAudioEnabled`, `isRewardedSupported`, `isExternalLinksAllowed` один раз.
4. `await storage.get([все ключи])` одним вызовом, миграции, восстановление.
5. Загрузка ассетов и сцены (экран загрузки с прогрессом).
6. Первый играбельный кадр отрисован, UI интерактивен → `platform.sendMessage('game_ready')` один раз.

## Модули и использование
| Модуль Bridge | Использование |
|---|---|
| `platform.language` | язык интерфейса, fallback `en` |
| `platform.sendMessage('game_ready')` | один раз после первого играбельного кадра |
| `platform.isAudioEnabled` + события | старт без звука при `false`; реакция на изменения |
| события паузы | пауза логики, рендера и звука |
| `storage.get / set` | единственное хранилище; массив ключей одним вызовом |
| `advertisement.showInterstitial()` | на естественных паузах (см. ниже) |
| `advertisement.isRewardedSupported`, `showRewarded()` | ветка Ad Boosts, Collect x2 |
| `analytics.send` | события игры (Bridge ≥ 2.3.0) |
| `platform.isExternalLinksAllowed` | показ внешних ссылок (в MVP ссылок нет) |

Другие модули (payments, leaderboards, player, social и т.д.) в MVP не используются. Если добавляются, UI скрывается по флагу поддержки.

## Interstitial: когда вызывать
Только `showInterstitial()` на естественных паузах, без собственных счётчиков и таймеров (Bridge сам решает показ):
1. После закрытия окна Welcome back.
2. При смене стола.
3. После крупной покупки (открытие стола).
Не вызывать во время активного тапа, зажатия, в первые секунды после старта и сразу после rewarded. Во время рекламы: пауза логики и рендера, звук 0; после: продолжение без потери прогресса. Блок не должен появляться «под пальцем»: перед вызовом отпустить зажатие и дождаться окончания анимации.

## Rewarded: контракт
```ts
const result = await platform.showRewarded()   // 'rewarded' | 'closed' | 'failed'
if (result === 'rewarded') engine.grantReward(...)
```
- Награда только при `'rewarded'`. `closed` и `failed`: ничего не выдаём, игра играбельна.
- Кнопка явно сообщает о рекламе и награде («Watch ad: x2 income»).
- Не предлагать повторно подряд и навязчиво. Вкладка и кнопки скрыты при `isRewardedSupported=false`.
- Защита от двойного клика: пока реклама идёт, кнопка заблокирована.

## Пауза и звук
Подписка на события паузы и аудио регистрируется до `game_ready`. Любой `pause=true` ставит на паузу `Engine`, рендер-цикл, `VolumeController` (звук 0). При `pause=false` возобновляем. Состояние `isAudioEnabled=false` не должно включаться ручным unmute пока платформа запрещает звук.

## Хранилище
Ключи: `save`, `settings`, `meta`. Данные JSON. Запись по политике `AC-SAVE-3`. Не хранить в `localStorage` ни при каких условиях (в том числе как fallback).

## Mock-режим и локальная разработка
Вне платформы Bridge отдаёт безопасные значения. Это поведение нужно учитывать: `showRewarded()` может возвращать отказ, `isRewardedSupported` может быть `false`. Для dev-режима предусмотреть `?mock=rewarded` в `FakePlatform`-прослойке (только debug-сборка), чтобы руками проверять успешный rewarded.

## Версия SDK
Используем CDN `v2/stable`. Версия и дата проверки фиксируются в `DECISIONS.md`; при обновлении Bridge прогоняем `npm run verify` и e2e.

## Загрузка на Playgama
См. `RELEASE.md`: сборка `game.zip`, проверка, загрузка в консоль, проверка опубликованной ссылки Playwright.
