# ARCHITECTURE

## Слои и правила импортов
```
src/
  core/       чистая логика (без three, DOM, Bridge). Детерминированная.
  data/       баланс и контент: tables.ts, upgrades.ts, adBoosts.ts
  platform/   адаптер Playgama Bridge + FakePlatform (для тестов)
  scene/      three.js: сцена, столы, монеты, камера, эффекты, пулы
  ui/         HTML/CSS интерфейс поверх canvas
  audio/      единый контроллер громкости и воспроизведение
  i18n/       словари en, ru и загрузчик
  app/        композиция: связывает слои, жизненный цикл, game loop
  debug/      ?debug оверлей и window.__game
```
Допустимые зависимости: `core` ← `data`; `app` знает всех; `scene`, `ui`, `audio`, `platform` зависят от `core` через интерфейсы, но **не друг от друга**. Правило проверяется `eslint-plugin-boundaries` (или `dependency-cruiser`) в `npm run verify`.

## Core (ключевые модули)
- `Clock` — интерфейс времени (`now()`); `SystemClock` и `FakeClock`.
- `Rng` — интерфейс случайности; `SeededRng` (например mulberry32).
- `BigNum` — безопасная арифметика больших чисел (сложение, умножение на число, сравнение, форматирование). Реализация на BigInt с фиксированной точностью либо mantissa/exponent. Решение фиксируется в `DECISIONS.md`.
- `GameState` — сериализуемое состояние: gold, upgrades, adBoosts, tables, settings, timestamps, saveVersion.
- `Economy` — формулы `ECONOMY_SPEC` (стоимость, доход, офлайн).
- `Tosser` — подбросы: тап, зажатие, авто. Возвращает события `CoinTossed`.
- `Engine` — `step(dt)` и команды (`tap`, `buy`, `unlockTable`, `grantReward`). Эмитит события.
- `Save` — сериализация, версионирование, миграции, debounce-политика.
- `Events` — типизированная шина событий (core → ui, scene, audio).

Core не знает про рендер. Монета для core — событие и начисление Gold. Физика отскока монеты живёт в `scene` (визуал), не влияет на экономику.

## Platform
Интерфейс `Platform`:
```ts
interface Platform {
  init(): Promise<void>
  language: string
  isAudioEnabled: boolean
  isRewardedSupported: boolean
  isExternalLinksAllowed: boolean
  storage: { get(keys: string[]): Promise<Record<string, unknown>>; set(data: Record<string, unknown>): Promise<void> }
  showInterstitial(): Promise<void>
  showRewarded(): Promise<'rewarded' | 'closed' | 'failed'>
  sendGameReady(): void
  analytics(event: string, params?: Record<string, unknown>): void
  onPause(cb: (paused: boolean) => void): void
  onAudioChange(cb: (enabled: boolean) => void): void
}
```
`BridgePlatform` реализует его поверх `window.bridge` и ловит любые ошибки (fail-safe). `FakePlatform` управляется из тестов (настраиваемые ответы, счётчики вызовов, эмуляция событий).

## Game loop и рендер
- Фиксированный шаг логики (например 20 Гц) с накоплением `dt`, интерполяция визуала. Core детерминирован.
- Рендер через `requestAnimationFrame`; остановка при скрытой вкладке, паузе платформы и рекламе.
- Лимит 60 FPS на сенсорных устройствах.
- Авто-качество: решение принимается не раньше 10 с после старта, по скользящему среднему.

## Бюджеты производительности
- Draw calls ≤ 60, треугольники ≤ 150k, активных монет ≤ 80 (пул, `InstancedMesh`).
- Один материал на группу объектов; текстуры сжаты, атласы.
- Без аллокаций в кадре (пулы для монет и `+N`).
- Потеря WebGL-контекста: обработчики `webglcontextlost`/`webglcontextrestored`, пересоздание ресурсов.

## Звук
Один `VolumeController`: итоговая громкость = `manualMute | platformAudio | paused | adPlaying` (если любой флаг гасит, звук 0). Состояние ручного mute сохраняется.

## Сохранения
Ключи Storage: `save` (JSON состояния), `settings`, `meta` (`saveVersion`, `lastSeen`). Старт: один `get([...])`. Запись: один `set` с изменёнными ключами; debounce 5 с, принудительно при `pause`/`visibilitychange`. Версионирование и миграции в `core/Save`.

## Отладка
- `?debug`: оверлей FPS, draw calls, треугольники, память.
- `window.__game` (только в debug и тестовой сборке): `addGold(n)`, `setTable(id)`, `reset()`, `setTime(t)`, `getState()`, `step(ms)`, `getStats()`. Не попадает в production-бандл.

## Сборка
Vite, `base: './'`. Скрипт Bridge вставляется в `index.html` первым в `<head>` вручную (без инъекции с async). `npm run package` собирает `game.zip` (index.html в корне, латиница в именах, проверка размера и отсутствия внешних URL).
