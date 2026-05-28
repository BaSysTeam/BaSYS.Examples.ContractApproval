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
  records are written automatically by operations through RecordsSources /
  RecordsSettings (declared on the operation, not here), registers are edited
  manually. Does NOT register the new type in system/dataTypes.json (records
  has IsReference = false), does NOT create detail tables, records sources,
  print forms, attached files or custom forms — all disabled by the kind.
  Конфигурация "какая операция и какие строки пишет в этот регистр"
  выполняется на стороне operation в его RecordsSettings и не относится к
  этому навыку.
---

# Create Records (Регистр записей)

Регистры записей в BaSYS — **не ссылочные** служебные таблицы (`IsReference = false`), в которые **операции при проведении автоматически записывают движения** через механизм проведения (`RecordsSources` / `RecordsSettings` на операции). Пользователь такие регистры **вручную не редактирует** — он лишь читает их через отчёты (`data_view`) и видит как историю / остатки в журнале.

Это принципиальное отличие от обычных регистров (`kind = register`), которые редактируются вручную пользователем через стандартные формы (прайс-листы, графики, ставки, настройки). Регистр записей — приёмник проводок, обычный регистр — справочник-настройка.

Определение вида лежит в `system/kinds/kind.records.json` и закрепляет следующие инварианты:

| Флаг                 | Значение | Следствие для нового файла                                                  |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| `StoreData`          | true     | Файл валидируется по `metaObjectStorableSettings.schema.json`.              |
| `IsReference`        | false    | **Не** регистрируется в `system/dataTypes.json` — записи добавлять не нужно. |
| `UseDetailsTables`   | false    | `DetailTables` всегда `[]`. Табличные части в регистрах записей не используются. |
| `UseForms`           | false    | Кастомные формы недоступны — `ListFormUid` / `ItemFormUid` всегда `null`. Никаких `*.form.*.json` / `*.form.*.vue` файлов. Используется автоформа платформы. |
| `UsePrintForms`      | false    | Печатные формы недоступны — никаких `*.print_form.*` файлов.                |
| `CanCreateRecords`   | false    | `RecordsSources: []`, `RecordsSettings: []` всегда пусты. **Регистр записей сам ничего не проводит** — записи в него пишут операции (на стороне `operation`). |
| `AllowAttachedFiles` | false    | Прикрепление файлов не поддерживается.                                       |

Kind UID — `3eabc5d2-9cf5-4a74-95c8-ff2c2015ded3`. Поскольку `IsReference = false`, **никакой записи в `system/dataTypes.json` создавать не нужно**.

---

## Records vs Register — Не Перепутай

| Признак                                | `records` (этот навык)                               | `register` (kind = register)                         |
| -------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Как заполняется                        | Автоматически операциями при проведении (`RecordsSources` / `RecordsSettings` в `operation`) | Вручную пользователем через формы списка / элемента |
| Что хранит                             | Движения по объектам учёта, остатки, расчёты, история состояний | Прайс-листы, графики, ставки, скидки, настройки, права |
| Стандартные колонки шапки              | **Шесть**: `id`, `period`, `object_kind`, `meta_object`, `object_uid`, `row` | Одна: `id`                                           |
| Стандартные индексы                    | **Два**: на `period` и на `object_uid` (заданы `HasIndex = true` в kind) | Нет                                                  |
| Кастомные формы                        | Запрещены (`UseForms = false`) — только автоформа    | Поддерживаются, но по умолчанию автоформа            |
| Этот навык                             | Подходит                                             | **Не** подходит — для `register` нужен отдельный навык `create-register` |

Если пользователь говорит «нужен регистр, который пользователь редактирует руками» — это `register`, **не** `records`. Если сомневаешься — спроси.

---

## Что Этот Навык НЕ Делает

Создание **только** самого регистра записей — таблицы-приёмника. Чтобы какая-то операция реально стала писать в него строки, нужно отдельно на стороне `operation`:

- добавить запись в `RecordsSettings` операции (с `MetaObjectUid` нового регистра, направлением `Direction` и выражениями `Expression` для колонок измерений и ресурсов);
- при необходимости — добавить `RecordsSources` (источники записей в виде `.bjs`-скриптов) и пометить операцию `CanCreateRecords = true`.

Это **отдельная задача** (см. правило `records-creation` в репозитории), которая выполняется в файлах `operation/{name}/*.json` и `operation/{name}/*.records_source.*.bjs`. Текущий навык **создаёт только сам регистр**; настройку проведения операций под него делает пользователь / отдельный шаг.

