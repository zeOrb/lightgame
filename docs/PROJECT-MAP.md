# Sunny — рабочая карта проекта

Файл для агента: что где лежит, что считать источником правды и куда лезть при типовой задаче.
Обновлено 21.11.2026 по текущему коду, а не по README.

## 1. Коротко

- Браузерная 3D-аркада на Three.js 0.185, Vite 7, чистый JavaScript (ES-модули), без UI-фреймворка.
- Одностраничное приложение: разметка и HUD в `index.html`, сцена и игровой цикл в `src/main.js`.
- Внешних моделей, картинок, шрифтов, CDN и сервера нет. Геометрия, текстуры и звук создаются кодом.
- Нужен Node.js 22.12+ и браузер с WebGL 2. Открывать через `file://` нельзя — только HTTP.
- Точка входа: `index.html` → `<script type="module" src="./src/main.js">`.

## 2. Команды

| Задача | Команда |
| --- | --- |
| Установка | `npm ci` |
| Дев-сервер | `npm run dev` (127.0.0.1) |
| Сборка | `npm run build` → `dist/` |
| Просмотр сборки | `npm run preview` |
| Все тесты | `npm test` (`node --test`) |
| Один файл тестов | `node --test tests/abilities.test.js` |
| Отчёт по экономике | `node scripts/balance-report.mjs` |

`start-sunny.bat` — локальный помощник: поднимает dev-сервер на 5173 и открывает браузер (файл не в git).
Деплой: `.github/workflows/deploy.yml` выполняет `npm ci`, `npm test`, `npm run build` и публикует `dist` на GitHub Pages. Красные тесты блокируют деплой.

## 3. Правила работы

- Тон общения задан в `AGENTS.md`. Технические правила ниже его не отменяют.
- Минимальные диффы. Код в проекте плотный: короткие функции, точки с запятой, `const`, деструктуризация.
- Источник правды — конфиги и код. README, `BALANCE.md`, `docs/architecture.html` местами устарели (см. раздел 11).
- Баланс и состав контента менять в JSON, а не литералами в `main.js`.
- Не переименовывать `id` навыков: по ним сохраняется прогресс в `localStorage` (`sunny.skill-tree.v1`).
- Игровая случайность — только через `randomManager` (`src/random-manager.js`). Графика — `RandomManager.graphics()`.
- Чистые модули (`game.js`, `camera.js`, `threats.js`, `abilities.js`, `floor-config.js`, `progression.js`, `random-manager.js`) не должны импортировать Three.js: их гоняют тесты в Node.
- JSON импортируется с атрибутом: `import config from './floors.json' with {type:'json'}`.
- После правок: точечные тесты по домену, затем `npm run build`.

## 4. Текущее состояние (21.11.2026)

- `floors.json`: 10 базовых этажей по 14 секций = 140 секций, `END = 139`, 5 провалов, 42 навыка в двух деревьях.
- `npm test`: 204 теста, все проходят. Сборка `npm run build` проходит.
- Рабочее дерево git: изменены `AGENTS.md` и `src/secret-levels.js`, не отслеживается `start-sunny.bat`.
- Границы рефакторинга `main.js` и открытые вопросы: `todo/main-gameplay-audit.md`, `todo/GDD-gameplay-skeleton.md`.

## 5. Структура

```
index.html              разметка меню, HUD, модалок, сенсорных кнопок
src/main.js             композиция сцены, состояние забега, ввод, update/frame (975 строк)
src/*.json              контент и баланс (этажи, враги, камни, навыки)
src/*.js                системы: логика, мир, сущности, VFX, UI
src/*.css               оформление; часть CSS импортируется из JS
tests/*.test.js         node:test, 59 файлов
docs/                   floors.md, RNG.md, skill-tree.md, architecture.html (устарел)
scripts/                balance-report.mjs, generate-paper.mjs
todo/                   GDD и аудит main.js
```

## 6. Карта модулей по доменам

