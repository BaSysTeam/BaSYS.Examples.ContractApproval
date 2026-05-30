---
name: create-catalog
description: >-
  Create a new BaSYS справочник (catalog metaobject) for storing reference
  data — generates the catalog/{name}/catalog.{name}.json settings file with
  the five standard columns (id / uid / is_deleted / title / is_files), the
  default indexes on is_deleted and is_files, and registers the new type in
  system/dataTypes.json so it can be referenced from other settings in the
  same editing session. Use when the user asks to create / build / generate /
  add a catalog, справочник, catalog-метаобъект, новый справочник, или
  справочник для хранения объектов учёта (номенклатура, контрагенты, статьи
  затрат, единицы измерения и т.п.). Supports adding optional custom header
  columns (strings, numbers, booleans, dates, references to other catalogs /
  enums) and — in rare complex cases — detail tables. Does NOT create records
  sources / settings (catalogs не проводятся по регистрам). Custom list /
  edit forms are wired through listFormUid / itemFormUid by the separate
  create-list-form / create-edit-form skills, only when the user explicitly
  asks.
---

# Create Catalog (Справочник)

Справочники в BaSYS — ссылочные сущности (`isReference = true`) для хранения объектов учёта: номенклатура, контрагенты, статьи затрат, единицы измерения и т.п. Чаще всего достаточно полей шапки; табличные части используются только в сложных случаях. Проведение по регистрам в справочниках не используется.

Определение вида лежит в `system/kinds/kind.catalog.json` и закрепляет следующие инварианты:

| Флаг                 | Значение | Следствие для нового файла                                            |
| -------------------- | -------- | --------------------------------------------------------------------- |
| `storeData`          | true     | Файл валидируется по `metaObjectStorableSettings.schema.json`.        |
| `isReference`        | true     | **Обязательно** регистрируется в `system/dataTypes.json` (`dbType: 11`). |
| `useDetailsTables`   | false    | По умолчанию `detailTables: []`. Добавлять только если пользователь явно попросил. |
| `useForms`           | true     | Кастомные формы поддерживаются, но **по умолчанию не создаются** — `listFormUid` / `itemFormUid` остаются `null`. |
| `usePrintForms`      | false    | Печатные формы недоступны — никаких `*.print_form.*` файлов. |
| `canCreateRecords`   | false    | `recordsSources: []`, `recordsSettings: []` всегда пусты. |
| `allowAttachedFiles` | true     | Прикрепление файлов разрешено самим видом — отдельных полей в JSON не нужно. |

Kind UID — `032d8377-500f-4631-b435-1f7f69046674`, `dbType` для записи в `dataTypes.json` — `11` (одинаков для всех справочников).

---

## Prerequisites — Ask the User

Прежде чем что-либо генерировать, уточни:

1. **`name`** (технический идентификатор) — обязательно. Английский `snake_case`, ≤ 30 символов, осмысленный (`product`, `partner`, `budget_item`, `warehouse`). Не угадывай. Если в репозитории уже есть папки в `catalog/` с кириллическими именами — считай их legacy и не трогай; **новые** справочники пишутся по правилу из `general-conventions`.
2. **`title`** (человекочитаемое имя) — обязательно. Единственное число, обычно русский (`Товар`, `Контрагент`, `Статья бюджета`). НЕ `Товары` — для `title` тоже единственное число.
3. **Дополнительные колонки шапки** — опционально. Спроси один раз: «Какие поля нужны кроме стандартных (id / uid / is_deleted / title / is_files)?». Для каждой собери: `name` (English snake_case), `title`, тип данных (по `system/dataTypes.json` — `Строка`, `Целое число`, `Десятичное число`, `Булево`, `Дата&Время`, или ссылка на другой справочник / перечисление), `required`, `unique`, `stringLength` / `numberDigits`, `memo`.
4. **Табличные части** — опционально, **по умолчанию `[]`**. Спрашивай **только если** пользователь явно сказал, что нужны (например: «справочник с табличной частью», «состав/расшифровка», «контактные лица»). См. секцию «Detail Tables (Optional)».
5. **`memo`** на метаобъект — опционально, короткое русское описание назначения справочника. По умолчанию `""`.

