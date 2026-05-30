---
name: create-records
description: >-
  Create a new BaSYS регистр записей (records metaobject) for storing
  operation-posted movements / state — остатки номенклатуры, расчёты с
  контрагентами, ставки/тарифы, история состояний, журналы движений.
  Generates the records/{name}/records.{name}.json settings file with the six
  standard columns required by the posting engine (id / period / object_kind /
  meta_object / object_uid / row), the two default indexes on period and
  object_uid, and any custom dimension / measurement columns the user
  requested. Use when the user asks to create / build / generate / add a
  records register, регистр записей, records-метаобъект, новый регистр
  записей, регистр движений, регистр остатков, регистр расчётов, регистр для
  проведения операций. Supports adding custom header columns (FK-измерения на
  справочники / перечисления / другие регистры, числовые ресурсы, строковые
  атрибуты, булевы признаки), virtual / computed columns and extra DB
  indexes. NOT to be confused with the register (независимый регистр) kind —
  records are written automatically by operations through recordsSources /
  recordsSettings (declared on the operation, not here), registers are edited
  manually. Does NOT register the new type in system/dataTypes.json (records
  has isReference = false), does NOT create detail tables, records sources,
  print forms, attached files or custom forms — all disabled by the kind.
  Конфигурация "какая операция и какие строки пишет в этот регистр"
  выполняется на стороне operation в его recordsSettings и не относится к
  этому навыку.
---

# Create Records (Регистр записей)

Регистры записей в BaSYS — **не ссылочные** служебные таблицы (`isReference = false`), в которые **операции при проведении автоматически записывают движения** через механизм проведения (`recordsSources` / `recordsSettings` на операции). Пользователь такие регистры **вручную не редактирует** — он лишь читает их через отчёты (`data_view`) и видит как историю / остатки в журнале.

Это принципиальное отличие от обычных регистров (`kind = register`), которые редактируются вручную пользователем через стандартные формы (прайс-листы, графики, ставки, настройки). Регистр записей — приёмник проводок, обычный регистр — справочник-настройка.

Определение вида лежит в `system/kinds/kind.records.json` и закрепляет следующие инварианты:

| Флаг                 | Значение | Следствие для нового файла                                                  |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| `storeData`          | true     | Файл валидируется по `metaObjectStorableSettings.schema.json`.              |
| `isReference`        | false    | **Не** регистрируется в `system/dataTypes.json` — записи добавлять не нужно. |
| `useDetailsTables`   | false    | `detailTables` всегда `[]`. Табличные части в регистрах записей не используются. |
| `useForms`           | false    | Кастомные формы недоступны — `listFormUid` / `itemFormUid` всегда `null`. Никаких `*.form.*.json` / `*.form.*.vue` файлов. Используется автоформа платформы. |
| `usePrintForms`      | false    | Печатные формы недоступны — никаких `*.print_form.*` файлов.                |
| `canCreateRecords`   | false    | `recordsSources: []`, `recordsSettings: []` всегда пусты. **Регистр записей сам ничего не проводит** — записи в него пишут операции (на стороне `operation`). |
| `allowAttachedFiles` | false    | Прикрепление файлов не поддерживается.                                       |

Kind UID — `3eabc5d2-9cf5-4a74-95c8-ff2c2015ded3`. Поскольку `isReference = false`, **никакой записи в `system/dataTypes.json` создавать не нужно**.

---

## Records vs Register — Не Перепутай

| Признак                                | `records` (этот навык)                               | `register` (kind = register)                         |
| -------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Как заполняется                        | Автоматически операциями при проведении (`recordsSources` / `recordsSettings` в `operation`) | Вручную пользователем через формы списка / элемента |
| Что хранит                             | Движения по объектам учёта, остатки, расчёты, история состояний | Прайс-листы, графики, ставки, скидки, настройки, права |
| Стандартные колонки шапки              | **Шесть**: `id`, `period`, `object_kind`, `meta_object`, `object_uid`, `row` | Одна: `id`                                           |
| Стандартные индексы                    | **Два**: на `period` и на `object_uid` (заданы `hasIndex = true` в kind) | Нет                                                  |
| Кастомные формы                        | Запрещены (`useForms = false`) — только автоформа    | Поддерживаются, но по умолчанию автоформа            |
| Этот навык                             | Подходит                                             | **Не** подходит — для `register` нужен отдельный навык `create-register` |

