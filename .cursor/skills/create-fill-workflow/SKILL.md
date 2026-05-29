---
name: create-fill-workflow
description: >-
  Create a BaSYS workflow (процесс) that performs an initial / bulk fill of a
  storable metaobject — enum (перечисление), catalog (справочник) or register
  (регистр с независимой записью) — from a list of values supplied by the user.
  The workflow has two steps: a java_script step that builds a DataTable with
  the rows in code, and a data_object_loader step that creates the objects in
  Create mode (SaveRegime = 1) so re-running the process does not duplicate
  existing rows. Use when the user asks to create a workflow / процесс that
  fills / заполняет / наполняет / прогружает / создаёт начальные значения
  перечисления, справочника или регистра, для первоначального заполнения /
  initial fill / seed / bulk insert / load list of values into an enum /
  catalog / register. The user MUST explicitly name the target metaobject and
  provide the data — the skill does not invent values. Does NOT cover
  operations (документы), records (регистры записей — write through operations'
  RecordsSettings), Excel import (see excel-import-to-detail), HTTP imports
  or per-row processing inside an iterator.
---

# Create Fill Workflow (Процесс первоначального заполнения)

A **fill workflow** is a [workflow](../../rules/workflows.mdc) that seeds a storable metaobject with a fixed, code-defined list of values. It is the standard pattern for filling reference data once (после создания / разворачивания базы) and being able to re-run safely as a no-op when nothing is missing.

The workflow has **exactly two steps**:

| # | `KindName` | `Name` | Purpose |
|---|------------|--------|---------|
| 1 | `java_script` | `data` | Build a `DataTable` with the rows in code (companion `.bjs` file). |
| 2 | `data_object_loader` | `load` | Save the rows. `SaveRegime = 1` (Create) + `SearchBy` ensures no duplicates on re-run. |

Use this skill **only** when the user wants to fill a metaobject with a fixed set of values defined in JS code. For Excel-driven import use [excel-import-to-detail](../excel-import-to-detail/SKILL.md). For per-row processing use an `iterator` step (see [workflows rule](../../rules/workflows.mdc)).

---

## Supported Target Kinds

The data_object_loader step works for storable kinds (`StoreData = true`). In this repo that means:

| Kind | `MetaObjectKindUid` | Typical `SearchBy` | Notes |
|------|---------------------|-------------------|-------|
| `enum` (перечисление) | `5449a8ad-9359-41b2-8ff2-3f415eb4da76` | `name` (PK string) | PK is supplied by the user; ideal candidate for fill. |
| `catalog` (справочник) | `032d8377-500f-4631-b435-1f7f69046674` | `title` или иной уникальный бизнес-ключ | PK `id` is auto-generated — never supply it from the script. |
| `register` (регистр) | `f3ecb444-8e72-4387-83f1-66c712de1c32` | уникальный бизнес-ключ из шапки | PK `id` is auto-generated — never supply it from the script. |

Other kinds are **out of scope** for this skill:
- `operation` (документ) — fills happen by creating operations, not by loader.
- `records` (регистр записей) — written by operations via `RecordsSettings`, never directly.
- `workflow`, `menu`, `data_view`, `excel_report` — not storable.

---

## Prerequisites — Ask the User

Before generating anything, clarify the following. **Do not guess** — if any item is missing from the prompt, ask before creating files.

1. **Target metaobject** — required. Both `Kind` and `Name` (e.g. «перечисление `contract_kind`», «справочник `city`», «регистр `tax_rate`»). Without this the skill cannot fill `MetaObjectKindUid` / `MetaObjectUid`.
2. **Data** — required. The user must list the rows verbatim (typically as `code` + `title` for enums, or as a small table for catalogs/registers). Map each row to the columns of the target object.
3. **`SearchBy` field** — the destination column used to detect already-existing rows in Create mode. Pick a stored, unique column:
    - For `enum` — the PK `name` is the standard choice.
    - For `catalog` / `register` — pick a column that is either marked `Unique` in the target's settings or is the natural business key (e.g. `code`, `inn`, `title`). If unclear, ask the user.
4. **Workflow `Name`** — optional. Default to `fill_{object_name}` (English snake_case, ≤30 chars). For the enum example: `fill_contract_kind`.
5. **English names for new rows** — if the user provided only Russian titles (typical for enums), generate snake_case English `name` values yourself and confirm them implicitly by listing them in the final answer.

