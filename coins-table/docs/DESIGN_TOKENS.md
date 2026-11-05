# DESIGN_TOKENS

Источник значений для `src/ui/tokens.css` (CSS-переменные) и `src/scene/palette.ts`. Менять здесь, потом в коде. Не хардкодить цвета в компонентах.

## Цвета UI
| Токен | Значение | Назначение |
|---|---|---|
| `--bg-0` | `#0E0B08` | фон приложения |
| `--bg-1` | `#1A1510` | панели |
| `--bg-2` | `#251D15` | карточки |
| `--line` | `#3A2E20` | разделители |
| `--text-0` | `#F6EBD6` | основной текст |
| `--text-1` | `#BFAE92` | вторичный текст |
| `--gold-0` | `#FFE08A` | свет золота |
| `--gold-1` | `#F2B63D` | основной акцент |
| `--gold-2` | `#B8801C` | тень золота |
| `--ad-0` | `#6FB4FF` | rewarded светлый |
| `--ad-1` | `#2F7BE0` | rewarded основной |
| `--danger` | `#E5604D` | ошибка |
| `--success` | `#6CCB7A` | успех |
| `--scrim` | `rgba(0,0,0,.6)` | подложка модалок |

## Цвета столов (сцена)
| Стол | Поверхность | Сукно | Отделка |
|---|---|---|---|
| Wooden | `#8A5A33` | `#1F6B3A` | `#C79A5B` |
| Marble | `#EDEBE6` | `#2457A6` | `#B9B5AC` |
| Royal | `#2A1710` | `#6B1230` | `#F2B63D` |

Золото монеты: `#F2B63D`, `metalness 1.0`, `roughness 0.25`.

## Типографика
`--font-ui`: локальный Rubik/Sora (latin+cyrillic subset), fallback `system-ui, sans-serif`.
Размеры: `--fs-12:12px`, `--fs-14:14px`, `--fs-16:16px`, `--fs-20:20px`, `--fs-28:28px`, `--fs-40:40px`. Вес: 400/600/700. `font-variant-numeric: tabular-nums` для чисел.

## Отступы и радиусы
Шкала: 4, 8, 12, 16, 24, 32. Радиусы: `--r-s:8px`, `--r-m:12px`, `--r-l:16px`, `--r-pill:999px`.

## Тени и свечение
- `--shadow-card: 0 4px 12px rgba(0,0,0,.35)`
- `--glow-gold: 0 0 16px rgba(242,182,61,.45)`
- `--glow-ad: 0 0 16px rgba(47,123,224,.45)`

## Движение
| Токен | Значение |
|---|---|
| `--dur-micro` | 120 ms |
| `--dur-base` | 240 ms |
| `--dur-scene` | 560 ms |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` |

## Слои (z-index)
canvas 0 · HUD 10 · панель 20 · шторка 30 · модалка 40 · тост 50 · экран загрузки 100.

## Брейкпоинты
| Имя | Условие |
|---|---|
| `compact-h` | `max-height: 420px` |
| `portrait` | `(orientation: portrait)` |
| `wide` | `min-aspect-ratio: 2/1` |
| `panel-side` | `(orientation: landscape) and (min-width: 900px)` |

## Размеры UI
Ширина боковой панели: 320–380 px. Высота нижней шторки: ≤ 45% высоты. Цели нажатия ≥ 44 px. Safe-area отступы обязательны.

## 3D бюджеты (константы)
`MAX_COINS=80`, `MAX_PARTICLES=60`, `MAX_FLOATING_TEXT=24`, `SHADOW_MAP=1024`, `PIXEL_RATIO_MAX=2`, `FPS_CAP_TOUCH=60`.