Если пользователь говорит «нужен регистр, который пользователь редактирует руками» — это `register`, **не** `records`. Если сомневаешься — спроси.

---

## Что Этот Навык НЕ Делает

Создание **только** самого регистра записей — таблицы-приёмника. Чтобы какая-то операция реально стала писать в него строки, нужно отдельно на стороне `operation`:

- добавить запись в `recordsSettings` операции (с `metaObjectUid` нового регистра, направлением `direction` и выражениями `expression` для колонок измерений и ресурсов);
- при необходимости — добавить `recordsSources` (источники записей в виде `.bjs`-скриптов) и пометить операцию `canCreateRecords = true`.

Это **отдельная задача** (см. правило `records-creation` в репозитории), которая выполняется в файлах `operation/{name}/*.json` и `operation/{name}/*.records_source.*.bjs`. Текущий навык **создаёт только сам регистр**; настройку проведения операций под него делает пользователь / отдельный шаг.

---

## Prerequisites — Ask the User

Прежде чем что-либо генерировать, уточни:

1. **`name`** (технический идентификатор) — обязательно. Английский `snake_case`, ≤ 30 символов, осмысленный (`item_stock`, `partner_settlements`, `production_output`, `employee_calc`). Не угадывай. Если в репозитории уже есть папки в `records/` с кириллическими именами — считай их legacy и не трогай; **новые** регистры записей пишутся по правилу из `general-conventions`.
2. **`title`** (человекочитаемое имя) — обязательно. Любой язык, обычно русский (`Остатки номенклатуры`, `Расчёты с клиентами`, `Выпуск цеха`). Используй существительное в форме, привычной пользователю.
3. **Колонки шапки** — обязательно. У регистра записей почти всегда есть пользовательские поля помимо шести стандартных (иначе хранить нечего). Для регистра остатков / движений это обычно:
    - **Измерения** (dimensions) — ссылки на справочники / перечисления / другие регистры, по которым ведётся учёт: `item` (номенклатура), `warehouse` (склад), `partner` (контрагент), `currency` (валюта), `project` (проект), `employee` (сотрудник) и т.п. Обычно `required: true`.
    - **Ресурсы** (measures) — числовые поля с количественной / суммовой информацией: `quantity`, `amount`, `price`, `sum_vat`. Обычно `required: false` (могут быть 0).
    - **Атрибуты** (attributes) — дополнительная описательная информация: `comment`, `status`, `is_active`. Не обязательны.

    Собери для каждой: `name` (English snake_case), `title`, тип данных (по `system/dataTypes.json`), `required`, `unique`, `stringLength` / `numberDigits`, нужен ли индекс, `memo`.
4. **`memo`** на метаобъект — опционально, короткое русское описание назначения регистра. По умолчанию `""`.

Не спрашивай о формах (запрещены видом), записях / проведении (настраивается на операции, а не здесь), печатных формах, прикреплённых файлах, табличных частях — всё это отключено видом.

---

## Pre-flight Checks

1. **Уникальность папки.** Папка `records/{name}/` ещё не существует.
2. **Ограничения `name`.** Английский lowercase `snake_case`, ≤ 30 символов, не начинается с цифры.
3. **Это действительно `records`, а не `register`.** Если пользователь описывает сценарий «пользователь руками вводит цены / графики / ставки» — остановись и уточни: возможно, нужен `register`.

При нарушении любого из условий — остановись и сообщи пользователю.

---

## Files to Produce

Ровно **одно** изменение:

1. **Создать** `records/{name}/records.{name}.json` — файл настроек (см. «Skeleton» ниже).

Никаких записей в `system/dataTypes.json` (`isReference = false`). Никаких `.bjs`, `.vue`, `*.form.*`, `*.print_form.*` файлов. Настройка проведения операций под этот регистр — отдельная задача в `operation/` (см. правило `records-creation`).