---

## Prerequisites — Ask the User

Прежде чем что-либо генерировать, уточни:

1. **`Name`** (технический идентификатор) — обязательно. Английский `snake_case`, ≤ 30 символов, осмысленный (`item_stock`, `partner_settlements`, `production_output`, `employee_calc`). Не угадывай. Если в репозитории уже есть папки в `records/` с кириллическими именами — считай их legacy и не трогай; **новые** регистры записей пишутся по правилу из `general-conventions`.
2. **`Title`** (человекочитаемое имя) — обязательно. Любой язык, обычно русский (`Остатки номенклатуры`, `Расчёты с клиентами`, `Выпуск цеха`). Используй существительное в форме, привычной пользователю.
3. **Колонки шапки** — обязательно. У регистра записей почти всегда есть пользовательские поля помимо шести стандартных (иначе хранить нечего). Для регистра остатков / движений это обычно:
    - **Измерения** (dimensions) — ссылки на справочники / перечисления / другие регистры, по которым ведётся учёт: `item` (номенклатура), `warehouse` (склад), `partner` (контрагент), `currency` (валюта), `project` (проект), `employee` (сотрудник) и т.п. Обычно `Required: true`.
    - **Ресурсы** (measures) — числовые поля с количественной / суммовой информацией: `quantity`, `amount`, `price`, `sum_vat`. Обычно `Required: false` (могут быть 0).
    - **Атрибуты** (attributes) — дополнительная описательная информация: `comment`, `status`, `is_active`. Не обязательны.

    Собери для каждой: `Name` (English snake_case), `Title`, тип данных (по `system/dataTypes.json`), `Required`, `Unique`, `StringLength` / `NumberDigits`, нужен ли индекс, `Memo`.
4. **`Memo`** на метаобъект — опционально, короткое русское описание назначения регистра. По умолчанию `""`.

Не спрашивай о формах (запрещены видом), записях / проведении (настраивается на операции, а не здесь), печатных формах, прикреплённых файлах, табличных частях — всё это отключено видом.

---

## Pre-flight Checks

1. **Уникальность папки.** Папка `records/{name}/` ещё не существует.
2. **Ограничения `Name`.** Английский lowercase `snake_case`, ≤ 30 символов, не начинается с цифры.
3. **Это действительно `records`, а не `register`.** Если пользователь описывает сценарий «пользователь руками вводит цены / графики / ставки» — остановись и уточни: возможно, нужен `register`.

При нарушении любого из условий — остановись и сообщи пользователю.

---

## Files to Produce

Ровно **одно** изменение:

1. **Создать** `records/{name}/records.{name}.json` — файл настроек (см. «Skeleton» ниже).

Никаких записей в `system/dataTypes.json` (`IsReference = false`). Никаких `.bjs`, `.vue`, `*.form.*`, `*.print_form.*` файлов. Настройка проведения операций под этот регистр — отдельная задача в `operation/` (см. правило `records-creation`).

---

## Skeleton

Сгенерируй свежий UUID v4 (lowercase, hyphenated) для **каждого** `Uid`: метаобъекта, `Header`, каждой колонки, каждого индекса. Все UID уникальны в пределах файла.

Свойства всех шести стандартных колонок (`Name`, `Title`, `DataSettings`, `RenderSettings`) копируются **дословно** из `system/kinds/kind.records.json`. Только собственный `Uid` колонки генерируется заново; `StandardColumnUid` — это исходный `Uid` стандартной колонки из вида.

```json
{
  "$schema": "../../system/schemas/metaObjectStorableSettings.schema.json",
  "Uid": "<new-uuid-v4>",
  "MetaObjectKindUid": "3eabc5d2-9cf5-4a74-95c8-ff2c2015ded3",
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
    "Columns": [ /* 6 стандартных колонок + кастомные колонки, см. ниже */ ],
    "Indexes": [ /* 2 стандартных индекса (period и object_uid) + опциональные индексы для кастомных колонок */ ]
  },
  "DetailTables": [],
  "Commands": [],
  "RecordsSources": [],
  "RecordsSettings": []
}
```

`OrderByExpression` / `DisplayExpression` оставь пустыми строками — вид (`kind.records.json`) уже задаёт `id` как дефолт для упорядочивания. Переопределяй только если пользователь явно попросил другое (например, `period DESC` для просмотра последних движений сверху).

`ListFormUid` и `ItemFormUid` остаются `null`. Кастомные формы для регистров записей **запрещены видом** (`UseForms = false`) — пользователь работает с регистром через автоформу и через отчёты.

