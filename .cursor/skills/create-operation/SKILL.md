---
name: create-operation
description: >-
  Create a new BaSYS операция (operation metaobject; пользователь может
  называть «документ») for posting business events into the system —
  оприходование, отгрузка, заказ, начисление, акт, расчёт и т.п. Generates the
  operation/{name}/operation.{name}.json settings file with the five standard
  columns (number / is_deleted / date / is_files / create_records), the three
  default indexes on is_deleted / date / is_files, optional custom header
  columns, optional detail tables (табличные части) with the three service
  columns id / object_uid / row_number, and — when the operation проводится
  по регистрам — recordsSettings posting rules (in the typical case
  sourceUid указывает прямо на header или на одну из detailTables; источник
  записей recordsSources + отдельный .bjs-файл подключается только в особых
  случаях, когда нужна группировка / разворачивание / синтетические колонки).
  Registers the new type in system/dataTypes.json so it can be referenced
  from other settings in the same editing session. Use when the user asks to
  create / build / generate / add an operation, операцию, документ,
  документ-метаобъект, operation-метаобъект, оприходование, отгрузку, расчёт,
  акт, заказ, начисление и т.п. Supports adding optional custom header
  columns (strings, numbers, booleans, dates, references to catalogs / enums
  / other operations), detail tables, and the full records-creation block
  (recordsSettings, плюс recordsSources с .bjs только когда необходимо).
  Custom list /
  edit forms are wired through listFormUid / itemFormUid by the separate
  create-list-form / create-edit-form skills, only when the user explicitly
  asks. Print forms (печатные формы), commands (команды на формах), workflows
  и т.п. — отдельные навыки / правила.
---

# Create Operation (Операция / Документ)

Операции в BaSYS — это бизнес-документы / события: оприходование, отгрузка, заказ, расчёт, акт, начисление и т.п. Это ссылочный вид (`isReference = true`), как правило проводимый по регистрам (но бывают и исключения), часто с табличными частями, кастомными формами и печатными формами. Пользователь может называть их и «документами», и «операциями» — это одно и то же.

Определение вида лежит в `system/kinds/kind.operation.json` и закрепляет следующие инварианты:

| Флаг                 | Значение | Следствие для нового файла                                            |
| -------------------- | -------- | --------------------------------------------------------------------- |
| `storeData`          | true     | Файл валидируется по `metaObjectStorableSettings.schema.json`.        |
| `isReference`        | true     | **Обязательно** регистрируется в `system/dataTypes.json` (`dbType: 11`). |
| `useDetailsTables`   | true     | Табличные части (`detailTables`) поддерживаются и часто используются. По умолчанию пусто — `detailTables: []`. |
| `useForms`           | true     | Кастомные формы поддерживаются, но **по умолчанию не создаются** — `listFormUid` / `itemFormUid` остаются `null`. |
| `usePrintForms`      | true     | Печатные формы поддерживаются, но создаются отдельным навыком. Никаких `*.print_form.*` файлов в рамках этого навыка. |
| `canCreateRecords`   | true     | Проведение по регистрам поддерживается через `recordsSettings` (обычный случай — `sourceUid` указывает прямо на `header` или на `detailTables[i]`) и опционально через `recordsSources` (особый случай — отдельный JS-скрипт `.bjs`, нужен только когда прямого проведения из шапки / ТЧ недостаточно). По умолчанию обе коллекции пусты. |
| `allowAttachedFiles` | true     | Прикрепление файлов разрешено самим видом — отдельных полей в JSON не нужно. |

Kind UID — `14a60875-e241-4e99-b32d-d45b2726d18b`, `dbType` для записи в `dataTypes.json` — `11` (одинаков для всех операций).

Префикс вида — `opr`, заголовок — `Операция`. Значения по умолчанию `orderByExpression = "number desc, date desc"` и `displayExpression = "Операция #{{number}} от {{date}}"` уже заданы на самом виде — в новом объекте оставляй эти поля пустыми строками, если пользователь не попросил иначе.