| Домен | Ключевые файлы |
| --- | --- |
| Вход и UI | `main.js`, `main-menu.js`, `skill-tree.js`, `pixel-skill-art.js`, `tree-viewport.js`, `shard-counter.js`, `light-bar-recovery.js`, `run-transition.js`, `level-diagnostics.js`, `bestiary*.js` |
| Чистая математика | `game.js` (маршрут, прыжок, свет, камера-якорь), `camera.js`, `platformer-motion.js`, `shelf-travel.js`, `abilities.js`, `rabbit-state.js`, `threats.js`, `arena-state.js` |
| Этажи и генерация | `floors.json`, `floor-config.js`, `placement-rules.js`, `random-manager.js`, `run-loot.js` |
| Мир и архитектура | `tower-hierarchy.js`, `enchanted-stairs.js`, `ancient-library.js`, `floor-gates.js`, `shelf-decorations.js`, `under-shelf-relics.js`, `window-light.js`, `stained-glass.js`, `tower-mist.js`, `tower-depth.js`, `atmospheric-focus.js`, `foreground-ruins.js`, `star-parallax.js`, `lantern-surfaces.js`, `old-wood.js`, `wood-pom.js` |
| Секретки | `secret-road*.js`, `secret-levels.js`, `secret-transition.js`, `secret-grass.js`, `secret-vines.js`, `secret-arena-ground.js`, `secret-dirt-particles.js`, `grass-exit-particles.js` |
| Враги и боссы | `enemies.json`, `enemy-config.js`, `enemy-factory.js`, `shadow-beast.js`, `shadow-cat.js`, `beast-knockback.js`, `beast-vitral-burst.js`, `floor-arenas.js`, `boss-flash.js`, `boss-hit-effects.js`, `arena-*.js` |
| Предметы и угрозы | `collectibles.js` + `collectibles.json`, `interactables.json`, `springboards.js`, `falling-shadows.js`, `threat-visuals.js`, `run-loot.js` |
| Прогрессия | `progression.js`, `skill-tree-config.js`, `skill-tree.json`, `treasury-tree.json`, `progression-balance.js` + `.json`, `skill-icons.js`, `skill-*.js` |
| Эффекты и звук | `pickup-effects.js`, `shadow-effects.js`, `ground-shadows.js`, `vitral-*.js`, `phase-trail.js`, `orb-*.js`, `landing-effects.js`, `rabbit-*.js`, `impact-audio.js`, `catcher-*.js`, `floating-parchment.js` |

Остальные `src/*.js` — небольшие VFX/декоративные модули; их роль читается по имени и по вызову из `main.js`.

## 7. Поток выполнения

`index.html` создаёт canvas и DOM. `main.js` на верхнем уровне строит сцену, материалы, этажи, сущности и системы, затем запускает `requestAnimationFrame(frame)`.

Состояние сессии — строка `state`: `intro`, `loading`, `playing`, `paused`, `won`, `lost`. Состояние игрока — скаляры модуля `main.js`: `s`, `lane`, `height`, `velocity`, `light`, `collected`, таймеры эффектов. Отдельного хранилища нет.

Опорные функции в `main.js` (номера строк сдвигаются):

| Строка | Функция | Роль |
| --- | --- | --- |
| 325 | состояние игрока | `state`, `s`, `lane`, `height`, `velocity`, `light`, `time` |
| 357 | `reset()` | единая точка сброса забега и очистки систем |
| 358 | `start()` | сброс + переход в `playing`; `{boss:true}` — отладочный бой |
| 360 | `pause()` | пауза/снятие паузы |
| 368 | `finish(won)` | победа/поражение, награда, открытие древа |
| 379 | `updateHUD()` | свет, этаж, прогресс, осколки |
| 396 | `updateArena()` | отдельная ветка боя на арене |
| 477 | `update(dt)` | основной игровой шаг |
| 729 | `frame(now)` | часы, вызов `update`, VFX, камера, рендер |

В `frame()` два времени: `time` (игровое, стоит на паузе) и `visualTime` (анимации). `dt` ограничивается `FrameClock`. Рендер идёт через `atmosphericFocus.render(...)`, а не прямым `renderer.render`.

Порядок `update(dt)` важен: сначала угрозы и движение, затем опора/прыжок, сбор и урон, расход света, и только в конце победа/поражение. Не переставлять проверки без причины.

## 8. Мир и математика

Позиция игрока — пара `(s, lane)`, а не вектор:

```
theta = s * PI/14 + routeYaw(s)
radius = 15 + lane
x = cos(theta) * radius
y = 100 - 0.5 * s
z = sin(theta) * radius
```

Ключевые значения (`src/game.js`):

| Константа | Значение | Смысл |
| --- | --- | --- |
| `TOTAL_SECTIONS` / `END` | 140 / 139 | вычисляется из `floors.json` |
| `ROUTE_RADIUS` | 15 | центральная дорожка |
| `SHELF_INNER_RADIUS` / `SHELF_OUTER_RADIUS` | 13.1 / 17.0 | полка |
| `LANE_LIMIT` | 1.2 | безопасная центральная полоса |
| `MOVEMENT_LANE_LIMIT` | 4.2 | движение может выходить за край полки |
| `SHELF_HALF_ANGLE` / `ROUTE_ANGLE` | 0.133 / PI/14 | угловая ширина |
| `JUMP_SPEED` / `GRAVITY` | 9 / 16 | прыжок |
| `PASSIVE_LIGHT_DRAIN` | 12 в секунду | пассивный расход |
| `SHADOW_LIGHT_THRESHOLD` | 30 (база) | порог теневой формы и яркости |

- Свет — здоровье и яркость. `lightStep()`: пассивный расход 12/с, теневой урон 48/с, лечение в витраже через `vitralRecovery()`; всё масштабируется навыками (`drainScale`, `damageScale`, `maxHP`, `regen`).
- `hpBrightness()` использует порог тени, а не 100.
- `shelfInnerRadius(s)` — детерминированный хеш от секции; крайние полки уже центральных.
- Провалы: `gaps` собирается из `floors.json`; `isGap(s)` и `GAP_HALF_WIDTH` используются и коллизией, и расстановкой.
- Прыжок на врага: `canStomp(...)` требует перекрытия, движения вниз и пересечения верха цели.
- Высота/этаж: `floorAt(s)`, `depthLight(s)`; этажи идут сверху вниз.

