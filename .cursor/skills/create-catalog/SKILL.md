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
  edit forms are wired through ListFormUid / ItemFormUid by the separate
  create-list-form / create-edit-form skills, only when the user explicitly
  asks.
---

# Create Catalog (Справочник)

Справочники в BaSYS — ссылочные сущности (`IsReference = true`) для хранения объектов учёта: номенклатура, контрагенты, статьи затрат, единицы измерения и т.п. Чаще всего достаточно полей шапки; табличные части используются только в сложных случаях. Проведение по регистрам в справочниках не используется.

Определение вида лежит в `system/kinds/kind.catalog.json` и закрепляет следующие инварианты:

| Флаг                 | Значение | Следствие для нового файла                                            |
| -------------------- | -------- | --------------------------------------------------------------------- |
| `StoreData`          | true     | Файл валидируется по `metaObjectStorableSettings.schema.json`.        |
| `IsReference`        | true     | **Обязательно** регистрируется в `system/dataTypes.json` (`dbType: 11`). |
| `UseDetailsTables`   | false    | По умолчанию `DetailTables: []`. Добавлять только если пользователь явно попросил. |
| `UseForms`           | true     | Кастомные формы поддерживаются, но **по умолчанию не создаются** — `ListFormUid` / `ItemFormUid` остаются `null`. |
| `UsePrintForms`      | false    | Печатные формы недоступны — никаких `*.print_form.*` файлов. |
| `CanCreateRecords`   | false    | `RecordsSources: []`, `RecordsSettings: []` всегда пусты. |
| `AllowAttachedFiles` | true     | Прикрепление файлов разрешено самим видом — отдельных полей в JSON не нужно. |

Kind UID — `032d8377-500f-4631-b435-1f7f69046674`, `dbType` для записи в `dataTypes.json` — `11` (одинаков для всех справочников).

---

## Prerequisites — Ask the User

Прежде чем что-либо генерировать, уточни:

1. **`Name`** (технический идентификатор) — обязательно. Английский `snake_case`, ≤ 30 символов, осмысленный (`product`, `partner`, `budget_item`, `warehouse`). Не угадывай. Если в репозитории уже есть папки в `catalog/` с кириллическими именами — считай их legacy и не трогай; **новые** справочники пишутся по правилу из `general-conventions`.
2. **`Title`** (человекочитаемое имя) — обязательно. Единственное число, обычно русский (`Товар`, `Контрагент`, `Статья бюджета`). НЕ `Товары` — для `Title` тоже единственное число.
3. **Дополнительные колонки шапки** — опционально. Спроси один раз: «Какие поля нужны кроме стандартных (id / uid / is_deleted / title / is_files)?». Для каждой собери: `Name` (English snake_case), `Title`, тип данных (по `system/dataTypes.json` — `Строка`, `Целое число`, `Десятичное число`, `Булево`, `Дата&Время`, или ссылка на другой справочник / перечисление), `Required`, `Unique`, `StringLength` / `NumberDigits`, `Memo`.
4. **Табличные части** — опционально, **по умолчанию `[]`**. Спрашивай **только если** пользователь явно сказал, что нужны (например: «справочник с табличной частью», «состав/расшифровка», «контактные лица»). См. секцию «Detail Tables (Optional)».
5. **`Memo`** на метаобъект — опционально, короткое русское описание назначения справочника. По умолчанию `""`.

Не спрашивай о записях, проведении и печатных формах — они отключены видом. Кастомные формы (`ListFormUid` / `ItemFormUid`) — отдельные навыки `create-list-form` / `create-edit-form`, по умолчанию остаются `null`.

---

## Pre-flight Checks

1. **Уникальность папки.** Папка `catalog/{name}/` ещё не существует.
2. **Уникальность записи типа.** В `system/dataTypes.json` нет записи с `kind = "catalog"` и тем же `name`.
3. **Ограничения `Name`.** Английский lowercase `snake_case`, ≤ 30 символов, не начинается с цифры.

При нарушении любого из условий — остановись и сообщи пользователю.

---

## Files to Produce

Ровно **два** изменения:

1. **Создать** `catalog/{name}/catalog.{name}.json` — файл настроек (см. «Skeleton» ниже).
2. **Дописать** одну запись в массив `system/dataTypes.json` — см. «Register the Type».

Никаких `.bjs`, `.vue`, `*.form.*`, `*.print_form.*` файлов. Если пользователь явно попросил форму — пусть отдельные навыки `create-list-form` / `create-edit-form` доделают это после.

---

## Skeleton

Сгенерируй свежий UUID v4 (lowercase, hyphenated) для **каждого** `Uid`: метаобъекта, `Header`, каждой колонки, каждого индекса, каждой ТЧ, каждой колонки ТЧ. Все UID уникальны в пределах файла.