Не спрашивай о записях, проведении и печатных формах — они отключены видом. Кастомные формы (`listFormUid` / `itemFormUid`) — отдельные навыки `create-list-form` / `create-edit-form`, по умолчанию остаются `null`.

---

## Pre-flight Checks

1. **Уникальность папки.** Папка `catalog/{name}/` ещё не существует.
2. **Уникальность записи типа.** В `system/dataTypes.json` нет записи с `kind = "catalog"` и тем же `name`.
3. **Ограничения `name`.** Английский lowercase `snake_case`, ≤ 30 символов, не начинается с цифры.

При нарушении любого из условий — остановись и сообщи пользователю.

---

## Files to Produce

Ровно **два** изменения:

1. **Создать** `catalog/{name}/catalog.{name}.json` — файл настроек (см. «Skeleton» ниже).
2. **Дописать** одну запись в массив `system/dataTypes.json` — см. «Register the Type».

Никаких `.bjs`, `.vue`, `*.form.*`, `*.print_form.*` файлов. Если пользователь явно попросил форму — пусть отдельные навыки `create-list-form` / `create-edit-form` доделают это после.

---

## Skeleton

Сгенерируй свежий UUID v4 (lowercase, hyphenated) для **каждого** `uid`: метаобъекта, `header`, каждой колонки, каждого индекса, каждой ТЧ, каждой колонки ТЧ. Все UID уникальны в пределах файла.

Свойства стандартных колонок (`name`, `title`, `dataSettings`, `renderSettings`) копируются **дословно** из `system/kinds/kind.catalog.json`. Только собственный `uid` колонки генерируется заново; `standardColumnUid` — это исходный `uid` стандартной колонки из вида.

```json
{
  "$schema": "../../system/schemas/metaObjectStorableSettings.schema.json",
  "uid": "<new-uuid-v4>",
  "metaObjectKindUid": "032d8377-500f-4631-b435-1f7f69046674",
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
    "columns": [ /* 5 стандартных колонок + опциональные кастомные, см. ниже */ ],
    "indexes": [ /* 2 стандартных индекса + опциональные индексы кастомных колонок */ ]
  },
  "detailTables": [],
  "commands": [],
  "recordsSources": [],
  "recordsSettings": []
}
```

`orderByExpression` / `displayExpression` оставь пустыми строками — вид (`kind.catalog.json`) уже задаёт `title` как дефолт. Переопределяй только если пользователь явно попросил другое поле.

### Standard columns (always 5, in this order)

У каждой колонки набор top-level полей: `uid` (свежий), `kind: 0`, `standardColumnUid` (из вида), `title`, `name`, `formula: ""`, `itemsSource: ""`, `autoClearMethod: 0`, `isStandard: true`, `dataSettings`, `renderSettings`, `dependencies: []`.

| `name`       | `standardColumnUid`                    | `dataSettings`                                                                                       | `renderSettings`                                       |
| ------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `id`         | `4a7c739c-6012-4e45-bfc0-b78a06db8aec` | Int (`b327f82a-…`), `stringLength: 100`, `numberDigits: 2`, **`primaryKey: true`**                  | `showInItem: true`, `showInList: true`                 |
| `uid`        | `b20fcd24-ba0f-b5b8-7e4d-39628145533e` | Guid (`6fa9c45b-…`), `stringLength: 100`, `numberDigits: 2`, **`required: true`**, **`unique: true`**, **`defaultValue: "new"`** | `showInItem: false`, `showInList: true` |
| `is_deleted` | `dc3def1b-bffd-4dc8-b0d5-5d34a57fdcb2` | Bool (`4bff64cf-…`), `stringLength: 100`, `numberDigits: 2`                                          | `showInItem: false`, `showInList: false`               |
| `title`      | `e163c0c4-de77-4e58-a468-f3527b573e4a` | String (`0234c067-…`), `stringLength: 100`, `numberDigits: 2`, **`required: true`**                  | `showInItem: true`, `showInList: true`                 |
| `is_files`   | `349f72d7-ac0f-40cd-b02d-a5b5f7dcd467` | Bool (`4bff64cf-…`), `stringLength: 100`, `numberDigits: 2`                                          | `showInItem: false`, `showInList: true`                |

Остальные поля `dataSettings` по умолчанию: `primaryKey: false`, `required: false`, `unique: false`, `defaultValue: null`. Остальные поля `renderSettings` по умолчанию: `controlKindUid: ""`, `listColumnWidth: ""`.