## 9. Данные и баланс

| Файл | Что задаёт | Документация |
| --- | --- | --- |
| `src/floors.json` | этажи, секции, провалы, окна, лут, враги, тени, сундуки, бутылки, книги, пружины, угрозы, секретки, арены, свет, поворот | `docs/floors.md` |
| `src/enemies.json` | обычные враги, боссы, профили, спавн на спирали и в аренах | `ENEMIES.md` |
| `src/collectibles.json` | виды камней: свет, очки, цвет, размер | — |
| `src/interactables.json` | параметры интерактивных объектов (сейчас — диапазон награды сундука) | — |
| `src/skill-tree.json` | основное древо: `baseStats`, ветки, ноды, цены, `requires`, эффекты | `docs/skill-tree.md` |
| `src/treasury-tree.json` | второе дерево «Сокровищница» (доход с камней) | в `docs/skill-tree.md` не описано |
| `src/progression-balance.json` | бонус за победу | `BALANCE.md` |
| `src/floors.json` → `seed` | сид планировки этажей | `docs/RNG.md` |

Правила `floors.json`: `floors` идут сверху вниз; `id` стабилен; `mode: generated | explicit`; `count` — число или `[min,max]`; `items` — точные секции; `placementRules` ограничивают соседство; ручные конфликты чинятся с `placementWarnings`. Финальная секция этажа обязательна — на ней ворота. Этажи от навыков добавляются после `baseFloors`.

Скилл-дерево: `baseStats` — допустимые параметры эффектов; операция ровно одна (`add`, `multiply`, `set`); `requires` задаёт зависимость; `icon` — имя из `skill-icons.js`; циклы запрещены; `progression.js` компилирует оба дерева и считает `RUN_UPGRADES` один раз на забег.

## 10. Типовые задачи

| Задача | Куда смотреть |
| --- | --- |
| Добавить/изменить навык | `skill-tree.json` или `treasury-tree.json`, затем `node --test tests/progression.test.js tests/skill-tree-config.test.js` |
| Изменить состав этажа | `floors.json`; проверить, что объекты помещаются; смотреть `LEVEL_DIAGNOSTICS` и панель «Ошибки размещения исправлены» |
| Добавить врага | `enemies.json`: новый `id`, `model`, `profile`, `stats`; добавить в `spiral.cycle` или `arenas.bossCycle`. Новая модель/поведение — код в `enemy-factory.js` / `floor-arenas.js` |
| Добавить угрозу | реестр в `threats.js`, модель/предупреждение в `threat-visuals.js`, затем `threats.pool` в `floors.json` |
| Поправить экономику | `scripts/balance-report.mjs`, `BALANCE.md`, `progression-balance.json`, цены в деревьях |
| Добавить эффект | класс в отдельном модуле, обновление из `frame()` или `update()`, сброс в `reset()` |
| Поменять HUD/меню | `index.html` + соответствующий CSS; обработчики — в `main.js` / `main-menu.js` |
| Изменить камеру | `camera.js`, ветки камеры в `frame()` (`arena`, `intro`, `won`, падение, обычный маршрут) |

## 11. Расхождения и технический долг

- `README.md` описывает 12 этажей и 168 секций. Фактически в `floors.json` 10 базовых этажей, 140 секций; число может вырасти от навыка `extraFloors`.
- `docs/architecture.html` — срез старой версии: 15 модулей, `style.css`, другие радиусы и константы. Для текущего кода не источник правды.
- `docs/skill-tree.md` не перечисляет все актуальные `baseStats` (`secretRoadSlip`, `maxAirDashes`, `damageDashCancel`, `damageDashCancelWindow`, `rayJumpHeal`, `gemPoolTier`, `maxGemsPerTile`, `shardPointsMultiplier`) и не описывает `treasury-tree.json`.
- `BALANCE.md` говорит о 27 узлах и 415 очках; сейчас `SKILLS` — 42 узла в двух деревьях. Пересчитывать через `balance-report.mjs`.
- `main.js` остаётся монолитом: сессия, правила урона/награды, сборка мира и камера частично в нём. План развязки — `todo/main-gameplay-audit.md`.
- Тесты на 21.11.2026 красные (27 падений). Перед выводами о регрессии сначала смотреть, падал ли конкретный тест до правки.
- Часть CSS подключается из `index.html`, часть импортируется из JS (`gameplay-hud.css`, `shard-counter.css`, `bestiary.css`, `level-diagnostics.css`). Не удалять импорт, даже если классы кажутся неиспользуемыми.
- Звук включается только после жеста пользователя; по умолчанию выключен.
- `base: './'` в `vite.config.js` нужен для GitHub Pages; не менять на абсолютный путь.

## 12. Проверка перед сдачей

1. `node --test tests/<домен>.test.js` — точечно.
2. `npm run build` — сборка Vite.
3. Для изменений баланса — `node scripts/balance-report.mjs`.
4. Для изменений этажей — открыть игру, проверить панель диагностики и консоль.
5. Не коммитить и не пушить без прямой просьбы.
