---
name: create-enum
description: >-
  Create a new BaSYS перечисление (enum metaobject) — generates the
  enum/{name}/enum.{name}.json settings file with the four standard columns
  (name / is_deleted / code / title), the default indexes on is_deleted and
  code, and registers the new type in system/dataTypes.json so it can be
  referenced from other settings in the same editing session. Use when the
  user asks to create / build / generate / add an enum, перечисление,
  enum-метаобъект, новое перечисление, or a "вырожденный справочник с
  текстовым ключом". Supports adding optional extra header columns
  (e.g. color, sort order, FK to another reference) when the user explicitly
  asks for them. Does NOT create detail tables, forms, records sources or
  print forms — the enum kind disables all of those.
---

# Create Enum (Перечисление)

Enums in BaSYS are **degenerate catalogs with a text primary key**. The kind definition lives in [system/kinds/kind.enum.json](../../../system/kinds/kind.enum.json) and pins the following invariants:

| Flag                 | Value | Consequence for the new file                         |
| -------------------- | ----- | ---------------------------------------------------- |
| `StoreData`          | true  | Settings validate against `metaObjectStorableSettings.schema.json`. |
| `IsReference`        | true  | **Must** be registered in `system/dataTypes.json`.   |
| `UseDetailsTables`   | false | `DetailTables` is always `[]`.                       |
| `UseForms`           | false | No custom forms — `ListFormUid`/`ItemFormUid` are `null`. Do **not** create `*.form.*.json` / `*.form.*.vue` files. |
| `UsePrintForms`      | false | No `*.print_form.*` files.                           |
| `CanCreateRecords`   | false | `RecordsSources`/`RecordsSettings` are always `[]`.  |
| `AllowAttachedFiles` | false | No file attachments.                                 |

Kind UID is `5449a8ad-9359-41b2-8ff2-3f415eb4da76` and `dbType` for the `dataTypes.json` entry is `16` (every enum in this repo uses these two values — see existing entries in `system/dataTypes.json`).

---

## Prerequisites — Ask the User

Before generating anything:

1. **`Name`** (technical identifier) — required. English `snake_case`, ≤ 30 chars (e.g. `severity`, `task_status`, `day_kind`). Do **not** guess; ask explicitly if not provided. If the repository already contains enum folders with Cyrillic names, treat them as legacy and leave them as-is — **new** enums must follow the English `snake_case` rule from `general-conventions`.
2. **`Title`** (human-readable) — required. Any language, typically Russian (e.g. `Тип дня`, `Статус задачи`).
3. **Extra header columns** — optional. Enums often have **none** beyond the four standard columns. Ask once: «Нужны ли дополнительные поля помимо стандартных (name / is_deleted / code / title)?». If yes, collect for each: `Name` (English snake_case), `Title`, data type (look up in `system/dataTypes.json`), `Required`, `Unique`, `StringLength` / `NumberDigits` (when relevant).
4. **`Memo`** (description) — optional, default empty string. Set on the metaobject and on each new custom column.

Do **not** ask about list/edit forms, detail tables, commands, records or print forms — the `enum` kind disables all of them.

---

## Pre-flight Checks

1. **Folder uniqueness.** Verify that `enum/{name}/` does **not** already exist. If it does, stop and report.
2. **dataTypes.json entry uniqueness.** Verify there is no existing entry in `system/dataTypes.json` with `kind = "enum"` and the same `name`. If there is, stop and report.
3. **`name` constraints.** English lowercase `snake_case`, ≤ 30 chars, must not start with a digit.

---

## Files to Produce

Exactly **two** writes:

1. **Create** `enum/{name}/enum.{name}.json` — the settings file (see «Skeleton» below).
2. **Append** one entry to the `system/dataTypes.json` array — see «Register the Type» below.

No `.bjs`, no `.vue`, no `*.form.*`, no `*.print_form.*` files.

---

## Skeleton