---

## Prerequisites — Ask the User

Прежде чем что-либо генерировать, уточни:

1. **`name`** (технический идентификатор) — обязательно. Английский `snake_case`, ≤ 30 символов, осмысленный (`goods_receipt`, `goods_writeoff`, `salary_calc`, `delivery`, `production_act`). Не угадывай. Если в репозитории уже есть папки в `operation/` с кириллическими именами — считай их legacy и не трогай; **новые** операции пишутся по правилу из `general-conventions`.
2. **`title`** (человекочитаемое имя) — обязательно. Единственное число, обычно русский (`Оприходование товаров`, `Отгрузка`, `Расчёт ЗП`, `Акт СМР`). Используй то название, которое пользователь произносит в чате; если пользователь говорит «документ», в `title` всё равно пиши конкретное действие (`Оприходование`, а не «Документ оприходования»).
3. **Дополнительные колонки шапки** — опционально, но почти всегда есть. Спроси один раз: «Какие поля нужны в шапке кроме стандартных (number / is_deleted / date / is_files / create_records)?». Типичные кандидаты для операций — `warehouse` (склад), `responsible_person` (ответственный), `partner` (контрагент), `currency`, `project`, `status`, `comment`. Для каждой колонки собери: `name` (English snake_case), `title`, тип данных (по `system/dataTypes.json` — `Строка`, `Целое число`, `Десятичное число`, `Булево`, `Дата&Время`, или ссылка на другой справочник / перечисление / другую операцию), `required`, `unique`, `stringLength` / `numberDigits`, `memo`.
4. **Табличные части (`detailTables`)** — опционально, **по умолчанию `[]`**. Спрашивай явно: «Нужны ли табличные части (например, «Товары», «Услуги», «Сотрудники») и какие колонки в каждой?». Если есть — для каждой ТЧ собери: `name` (English snake_case), `title` (русский), `memo`, список пользовательских колонок с теми же атрибутами, что и колонки шапки. См. секцию «Detail Tables».
5. **Проведение по регистрам (`recordsSettings`)** — опционально, **по умолчанию `recordsSettings: []`**. Спрашивай явно: «Нужно ли настроить проведение по регистрам, и если да — в какие регистры записывать какие данные?». Если да — для каждого правила собери: целевой регистр (`destinationMetaObjectUid` — `uid` объекта из `records/<name>/records.<name>.json`), источник (по умолчанию — `header` или одна из `detailTables`), направление (`Plus` / `Minus`) и формулы заполнения колонок регистра. См. секцию «Records Settings».
6. **Источник записей (`recordsSources`)** — **особый случай, не путать с обычным проведением**. Это отдельный JS-скрипт в `.bjs`-файле, который порождает свой `DataTable` для записей. **Не предлагай пользователю создать его по умолчанию.** Источник записей нужен, **только если** прямого проведения из шапки и/или строк ТЧ недостаточно: ТЧ нужно сгруппировать по ключу с суммированием (одна номенклатура встречается в нескольких строках), развернуть / объединить несколько ТЧ, добавить синтетические колонки, инвертировать значения по сложному правилу и т.п. В типовом документе («одна строка ТЧ → одна запись регистра», «одна шапка → одна запись регистра») `recordsSources` остаётся пустым — `sourceUid` в `recordsSettings.rows` ссылается прямо на `header.uid` или на `detailTables[i].uid`. См. секцию «Records Sources» только когда пользователь явно подтвердил, что обычным проведением задачу не решить.
7. **`memo`** на метаобъект — опционально, короткое русское описание назначения операции. По умолчанию `""`.

Не спрашивай о кастомных формах, печатных формах, командах и workflow — для них есть отдельные навыки / правила. По умолчанию `listFormUid` / `itemFormUid` = `null`, `commands: []`.

---

## Pre-flight Checks

