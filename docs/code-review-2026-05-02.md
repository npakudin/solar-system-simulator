# Code Review: simulator_3d — фокус на снижении контекста для LLM

Дата: 2026-05-02

## Структура проекта (размеры файлов)

| Файл | Строк | Токенов (~) | Роль |
|------|-------|-------------|------|
| app-classic.js | 1374 | ~6000 | Главный цикл, рендеринг, UI |
| scenario-data.js | 1005 | ~4500 | Сценарии, каталог тел, миссии |
| rocket-classic.js | 552 | ~2500 | Физика ракеты, миссии |
| physics-classic.js | 412 | ~1800 | N-body гравитация |
| mesh-factory.js | 261 | ~1200 | Three.js меши |
| attitude.js | 90 | ~400 | Ориентация ракеты |
| time-format.js | 50 | ~200 | Форматирование времени |
| vec3.js | 37 | ~150 | Векторная математика |
| body-index.js | 20 | ~80 | Поиск тел по имени |
| constants.js | 9 | ~40 | Физические константы |
| **Итого** | **~3810** | **~16870** | |

## TL;DR: самые ценные изменения для снижения контекста

1. **Вынести неактивные сценарии** — сэкономит ~700–800 строк из scenario-data.js
2. **Разбить app-classic.js** на 3 части — сэкономит ~700–900 строк на типичную задачу
3. **Упростить векторные функции** — незначительно, но читаемость выше

---

## 1. scenario-data.js — главная цель для рефакторинга

**Проблема:** файл 1005 строк содержит данные для 5+ сценариев, но в работе одновременно
используется один. LLM грузит все 1005 строк ради ~150 строк активного сценария.

**Рекомендация: разделить на два файла**

```
src/
  scenario-data.js          # оставить: bodyCatalog, RocketLaunchConfig, buildMission
  scenario-active.js        # текущий рабочий сценарий (~150 строк)
  scenario-archive.js       # все остальные сценарии (не импортировать в physics)
```

В `scenario-data.js` добавить простой импорт:

```js
// scenario-data.js
import { activeScenario } from './scenario-active.js';
import { archivedScenarios } from './scenario-archive.js';

export const scenarios = [activeScenario, ...archivedScenarios];
```

Когда нужно отлаживать один сценарий — открываешь только `scenario-active.js` (~150 строк).
Остальные сценарии в контекст не попадают.

**Экономия контекста:** ~700–800 строк / ~3200 токенов на задачу по ракете.

---

## 2. app-classic.js — монолит на 1374 строки

**Проблема:** файл делает всё — физику, рендеринг, UI, ISS, камеру. Для задачи "поправить
отображение топлива" всё равно грузится код ISS и управление камерой.

**Предлагаемое деление:**

### 2a. Вынести ISS в `iss-tracking.js` (~100 строк)

Строки 118–211 в app-classic.js — самодостаточный модуль SGP4:

```js
// iss-tracking.js
export function initISS(bodies) { ... }
export function updateISSPosition(bodies, elapsedSeconds) { ... }
export function computeLaunchWindowSeconds(site) { ... }
```

Никак не связан с рендерингом или физикой. Изолируется легко.

### 2b. Вынести UI-обработчики в `ui-events.js` (~200 строк)

Всё, что связано с DOM: кнопки, слайдеры, выпадающие списки.
app-classic.js станет оркестратором, а не мешаниной DOM и физики.

### 2c. Вынести time-scale логику в `time-scale.js` (~80 строк)

Строки 30–112: конвертация слайдера, динамическое масштабирование времени.
Самодостаточный блок без зависимостей от рендеринга.

**Итог после рефакторинга app-classic.js:** ~900 строк → при работе над рендерингом
грузится ~900 строк вместо 1374. При работе над ISS — только ~100 строк.

---

## 3. Конкретные функции

### appendTrailPoint — НЕ упрощать