---

## Skeleton

Сгенерируй свежий UUID v4 (lowercase, hyphenated) для **каждого** `uid`: метаобъекта, `header`, каждой колонки, каждого индекса. Все UID уникальны в пределах файла.

Свойства всех шести стандартных колонок (`name`, `title`, `dataSettings`, `renderSettings`) копируются **дословно** из `system/kinds/kind.records.json`. Только собственный `uid` колонки генерируется заново; `standardColumnUid` — это исходный `uid` стандартной колонки из вида.

```json
{
  "$schema": "../../system/schemas/metaObjectStorableSettings.schema.json",
  "uid": "<new-uuid-v4>",
  "metaObjectKindUid": "3eabc5d2-9cf5-4a74-95c8-ff2c2015ded3",
  "title": "<title>",
  "name": "<name>",
  "memo": "<короткое русское описание, может быть пустым>",
  "editMethod": 0,
  "orderByExpression": "",
  "displayExpression": "",
  "listFormUid": null,
  "itemFormUid": null,
  "showMainImage": false,
  "isActive": true,
  "header": {
    "uid": "<new-uuid-v4>",
    "title": "header",
    "name": "header",
    "memo": "",
    "autoClearMethod": 0,
    "columns": [ /* 6 стандартных колонок + кастомные колонки, см. ниже */ ],
    "indexes": [ /* 2 стандартных индекса (period и object_uid) + опциональные индексы для кастомных колонок */ ]
  },
  "detailTables": [],
  "commands": [],
  "recordsSources": [],
  "recordsSettings": []
}
```

`orderByExpression` / `displayExpression` оставь пустыми строками — вид (`kind.records.json`) уже задаёт `id` как дефолт для упорядочивания. Переопределяй только если пользователь явно попросил другое (например, `period DESC` для просмотра последних движений сверху).

`listFormUid` и `itemFormUid` остаются `null`. Кастомные формы для регистров записей **запрещены видом** (`useForms = false`) — пользователь работает с регистром через автоформу и через отчёты.

### Standard columns (always 6, in this order)

Каждая стандартная колонка имеет top-level поля: `uid` (свежий), `kind: 0`, `standardColumnUid` (из kind), `title`, `name`, `formula: ""`, `itemsSource: ""`, `autoClearMethod: 0`, `isStandard: true`, `dataSettings`, `renderSettings`, `dependencies: []`. Все эти 6 колонок заполняются и поддерживаются **движком проведения** автоматически — пользователь их не редактирует и не указывает в выражениях операции, но колонки **обязательно должны присутствовать** в шапке регистра, иначе механизм проведения не сработает.

| `name`        | `standardColumnUid`                    | `dataSettings` (тип, ключевые флаги)                                                                  | Назначение в механизме проведения                       |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `id`          | `7f7eb95c-7b70-4e4f-a391-4080d0710589` | Long (`daa57cb0-…`), **`primaryKey: true`**                                                           | Первичный ключ строки регистра.                         |
| `period`      | `8893e1df-525e-4a3f-b421-988294b4a2a8` | DateTime (`9001eafb-…`), **`required: true`**, `hasIndex: true` в kind ⇒ нужен стандартный индекс    | Дата документа-источника (период проводки).             |
| `object_kind` | `dcb06a92-5d6f-46be-af10-88a4f91f47e6` | Тип «Вид объекта» (`689d1aac-66d8-478f-852e-0e3881b427bf`), **`required: true`**                      | Вид метаданных операции-источника (например, `operation`). |
| `meta_object` | `7c2b8ad7-034d-495b-ba80-e300edc50146` | Тип «Объект метаданных» (`a4d064c6-465f-42a5-bbc0-48f743148c36`), **`required: true`**                | UID конкретного метаобъекта-источника.                  |
| `object_uid`  | `78c493f2-e58a-4ce6-8665-27af40000562` | Int (`b327f82a-…`), **`required: true`**, `hasIndex: true` в kind ⇒ нужен стандартный индекс         | ID конкретного экземпляра документа-источника.          |
| `row`         | `398c66ad-10ce-4c75-9a7b-f2ba9398972f` | Int (`b327f82a-…`), **`required: true`**                                                              | Номер строки источника проводки.                        |