Generate a fresh UUID v4 (lowercase, hyphenated) for **every** `Uid`: the metaobject, the `Header`, each column, each index. All UIDs must be unique across the file.

Standard-column properties (`Name`, `Title`, `DataSettings`, `RenderSettings`) are copied verbatim from `system/kinds/kind.enum.json`. Only the column's own `Uid` is freshly generated; `StandardColumnUid` is the original `Uid` from the kind.

```json
{
  "$schema": "../../system/schemas/metaObjectStorableSettings.schema.json",
  "Uid": "<new-uuid-v4>",
  "MetaObjectKindUid": "5449a8ad-9359-41b2-8ff2-3f415eb4da76",
  "Title": "<Title>",
  "Name": "<name>",
  "Memo": "<short Russian description, may be empty>",
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
    "Columns": [ /* 4 standard columns + optional custom columns, see below */ ],
    "Indexes": [ /* 2 standard indexes + optional indexes for custom columns */ ]
  },
  "DetailTables": [],
  "Commands": [],
  "RecordsSources": [],
  "RecordsSettings": []
}
```

### Standard Columns (always 4, in this order)

Every column has these top-level fields: `Uid` (fresh), `Kind: 0`, `StandardColumnUid` (from kind), `Title`, `Name`, `Formula: ""`, `ItemsSource: ""`, `AutoClearMethod: 0`, `IsStandard: true`, `DataSettings`, `RenderSettings`, `Dependencies: []`.

| `Name`       | `StandardColumnUid`                    | `DataSettings`                                                                                         | `RenderSettings`                                                            |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `name`       | `3cceebad-7d5a-4943-a102-6267e22227a8` | String (`0234c067-…`), `StringLength: 20`, `NumberDigits: 2`, **`PrimaryKey: true`**                   | `ShowInItem: true`, `ShowInList: true`                                      |
| `is_deleted` | `1e0063d0-288d-494a-8761-1185300d571d` | Bool (`4bff64cf-…`), `StringLength: 100`, `NumberDigits: 2`                                            | `ShowInItem: false`, `ShowInList: false` (copy from kind — do not change)   |
| `code`       | `e647fb57-470e-4547-9a94-2be0f3d0985e` | String (`0234c067-…`), `StringLength: 3`, `NumberDigits: 2`, **`Required: true`**, **`Unique: true`**  | `ShowInItem: true`, `ShowInList: true`                                      |
| `title`      | `91a26ae4-5723-4109-8322-7e4e59129239` | String (`0234c067-…`), `StringLength: 100`, `NumberDigits: 2`, **`Required: true`**                    | `ShowInItem: true`, `ShowInList: true`                                      |

All other `DataSettings` fields default: `PrimaryKey: false`, `Required: false`, `Unique: false`, `DefaultValue: null`. All other `RenderSettings` fields default: `ControlKindUid: ""`, `ListColumnWidth: ""`.

### Standard Indexes (always 2)

One index per `HasIndex = true` standard column (in this order):

```json
{
  "Uid": "<new-uuid-v4>",
  "Columns": [ { "ColumnUid": "<Uid of is_deleted column>", "Direction": 0 } ]
},
{
  "Uid": "<new-uuid-v4>",
  "Columns": [ { "ColumnUid": "<Uid of code column>",       "Direction": 0 } ]
}
```

### Optional Custom Columns

Append after the four standard columns. Each entry:

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
    "DataTypeUid": "<from system/dataTypes.json>",
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

Pick `DataTypeUid` from `system/dataTypes.json` by `Title` / `TypeName`. Never invent one. Fill `Memo` on every custom column. Defaults to `Kind = 0` (stored); set `Kind = 1` only if the user explicitly says «виртуальная».

If a custom column needs a DB index (the user asked for it, or it is a frequent search/filter field), append a matching entry to `Indexes` with the same shape as the standard indexes.

---

## Register the Type