### Standard Columns (always 6, in this order)

Каждая стандартная колонка имеет top-level поля: `Uid` (свежий), `Kind: 0`, `StandardColumnUid` (из kind), `Title`, `Name`, `Formula: ""`, `ItemsSource: ""`, `AutoClearMethod: 0`, `IsStandard: true`, `DataSettings`, `RenderSettings`, `Dependencies: []`. Все эти 6 колонок заполняются и поддерживаются **движком проведения** автоматически — пользователь их не редактирует и не указывает в выражениях операции, но колонки **обязательно должны присутствовать** в шапке регистра, иначе механизм проведения не сработает.

| `Name`        | `StandardColumnUid`                    | `DataSettings` (тип, ключевые флаги)                                                                  | Назначение в механизме проведения                       |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `id`          | `7f7eb95c-7b70-4e4f-a391-4080d0710589` | Long (`daa57cb0-…`), **`PrimaryKey: true`**                                                           | Первичный ключ строки регистра.                         |
| `period`      | `8893e1df-525e-4a3f-b421-988294b4a2a8` | DateTime (`9001eafb-…`), **`Required: true`**, `HasIndex: true` в kind ⇒ нужен стандартный индекс    | Дата документа-источника (период проводки).             |
| `object_kind` | `dcb06a92-5d6f-46be-af10-88a4f91f47e6` | Тип «Вид объекта» (`689d1aac-66d8-478f-852e-0e3881b427bf`), **`Required: true`**                      | Вид метаданных операции-источника (например, `operation`). |
| `meta_object` | `7c2b8ad7-034d-495b-ba80-e300edc50146` | Тип «Объект метаданных» (`a4d064c6-465f-42a5-bbc0-48f743148c36`), **`Required: true`**                | UID конкретного метаобъекта-источника.                  |
| `object_uid`  | `78c493f2-e58a-4ce6-8665-27af40000562` | Int (`b327f82a-…`), **`Required: true`**, `HasIndex: true` в kind ⇒ нужен стандартный индекс         | ID конкретного экземпляра документа-источника.          |
| `row`         | `398c66ad-10ce-4c75-9a7b-f2ba9398972f` | Int (`b327f82a-…`), **`Required: true`**                                                              | Номер строки источника проводки.                        |

Все шесть колонок копируются с `RenderSettings`: `ControlKindUid: ""`, `ShowInItem: true`, `ShowInList: true`, `ListColumnWidth: ""` (как в `kind.records.json`).

Все остальные `DataSettings`-поля у стандартных колонок имеют значения по умолчанию: `StringLength: 100`, `NumberDigits: 2`, `Unique: false`, `DefaultValue: null` (см. `kind.records.json`).

### Standard Indexes (always 2)

По одному индексу на каждую стандартную колонку с `HasIndex = true` в kind. Порядок:

```json
{
  "Uid": "<new-uuid-v4>",
  "Columns": [ { "ColumnUid": "<Uid колонки period>", "Direction": 0 } ]
},
{
  "Uid": "<new-uuid-v4>",
  "Columns": [ { "ColumnUid": "<Uid колонки object_uid>", "Direction": 0 } ]
}
```

Это типичный набор индексов для регистра записей. Без них выборки по периоду и по документу-источнику будут медленными.

### Custom Columns (the main payload)

Добавляются **после** шести стандартных колонок. Каждая запись:

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
    "Unique": false,
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
  - Ссылка на справочник / перечисление / регистр — ищи в `system/dataTypes.json` запись с нужным `kind` (`catalog` / `enum` / `register`) и `name`, бери её `uid`.
- `Memo` заполняется на каждой кастомной колонке — короткая русская подсказка о назначении (это **измерение** или **ресурс**, на какой справочник ссылается и т.п.).
- `Kind = 0` (Stored) по умолчанию. `Kind = 1` (Virtual) — **только** если пользователь явно сказал «виртуальная колонка», «не сохраняется в БД», «только для отображения». Виртуальная колонка обычно имеет `Formula` — выражение на JS, вычисляющее значение по другим полям шапки (`$h.<имя>`).
- Поле `Formula` **не зависит** от `Kind`. Хранимая колонка (`Kind = 0`) тоже может иметь `Formula` — тогда значение вычисляется при сохранении и кладётся в БД.
- `StringLength` имеет смысл для строк (типичные значения: 20–200), `NumberDigits` — для десятичных чисел (количество знаков после запятой, обычно 2 для денег и 3–5 для количеств).
- Для **измерений-ссылок** (FK на справочник / перечисление / регистр) `DataTypeUid` — это `uid` целевого типа из `system/dataTypes.json`. Имя колонки часто содержит подсказку о цели: `item`, `warehouse`, `partner`, `currency`. Обычно `Required: true`. Если по этому измерению часто строится выборка / отчёт — добавь индекс (см. ниже).
- Для **ресурсов** (числовые меры) `DataTypeUid` — обычно «Десятичное число» (`a05516ac-…`). `Required: false` (ресурс может быть `0`/`null`). `NumberDigits` — `2` для денег, `3`–`5` для количеств.
- Поле `Unique` у кастомных колонок регистра записей — почти всегда `false` (одну и ту же номенклатуру в одном складе можно проводить много раз разными документами).