1. **Уникальность папки.** Папка `operation/{name}/` ещё не существует.
2. **Уникальность записи типа.** В `system/dataTypes.json` нет записи с `kind = "operation"` и тем же `name`.
3. **Ограничения `name`.** Английский lowercase `snake_case`, ≤ 30 символов, не начинается с цифры.
4. **Регистры существуют.** Если пользователь попросил проведение в конкретные регистры — проверь, что соответствующие файлы `records/<name>/records.<name>.json` существуют и из них можно вытащить `uid` объекта и `uid` нужных колонок назначения. Если регистра ещё нет — остановись и сообщи пользователю; создание регистров — отдельный навык (`create-records`).

При нарушении любого из условий — остановись и сообщи пользователю.

---

## Files to Produce

Минимум — **два** изменения; больше — только если пользователь явно попросил источник записей:

1. **Создать** `operation/{name}/operation.{name}.json` — файл настроек (см. «Skeleton» ниже). В типовом случае внутри этого файла настраивается и проведение по регистрам (`recordsSettings` с прямой ссылкой на `header` / `detailTables[i]`).
2. **Дописать** одну запись в массив `system/dataTypes.json` — см. «Register the Type».
3. (**Опционально**, только когда есть `recordsSources`) **для каждой записи `recordsSources`** — создать отдельный файл `operation/{name}/operation.{name}.records_source.{sourceName}.bjs` со скриптом источника записей (см. «Records Sources»). В типовом документе таких файлов **нет**.

Никаких `*.form.*`, `*.print_form.*`, `*.command.*.bjs` файлов. Если пользователь явно попросил форму, печатную форму или команду — пусть отдельные навыки (`create-list-form`, `create-edit-form`, `create-print-form`, ...) или правила (`commands`, `print-forms`, `workflows`) доделают это после.

---

## Skeleton

Сгенерируй свежий UUID v4 (lowercase, hyphenated) для **каждого** `uid`: метаобъекта, `header`, каждой колонки, каждого индекса, каждой ТЧ, каждой колонки ТЧ, каждой записи `recordsSources` и каждой строки `recordsSettings.rows`. Все UID уникальны в пределах файла.

Свойства стандартных колонок (`name`, `title`, `dataSettings`, `renderSettings`) копируются **дословно** из `system/kinds/kind.operation.json`. Только собственный `uid` колонки генерируется заново; `standardColumnUid` — это исходный `uid` стандартной колонки из вида.

```json
{
  "$schema": "../../system/schemas/metaObjectStorableSettings.schema.json",
  "uid": "<new-uuid-v4>",
  "metaObjectKindUid": "14a60875-e241-4e99-b32d-d45b2726d18b",
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
    "indexes": [ /* 3 стандартных индекса + опциональные индексы кастомных колонок */ ]
  },
  "detailTables": [],
  "commands": [],
  "recordsSources": [],
  "recordsSettings": []
}
```

`orderByExpression` / `displayExpression` оставь пустыми строками — вид (`kind.operation.json`) уже задаёт `"number desc, date desc"` и `"Операция #{{number}} от {{date}}"` как умолчания. Переопределяй только если пользователь явно попросил другие.

### Standard columns (always 5, in this order)

У каждой колонки набор top-level полей: `uid` (свежий), `kind: 0`, `standardColumnUid` (из вида), `title`, `name`, `formula: ""`, `itemsSource: ""`, `autoClearMethod: 0`, `isStandard: true`, `dataSettings`, `renderSettings`, `dependencies: []`.

