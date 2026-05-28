---
name: create-register
description: >-
  Create a new BaSYS регистр (register metaobject) for storing manually-edited
  auxiliary data — прайс-листы, графики, ставки налогов, скидки, настройки,
  производственные календари и т.п. Generates the
  register/{name}/register.{name}.json settings file with the single standard
  column (id) and any custom header columns the user requested. Use when the
  user asks to create / build / generate / add a register, регистр,
  register-метаобъект, новый регистр, прайс-лист, график, ставку,
  справочник-настройку, регистр настроек, регистр сведений. Supports adding
  custom header columns (strings, numbers, booleans, dates, references to
  catalogs / enums), virtual / computed columns and DB indexes. NOT to be
  confused with the records (регистр записей) kind — registers are edited
  manually, records are written by operations through RecordsSources /
  RecordsSettings. Does NOT register the new type in system/dataTypes.json
  (register has IsReference = false), does NOT create detail tables, records
  sources, print forms or attached files — all disabled by the kind. Custom
  forms are rarely needed; when explicitly requested, they are wired through
  ListFormUid / ItemFormUid by the separate create-list-form /
  create-edit-form skills.
---

# Create Register (Регистр)

Регистры в BaSYS — **не ссылочные** сущности (`IsReference = false`), предназначенные для хранения вспомогательной информации, которую пользователь редактирует **вручную**: прайс-листы, графики (производственный календарь, рабочие часы), ставки налогов, скидки, настройки прав, порядок визирования и т.п. Это принципиальное отличие от **регистров записей** (`kind = records`), в которые строки создаются автоматически при проведении операций — в обычные регистры данные вводятся через стандартные формы списка и редактирования.

Определение вида лежит в `system/kinds/kind.register.json` и закрепляет следующие инварианты:

| Флаг                 | Значение | Следствие для нового файла                                                  |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| `StoreData`          | true     | Файл валидируется по `metaObjectStorableSettings.schema.json`.              |
| `IsReference`        | false    | **Не** регистрируется в `system/dataTypes.json` — записи добавлять не нужно. |
| `UseDetailsTables`   | false    | `DetailTables` всегда `[]`. Табличные части в регистрах не используются.    |
| `UseForms`           | true     | Кастомные формы поддерживаются, но **по умолчанию не создаются** — `ListFormUid` / `ItemFormUid` остаются `null`. Используется автоформа платформы. |
| `UsePrintForms`      | false    | Печатные формы недоступны — никаких `*.print_form.*` файлов.                |
| `CanCreateRecords`   | false    | `RecordsSources: []`, `RecordsSettings: []` всегда пусты — регистр не проводится. |
| `AllowAttachedFiles` | false    | Прикрепление файлов не поддерживается.                                       |

Kind UID — `f3ecb444-8e72-4387-83f1-66c712de1c32`. Поскольку `IsReference = false`, **никакой записи в `system/dataTypes.json` создавать не нужно**.

---

## Register vs Records — Не Перепутай

| Признак                                | `register` (этот навык)                              | `records` (kind = records)                           |
| -------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Как заполняется                        | Вручную пользователем через формы списка / элемента | Автоматически операциями (`RecordsSources` / `RecordsSettings` в `operation`) |
| Что хранит                             | Прайс-листы, графики, ставки, скидки, настройки, права | Движения по объектам учёта, история состояний, остатки |
| Стандартные колонки шапки              | Только `id`                                          | `id`, `period`, `object_kind`, `meta_object`, `object_uid`, `row` |
| `CanCreateRecords`                     | false                                                | false (записи **в** регистр пишут операции, а не сам регистр) |
| Этот навык                             | Подходит                                             | **Не** подходит — для `records` нужен отдельный навык |

Если пользователь говорит «нужен регистр, в который операция документа будет писать движения» — это `records`, **не** `register`. Если сомневаешься — спроси.

---

## Prerequisites — Ask the User

Прежде чем что-либо генерировать, уточни:

1. **`Name`** (технический идентификатор) — обязательно. Английский `snake_case`, ≤ 30 символов, осмысленный (`price_list`, `tax_rate`, `discount`, `work_calendar`, `working_hours`). Не угадывай. Если в репозитории уже есть папки в `register/` с кириллическими именами — считай их legacy и не трогай; **новые** регистры пишутся по правилу из `general-conventions`.
2. **`Title`** (человекочитаемое имя) — обязательно. Любой язык, обычно русский (`Прайс-лист`, `Ставки налогов`, `Производственный календарь`). Используй существительное в форме, привычной пользователю для регистра данных.
3. **Колонки шапки** — обязательно. У регистра почти всегда есть пользовательские поля помимо стандартного `id` (иначе хранить нечего). Собери для каждой: `Name` (English snake_case), `Title`, тип данных (по `system/dataTypes.json` — `Строка`, `Целое число`, `Десятичное число`, `Булево`, `Дата&Время`, или ссылка на справочник / перечисление), `Required`, `Unique`, `StringLength` / `NumberDigits`, нужен ли индекс, `Memo`.
4. **`Memo`** на метаобъект — опционально, короткое русское описание назначения регистра. По умолчанию `""`.

Не спрашивай о записях / проведении, печатных формах, прикреплённых файлах, табличных частях — всё это отключено видом. Не спрашивай про формы — по умолчанию используется автоформа платформы; формы создаются отдельными навыками `create-list-form` / `create-edit-form` только если пользователь явно попросил.

---

## Pre-flight Checks

1. **Уникальность папки.** Папка `register/{name}/` ещё не существует.
2. **Ограничения `Name`.** Английский lowercase `snake_case`, ≤ 30 символов, не начинается с цифры.
3. **Это действительно `register`, а не `records`.** Если пользователь описывает сценарий «операция пишет в регистр» — остановись и уточни.

При нарушении любого из условий — остановись и сообщи пользователю.

---

## Files to Produce

Ровно **одно** изменение:

1. **Создать** `register/{name}/register.{name}.json` — файл настроек (см. «Skeleton» ниже).

Никаких записей в `system/dataTypes.json` (`IsReference = false`). Никаких `.bjs`, `.vue`, `*.form.*`, `*.print_form.*` файлов. Если пользователь явно попросил форму — отдельные навыки `create-list-form` / `create-edit-form` доделают это после.

---

## Skeleton

Сгенерируй свежий UUID v4 (lowercase, hyphenated) для **каждого** `Uid`: метаобъекта, `Header`, каждой колонки, каждого индекса. Все UID уникальны в пределах файла.

Свойства стандартной колонки `id` (`Name`, `Title`, `DataSettings`, `RenderSettings`) копируются **дословно** из `system/kinds/kind.register.json`. Только собственный `Uid` колонки генерируется заново; `StandardColumnUid` — это исходный `Uid` стандартной колонки из вида.

```json
{
  "$schema": "../../system/schemas/metaObjectStorableSettings.schema.json",
  "Uid": "<new-uuid-v4>",
  "MetaObjectKindUid": "f3ecb444-8e72-4387-83f1-66c712de1c32",
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
    "Columns": [ /* 1 стандартная колонка id + кастомные колонки, см. ниже */ ],
    "Indexes": [ /* пусто по умолчанию; индексы добавляются только для кастомных колонок, по которым ведётся поиск/фильтр */ ]
  },
  "DetailTables": [],
  "Commands": [],
  "RecordsSources": [],
  "RecordsSettings": []
}
```

`OrderByExpression` / `DisplayExpression` оставь пустыми строками — вид (`kind.register.json`) уже задаёт `id` как дефолт для упорядочивания. Переопределяй только если пользователь явно попросил другое поле (например, `period DESC` для прайс-листа).

### Standard Columns (always 1: id)

У стандартной колонки `id` набор top-level полей: `Uid` (свежий), `Kind: 0`, `StandardColumnUid: "96b5f50b-98de-43fb-aea5-70fc29a35763"`, `Title: "Id"`, `Name: "id"`, `Formula: ""`, `ItemsSource: ""`, `AutoClearMethod: 0`, `IsStandard: true`, `Dependencies: []`, плюс:

| Поле               | Значение                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `StandardColumnUid`| `96b5f50b-98de-43fb-aea5-70fc29a35763`                                                              |
| `DataSettings`     | Целое число (long) (`daa57cb0-32eb-4709-b61f-4ea023ae31c3`), `StringLength: 100`, `NumberDigits: 2`, **`PrimaryKey: true`**, `Required: false`, `Unique: false`, `DefaultValue: null` |
| `RenderSettings`   | `ControlKindUid: ""`, `ShowInItem: true`, `ShowInList: true`, `ListColumnWidth: ""`                |

`HasIndex` у стандартной колонки `id` в `kind.register.json` — `false`, поэтому **стандартных индексов нет**. Массив `Indexes` по умолчанию пустой `[]`.