Все шесть колонок копируются с `renderSettings`: `controlKindUid: ""`, `showInItem: true`, `showInList: true`, `listColumnWidth: ""` (как в `kind.records.json`).

Все остальные `dataSettings`-поля у стандартных колонок имеют значения по умолчанию: `stringLength: 100`, `numberDigits: 2`, `unique: false`, `defaultValue: null` (см. `kind.records.json`).

### Standard indexes (always 2)

По одному индексу на каждую стандартную колонку с `hasIndex = true` в kind. Порядок:

```json
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid колонки period>", "direction": 0 } ]
},
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid колонки object_uid>", "direction": 0 } ]
}
```

Это типичный набор индексов для регистра записей. Без них выборки по периоду и по документу-источнику будут медленными.

### Custom columns (the main payload)

Добавляются **после** шести стандартных колонок. Каждая запись:

```json
{
  "uid": "<new-uuid-v4>",
  "kind": 0,
  "standardColumnUid": null,
  "title": "<title>",
  "name": "<name>",
  "formula": "",
  "itemsSource": "",
  "autoClearMethod": 0,
  "isStandard": false,
  "dataSettings": {
    "dataTypeUid": "<из system/dataTypes.json>",
    "stringLength": <int>,
    "numberDigits": 2,
    "primaryKey": false,
    "required": <bool>,
    "unique": false,
    "defaultValue": null
  },
  "renderSettings": {
    "controlKindUid": "",
    "showInItem": true,
    "showInList": true,
    "listColumnWidth": ""
  },
  "dependencies": []
}
```

Правила:

- `dataTypeUid` берётся из `system/dataTypes.json` по `title` / `typeName`. Никогда не выдумывай UID. Частые типы:
  - Строка — `0234c067-7868-46b2-ba8e-e22fae5255cb`
  - Целое число (int) — `b327f82a-ea96-416f-9836-785db28eccac`
  - Целое число (long) — `daa57cb0-32eb-4709-b61f-4ea023ae31c3`
  - Десятичное число — `a05516ac-baae-4f66-9b67-6703998a6a1b`
  - Булево — `4bff64cf-eb01-4933-9f3d-b902336751f4`
  - Дата&Время — `9001eafb-efb1-442f-b288-723bb8002b12`
  - Guid — `6fa9c45b-f514-4fea-a480-8e940636a1df`
  - Ссылка на справочник / перечисление / регистр — ищи в `system/dataTypes.json` запись с нужным `kind` (`catalog` / `enum` / `register`) и `name`, бери её `uid`.
- `memo` заполняется на каждой кастомной колонке — короткая русская подсказка о назначении (это **измерение** или **ресурс**, на какой справочник ссылается и т.п.).
- `kind = 0` (Stored) по умолчанию. `kind = 1` (Virtual) — **только** если пользователь явно сказал «виртуальная колонка», «не сохраняется в БД», «только для отображения». Виртуальная колонка обычно имеет `formula` — выражение на JS, вычисляющее значение по другим полям шапки (`$h.<имя>`).
- Поле `formula` **не зависит** от `kind`. Хранимая колонка (`kind = 0`) тоже может иметь `formula` — тогда значение вычисляется при сохранении и кладётся в БД.
- `stringLength` имеет смысл для строк (типичные значения: 20–200), `numberDigits` — для десятичных чисел (количество знаков после запятой, обычно 2 для денег и 3–5 для количеств).
- Для **измерений-ссылок** (FK на справочник / перечисление / регистр) `dataTypeUid` — это `uid` целевого типа из `system/dataTypes.json`. Имя колонки часто содержит подсказку о цели: `item`, `warehouse`, `partner`, `currency`. Обычно `required: true`. Если по этому измерению часто строится выборка / отчёт — добавь индекс (см. ниже).
- Для **ресурсов** (числовые меры) `dataTypeUid` — обычно «Десятичное число» (`a05516ac-…`). `required: false` (ресурс может быть `0`/`null`). `numberDigits` — `2` для денег, `3`–`5` для количеств.
- Поле `unique` у кастомных колонок регистра записей — почти всегда `false` (одну и ту же номенклатуру в одном складе можно проводить много раз разными документами).