| `name`            | `standardColumnUid`                    | `dataSettings`                                                                                                | `renderSettings`                                       |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `number`          | `a39e7b83-e94d-4646-b620-04434fef2f4c` | Int (`b327f82a-…`), `stringLength: 100`, `numberDigits: 2`, **`primaryKey: true`**                            | `showInItem: true`, `showInList: true`                 |
| `is_deleted`      | `95d36e42-5d4d-4c26-adc1-1319e860b45e` | Bool (`4bff64cf-…`), `stringLength: 100`, `numberDigits: 2`                                                   | `showInItem: false`, `showInList: false` (копируй из вида — не меняй) |
| `date`            | `f244de36-53c9-4e93-a5a2-94abbed91e02` | DateTime (`9001eafb-…`), `stringLength: 100`, `numberDigits: 2`, **`required: true`**, **`defaultValue: "now"`** | `showInItem: true`, `showInList: true`                 |
| `is_files`        | `9cac33f4-6758-4aab-be4a-b00790bdf452` | Bool (`4bff64cf-…`), `stringLength: 100`, `numberDigits: 2`                                                   | `showInItem: false`, `showInList: true`                |
| `create_records`  | `fee422db-18dc-442a-a8dd-01df76c20a98` | Bool (`4bff64cf-…`), `stringLength: 100`, `numberDigits: 2`, **`defaultValue: "true"`**                       | `showInItem: true`, `showInList: true`                 |

Остальные поля `dataSettings` по умолчанию: `primaryKey: false`, `required: false`, `unique: false`, `defaultValue: null`. Остальные поля `renderSettings` по умолчанию: `controlKindUid: ""`, `listColumnWidth: ""`.

Поле `create_records` — это флаг «провести при сохранении». Когда `false`, ранее созданные записи удаляются и новых не создаётся (аналог «отмены проведения»). Колонка обязательна — без неё проведение по регистрам не сработает.

### Standard indexes (always 3)

По одному индексу на каждую стандартную колонку с `hasIndex: true` в `kind.operation.json` — это `is_deleted`, `date` и `is_files`, в этом порядке:

```json
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid of is_deleted column>", "direction": 0 } ]
},
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid of date column>",       "direction": 0 } ]
},
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid of is_files column>",   "direction": 0 } ]
}
```

### Optional Custom columns (header)

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
  - Ссылка на справочник / перечисление / другую операцию — ищи в `system/dataTypes.json` запись с нужным `kind` и `name`, бери её `uid`.
- `memo` заполняется на каждой кастомной колонке — короткая русская подсказка о назначении.
- `kind = 0` (Stored) по умолчанию. `kind = 1` — только если пользователь явно сказал «виртуальная колонка» / «не сохраняется в БД». Наличие `formula` **не** делает колонку виртуальной — формула может сохранять вычисленное значение в БД при `kind = 0`.
- `stringLength` имеет смысл для строк (типичные значения: 20–100), `numberDigits` — для десятичных чисел (количество знаков после запятой; для сумм денег — `2`, для количества штук / кг — `3` или `4`).
- Для **ссылочных** колонок (FK на справочник / перечисление / другую операцию) `dataTypeUid` — это `uid` целевого типа из `system/dataTypes.json`. Имя колонки часто содержит подсказку о цели: `warehouse`, `partner`, `currency`, `responsible_person`, `project`.
- Если колонка часто используется для поиска / фильтрации — добавь индекс в массив `indexes` (та же форма, что у стандартных).
- Если у колонки есть вычисляемые зависимости (например, при изменении `date` пересчитывается `period_start`), их можно описать через `dependencies` (см. реальные операции `проверка_зп.json`, `goods_receipt.json` для синтаксиса).

### Detail Tables (Optional, Common)

По умолчанию `detailTables: []`. Табличные части в операциях используются часто — это типичные «строки документа»: товары, услуги, сотрудники, начисления, проводки. Добавляй ТЧ **только если** пользователь подтвердил, что она нужна.

Структура одной ТЧ:

```json
{
  "uid": "<new-uuid-v4>",
  "title": "<Заголовок, например «Товары»>",
  "name": "<snake_case_name, например 'goods'>",
  "memo": "<короткое описание назначения ТЧ>",
  "autoClearMethod": 0,
  "columns": [ /* 3 служебные + пользовательские колонки */ ],
  "indexes": [ /* индекс на object_uid + опциональные индексы пользовательских колонок */ ]
}
```