---

## Title Numbering Convention (`01.NNN`)

Every fill workflow created by this skill must have a **numeric prefix** in its top-level `Title` so the workflows visually group and sort in the BaSYS list. Format:

```
01.NNN <Заголовок>
```

- **`01`** — fixed group code for **fill** workflows (первоначальное заполнение). All workflows produced by this skill share this prefix; do not invent another group code here.
- **`NNN`** — three-digit zero-padded sequential index, **unique** across all fill workflows in the repo (`001`, `002`, …, `099`, `100`, …).
- One space between the code and the human-readable title.
- The prefix lives **only** in the workflow's top-level `Title`. Do **not** prepend it to step `Title`s, to `Name`, to `Memo`, or to filenames.
- Only **new** workflows get a freshly assigned `NNN`. Existing workflows keep their already-assigned code — never renumber them.

### How to pick the next `NNN`

Before writing the JSON file:

1. List all `workflow/*/workflow.*.json` files in the repo.
2. Read the top-level `Title` of each.
3. Extract every `NNN` from titles matching `^01\.(\d{3})\b`.
4. Take `max(NNN) + 1`, format with three digits (`String(n).padStart(3, '0')`).
5. If no fill workflow exists yet, start at `001`.

Examples (current state of the repo):

| Existing workflow | Title |
|---|---|
| `workflow/fill_contract_kind/` | `01.001 Заполнение видов договоров` |
| `workflow/fill_contract_status/` | `01.002 Заполнение статусов договоров` |

The next fill workflow created by this skill therefore gets `01.003 …` in its `Title`.

> If a non-fill workflow happens to use a different group code (e.g. `02.NNN` for imports), ignore those rows when computing the next `01.NNN`.

---

## Pre-flight Lookups

Before writing files, read the target metaobject's settings file `{kind}/{name}/{kind}.{name}.json` and extract:

1. **`Uid`** of the metaobject → goes into `MetaObjectUid` of the loader step.
2. **`MetaObjectKindUid`** → goes into `MetaObjectKindUid` of the loader step (confirms the kind from the table above).
3. **List of stored columns** in `Header.Columns` → defines the destination fields you can map to.
4. **`DataTypeUid`** of each column you plan to map → goes into `HeaderMapping[i].DataTypeUid`. Take the value directly from the target column's `DataSettings.DataTypeUid`.
5. Verify the `SearchBy` column actually exists in `Header.Columns` (by `Name`).

Do **not** map auto-generated PK columns (`id` on catalogs / registers) — leave them to be generated by the server.

Do **not** map the soft-delete flag (`is_deleted` on enums / catalogs) — its default `false` is what you want.

---

## Files to Produce

Exactly **two writes** under `workflow/{workflow_name}/`:

1. `workflow.{workflow_name}.json` — settings file (skeleton below).
2. `workflow.{workflow_name}.step.data.bjs` — script body for the `data` step.

Workflow has `IsReference = false` — **do not** touch `system/dataTypes.json`.

---

## Workflow JSON Skeleton

Generate a fresh UUID v4 (lowercase, hyphenated) for **every** `Uid` — workflow, every step, every `HeaderMapping` row.

```json
{
  "$schema": "../../system/schemas/workflowSettings.schema.json",
  "Uid": "<new-uuid-v4>",
  "Name": "<workflow_name>",
  "Title": "01.NNN <Заполнение … на русском>",
  "Memo": "<Короткое описание процесса>",
  "IsActive": true,
  "Version": 1,
  "Steps": [
    {
      "Uid": "<step1-uuid>",
      "PreviousStepUid": "",
      "KindUid": "dff616ce-0f40-4e44-a82b-14aa5ee2e4d6",
      "KindName": "java_script",
      "Title": "Данные",
      "Name": "data",
      "Memo": "Подготовка DataTable со значениями для загрузки.",
      "IsActive": true,
      "Expression": "workflow.<workflow_name>.step.data.bjs"
    },
    {
      "Uid": "<step2-uuid>",
      "PreviousStepUid": "<step1-uuid>",
      "KindUid": "a7edd0be-6f12-4fac-b88a-4f83acc7dacb",
      "KindName": "data_object_loader",
      "Title": "Загрузка данных",
      "Name": "load",
      "Memo": "Создание объектов. Режим Create — повторный запуск не задублирует существующие записи.",
      "IsActive": true,
      "MetaObjectKindUid": "<from target object>",
      "MetaObjectUid": "<from target object>",
      "SaveRegime": 1,
      "SearchBy": "<unique destination column Name>",
      "SourcePath": "data",
      "Condition": "",
      "CreateRecords": false,
      "HeaderMapping": [
        {
          "Uid": "<mapping-row-uuid>",
          "SourceFieldName": "<column name in DataTable>",
          "DestinationFieldName": "<same column name in target Header>",
          "DefaultValue": "",
          "SearchBy": "",
          "DataTypeUid": "<DataTypeUid of the destination column>",
          "CreateIfNotExist": false
        }
      ],
      "TableMapping": []
    }
  ]
}
```

