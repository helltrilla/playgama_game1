# ROADMAP — порядок работ (SDD + TDD)

Статусы: `done` (все вехи M0–M7 завершены и подтверждены тестами; веха M8 готова к загрузке в консоль).

## M0. Каркас проекта
- [x] Vite + TS strict, ESLint, Prettier, Vitest, Playwright, fast-check.
- [x] Правила границ слоёв (`ARCHITECTURE`), скрипты `verify`, `package`.
- [x] Заготовка `index.html` с Bridge первым в `<head>`, `playgama-bridge-config.json`.
- [x] CI (lint + typecheck + test + build).
- **Результат:** `npm run verify` и сборка протестированы.

## M1. Core: экономика и состояние (TDD, без UI)
- [x] `Clock`, `Rng`, `BigNum` (ADR-8), форматирование чисел. — AC-ECO-5
- [x] `cost(level)`, покупка x1/x10/Max. — AC-ECO-1,2,3
- [x] Доход за монету, множители. — AC-ECO-4, AC-GAME-1
- [x] Тапы, зажатие, авто-подброс, Multi/Lucky. — AC-GAME-2,3,4
- [x] Столы и открытие. — AC-TBL-1,2,4
- [x] Property-тесты инвариантов. — AC-ECO-6
- [x] Симулятор баланса `scripts/sim-economy.ts`.
- **Результат:** 13 unit/prop тест-файлов, 38 тестов зелёные.

## M2. Сохранения и офлайн
- [x] `Save`: сериализация, версии, миграции, debounce. — AC-SAVE-1,3,4
- [x] Офлайн-доход. — AC-OFF-1
- [x] Ad Boosts логика, кулдауны, Frenzy. — AC-ADS-1,2,3,4
- **Результат:** `save.roundtrip.test.ts`, `offline.test.ts`, `ads.reward.test.ts` пройдены.

## M3. Платформа (на FakePlatform)
- [x] Интерфейс `Platform`, `FakePlatform`, `BridgePlatform`. — AC-PG-3,5,7,10,11
- [x] Старт-последовательность: init → storage.get → ассеты → `game_ready`. — AC-PG-1,6
- [x] Пауза, звук, `VolumeController`.
- [x] Rewarded и interstitial в `Engine` через `Platform`. — AC-ADS-1,2, AC-PG-7
- **Результат:** `volume.test.ts`, `game.spec.ts` пройдены.

## M4. Сцена three.js
- [x] Рендер, камера, свет, стол Wooden, монета (InstancedMesh), пул. — AC-GAME-5
- [x] Физика отскока (визуальная), частицы, `+N`. — AC-GAME-6
- [x] Столы Marble и Royal, переключение. — AC-TBL-3
- [x] Бюджеты: draw calls (≤ 15) и треугольники (< 1000). — AC-PERF-1,4,6
- **Результат:** проверено оверлеем в Playwright visual-тестах (7 draw calls, 408 tris).

## M5. UI
- [x] Токены и компоненты (`DESIGN_SYSTEM`, `DESIGN_TOKENS`).
- [x] HUD, панель Upgrades, вкладка Ad Boosts, выбор стола. — `SCREEN_SPEC`
- [x] Welcome back, Settings, Loading, тосты. — AC-OFF-2
- [x] Локализация en/ru. — AC-LOC-1,2,3, AC-PG-3
- [x] Адаптивность по матрице. — AC-UX-1…7
- **Результат:** все UI компоненты реализованы без внешних CSS-фреймворков.

## M6. Звук и полировка
- [x] Аудио ассеты (Kenney CC0 ogg), mute, реакция на паузу и рекламу.
- [x] Анимации, отклик, `prefers-reduced-motion`.
- [x] Визуальная доработка (материалы дерева, мрамора, бордового сукна, золото).
- **Результат:** единый AudioController с WebAudio GainNode деревом и фоновыми джинглами.

## M7. Качество и модерация
- [x] E2E сценарии (`TEST_PLAN §6`), visual-матрица, soak.
- [x] Compliance-скан и чеклист `PLAYGAMA_COMPLIANCE`. — AC-PG-* (15/15 проверок).
- [x] Оптимизация размера и памяти. — AC-PERF-* (`game.zip` 0.40 МБ при бюджете 10 МБ).
- [x] Консультация с поддержкой Playgama (ADR-11).
- **Результат:** 9/9 Playwright E2E и visual тестов пройдены, 20 скриншотов просмотрены.

## M8. Релиз
- [x] Реальные ID в config, сборка `game.zip`.
- [x] Материалы для публикации, документация сборки и релиза (`RELEASE.md`, `README.md`, `CREDITS.md`).
- [ ] Загрузка в Developer Console Playgama и прохождение модерации.
- [ ] Проверка опубликованной ссылки Playwright'ом.

## Бэклог (после MVP)
Новые столы, престиж, лидерборды (`leaderboards`), достижения, ежедневные награды, больше языков, remote config для баланса.