**Три служебные колонки** в начале `columns` — обязательны для любой ТЧ операции. У всех `kind: 0`, `isStandard: true`, `standardColumnUid: null`, `formula: ""`, `itemsSource: ""`, `autoClearMethod: 0`, `dependencies: []`. `renderSettings` — все четыре стандартных значения (`controlKindUid: ""`, `showInItem: true`, `showInList: true`, `listColumnWidth: ""`).

| `name`        | `title`      | Тип данных                              | Особенности `dataSettings`                                  |
| ------------- | ------------ | --------------------------------------- | ----------------------------------------------------------- |
| `id`          | `id`         | Long — `daa57cb0-32eb-4709-b61f-4ea023ae31c3` | `stringLength: 100`, `numberDigits: 2`, **`primaryKey: true`** |
| `object_uid`  | `object UID` | Int — `b327f82a-ea96-416f-9836-785db28eccac`  | `stringLength: 100`, `numberDigits: 2`, **`required: true`**   |
| `row_number`  | `Row number` | Int — `b327f82a-ea96-416f-9836-785db28eccac`  | `stringLength: 100`, `numberDigits: 2`, **`required: true`**   |

> ВНИМАНИЕ: в ТЧ **операций** служебная FK-колонка к шапке называется `object_uid` (int). Это отличается от ТЧ справочников, где аналогичная колонка может называться `parent_id`. Не путай.

**Стандартный индекс ТЧ** — один индекс на `object_uid`:

```json
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid of object_uid column>", "direction": 0 } ]
}
```

**Пользовательские колонки ТЧ** — по тем же правилам, что и колонки шапки (см. «Optional Custom columns»). Типичные колонки ТЧ операции: `item` (FK на номенклатуру), `quantity` (decimal), `price` (decimal), `amount` (decimal с формулой `$r.quantity * $r.price`).

Если колонка ТЧ вычисляется по формуле от других колонок (типичный пример — `amount = quantity * price`), у тех колонок, от которых она зависит, заполни `dependencies` со ссылкой на UID вычисляемой колонки:

```json
"dependencies": [
  {
    "kind": 1,
    "fieldUid": "<uid of dependent (computed) column, например amount>",
    "tableUid": "<uid of this detail table>"
  }
]
```

`kind`: `0` — HeaderField (зависимость в шапке), `1` — RowField (зависимость в ТЧ), `2` — Table.

### Records Settings (Optional)

Проведение по регистрам — самая характерная фича операций. Коллекция `recordsSettings` **пуста по умолчанию**; добавляй её **только если** пользователь явно попросил настроить проведение в регистры. Параллельная коллекция `recordsSources` — для особого случая (см. ниже), в типовом документе она остаётся пустой.

Полные правила — в правиле `records-creation` (`.cursor/rules/records-creation.mdc`). Краткий минимум для этого навыка:

Одна запись `recordsSettings` = одно правило записи в один целевой регистр. Внутри `rows` — одна или несколько строк, каждая выбирает источник и описывает как заполнить колонки регистра:

```json
{
  "destinationMetaObjectUid": "<uid целевого регистра из records/<name>/records.<name>.json>",
  "rows": [
    {
      "uid": "<new-uuid-v4>",
      "sourceUid": "<uid источника: header.uid | detailTables[i].uid | recordsSources[i].uid>",
      "direction": 0,
      "condition": "",
      "columns": [
        { "destinationColumnUid": "<uid колонки регистра, например period>",     "expression": "$h.date" },
        { "destinationColumnUid": "<uid колонки регистра, например quantity>",   "expression": "$r.quantity" }
      ]
    }
  ]
}
```

- `direction`: `0` — Plus (Приход), `1` — Minus (Расход). При `Minus` движок сам инвертирует знак decimal-колонок — **не** инвертируй вручную в формулах.
- `condition` — пустая строка = «писать всегда»; иначе JS-выражение, возвращающее boolean (`$r.quantity > 0`, `$h.status > 2 && $h.warehouse > 0`).
- `columns` — пары `destinationColumnUid` ↔ `expression`. Заполняй только те колонки регистра, которые нужно записать (включая `period`). НЕ перечисляй служебные колонки `MetaObjectKind` / `MetaObject` / `object` / `Row` — их заполняет движок автоматически.
- `expression`: `$h.<имя_колонки_шапки>`, `$r.<имя_колонки_текущей_строки_источника>`, либо произвольное JS-выражение. `$r.*` **недоступно**, если `sourceUid` указывает на `header`.