Key fixed values:
- `Title` carries the numeric prefix `01.NNN ` — see the [title numbering convention](#title-numbering-convention-01nnn) above. The remaining body of the title is the Russian description (e.g. `01.003 Заполнение городов`).
- `SaveRegime: 1` — Create only. Existing rows (matched by `SearchBy`) are skipped, so re-running the workflow is safe.
- `SourcePath: "data"` — points at the `data` step's result.
- `CreateRecords: false` — fill workflows never trigger проведение по регистрам.

---

## `data` Step Script

File: `workflow.{workflow_name}.step.data.bjs`

Build the table with `createTable(...)` from BaSYS.FX and append rows with `.addRow({...})`. Column names must match `HeaderMapping[i].SourceFieldName` exactly.

```javascript
// Формирование набора значений для загрузки в <kind>.<name>.
const data = createTable([
    { name: '<col1>', dataType: '<string|number|boolean|date>' },
    { name: '<col2>', dataType: '<…>' }
])
    .addRow({ <col1>: <value>, <col2>: <value> })
    .addRow({ <col1>: <value>, <col2>: <value> });

return data;
```

`dataType` values: `'string'`, `'number'`, `'boolean'`, `'date'`. Pick whatever matches the destination column type.

The script **must** `return` the table — that value becomes `_data.data` for the loader step.

---

## Reference Example — Filling an Enum

Concrete pair already lives in the repo at [`workflow/fill_contract_kind/`](../../../workflow/fill_contract_kind/) and fills the [`enum/contract_kind`](../../../enum/contract_kind/enum.contract_kind.json) перечисление with six values. Inspect it as a working template — note the `01.001` numeric prefix in its top-level `Title`.

Settings (excerpt):

```json
"Title": "01.001 Заполнение видов договоров",
"MetaObjectKindUid": "5449a8ad-9359-41b2-8ff2-3f415eb4da76",
"MetaObjectUid": "f1a2b3c4-d5e6-4789-9abc-def012345678",
"SaveRegime": 1,
"SearchBy": "name",
"SourcePath": "data",
"HeaderMapping": [
  { "SourceFieldName": "name",  "DestinationFieldName": "name",  "DataTypeUid": "0234c067-7868-46b2-ba8e-e22fae5255cb", ... },
  { "SourceFieldName": "code",  "DestinationFieldName": "code",  "DataTypeUid": "0234c067-7868-46b2-ba8e-e22fae5255cb", ... },
  { "SourceFieldName": "title", "DestinationFieldName": "title", "DataTypeUid": "0234c067-7868-46b2-ba8e-e22fae5255cb", ... }
]
```

Data script:

```javascript
const data = createTable([
    { name: 'name', dataType: 'string' },
    { name: 'code', dataType: 'string' },
    { name: 'title', dataType: 'string' }
])
    .addRow({ name: 'draft',       code: '01', title: 'Черновик' })
    .addRow({ name: 'in_approval', code: '02', title: 'На согласовании' });

return data;
```

---

## Kind-Specific Notes

### Enum (перечисление)

- Standard columns: `name` (PK string), `is_deleted`, `code`, `title`.
- Always map `name`, `code`, `title`. Skip `is_deleted`.
- `SearchBy: "name"` is the standard choice (PK is supplied by the user).
- All three destination columns are strings — `DataTypeUid` is the same `0234c067-7868-46b2-ba8e-e22fae5255cb` for all of them (verify against `system/dataTypes.json`).

### Catalog (справочник)

- Standard columns: `id` (PK auto), `uid`, `is_deleted`, `title`, `is_files`.
- Never map `id` / `uid` — generated by the server.
- Map `title` plus any required custom columns from the catalog's `Header.Columns`.
- `SearchBy` — pick `title` if unique, otherwise the natural business key (e.g. `code`, `inn`). Confirm with the user when ambiguous.
- For columns that are foreign keys to other reference objects (`DataTypeUid` of another catalog/enum), set `SearchBy` **on the mapping row** to the destination column name in the referenced object that the source value matches by (typically `name` for enums, `title` or `code` for catalogs). Set `CreateIfNotExist` cautiously: prefer `false` and ensure the referenced rows already exist.

### Register (регистр с независимой записью)

- Single standard column: `id` (PK auto). All meaningful fields are custom.
- Never map `id` — generated by the server.
- `SearchBy` — pick the unique business key (often a composite is desired, but the loader supports only a single field; choose the most discriminating column or add a dedicated `code` column to the register beforehand).

---

## Building Checklist

Copy and track:

```
- [ ] Тип объекта (enum / catalog / register) и Name подтверждены пользователем
- [ ] Прочитан файл {kind}/{name}/{kind}.{name}.json целевого объекта
- [ ] Из него извлечены: Uid (MetaObjectUid), MetaObjectKindUid, список колонок Header.Columns с их DataTypeUid
- [ ] Все строки данных предоставлены пользователем (значения не выдуманы)
- [ ] Английские Name для новых строк сгенерированы (если применимо) и перечислены в финальном ответе
- [ ] SearchBy — реально существующая колонка целевого объекта; для enum это name
- [ ] Auto-PK колонки (id для catalog/register) НЕ включены в HeaderMapping
- [ ] is_deleted НЕ включён в HeaderMapping (по умолчанию false — нужное поведение)
- [ ] Имя процесса: workflow_name (snake_case, ≤30 chars)
- [ ] Просканированы все workflow/*/workflow.*.json, среди Title с префиксом 01.NNN найден max(NNN); новому процессу присвоен 01.(max+1) с тремя цифрами (или 01.001, если процессов нет)
- [ ] Top-level Title начинается с "01.NNN " — префикс не дублируется в Name/Memo/Title шагов
- [ ] Создана папка workflow/{workflow_name}/
- [ ] Создан workflow.{workflow_name}.json с $schema на ../../system/schemas/workflowSettings.schema.json
- [ ] Создан workflow.{workflow_name}.step.data.bjs с return DataTable
- [ ] Шаги связаны через PreviousStepUid: data → load
- [ ] data step: Expression = "workflow.{workflow_name}.step.data.bjs" (filename совпадает)
- [ ] load step: SaveRegime = 1, SearchBy заполнен, SourcePath = "data", CreateRecords = false
- [ ] В HeaderMapping имена SourceFieldName совпадают с колонками DataTable, DestinationFieldName совпадают с Name колонок целевого объекта
- [ ] DataTypeUid каждой mapping-строки скопирован из DataSettings.DataTypeUid соответствующей колонки целевого объекта
- [ ] Все Uid (workflow + 2 steps + N mapping rows) — свежие UUID v4
- [ ] Memo заполнены на процессе и обоих шагах (на русском)
- [ ] В system/dataTypes.json ничего не изменено (workflow — не reference-kind)
```

---

## Out of Scope

- **Operations / documents (документы)** — нельзя «залить» через data_object_loader как ряд строк-документов с автоматическими записями в регистрах; для bootstrap-операций нужен отдельный сценарий (вне этой skill).
- **Records registers (регистры записей)** — записываются автоматически при проведении операций через `RecordsSettings`. Прямая загрузка через loader не предусмотрена.
- **Excel-driven import** — см. [excel-import-to-detail](../excel-import-to-detail/SKILL.md).
- **Per-row HTTP / SMTP / branching** — нужны iterator / http_connector / if-шаги, см. [workflows rule](../../rules/workflows.mdc).
- **Update mode** — данная skill всегда использует `SaveRegime = 1` (Create). Если требуется массовое обновление существующих записей — нужен другой процесс (`SaveRegime = 0` или `2`) и явное согласие пользователя на перезапись.