### Custom Columns (the main payload)

Добавляются **после** стандартной колонки `id`. Каждая запись:

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
  - Ссылка на справочник / перечисление — ищи в `system/dataTypes.json` запись с нужным `kind` (`catalog` / `enum`) и `name`, бери её `uid`.
- `Memo` заполняется на каждой кастомной колонке — короткая русская подсказка о назначении.
- `Kind = 0` (Stored) по умолчанию. `Kind = 1` (Virtual) — **только** если пользователь явно сказал «виртуальная колонка», «не сохраняется в БД», «только для отображения». Виртуальная колонка обычно имеет `Formula` — выражение на JS, вычисляющее значение по другим полям шапки (`$h.<имя>`).
- Поле `Formula` **не зависит** от `Kind`. Хранимая колонка (`Kind = 0`) тоже может иметь `Formula` — тогда значение вычисляется при сохранении и кладётся в БД (см. колонку `fill_order` в `register/порядок_визирования_договоров/`).
- `StringLength` имеет смысл для строк (типичные значения: 20–200), `NumberDigits` — для десятичных чисел (количество знаков после запятой, обычно 2 для денег).
- Для **ссылочных** колонок (FK на справочник / перечисление / другой регистр) `DataTypeUid` — это `uid` целевого типа из `system/dataTypes.json`. Имя колонки часто содержит подсказку о цели: `product`, `currency`, `day_kind`, `partner` и т.п. По таким колонкам часто нужен индекс.
- Поле `DefaultValue` — строка, выражающая значение по умолчанию (например, `"1"` для целого, `"true"` для булева). По умолчанию — `null`.

### Indexes (Optional, On-Demand)

По умолчанию `Indexes: []`. **Стандартных индексов у регистра нет** (у стандартной колонки `id` `HasIndex = false`). Добавляй индекс **только** для тех кастомных колонок, по которым реально ведётся поиск / фильтрация — обычно это:

- ссылочные колонки (FK), по которым часто строится выборка («все цены данного товара», «график за период по сотруднику»);
- колонки `period` / `date` в исторических / периодических регистрах;
- любые поля, явно отмеченные пользователем как поиск/фильтр.

Структура индекса — такая же, как у стандартных индексов справочников / перечислений:

```json
{
  "Uid": "<new-uuid-v4>",
  "Columns": [
    { "ColumnUid": "<Uid колонки, по которой строится индекс>", "Direction": 0 }
  ]
}
```

Для составного индекса (например, `(product, period)` для прайс-листа) перечисли несколько объектов в `Columns` в нужном порядке.

---

## NOT to Produce

- **Запись в `system/dataTypes.json`** — `register` имеет `IsReference = false`, не дописывай ничего в этот файл.
- **Табличные части** — `UseDetailsTables = false`, всегда `DetailTables: []`. Если пользователь хочет «регистр с табличной частью» — переспроси: скорее всего ему нужен `catalog` или `operation`, а не регистр.
- **Печатные формы** — `UsePrintForms = false`, никаких `*.print_form.*`.
- **Записи / проведение** — `CanCreateRecords = false`, `RecordsSources: []`, `RecordsSettings: []` всегда пусты. Если пользователю нужно, чтобы операция писала в регистр — это `records`, не `register`.
- **Прикреплённые файлы** — `AllowAttachedFiles = false`.
- **Кастомные формы** — по умолчанию `ListFormUid: null`, `ItemFormUid: null` (используется автоформа). Создавай формы отдельными навыками `create-list-form` / `create-edit-form` **только** если пользователь явно попросил.

---

## Reference Examples

Два готовых к копированию шаблона лежат рядом с навыком. Читай их только в момент сборки файла — они не подгружаются вместе с `SKILL.md`.

- [examples/minimal.json](examples/minimal.json) — минимальный регистр (производственный календарь): стандартная колонка `id` + два кастомных поля (`period` — дата, `day_kind` — ссылка на перечисление), без индексов и переопределений. **Начинай с него** для типичного случая.
- [examples/with_extras.json](examples/with_extras.json) — регистр-прайс-лист посложнее: стандартная колонка `id` + `period` (дата начала действия), `product` (FK на справочник), `price` (десятичное число с `NumberDigits: 2`), `currency` (FK на справочник), `is_active` (булево с `DefaultValue: "true"`) и виртуальная колонка `price_with_vat` (`Kind: 1` + `Formula`). Имеет два индекса: одиночный по `period` и составной по `(product, period)`, а также переопределённый `OrderByExpression: "period DESC"`. Используй как шаблон, когда есть ссылочные поля, индексы или вычисляемые колонки.