#### Выбор источника (`sourceUid`)

`sourceUid` — это `uid` одного из трёх типов источников **на этой же операции**. **По умолчанию используй первые два** — это типовой случай:

1. **`header.uid`** — одна запись регистра на одну операцию. Внутри выражений доступен только `$h.*`. Типичный пример: документ «Закрытие месяца» пишет один итог в регистр.
2. **`detailTables[i].uid`** — одна запись регистра на одну строку выбранной ТЧ. Доступны и `$h.*` (поля шапки), и `$r.*` (поля текущей строки ТЧ). **Это самый частый паттерн**: «Оприходование» / «Отгрузка» / «Расчёт ЗП» — каждая строка ТЧ становится отдельной записью регистра. Никакого `.bjs`-файла создавать не нужно.
3. **`recordsSources[i].uid`** — особый случай, см. следующую секцию.

#### recordsSources (источники записей) — особый случай

`recordsSources` подключается, **только если** прямого проведения из шапки и/или одной ТЧ недостаточно:

- ключевая колонка ТЧ повторяется в разных строках и нужно сгруппировать с суммированием (например, одна и та же номенклатура в нескольких строках);
- нужно объединить / развернуть несколько ТЧ;
- нужны вычисляемые / синтетические колонки, которых нет в исходных данных;
- нужны нестандартные правила фильтрации / преобразования, которые неудобно выразить через `condition` + `expression`.

В типовом документе (одна строка ТЧ → одна запись регистра) **`recordsSources` остаётся пустым**, скрипт `.bjs` не создаётся. Не предлагай пользователю источник записей по умолчанию.

Когда источник всё-таки нужен — добавь одну запись в `recordsSources`:

```json
{
  "uid": "<new-uuid-v4>",
  "title": "group_by_item",
  "expression": "operation.<name>.records_source.<sourceName>.bjs"
}
```

- `uid` — свежий UUID v4. Используется как `sourceUid` в строках `recordsSettings`.
- `title` — для **новых** источников выбирай чистый ASCII-слаг `snake_case` (это же значение войдёт в имя файла). Существующие источники с кириллическими / пробельными `title` не переименовывай.
- `expression` — **только имя файла** без пути. Файл создаётся рядом с метаобъектом: `operation/{name}/operation.{name}.records_source.{sourceName}.bjs`. Имя файла должно **дословно** совпадать со значением `expression`.

Тело `.bjs` — скрипт, возвращающий `DataTable`. В нём доступны `$h` (шапка) и `$t` (ТЧ как `DataTable`-ы). Используй BaSYS.FX-хелперы (`groupBy`, `process`, `addColumn`, `select`, …) вместо ручных циклов. Типичный пример:

```javascript
var source = $t.goods
    .groupBy(['item'], ['quantity', 'amount']);

return source;
```

---

## Register the Type

Поскольку `operation` имеет `isReference = true`, новый тип **обязательно** дописывается в `system/dataTypes.json`, чтобы на него можно было ссылаться из других файлов настроек в этой же сессии (например — как FK-колонка в другом метаобъекте). Сервер перезапишет эту запись при следующей синхронизации — **не** изменяй и **не** удаляй существующие записи, только дописывай.

Дописать ровно один объект в массив верхнего уровня:

```json
{
  "uid": "<operation.uid>",
  "kind": "operation",
  "name": "<operation.name>",
  "title": "Операция.<operation.title>",
  "isPrimitive": false,
  "dbType": 11,
  "objectKindUid": "14a60875-e241-4e99-b32d-d45b2726d18b",
  "typeName": null
}
```

