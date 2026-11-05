# LOCALIZATION

## Правила
- Языки MVP: **English (`en`, по умолчанию и fallback)** и **Русский (`ru`)**.
- Язык выбирается автоматически из `platform.language` после инициализации Bridge. Нет совпадения → `en`.
- Ручной выбор в Settings. Названия языков на родных языках («English», «Русский»), рядом иконка глобуса, доступно даже при непонятном языке.
- Строки только в словарях `src/i18n/en.ts`, `ru.ts`. В коде и вёрстке нет литералов текста.
- Ключи в `en` и `ru` совпадают (`AC-LOC-1`). Лишние и пропущенные ключи ломают `verify`.
- Запрещённые слова (`casino`, `bet`, `jackpot`, `slot`, `gamble`, `казино`, `ставк`, `джекпот`, `слот`) не встречаются (`AC-LOC-2`). Тест сканирует словари.
- Числа форматируются одинаково (суффиксы K, M, B латиницей); десятичный разделитель по языку.
- Интерполяция через `{name}`; множественные числа через функцию с формами (en: 2 формы, ru: 3).
- Тексты без эмодзи. Не вшивать текст в картинки.
- Запас длины: русские строки на 30–40% длиннее; UI проверяется на `ru`.

## Структура ключей
`common.*`, `hud.*`, `panel.*`, `upgrade.<id>.name|desc`, `adBoost.<id>.name|desc`, `table.<id>.name`, `offline.*`, `settings.*`, `toast.*`, `loading.*`, `aria.*`.

## Начальный словарь (en → ru)
| Ключ | en | ru |
|---|---|---|
| `hud.gold` | Gold | Золото |
| `hud.perSecond` | {n}/s | {n}/с |
| `hud.tapHint` | Tap the table | Нажимай на стол |
| `panel.upgrades` | Upgrades | Улучшения |
| `panel.adBoosts` | Ad Boosts | Бонусы за рекламу |
| `panel.buy` | Buy | Купить |
| `panel.max` | Max | Макс |
| `panel.level` | Level {n} | Уровень {n} |
| `panel.locked` | Locked | Закрыто |
| `panel.adsOptional` | Ads are optional | Реклама по желанию |
| `adBoost.watch` | Watch ad | Смотреть рекламу |
| `adBoost.activate` | Activate | Включить |
| `adBoost.cooldown` | Ready in {t} | Будет готово через {t} |
| `upgrade.coinValue.name` | Coin Value | Ценность монеты |
| `upgrade.autoTosser.name` | Auto Tosser | Авто-подброс |
| `upgrade.tossSpeed.name` | Toss Speed | Скорость подброса |
| `upgrade.multiToss.name` | Multi Toss | Мульти-подброс |
| `upgrade.luckyCoin.name` | Lucky Coin | Счастливая монета |
| `upgrade.offlineVault.name` | Offline Vault | Хранилище офлайна |
| `adBoost.goldenHour.name` | Golden Hour | Золотой час |
| `adBoost.diamondCoins.name` | Diamond Coins | Алмазные монеты |
| `adBoost.magnetTouch.name` | Magnet Touch | Магнитное касание |
| `adBoost.timeWarp.name` | Time Warp | Скачок времени |
| `adBoost.frenzy.name` | Frenzy | Неистовство |
| `table.wooden.name` | Wooden Table | Деревянный стол |
| `table.marble.name` | Marble Table | Мраморный стол |
| `table.royal.name` | Royal Table | Королевский стол |
| `table.unlock` | Unlock | Открыть |
| `table.active` | Active | Выбран |
| `offline.title` | Welcome back! | С возвращением! |
| `offline.away` | You were away for {t} | Вас не было {t} |
| `offline.collect` | Collect | Забрать |
| `offline.collectX2` | Collect x2 (watch ad) | Забрать x2 (реклама) |
| `settings.title` | Settings | Настройки |
| `settings.sound` | Sound | Звук |
| `settings.language` | Language | Язык |
| `settings.reset` | Reset progress | Сбросить прогресс |
| `settings.resetConfirm` | Delete all progress? | Удалить весь прогресс? |
| `toast.adUnavailable` | Ad unavailable, try again later | Реклама недоступна, попробуйте позже |
| `loading.title` | Loading… | Загрузка… |
| `loading.error` | Something went wrong | Что-то пошло не так |
| `common.close` | Close | Закрыть |
| `common.retry` | Retry | Повторить |

## Добавление языка
1. Создать `src/i18n/<code>.ts` с полным набором ключей.
2. Добавить в реестр языков и в список выбора (название на родном языке).
3. Проверить длину строк и шрифт (глифы), прогнать `verify`.