Because `enum` has `IsReference = true`, the new type **must** be appended to `system/dataTypes.json` so it can be referenced as a `DataTypeUid` from other settings files in the same editing session. The server overwrites this entry on the next sync — do **not** modify or delete existing entries, only append.

Append exactly one object to the top-level array:

```json
{
  "uid": "<enum.Uid>",
  "kind": "enum",
  "name": "<enum.Name>",
  "title": "Перечисление.<enum.Title>",
  "isPrimitive": false,
  "dbType": 16,
  "objectKindUid": "5449a8ad-9359-41b2-8ff2-3f415eb4da76",
  "typeName": null
}
```

`uid` is the **same** UID as the metaobject's `Uid` — do **not** generate a separate one.

---

## Reference Examples

Two ready-to-copy templates live next to this skill. Read them only when actually building the file — they are not preloaded with `SKILL.md`.

- [examples/minimal.json](examples/minimal.json) — minimal enum: four standard columns + two standard indexes, no overrides. **Start here** for the typical case.
- [examples/with_extras.json](examples/with_extras.json) — same skeleton plus two custom columns (`color` as plain string, `sort_order` as integer with its own index) and `OrderByExpression` / `DisplayExpression` overrides on the metaobject. Use as a template when the user explicitly asks for extra fields, ordering or display formatting.

How to use:

1. Read the relevant example file.
2. Copy its structure into `enum/{name}/enum.{name}.json`.
3. Replace every `Uid` with a fresh UUID v4 (every UID in the examples is illustrative).
4. Replace `Title` / `Name` / `Memo` with the values gathered from the user.
5. Replace `$schema` with `"../../system/schemas/metaObjectStorableSettings.schema.json"` (the example files use a deeper relative path because they live under `.cursor/skills/create-enum/examples/`).
6. For custom columns: pick `DataTypeUid` from `system/dataTypes.json` by `Title` / `TypeName`; never reuse the illustrative UIDs.

---

## Building Checklist

Copy and track:

```
- [ ] Name (English snake_case, ≤ 30 chars) и Title подтверждены
- [ ] Папка enum/{name}/ ещё не существует
- [ ] В system/dataTypes.json нет записи kind="enum" + name=<name>
- [ ] Принято решение по дополнительным колонкам (по умолчанию — нет)
- [ ] Сгенерирован Uid метаобъекта (UUID v4)
- [ ] Сгенерирован Uid Header (UUID v4)
- [ ] 4 стандартные колонки добавлены в порядке: name, is_deleted, code, title
- [ ] Каждая стандартная колонка: свежий Uid + StandardColumnUid из kind + IsStandard=true + копия DataSettings/RenderSettings
- [ ] 2 стандартных индекса добавлены: на is_deleted и на code
- [ ] Кастомные колонки (если есть) — IsStandard=false, StandardColumnUid=null, DataTypeUid из system/dataTypes.json, Memo заполнен
- [ ] DetailTables: [], Commands: [], RecordsSources: [], RecordsSettings: []
- [ ] ListFormUid: null, ItemFormUid: null
- [ ] $schema указывает на ../../system/schemas/metaObjectStorableSettings.schema.json
- [ ] В system/dataTypes.json добавлена ровно одна запись: uid = enum.Uid, kind = "enum", dbType = 16, objectKindUid = 5449a8ad-…, title = "Перечисление.<Title>"
- [ ] Существующие записи в system/dataTypes.json не изменены и не удалены
- [ ] Никаких *.form.*, *.print_form.*, *.bjs, *.vue файлов не создано
```

---

## Out of Scope

- **Custom list / edit forms** — `kind.enum.UseForms = false`. Enums use the auto-generated form.
- **Detail tables, commands, records sources, print forms, attached files** — all disabled by the kind.
- **Renaming an existing enum** — Cyrillic folder/file names already present in `enum/` are referenced by the system and must not be renamed.
- **Modifying existing entries in `system/dataTypes.json`** — append only.