### Extra indexes (Optional, On-Demand)

Два стандартных индекса (`period`, `object_uid`) добавляются всегда. Помимо них, добавляй индекс **только** для тех кастомных колонок, по которым реально ведётся поиск / фильтрация в отчётах:

- ссылочные измерения, по которым часто строятся отчёты («остатки по номенклатуре», «расчёты по контрагенту»);
- комбинации измерений для составных индексов (например, `(item, warehouse)` в регистре остатков для быстрого получения остатка по номенклатуре на складе).

Структура индекса — такая же, как у стандартных:

```json
{
  "uid": "<new-uuid-v4>",
  "columns": [
    { "columnUid": "<uid колонки>", "direction": 0 }
  ]
}
```

Для составного индекса перечисли несколько объектов в `columns` в нужном порядке.

---

## NOT to Produce

- **Запись в `system/dataTypes.json`** — `records` имеет `isReference = false`, не дописывай ничего в этот файл.
- **Табличные части** — `useDetailsTables = false`, всегда `detailTables: []`.
- **Печатные формы** — `usePrintForms = false`, никаких `*.print_form.*`.
- **Записи / проведение** — `canCreateRecords = false`, `recordsSources: []`, `recordsSettings: []` всегда пусты. Сам регистр записей ничего никуда не пишет; это **приёмник** проводок, а не их источник. Настройка проведения операций под этот регистр выполняется на стороне `operation`.
- **Прикреплённые файлы** — `allowAttachedFiles = false`.
- **Кастомные формы списка / редактирования** — `useForms = false`, запрещены видом. `listFormUid` и `itemFormUid` остаются `null`. Никаких `*.form.*.json` / `*.form.*.vue` файлов. Кастомные формы для регистров записей — крайнее исключение, и видом они отключены.
- **Команды и кнопки** — кастомные регистры записей в репозитории всегда имеют `commands: []`. Если пользователь хочет действия над регистром — это, скорее всего, отчёт / data-view, а не регистр.

---

## Reference Examples

Два готовых к копированию шаблона лежат рядом с навыком. Читай их только в момент сборки файла — они не подгружаются вместе с `SKILL.md`.

- [examples/minimal.json](examples/minimal.json) — минимальный регистр остатков: шесть стандартных колонок + два стандартных индекса (`period`, `object_uid`) + одно измерение (`item` — ссылка на справочник номенклатуры) + два ресурса (`quantity`, `amount`). Самый типичный «остаточный» регистр. **Начинай с него** для типичного случая.
- [examples/with_extras.json](examples/with_extras.json) — регистр расчётов посложнее: шесть стандартных колонок + два стандартных индекса + несколько измерений (`partner` — FK на справочник, `currency` — FK на справочник, `project` — строка-шифр, `direction` — FK на перечисление) + два ресурса (`amount`, `amount_currency`) + виртуальная колонка `amount_signed` с `formula` + дополнительный индекс по `partner`. Используй как шаблон, когда есть несколько FK-измерений, индекс по измерению или вычисляемая колонка.

Как использовать:

1. Прочитай нужный пример.
2. Скопируй структуру в `records/{name}/records.{name}.json`.
3. Замени **каждый** `uid` свежим UUID v4 — все UID в примерах иллюстративные.
4. Замени `title` / `name` / `memo` на значения, полученные от пользователя.
5. Замени `$schema` на `"../../system/schemas/metaObjectStorableSettings.schema.json"` (в файлах примеров используется более глубокий относительный путь, потому что они лежат под `.cursor/skills/create-records/examples/`).
6. У шести стандартных колонок ничего не меняй, кроме их собственного `uid` (на свежий UUID v4) и `columnUid`-ссылок в двух стандартных индексах (должны указывать на новые UID колонок `period` и `object_uid` соответственно).
7. Для кастомных колонок: подбери `dataTypeUid` из `system/dataTypes.json` по `title` / `typeName`; никогда не оставляй иллюстративные UID из шаблона.
8. Для FK-измерений: в `system/dataTypes.json` найди запись целевого справочника / перечисления / регистра по `kind` + `name`, возьми её `uid` и подставь в `dataTypeUid` колонки.
9. Для дополнительных индексов: проверь, что `columnUid` указывает на свежие UID соответствующих колонок в твоём файле.

