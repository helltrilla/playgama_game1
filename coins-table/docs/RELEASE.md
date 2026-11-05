# RELEASE — сборка, проверка, публикация

## Предрелизный чеклист
1. `npm run verify` зелёный (lint, typecheck, unit, integration, build, compliance-скан).
2. `npm run test:e2e` и `npm run test:compliance` зелёные.
3. `PLAYGAMA_COMPLIANCE.md`: все пункты `done` или `n/a`.
4. Ручная проверка на реальных устройствах: iOS Safari, Android Chrome, десктоп Chrome и Firefox.
5. FPS и память: soak 10 минут, `AC-PERF-*`.
6. `CREDITS.md` заполнен, лицензии подтверждены.
7. `playgama-bridge-config.json` содержит реальные ID и плейсменты (после регистрации игры в консоли).
8. Версия в `package.json` и в Settings обновлена; `CHANGELOG.md` дополнен.
9. `DECISIONS.md`: ADR-11 (консультация по тематике) закрыт.

## Сборка
```
npm ci
npm run verify
npm run package    # создаёт dist/ и game.zip
```
Проверки `package`: `index.html` в корне архива, имена файлов только латиницей, размер ≤ 300 МБ (цель ≤ 10 МБ), нет внешних URL кроме Bridge, нет `localStorage`/GA, `window.__game` и debug-код вырезаны.

## Публикация на Playgama (консоль разработчика)
1. Зарегистрироваться, создать игру в консоли, указать платформы публикации и устройства (mobile/desktop), ориентацию.
2. Заполнить `playgama-bridge-config.json` ID, пересобрать.
3. Загрузить `game.zip` (песочница/черновик). Дождаться автоматической проверки сборки (config, память < 2 ГБ, структура).
4. Загрузить иконку, обложку, скриншоты, описание en/ru, теги (`ASSET_INVENTORY`).
5. Проверить игру в песочнице: сценарии `TEST_PLAN §6`, реклама, сохранения, пауза.
6. Отправить на модерацию.
7. После публикации открыть опубликованную ссылку Playwright'ом и повторить сценарии.

Альтернативно можно использовать Playgama MCP-сервер (создание игры, загрузка билдов и обложек, публикация песочницы) — см. https://wiki.playgama.com/playgama/mcp.md. Решение о его использовании фиксируется в `DECISIONS.md`.

## Если модерация отклонила
1. Записать причину в `docs/MODERATION_LOG.md` (дата, причина, исправление).
2. Добавить регрессионный критерий в `ACCEPTANCE.md` и тест.
3. Исправить, прогнать `verify`, отправить повторно.

## Версионирование и обновления
SemVer. Изменения сейва: повышаем `saveVersion`, добавляем миграцию и тест (`AC-SAVE-4`). Баланс меняем в `ECONOMY_SPEC` → `data` → тесты. Обновление Bridge: проверить changelog, прогнать e2e.

## Пост-релизный мониторинг
События аналитики (`bridge.analytics.send`): `session_start`, `first_tap`, `upgrade_buy`, `table_unlock`, `rewarded_offer`, `rewarded_complete`, `offline_collect`, `error`. Метрики: D1/D7, длина сессии, доля rewarded, точки оттока. Решения по балансу фиксируются в `DECISIONS.md`.