Свойства стандартных колонок (`Name`, `Title`, `DataSettings`, `RenderSettings`) копируются **дословно** из `system/kinds/kind.catalog.json`. Только собственный `Uid` колонки генерируется заново; `StandardColumnUid` — это исходный `Uid` стандартной колонки из вида.

```json
{
  "$schema": "../../system/schemas/metaObjectStorableSettings.schema.json",
  "Uid": "<new-uuid-v4>",
  "MetaObjectKindUid": "032d8377-500f-4631-b435-1f7f69046674",
  "Title": "<Title>",
  "Name": "<name>",
  "Memo": "<короткое русское описание, может быть пустым>",
  "EditMethod": 0,
  "OrderByExpression": "",
  "DisplayExpression": "",
  "ListFormUid": null,
  "ItemFormUid": null,
  "ShowMainImage": false,
  "IsActive": true,
  "Header": {
    "Uid": "<new-uuid-v4>",
    "Title": "header",
    "Name": "header",
    "Memo": "",
    "AutoClearMethod": 0,
    "Columns": [ /* 5 стандартных колонок + опциональные кастомные, см. ниже */ ],
    "Indexes": [ /* 2 стандартных индекса + опциональные индексы кастомных колонок */ ]
  },
  "DetailTables": [],
  "Commands": [],
  "RecordsSources": [],
  "RecordsSettings": []
}
```

`OrderByExpression` / `DisplayExpression` оставь пустыми строками — вид (`kind.catalog.json`) уже задаёт `title` как дефолт. Переопределяй только если пользователь явно попросил другое поле.

### Standard Columns (always 5, in this order)

У каждой колонки набор top-level полей: `Uid` (свежий), `Kind: 0`, `StandardColumnUid` (из вида), `Title`, `Name`, `Formula: ""`, `ItemsSource: ""`, `AutoClearMethod: 0`, `IsStandard: true`, `DataSettings`, `RenderSettings`, `Dependencies: []`.

| `Name`       | `StandardColumnUid`                    | `DataSettings`                                                                                       | `RenderSettings`                                       |
| ------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `id`         | `4a7c739c-6012-4e45-bfc0-b78a06db8aec` | Int (`b327f82a-…`), `StringLength: 100`, `NumberDigits: 2`, **`PrimaryKey: true`**                  | `ShowInItem: true`, `ShowInList: true`                 |
| `uid`        | `b20fcd24-ba0f-b5b8-7e4d-39628145533e` | Guid (`6fa9c45b-…`), `StringLength: 100`, `NumberDigits: 2`, **`Required: true`**, **`Unique: true`**, **`DefaultValue: "new"`** | `ShowInItem: false`, `ShowInList: true` |
| `is_deleted` | `dc3def1b-bffd-4dc8-b0d5-5d34a57fdcb2` | Bool (`4bff64cf-…`), `StringLength: 100`, `NumberDigits: 2`                                          | `ShowInItem: false`, `ShowInList: false`               |
| `title`      | `e163c0c4-de77-4e58-a468-f3527b573e4a` | String (`0234c067-…`), `StringLength: 100`, `NumberDigits: 2`, **`Required: true`**                  | `ShowInItem: true`, `ShowInList: true`                 |
| `is_files`   | `349f72d7-ac0f-40cd-b02d-a5b5f7dcd467` | Bool (`4bff64cf-…`), `StringLength: 100`, `NumberDigits: 2`                                          | `ShowInItem: false`, `ShowInList: true`                |

Остальные поля `DataSettings` по умолчанию: `PrimaryKey: false`, `Required: false`, `Unique: false`, `DefaultValue: null`. Остальные поля `RenderSettings` по умолчанию: `ControlKindUid: ""`, `ListColumnWidth: ""`.

### Standard Indexes (always 2)

По одному индексу на каждую стандартную колонку с `HasIndex: true` в `kind.catalog.json` — это `is_deleted` и `is_files`, в этом порядке:

```json
{
  "Uid": "<new-uuid-v4>",
  "Columns": [ { "ColumnUid": "<Uid of is_deleted column>", "Direction": 0 } ]
},
{
  "Uid": "<new-uuid-v4>",
  "Columns": [ { "ColumnUid": "<Uid of is_files column>",   "Direction": 0 } ]
}
```

### Optional Custom Columns

Добавляются после пяти стандартных. Каждая запись:

```json
{
  "Uid": "<new-uuid-v4>",
  "Kind": 0,
  "StandardColumnUid": null,
  "Title": "<Title>",
  "Name": "<name>",
  "Formula": "",
  "ItemsSource": "",
  "AutoClearMethod": 0,
  "IsStandard": false,
  "DataSettings": {
    "DataTypeUid": "<из system/dataTypes.json>",
    "StringLength": <int>,
    "NumberDigits": 2,
    "PrimaryKey": false,
    "Required": <bool>,
    "Unique": <bool>,
    "DefaultValue": null
  },
  "RenderSettings": {
    "ControlKindUid": "",
    "ShowInItem": true,
    "ShowInList": true,
    "ListColumnWidth": ""
  },
  "Dependencies": []
}
```

Правила:

- `DataTypeUid` берётся из `system/dataTypes.json` по `Title` / `TypeName`. Никогда не выдумывай UID. Частые типы:
  - Строка — `0234c067-7868-46b2-ba8e-e22fae5255cb`
  - Целое число (int) — `b327f82a-ea96-416f-9836-785db28eccac`
  - Целое число (long) — `daa57cb0-32eb-4709-b61f-4ea023ae31c3`
  - Десятичное число — `a05516ac-baae-4f66-9b67-6703998a6a1b`
  - Булево — `4bff64cf-eb01-4933-9f3d-b902336751f4`
  - Дата&Время — `9001eafb-efb1-442f-b288-723bb8002b12`
  - Guid — `6fa9c45b-f514-4fea-a480-8e940636a1df`
  - Ссылка на другой справочник / перечисление — ищи в `system/dataTypes.json` запись с нужным `kind` и `name`, бери её `uid`.
- `Memo` заполняется на каждой кастомной колонке — короткая русская подсказка о назначении.
- `Kind = 0` (Stored) по умолчанию. `Kind = 1` — только если пользователь явно сказал «виртуальная колонка» / «не сохраняется в БД».
- `StringLength` имеет смысл для строк (типичные значения: 20–100), `NumberDigits` — для десятичных чисел (количество знаков после запятой).
- Для **ссылочных** колонок (FK на другой справочник / перечисление) `DataTypeUid` — это `uid` целевого типа из `system/dataTypes.json`. Имя колонки часто содержит подсказку о цели: `partner`, `currency`, `measure_unit` и т.п.
- Если колонка часто используется для поиска / фильтрации — добавь индекс в массив `Indexes` (та же форма, что у стандартных).

### Detail Tables (Optional, Rare)

По умолчанию `DetailTables: []`. Добавляй ТЧ **только если** пользователь явно попросил (например: «справочник с табличной частью», «контактные лица», «расшифровка состава»). Признаком того, что ТЧ оправдана, является связь «один-ко-многим» внутри одной сущности справочника (например — несколько телефонов у контрагента, несколько строк состава у комплекта номенклатуры).

Структура одной ТЧ:

```json
{
  "Uid": "<new-uuid-v4>",
  "Title": "<Заголовок>",
  "Name": "<snake_case_name>",
  "Memo": "<короткое описание назначения ТЧ>",
  "AutoClearMethod": 0,
  "Columns": [ /* служебные + пользовательские колонки */ ],
  "Indexes": []
}
```

Для каждой ТЧ обязательно включи три служебные колонки в начале `Columns` (см. реальные ТЧ у объектов `register/` / `operation/` в текущем репозитории — у них тот же формат):

- `id` — `Kind: 0`, `IsStandard: true`, `StandardColumnUid: null`, тип int, `PrimaryKey: true`.
- `parent_id` — `Kind: 0`, `IsStandard: true`, `StandardColumnUid: null`, тип int (ссылка на `id` шапки), `Required: true`.
- `row_number` — `Kind: 0`, `IsStandard: true`, `StandardColumnUid: null`, тип int (порядковый номер строки), `Required: true`.

Пользовательские колонки ТЧ — по тем же правилам, что и колонки шапки. Если в шапке справочника нужна ТЧ редко — лучше открыто спроси пользователя ещё раз, прежде чем её добавлять.

---

## Register the Type

Поскольку `catalog` имеет `IsReference = true`, новый тип **обязательно** дописывается в `system/dataTypes.json`, чтобы на него можно было ссылаться из других файлов настроек в этой же сессии. Сервер перезапишет эту запись при следующей синхронизации — **не** изменяй и **не** удаляй существующие записи, только дописывай.

Дописать ровно один объект в массив верхнего уровня:

```json
{
  "uid": "<catalog.Uid>",
  "kind": "catalog",
  "name": "<catalog.Name>",
  "title": "Справочник.<catalog.Title>",
  "isPrimitive": false,
  "dbType": 11,
  "objectKindUid": "032d8377-500f-4631-b435-1f7f69046674",
  "typeName": null
}
```

`uid` — **тот же** UID, что и у метаобъекта (`catalog.Uid`), отдельный не генерируй.

---

## Reference Examples