### Standard indexes (always 2)

По одному индексу на каждую стандартную колонку с `hasIndex: true` в `kind.catalog.json` — это `is_deleted` и `is_files`, в этом порядке:

```json
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid of is_deleted column>", "direction": 0 } ]
},
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid of is_files column>",   "direction": 0 } ]
}
```

### Optional Custom columns

Добавляются после пяти стандартных. Каждая запись:

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
    "unique": <bool>,
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
  - Ссылка на другой справочник / перечисление — ищи в `system/dataTypes.json` запись с нужным `kind` и `name`, бери её `uid`.
- `memo` заполняется на каждой кастомной колонке — короткая русская подсказка о назначении.
- `kind = 0` (Stored) по умолчанию. `kind = 1` — только если пользователь явно сказал «виртуальная колонка» / «не сохраняется в БД».
- `stringLength` имеет смысл для строк (типичные значения: 20–100), `numberDigits` — для десятичных чисел (количество знаков после запятой).
- Для **ссылочных** колонок (FK на другой справочник / перечисление) `dataTypeUid` — это `uid` целевого типа из `system/dataTypes.json`. Имя колонки часто содержит подсказку о цели: `partner`, `currency`, `measure_unit` и т.п.
- Если колонка часто используется для поиска / фильтрации — добавь индекс в массив `indexes` (та же форма, что у стандартных).

### Detail Tables (Optional, Rare)

По умолчанию `detailTables: []`. Добавляй ТЧ **только если** пользователь явно попросил (например: «справочник с табличной частью», «контактные лица», «расшифровка состава»). Признаком того, что ТЧ оправдана, является связь «один-ко-многим» внутри одной сущности справочника (например — несколько телефонов у контрагента, несколько строк состава у комплекта номенклатуры).

Структура одной ТЧ:

```json
{
  "uid": "<new-uuid-v4>",
  "title": "<Заголовок>",
  "name": "<snake_case_name>",
  "memo": "<короткое описание назначения ТЧ>",
  "autoClearMethod": 0,
  "columns": [ /* служебные + пользовательские колонки */ ],
  "indexes": []
}
```

Для каждой ТЧ обязательно включи три служебные колонки в начале `columns` (см. реальные ТЧ у объектов `register/` / `operation/` в текущем репозитории — у них тот же формат):

- `id` — `kind: 0`, `isStandard: true`, `standardColumnUid: null`, тип int, `primaryKey: true`.
- `parent_id` — `kind: 0`, `isStandard: true`, `standardColumnUid: null`, тип int (ссылка на `id` шапки), `required: true`.
- `row_number` — `kind: 0`, `isStandard: true`, `standardColumnUid: null`, тип int (порядковый номер строки), `required: true`.

Пользовательские колонки ТЧ — по тем же правилам, что и колонки шапки. Если в шапке справочника нужна ТЧ редко — лучше открыто спроси пользователя ещё раз, прежде чем её добавлять.

---

## Register the Type

Поскольку `catalog` имеет `isReference = true`, новый тип **обязательно** дописывается в `system/dataTypes.json`, чтобы на него можно было ссылаться из других файлов настроек в этой же сессии. Сервер перезапишет эту запись при следующей синхронизации — **не** изменяй и **не** удаляй существующие записи, только дописывай.

Дописать ровно один объект в массив верхнего уровня:

```json
{
  "uid": "<catalog.uid>",
  "kind": "catalog",
  "name": "<catalog.name>",
  "title": "Справочник.<catalog.title>",
  "isPrimitive": false,
  "dbType": 11,
  "objectKindUid": "032d8377-500f-4631-b435-1f7f69046674",
  "typeName": null
}
```

`uid` — **тот же** UID, что и у метаобъекта (`catalog.uid`), отдельный не генерируй.

---

## Reference Examples

Два готовых к копированию шаблона лежат рядом с навыком. Читай их только в момент сборки файла — они не подгружаются вместе с `SKILL.md`.