---

## Building Checklist

Скопируй и отмечай:

```
- [ ] Подтверждено, что нужен именно records, а не register (записи пишет операция, а не пользователь)
- [ ] name (English snake_case, ≤ 30 chars) и title подтверждены
- [ ] Папка records/{name}/ ещё не существует
- [ ] Собран список кастомных колонок (имя/тип/required/индекс/memo): измерения (FK) + ресурсы (числа) + атрибуты
- [ ] Сгенерирован uid метаобъекта (UUID v4)
- [ ] Сгенерирован uid header (UUID v4)
- [ ] metaObjectKindUid = 3eabc5d2-9cf5-4a74-95c8-ff2c2015ded3
- [ ] 6 стандартных колонок добавлены в порядке: id, period, object_kind, meta_object, object_uid, row
- [ ] Каждая стандартная колонка: свежий uid + standardColumnUid из kind + isStandard=true + копия dataSettings/renderSettings из kind.records.json
- [ ] 2 стандартных индекса добавлены: на period и на object_uid (с columnUid, указывающими на свежие UID этих колонок)
- [ ] Кастомные колонки: isStandard=false, standardColumnUid=null, dataTypeUid взят из system/dataTypes.json, memo заполнен, kind=0 (если только не «виртуальная»)
- [ ] FK-измерения (если есть): dataTypeUid — это uid целевого типа из system/dataTypes.json (catalog/enum/register), required=true для существенных измерений
- [ ] Ресурсы (если есть): dataTypeUid — десятичное число (a05516ac-…), numberDigits подобран по типу величины (2 для денег, 3–5 для количеств), обычно required=false
- [ ] Виртуальные колонки (если есть): kind=1, заполнен formula с выражением на JS ($h.<имя> для других полей шапки)
- [ ] Дополнительные индексы для часто фильтруемых измерений (если нужно) добавлены; columnUid указывает на свежие UID колонок
- [ ] detailTables: [], commands: [], recordsSources: [], recordsSettings: []
- [ ] listFormUid: null, itemFormUid: null (useForms=false, формы запрещены видом)
- [ ] orderByExpression / displayExpression: "" (если только пользователь явно не попросил другое)
- [ ] $schema указывает на ../../system/schemas/metaObjectStorableSettings.schema.json
- [ ] В system/dataTypes.json НИЧЕГО не добавлено (isReference = false)
- [ ] Никаких *.form.*, *.print_form.*, *.bjs, *.vue файлов не создано
- [ ] Пользователю сообщено: чтобы операция начала писать в этот регистр, надо отдельно настроить recordsSettings на самой операции (задача за рамками этого навыка)
```

---

## Out of Scope

- **Регистры (`register`)** — это отдельный вид метаданных, редактируется вручную. Этот навык такие регистры **не** создаёт (для них — отдельный навык `create-register`).
- **Настройка проведения операций под этот регистр** — выполняется в `operation/{name}/operation.{name}.json` через `recordsSettings` (и опционально `recordsSources` + `.bjs`-скрипты). См. правило `records-creation` в репозитории. Этот навык создаёт только сам регистр-приёмник.
- **Кастомные формы списка / редактирования** — `kind.records.useForms = false`, запрещены видом. Регистр записей доступен только через автоформу и через отчёты (`data_view`).
- **Печатные формы** — `kind.records.usePrintForms = false`, недоступно.
- **Табличные части** — `kind.records.useDetailsTables = false`, недоступно.
- **Прикреплённые файлы** — `kind.records.allowAttachedFiles = false`, недоступно.
- **Команды и кнопки** — кастомные регистры записей в репозитории всегда имеют `commands: []`.
- **Переименование существующего регистра записей** — кириллические имена папок и файлов в `records/` уже зашиты в систему и не должны переименовываться.