Два готовых к копированию шаблона лежат рядом с навыком. Читай их только в момент сборки файла — они не подгружаются вместе с `SKILL.md`.

- [examples/minimal.json](examples/minimal.json) — минимальный справочник: пять стандартных колонок + два стандартных индекса, без кастомных полей. **Начинай с него** для типичного случая.
- [examples/with_extras.json](examples/with_extras.json) — тот же скелет плюс пять кастомных колонок: `name` (строка), `code` (целое, с собственным индексом), `price` (десятичное), `is_main` (булево) и `currency` (ссылка на другой справочник, `DataTypeUid` — иллюстративный, его надо заменить на `uid` реального справочника / перечисления из `system/dataTypes.json`). Используй как шаблон, когда пользователь явно попросил доп. поля.

Как использовать:

1. Прочитай нужный пример.
2. Скопируй структуру в `catalog/{name}/catalog.{name}.json`.
3. Замени **каждый** `Uid` свежим UUID v4 — все UID в примерах иллюстративные.
4. Замени `Title` / `Name` / `Memo` на значения, полученные от пользователя.
5. Замени `$schema` на `"../../system/schemas/metaObjectStorableSettings.schema.json"` (в файлах примеров используется более глубокий относительный путь, потому что они лежат под `.cursor/skills/create-catalog/examples/`).
6. Для кастомных колонок: подбери `DataTypeUid` из `system/dataTypes.json` по `Title` / `TypeName`; никогда не оставляй иллюстративные UID из шаблона.
7. Для ссылочных колонок: в `system/dataTypes.json` найди запись целевого справочника / перечисления по `kind` + `name`, возьми её `uid` и подставь в `DataTypeUid` колонки.

---

## Building Checklist

Скопируй и отмечай:

```
- [ ] Name (English snake_case, ≤ 30 chars) и Title (единственное число) подтверждены
- [ ] Папка catalog/{name}/ ещё не существует
- [ ] В system/dataTypes.json нет записи kind="catalog" + name=<name>
- [ ] Принято решение по дополнительным колонкам шапки (имя/тип/Required/Unique/Memo)
- [ ] Принято решение по табличным частям (по умолчанию — нет; добавляем только если попросили)
- [ ] Сгенерирован Uid метаобъекта (UUID v4)
- [ ] Сгенерирован Uid Header (UUID v4)
- [ ] 5 стандартных колонок добавлены в порядке: id, uid, is_deleted, title, is_files
- [ ] Каждая стандартная колонка: свежий Uid + StandardColumnUid из kind + IsStandard=true + DataSettings/RenderSettings скопированы из kind.catalog.json
- [ ] 2 стандартных индекса добавлены: на is_deleted и на is_files
- [ ] Кастомные колонки (если есть): IsStandard=false, StandardColumnUid=null, DataTypeUid взят из system/dataTypes.json, Memo заполнен, Kind=0 (если только не «виртуальная»)
- [ ] Ссылочные колонки (если есть): DataTypeUid — это uid целевого типа из system/dataTypes.json (другой catalog/enum)
- [ ] DetailTables: [] (или добавлены ТЧ со служебными колонками id/parent_id/row_number, если пользователь явно попросил)
- [ ] Commands: [], RecordsSources: [], RecordsSettings: []
- [ ] ListFormUid: null, ItemFormUid: null (формы — отдельные навыки)
- [ ] OrderByExpression: "", DisplayExpression: "" (умолчания вида используют title)
- [ ] $schema указывает на ../../system/schemas/metaObjectStorableSettings.schema.json
- [ ] В system/dataTypes.json добавлена ровно одна запись: uid = catalog.Uid, kind = "catalog", dbType = 11, objectKindUid = 032d8377-…, title = "Справочник.<Title>"
- [ ] Существующие записи в system/dataTypes.json не изменены и не удалены
- [ ] Никаких *.form.*, *.print_form.*, *.bjs, *.vue файлов не создано
```

---

## Out of Scope

- **Кастомные список / форма редактирования** — отдельные навыки `create-list-form` / `create-edit-form`. По умолчанию `ListFormUid` / `ItemFormUid` = `null` (используется автоформа платформы); навыки запускаются только если пользователь явно попросил конкретную форму.
- **Печатные формы** — `kind.catalog.UsePrintForms = false`, недоступно.
- **Проведение по регистрам** — `kind.catalog.CanCreateRecords = false`, недоступно.
- **Команды и кнопки** — добавляются отдельно (см. правило `commands`); по умолчанию `Commands: []`.
- **Переименование существующего справочника** — кириллические имена папок и файлов в `catalog/` уже зашиты в систему и не должны переименовываться.
- **Изменение существующих записей в `system/dataTypes.json`** — только дописывание.