```js
function appendTrailPoint(trail, scenePosition) {
  if (trail.count >= trail.capacity) {
    const newCapacity = trail.capacity * 2;
    const newPositions = new Float32Array(newCapacity * 3);
    newPositions.set(trail.positions.subarray(0, trail.count * 3));
    trail.positions = newPositions;
    trail.capacity = newCapacity;
    trail.line.geometry.setAttribute("position", new THREE.BufferAttribute(newPositions, 3));
  }
  const i = trail.count;
  trail.positions[i * 3] = scenePosition.x;
  trail.positions[i * 3 + 1] = scenePosition.y;
  trail.positions[i * 3 + 2] = scenePosition.z;
  trail.count++;
  trail.line.geometry.setDrawRange(0, trail.count);
  trail.line.geometry.attributes.position.needsUpdate = true;
}
```

**Почему не трогать:** `Float32Array` с ручным управлением буфером — это намеренный выбор
для WebGL. Замена на `Array.push()` создаст GC-давление на каждый кадр и сломает прямую
передачу буфера в GPU. Функция делает ровно одно дело, контекст она занимает мало (~15 строк).
Оставить как есть.

### speedRelativeTo — упростить через vec3

```js
// было
function speedRelativeTo(rocket, refBody) {
  if (!refBody) return speed(rocket);
  const dvx = rocket.velocity.x - refBody.velocity.x;
  const dvy = rocket.velocity.y - refBody.velocity.y;
  const dvz = rocket.velocity.z - refBody.velocity.z;
  return Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
}

// стало
function speedRelativeTo(rocket, refBody) {
  if (!refBody) return speed(rocket);
  return Vec3.distance(rocket.velocity, refBody.velocity);
}
```

`Vec3.distance` уже есть в `vec3.js` и делает ровно это. Аллокация одного временного объекта
здесь незначима — функция вызывается раз в кадр для UI. Аналогично `closingSpeed` можно
переписать:

```js
function closingSpeed(rocket, targetBody) {
  const dir = Vec3.subtract(targetBody.position, rocket.position);
  const dist = Vec3.len(dir);
  if (dist === 0) return 0;
  const u = Vec3.multiply(dir, 1 / dist);
  return Vec3.dot(Vec3.subtract(rocket.velocity, targetBody.velocity), u);
}
```

**Вывод по функциям:** длина `speedRelativeTo` сама по себе не проблема (6 строк).
Проблема контекста решается разбиением файлов, а не упрощением отдельных функций.
Экономия от упрощения 10 таких функций — ~50 строк, а от разбиения файлов — ~1500 строк.

---

## 4. Приоритет изменений по соотношению эффект/усилие

| Изменение | Усилие | Экономия строк/задачу |
|-----------|--------|----------------------|
| scenario-active.js (вынести текущий сценарий) | Низкое | ~700 строк |
| iss-tracking.js | Низкое | ~100 строк |
| time-scale.js | Среднее | ~80 строк |
| ui-events.js | Среднее | ~200 строк |
| Упростить speedRelativeTo и подобные | Низкое | ~20 строк |
| Разбить scenario-data на JSON + JS | Высокое | ~50 строк |

**Рекомендую начать с scenario-active.js** — максимальный эффект при минимальных усилиях.
Просто создать новый файл, перенести один сценарий, поправить один import.

---

## 5. Архитектурные наблюдения

### Хорошо сделано
- Четкое разделение физики и рендеринга (physics-classic.js vs mesh-factory.js)
- vec3.js как функциональная библиотека без мутаций
- Адаптивный timestep в chooseStepSeconds — правильный подход для N-body

### Технический долг
- `body-index.js` (20 строк) практически не используется — `bodies.find(b => b.name === X)`
  разбросан по всем файлам. Стоит или убрать, или использовать везде.
- Много inline `Math.sqrt(dx*dx + dy*dy + dz*dz)` вместо vec3.distance/len
- Модульный паттерн с замыканиями в mesh-factory.js усложняет тестирование

### Не менять
- Принцип организации файлов (один модуль = одна ответственность) — правильный
- Формат scenario-data: плоские JS-объекты лучше JSON для данного размера (нет TS, нет схем)
- appendTrailPoint с Float32Array — намеренная оптимизация GPU