`uid` — **тот же** UID, что и у метаобъекта (`operation.uid`), отдельный не генерируй.

---

## Reference Examples

Готовые к копированию шаблоны лежат рядом с навыком. Читай их только в момент сборки файла — они не подгружаются вместе с `SKILL.md`. Примеры идут от простого к сложному; **выбирай минимально достаточный**.

- `examples/minimal.json` — минимальная операция: пять стандартных колонок + три стандартных индекса, без кастомных полей, без ТЧ, без проведения по регистрам. **Начинай с него**, когда пользователь попросил голую заготовку операции «только с шапкой».
- `examples/with_details.json` — **типовой документ с проведением**: пять стандартных + две кастомные колонки шапки (`warehouse` — FK на справочник, `responsible_person` — FK на справочник); одна ТЧ `goods` (три служебные + четыре пользовательские колонки `item` / `quantity` / `price` / `amount`, последняя — с формулой `$r.quantity * $r.price`); `recordsSources: []`; одно правило `recordsSettings`, в котором `sourceUid` указывает **прямо на ТЧ** — одна строка ТЧ становится одной записью регистра, без отдельного `.bjs`-файла. Используй как шаблон для большинства реальных документов (оприходование / отгрузка / расчёт ЗП и т.п.).
- `examples/with_records_source.json` — **особый случай**: та же шапка и ТЧ, но в ТЧ одна и та же номенклатура может встречаться в нескольких строках, поэтому перед проведением строки надо сгруппировать. Здесь добавлена одна запись `recordsSources` (`group_by_item`), и `recordsSettings.rows[0].sourceUid` ссылается на неё, а не на ТЧ напрямую. **Используй только когда** прямого проведения из шапки / ТЧ недостаточно (см. список условий в секции «recordsSources (источники записей) — особый случай»). По умолчанию `with_details.json` предпочтительнее.
- `examples/with_records_source.records_source.group_by_item.bjs` — тело `.bjs`-скрипта, на который ссылается источник записей из `with_records_source.json`. Демонстрирует группировку ТЧ через `BaSYS.FX` `groupBy`. При копировании шаблона создавай аналогичный файл рядом с метаобъектом: `operation/{name}/operation.{name}.records_source.{sourceName}.bjs` — имя файла должно дословно совпадать со значением `expression` в JSON.

Как использовать:

1. Прочитай **только нужный** пример. Если случай простой — не открывай `with_records_source.*`.
2. Скопируй структуру в `operation/{name}/operation.{name}.json` (и, только для `with_records_source`, в соответствующий `.bjs`-файл).
3. Замени **каждый** `uid` свежим UUID v4 — все UID в примерах иллюстративные.
4. Замени `title` / `name` / `memo` на значения, полученные от пользователя.
5. Замени `$schema` на `"../../system/schemas/metaObjectStorableSettings.schema.json"` (в файлах примеров используется более глубокий относительный путь, потому что они лежат под `.cursor/skills/create-operation/examples/`).
6. Для кастомных колонок и FK: подбери `dataTypeUid` из `system/dataTypes.json` по `title` / `typeName` или по паре `kind` + `name` для ссылочных типов; никогда не оставляй иллюстративные UID из шаблона.
7. Для `recordsSettings`: подставь реальный `destinationMetaObjectUid` из `records/<name>/records.<name>.json` и реальные `destinationColumnUid` колонок регистра-назначения. Для типового случая `sourceUid` = `header.uid` или `detailTables[i].uid` **этой же** операции.
8. Только для `with_records_source` (особый случай): для каждого `recordsSources` элемента создай рядом с метаобъектом `.bjs`-файл с именем, точно совпадающим с `expression`.

---

## Building Checklist

Скопируй и отмечай:

```
- [ ] name (English snake_case, ≤ 30 chars) и title (единственное число) подтверждены
- [ ] Папка operation/{name}/ ещё не существует
- [ ] В system/dataTypes.json нет записи kind="operation" + name=<name>
- [ ] Принято решение по дополнительным колонкам шапки (имя/тип/required/unique/memo)
- [ ] Принято решение по табличным частям (по умолчанию — нет; добавляем только если попросили)
- [ ] Принято решение по проведению по регистрам (по умолчанию — нет; иначе подтверждены целевые регистры и их колонки)
- [ ] Если проведение есть — выбран источник для каждой строки recordsSettings.rows: по умолчанию header.uid или detailTables[i].uid этой же операции. recordsSources (отдельный .bjs) подключается только если пользователь подтвердил необходимость группировки / разворачивания / синтетических колонок
- [ ] Сгенерирован uid метаобъекта (UUID v4)
- [ ] Сгенерирован uid header (UUID v4)
- [ ] 5 стандартных колонок добавлены в порядке: number, is_deleted, date, is_files, create_records
- [ ] Каждая стандартная колонка: свежий uid + standardColumnUid из kind + isStandard=true + dataSettings/renderSettings скопированы из kind.operation.json
- [ ] 3 стандартных индекса добавлены: на is_deleted, на date, на is_files
- [ ] Кастомные колонки шапки (если есть): isStandard=false, standardColumnUid=null, dataTypeUid взят из system/dataTypes.json, memo заполнен, kind=0 (если только не «виртуальная»)
- [ ] Ссылочные колонки (если есть): dataTypeUid — это uid целевого типа из system/dataTypes.json (catalog/enum/operation)
- [ ] detailTables: [] (или добавлены ТЧ с тремя служебными колонками id/object_uid/row_number и индексом на object_uid)
- [ ] У ТЧ — на каждую пользовательскую колонку с формулой выставлены dependencies на её зависимостях (kind=1, fieldUid, tableUid)
- [ ] recordsSettings: [] (или для каждого правила: destinationMetaObjectUid и destinationColumnUid существуют в records/...; sourceUid указывает на header / DetailTable / RecordsSource этой операции; direction корректен; Period заполнен; служебные колонки регистра MetaObjectKind / MetaObject / object / Row не перечислены)
- [ ] recordsSources: [] (по умолчанию пусто; только если был особый случай — для каждого источника создан .bjs-файл с именем, совпадающим с expression; тело скрипта возвращает DataTable)
- [ ] commands: []  (команды — отдельный навык)
- [ ] listFormUid: null, itemFormUid: null  (формы — отдельные навыки)
- [ ] orderByExpression: "", displayExpression: ""  (умолчания вида)
- [ ] $schema указывает на ../../system/schemas/metaObjectStorableSettings.schema.json
- [ ] В system/dataTypes.json добавлена ровно одна запись: uid = operation.uid, kind = "operation", dbType = 11, objectKindUid = 14a60875-…, title = "Операция.<title>"
- [ ] Существующие записи в system/dataTypes.json не изменены и не удалены
- [ ] Никаких *.form.*, *.print_form.*, *.command.*.bjs файлов не создано
```

---

## Out of Scope

- **Кастомные список / форма редактирования** — отдельные навыки `create-list-form` / `create-edit-form`. По умолчанию `listFormUid` / `itemFormUid` = `null` (используется автоформа платформы); навыки запускаются только если пользователь явно попросил конкретную форму.
- **Печатные формы (`*.print_form.*`)** — отдельный навык / правило `print-forms`. Подкреплённый `.xlsx` шаблон не создаётся в рамках этого навыка.
- **Команды и кнопки (`commands` + `*.command.*.bjs`)** — отдельное правило `commands`; по умолчанию `commands: []`.
- **Создание регистров-назначений (`records`)** — отдельный навык `create-records`. Если пользователь попросил проведение в регистр, которого ещё нет — сначала создай регистр, потом возвращайся в этот навык.
- **Workflows / процессы** — отдельное правило `workflows`.
- **Переименование существующей операции** — кириллические имена папок и файлов в `operation/` уже зашиты в систему и не должны переименовываться.
- **Изменение существующих записей в `system/dataTypes.json`** — только дописывание.