### Extra Indexes (Optional, On-Demand)

Два стандартных индекса (`period`, `object_uid`) добавляются всегда. Помимо них, добавляй индекс **только** для тех кастомных колонок, по которым реально ведётся поиск / фильтрация в отчётах:

- ссылочные измерения, по которым часто строятся отчёты («остатки по номенклатуре», «расчёты по контрагенту»);
- комбинации измерений для составных индексов (например, `(item, warehouse)` в регистре остатков для быстрого получения остатка по номенклатуре на складе).

Структура индекса — такая же, как у стандартных:

```json
{
  "Uid": "<new-uuid-v4>",
  "Columns": [
    { "ColumnUid": "<Uid колонки>", "Direction": 0 }
  ]
}
```

Для составного индекса перечисли несколько объектов в `Columns` в нужном порядке.

---

## NOT to Produce

- **Запись в `system/dataTypes.json`** — `records` имеет `IsReference = false`, не дописывай ничего в этот файл.
- **Табличные части** — `UseDetailsTables = false`, всегда `DetailTables: []`.
- **Печатные формы** — `UsePrintForms = false`, никаких `*.print_form.*`.
- **Записи / проведение** — `CanCreateRecords = false`, `RecordsSources: []`, `RecordsSettings: []` всегда пусты. Сам регистр записей ничего никуда не пишет; это **приёмник** проводок, а не их источник. Настройка проведения операций под этот регистр выполняется на стороне `operation`.
- **Прикреплённые файлы** — `AllowAttachedFiles = false`.
- **Кастомные формы списка / редактирования** — `UseForms = false`, запрещены видом. `ListFormUid` и `ItemFormUid` остаются `null`. Никаких `*.form.*.json` / `*.form.*.vue` файлов. Кастомные формы для регистров записей — крайнее исключение, и видом они отключены.
- **Команды и кнопки** — кастомные регистры записей в репозитории всегда имеют `Commands: []`. Если пользователь хочет действия над регистром — это, скорее всего, отчёт / data-view, а не регистр.

---

## Reference Examples

Два готовых к копированию шаблона лежат рядом с навыком. Читай их только в момент сборки файла — они не подгружаются вместе с `SKILL.md`.

- [examples/minimal.json](examples/minimal.json) — минимальный регистр остатков: шесть стандартных колонок + два стандартных индекса (`period`, `object_uid`) + одно измерение (`item` — ссылка на справочник номенклатуры) + два ресурса (`quantity`, `amount`). Самый типичный «остаточный» регистр. **Начинай с него** для типичного случая.
- [examples/with_extras.json](examples/with_extras.json) — регистр расчётов посложнее: шесть стандартных колонок + два стандартных индекса + несколько измерений (`partner` — FK на справочник, `currency` — FK на справочник, `project` — строка-шифр, `direction` — FK на перечисление) + два ресурса (`amount`, `amount_currency`) + виртуальная колонка `amount_signed` с `Formula` + дополнительный индекс по `partner`. Используй как шаблон, когда есть несколько FK-измерений, индекс по измерению или вычисляемая колонка.

Как использовать:

1. Прочитай нужный пример.
2. Скопируй структуру в `records/{name}/records.{name}.json`.
3. Замени **каждый** `Uid` свежим UUID v4 — все UID в примерах иллюстративные.
4. Замени `Title` / `Name` / `Memo` на значения, полученные от пользователя.
5. Замени `$schema` на `"../../system/schemas/metaObjectStorableSettings.schema.json"` (в файлах примеров используется более глубокий относительный путь, потому что они лежат под `.cursor/skills/create-records/examples/`).
6. У шести стандартных колонок ничего не меняй, кроме их собственного `Uid` (на свежий UUID v4) и `ColumnUid`-ссылок в двух стандартных индексах (должны указывать на новые UID колонок `period` и `object_uid` соответственно).
7. Для кастомных колонок: подбери `DataTypeUid` из `system/dataTypes.json` по `Title` / `TypeName`; никогда не оставляй иллюстративные UID из шаблона.
8. Для FK-измерений: в `system/dataTypes.json` найди запись целевого справочника / перечисления / регистра по `kind` + `name`, возьми её `uid` и подставь в `DataTypeUid` колонки.
9. Для дополнительных индексов: проверь, что `ColumnUid` указывает на свежие UID соответствующих колонок в твоём файле.

---

## Building Checklist

Скопируй и отмечай:

```
- [ ] Подтверждено, что нужен именно records, а не register (записи пишет операция, а не пользователь)
- [ ] Name (English snake_case, ≤ 30 chars) и Title подтверждены
- [ ] Папка records/{name}/ ещё не существует
- [ ] Собран список кастомных колонок (имя/тип/Required/индекс/Memo): измерения (FK) + ресурсы (числа) + атрибуты
- [ ] Сгенерирован Uid метаобъекта (UUID v4)
- [ ] Сгенерирован Uid Header (UUID v4)
- [ ] MetaObjectKindUid = 3eabc5d2-9cf5-4a74-95c8-ff2c2015ded3
- [ ] 6 стандартных колонок добавлены в порядке: id, period, object_kind, meta_object, object_uid, row
- [ ] Каждая стандартная колонка: свежий Uid + StandardColumnUid из kind + IsStandard=true + копия DataSettings/RenderSettings из kind.records.json
- [ ] 2 стандартных индекса добавлены: на period и на object_uid (с ColumnUid, указывающими на свежие UID этих колонок)
- [ ] Кастомные колонки: IsStandard=false, StandardColumnUid=null, DataTypeUid взят из system/dataTypes.json, Memo заполнен, Kind=0 (если только не «виртуальная»)
- [ ] FK-измерения (если есть): DataTypeUid — это uid целевого типа из system/dataTypes.json (catalog/enum/register), Required=true для существенных измерений
- [ ] Ресурсы (если есть): DataTypeUid — десятичное число (a05516ac-…), NumberDigits подобран по типу величины (2 для денег, 3–5 для количеств), обычно Required=false
- [ ] Виртуальные колонки (если есть): Kind=1, заполнен Formula с выражением на JS ($h.<имя> для других полей шапки)
- [ ] Дополнительные индексы для часто фильтруемых измерений (если нужно) добавлены; ColumnUid указывает на свежие UID колонок
- [ ] DetailTables: [], Commands: [], RecordsSources: [], RecordsSettings: []
- [ ] ListFormUid: null, ItemFormUid: null (UseForms=false, формы запрещены видом)
- [ ] OrderByExpression / DisplayExpression: "" (если только пользователь явно не попросил другое)
- [ ] $schema указывает на ../../system/schemas/metaObjectStorableSettings.schema.json
- [ ] В system/dataTypes.json НИЧЕГО не добавлено (IsReference = false)
- [ ] Никаких *.form.*, *.print_form.*, *.bjs, *.vue файлов не создано
- [ ] Пользователю сообщено: чтобы операция начала писать в этот регистр, надо отдельно настроить RecordsSettings на самой операции (задача за рамками этого навыка)
```

---

## Out of Scope

- **Регистры (`register`)** — это отдельный вид метаданных, редактируется вручную. Этот навык такие регистры **не** создаёт (для них — отдельный навык `create-register`).
- **Настройка проведения операций под этот регистр** — выполняется в `operation/{name}/operation.{name}.json` через `RecordsSettings` (и опционально `RecordsSources` + `.bjs`-скрипты). См. правило `records-creation` в репозитории. Этот навык создаёт только сам регистр-приёмник.
- **Кастомные формы списка / редактирования** — `kind.records.UseForms = false`, запрещены видом. Регистр записей доступен только через автоформу и через отчёты (`data_view`).
- **Печатные формы** — `kind.records.UsePrintForms = false`, недоступно.
- **Табличные части** — `kind.records.UseDetailsTables = false`, недоступно.
- **Прикреплённые файлы** — `kind.records.AllowAttachedFiles = false`, недоступно.
- **Команды и кнопки** — кастомные регистры записей в репозитории всегда имеют `Commands: []`.
- **Переименование существующего регистра записей** — кириллические имена папок и файлов в `records/` уже зашиты в систему и не должны переименовываться.