- [examples/minimal.json](examples/minimal.json) — минимальный справочник: пять стандартных колонок + два стандартных индекса, без кастомных полей. **Начинай с него** для типичного случая.
- [examples/with_extras.json](examples/with_extras.json) — тот же скелет плюс пять кастомных колонок: `name` (строка), `code` (целое, с собственным индексом), `price` (десятичное), `is_main` (булево) и `currency` (ссылка на другой справочник, `dataTypeUid` — иллюстративный, его надо заменить на `uid` реального справочника / перечисления из `system/dataTypes.json`). Используй как шаблон, когда пользователь явно попросил доп. поля.

Как использовать:

1. Прочитай нужный пример.
2. Скопируй структуру в `catalog/{name}/catalog.{name}.json`.
3. Замени **каждый** `uid` свежим UUID v4 — все UID в примерах иллюстративные.
4. Замени `title` / `name` / `memo` на значения, полученные от пользователя.
5. Замени `$schema` на `"../../system/schemas/metaObjectStorableSettings.schema.json"` (в файлах примеров используется более глубокий относительный путь, потому что они лежат под `.cursor/skills/create-catalog/examples/`).
6. Для кастомных колонок: подбери `dataTypeUid` из `system/dataTypes.json` по `title` / `typeName`; никогда не оставляй иллюстративные UID из шаблона.
7. Для ссылочных колонок: в `system/dataTypes.json` найди запись целевого справочника / перечисления по `kind` + `name`, возьми её `uid` и подставь в `dataTypeUid` колонки.

---

## Building Checklist

Скопируй и отмечай:

```
- [ ] name (English snake_case, ≤ 30 chars) и title (единственное число) подтверждены
- [ ] Папка catalog/{name}/ ещё не существует
- [ ] В system/dataTypes.json нет записи kind="catalog" + name=<name>
- [ ] Принято решение по дополнительным колонкам шапки (имя/тип/required/unique/memo)
- [ ] Принято решение по табличным частям (по умолчанию — нет; добавляем только если попросили)
- [ ] Сгенерирован uid метаобъекта (UUID v4)
- [ ] Сгенерирован uid header (UUID v4)
- [ ] 5 стандартных колонок добавлены в порядке: id, uid, is_deleted, title, is_files
- [ ] Каждая стандартная колонка: свежий uid + standardColumnUid из kind + isStandard=true + dataSettings/renderSettings скопированы из kind.catalog.json
- [ ] 2 стандартных индекса добавлены: на is_deleted и на is_files
- [ ] Кастомные колонки (если есть): isStandard=false, standardColumnUid=null, dataTypeUid взят из system/dataTypes.json, memo заполнен, kind=0 (если только не «виртуальная»)
- [ ] Ссылочные колонки (если есть): dataTypeUid — это uid целевого типа из system/dataTypes.json (другой catalog/enum)
- [ ] detailTables: [] (или добавлены ТЧ со служебными колонками id/parent_id/row_number, если пользователь явно попросил)
- [ ] commands: [], recordsSources: [], recordsSettings: []
- [ ] listFormUid: null, itemFormUid: null (формы — отдельные навыки)
- [ ] orderByExpression: "", displayExpression: "" (умолчания вида используют title)
- [ ] $schema указывает на ../../system/schemas/metaObjectStorableSettings.schema.json
- [ ] В system/dataTypes.json добавлена ровно одна запись: uid = catalog.uid, kind = "catalog", dbType = 11, objectKindUid = 032d8377-…, title = "Справочник.<title>"
- [ ] Существующие записи в system/dataTypes.json не изменены и не удалены
- [ ] Никаких *.form.*, *.print_form.*, *.bjs, *.vue файлов не создано
```

---

## Out of Scope

- **Кастомные список / форма редактирования** — отдельные навыки `create-list-form` / `create-edit-form`. По умолчанию `listFormUid` / `itemFormUid` = `null` (используется автоформа платформы); навыки запускаются только если пользователь явно попросил конкретную форму.
- **Печатные формы** — `kind.catalog.usePrintForms = false`, недоступно.
- **Проведение по регистрам** — `kind.catalog.canCreateRecords = false`, недоступно.
- **Команды и кнопки** — добавляются отдельно (см. правило `commands`); по умолчанию `commands: []`.
- **Переименование существующего справочника** — кириллические имена папок и файлов в `catalog/` уже зашиты в систему и не должны переименовываться.
- **Изменение существующих записей в `system/dataTypes.json`** — только дописывание.