Как использовать:

1. Прочитай нужный пример.
2. Скопируй структуру в `register/{name}/register.{name}.json`.
3. Замени **каждый** `Uid` свежим UUID v4 — все UID в примерах иллюстративные.
4. Замени `Title` / `Name` / `Memo` на значения, полученные от пользователя.
5. Замени `$schema` на `"../../system/schemas/metaObjectStorableSettings.schema.json"` (в файлах примеров используется более глубокий относительный путь, потому что они лежат под `.cursor/skills/create-register/examples/`).
6. Для кастомных колонок: подбери `DataTypeUid` из `system/dataTypes.json` по `Title` / `TypeName`; никогда не оставляй иллюстративные UID из шаблона.
7. Для ссылочных колонок: в `system/dataTypes.json` найди запись целевого справочника / перечисления / регистра по `kind` + `name`, возьми её `uid` и подставь в `DataTypeUid` колонки.
8. Для индексов: проверь, что `ColumnUid` указывает на свежие UID соответствующих колонок в твоём файле.

---

## Building Checklist

Скопируй и отмечай:

```
- [ ] Подтверждено, что нужен именно register, а не records (записи пишет пользователь, а не операция)
- [ ] Name (English snake_case, ≤ 30 chars) и Title подтверждены
- [ ] Папка register/{name}/ ещё не существует
- [ ] Собран список кастомных колонок (имя/тип/Required/Unique/индекс/Memo)
- [ ] Сгенерирован Uid метаобъекта (UUID v4)
- [ ] Сгенерирован Uid Header (UUID v4)
- [ ] MetaObjectKindUid = f3ecb444-8e72-4387-83f1-66c712de1c32
- [ ] Стандартная колонка id добавлена первой: свежий Uid + StandardColumnUid=96b5f50b-… + IsStandard=true + DataSettings/RenderSettings скопированы из kind.register.json
- [ ] Кастомные колонки: IsStandard=false, StandardColumnUid=null, DataTypeUid взят из system/dataTypes.json, Memo заполнен, Kind=0 (если только не «виртуальная»)
- [ ] Ссылочные колонки (если есть): DataTypeUid — это uid целевого типа из system/dataTypes.json (catalog/enum/register)
- [ ] Виртуальные колонки (если есть): Kind=1, заполнен Formula с выражением на JS ($h.<имя> для других полей шапки)
- [ ] Indexes: [] (или добавлены индексы для часто фильтруемых колонок — FK, period и т.п.; ColumnUid указывает на свежие UID колонок)
- [ ] DetailTables: [], Commands: [], RecordsSources: [], RecordsSettings: []
- [ ] ListFormUid: null, ItemFormUid: null (формы — отдельные навыки, по умолчанию автоформа)
- [ ] OrderByExpression / DisplayExpression: "" (если только пользователь явно не попросил другое)
- [ ] $schema указывает на ../../system/schemas/metaObjectStorableSettings.schema.json
- [ ] В system/dataTypes.json НИЧЕГО не добавлено (IsReference = false)
- [ ] Никаких *.form.*, *.print_form.*, *.bjs, *.vue файлов не создано
```

---

## Out of Scope

- **Регистры записей (`records`)** — это отдельный вид метаданных, заполняется операциями через `RecordsSources` / `RecordsSettings`. Этот навык такие регистры **не** создаёт.
- **Кастомные список / форма редактирования** — отдельные навыки `create-list-form` / `create-edit-form`. По умолчанию `ListFormUid` / `ItemFormUid` = `null` (используется автоформа платформы); навыки запускаются только если пользователь явно попросил конкретную форму. Для регистров кастомные формы — скорее исключение, чем правило.
- **Печатные формы** — `kind.register.UsePrintForms = false`, недоступно.
- **Проведение по регистрам** — `kind.register.CanCreateRecords = false`, недоступно. Регистр не «проводится», он редактируется вручную.
- **Табличные части** — `kind.register.UseDetailsTables = false`, недоступно.
- **Прикреплённые файлы** — `kind.register.AllowAttachedFiles = false`, недоступно.
- **Команды и кнопки** — добавляются отдельно (см. правило `commands`); по умолчанию `Commands: []`.
- **Переименование существующего регистра** — кириллические имена папок и файлов в `register/` уже зашиты в систему и не должны переименовываться.
