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
| `storeData`          | true  | Settings validate against `metaObjectStorableSettings.schema.json`. |
| `isReference`        | true  | **Must** be registered in `system/dataTypes.json`.   |
| `useDetailsTables`   | false | `detailTables` is always `[]`.                       |
| `useForms`           | false | No custom forms — `listFormUid`/`itemFormUid` are `null`. Do **not** create `*.form.*.json` / `*.form.*.vue` files. |
| `usePrintForms`      | false | No `*.print_form.*` files.                           |
| `canCreateRecords`   | false | `recordsSources`/`recordsSettings` are always `[]`.  |
| `allowAttachedFiles` | false | No file attachments.                                 |

Kind UID is `5449a8ad-9359-41b2-8ff2-3f415eb4da76` and `dbType` for the `dataTypes.json` entry is `16` (every enum in this repo uses these two values — see existing entries in `system/dataTypes.json`).

---

## Prerequisites — Ask the User

Before generating anything:

1. **`name`** (technical identifier) — required. English `snake_case`, ≤ 30 chars (e.g. `severity`, `task_status`, `day_kind`). Do **not** guess; ask explicitly if not provided. If the repository already contains enum folders with Cyrillic names, treat them as legacy and leave them as-is — **new** enums must follow the English `snake_case` rule from `general-conventions`.
2. **`title`** (human-readable) — required. Any language, typically Russian (e.g. `Тип дня`, `Статус задачи`).
3. **Extra header columns** — optional. Enums often have **none** beyond the four standard columns. Ask once: «Нужны ли дополнительные поля помимо стандартных (name / is_deleted / code / title)?». If yes, collect for each: `name` (English snake_case), `title`, data type (look up in `system/dataTypes.json`), `required`, `unique`, `stringLength` / `numberDigits` (when relevant).
4. **`memo`** (description) — optional, default empty string. Set on the metaobject and on each new custom column.

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

Generate a fresh UUID v4 (lowercase, hyphenated) for **every** `uid`: the metaobject, the `header`, each column, each index. All UIDs must be unique across the file.

Standard-column properties (`name`, `title`, `dataSettings`, `renderSettings`) are copied verbatim from `system/kinds/kind.enum.json`. Only the column's own `uid` is freshly generated; `standardColumnUid` is the original `uid` from the kind.

```json
{
  "$schema": "../../system/schemas/metaObjectStorableSettings.schema.json",
  "uid": "<new-uuid-v4>",
  "metaObjectKindUid": "5449a8ad-9359-41b2-8ff2-3f415eb4da76",
  "title": "<title>",
  "name": "<name>",
  "memo": "<short Russian description, may be empty>",
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
    "columns": [ /* 4 standard columns + optional custom columns, see below */ ],
    "indexes": [ /* 2 standard indexes + optional indexes for custom columns */ ]
  },
  "detailTables": [],
  "commands": [],
  "recordsSources": [],
  "recordsSettings": []
}
```

### Standard columns (always 4, in this order)

Every column has these top-level fields: `uid` (fresh), `kind: 0`, `standardColumnUid` (from kind), `title`, `name`, `formula: ""`, `itemsSource: ""`, `autoClearMethod: 0`, `isStandard: true`, `dataSettings`, `renderSettings`, `dependencies: []`.

| `name`       | `standardColumnUid`                    | `dataSettings`                                                                                         | `renderSettings`                                                            |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `name`       | `3cceebad-7d5a-4943-a102-6267e22227a8` | String (`0234c067-…`), `stringLength: 20`, `numberDigits: 2`, **`primaryKey: true`**                   | `showInItem: true`, `showInList: true`                                      |
| `is_deleted` | `1e0063d0-288d-494a-8761-1185300d571d` | Bool (`4bff64cf-…`), `stringLength: 100`, `numberDigits: 2`                                            | `showInItem: false`, `showInList: false` (copy from kind — do not change)   |
| `code`       | `e647fb57-470e-4547-9a94-2be0f3d0985e` | String (`0234c067-…`), `stringLength: 3`, `numberDigits: 2`, **`required: true`**, **`unique: true`**  | `showInItem: true`, `showInList: true`                                      |
| `title`      | `91a26ae4-5723-4109-8322-7e4e59129239` | String (`0234c067-…`), `stringLength: 100`, `numberDigits: 2`, **`required: true`**                    | `showInItem: true`, `showInList: true`                                      |

All other `dataSettings` fields default: `primaryKey: false`, `required: false`, `unique: false`, `defaultValue: null`. All other `renderSettings` fields default: `controlKindUid: ""`, `listColumnWidth: ""`.

### Standard indexes (always 2)

One index per `hasIndex = true` standard column (in this order):

```json
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid of is_deleted column>", "direction": 0 } ]
},
{
  "uid": "<new-uuid-v4>",
  "columns": [ { "columnUid": "<uid of code column>",       "direction": 0 } ]
}
```

### Optional Custom columns

Append after the four standard columns. Each entry:

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
    "dataTypeUid": "<from system/dataTypes.json>",
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

Pick `dataTypeUid` from `system/dataTypes.json` by `title` / `typeName`. Never invent one. Fill `memo` on every custom column. Defaults to `kind = 0` (stored); set `kind = 1` only if the user explicitly says «виртуальная».

If a custom column needs a DB index (the user asked for it, or it is a frequent search/filter field), append a matching entry to `indexes` with the same shape as the standard indexes.

---

## Register the Type

Because `enum` has `isReference = true`, the new type **must** be appended to `system/dataTypes.json` so it can be referenced as a `dataTypeUid` from other settings files in the same editing session. The server overwrites this entry on the next sync — do **not** modify or delete existing entries, only append.

Append exactly one object to the top-level array:

```json
{
  "uid": "<enum.uid>",
  "kind": "enum",
  "name": "<enum.name>",
  "title": "Перечисление.<enum.title>",
  "isPrimitive": false,
  "dbType": 16,
  "objectKindUid": "5449a8ad-9359-41b2-8ff2-3f415eb4da76",
  "typeName": null
}
```

`uid` is the **same** UID as the metaobject's `uid` — do **not** generate a separate one.

---

## Reference Examples

Two ready-to-copy templates live next to this skill. Read them only when actually building the file — they are not preloaded with `SKILL.md`.

- [examples/minimal.json](examples/minimal.json) — minimal enum: four standard columns + two standard indexes, no overrides. **Start here** for the typical case.
- [examples/with_extras.json](examples/with_extras.json) — same skeleton plus two custom columns (`color` as plain string, `sort_order` as integer with its own index) and `orderByExpression` / `displayExpression` overrides on the metaobject. Use as a template when the user explicitly asks for extra fields, ordering or display formatting.

How to use:

1. Read the relevant example file.
2. Copy its structure into `enum/{name}/enum.{name}.json`.
3. Replace every `uid` with a fresh UUID v4 (every UID in the examples is illustrative).
4. Replace `title` / `name` / `memo` with the values gathered from the user.
5. Replace `$schema` with `"../../system/schemas/metaObjectStorableSettings.schema.json"` (the example files use a deeper relative path because they live under `.cursor/skills/create-enum/examples/`).
6. For custom columns: pick `dataTypeUid` from `system/dataTypes.json` by `title` / `typeName`; never reuse the illustrative UIDs.

---

## Building Checklist

Copy and track:

```
- [ ] name (English snake_case, ≤ 30 chars) и title подтверждены
- [ ] Папка enum/{name}/ ещё не существует
- [ ] В system/dataTypes.json нет записи kind="enum" + name=<name>
- [ ] Принято решение по дополнительным колонкам (по умолчанию — нет)
- [ ] Сгенерирован uid метаобъекта (UUID v4)
- [ ] Сгенерирован uid header (UUID v4)
- [ ] 4 стандартные колонки добавлены в порядке: name, is_deleted, code, title
- [ ] Каждая стандартная колонка: свежий uid + standardColumnUid из kind + isStandard=true + копия dataSettings/renderSettings
- [ ] 2 стандартных индекса добавлены: на is_deleted и на code
- [ ] Кастомные колонки (если есть) — isStandard=false, standardColumnUid=null, dataTypeUid из system/dataTypes.json, memo заполнен
- [ ] detailTables: [], commands: [], recordsSources: [], recordsSettings: []
- [ ] listFormUid: null, itemFormUid: null
- [ ] $schema указывает на ../../system/schemas/metaObjectStorableSettings.schema.json
- [ ] В system/dataTypes.json добавлена ровно одна запись: uid = enum.uid, kind = "enum", dbType = 16, objectKindUid = 5449a8ad-…, title = "Перечисление.<title>"
- [ ] Существующие записи в system/dataTypes.json не изменены и не удалены
- [ ] Никаких *.form.*, *.print_form.*, *.bjs, *.vue файлов не создано
```

---

## Out of Scope

- **Custom list / edit forms** — `kind.enum.useForms = false`. Enums use the auto-generated form.
- **Detail tables, commands, records sources, print forms, attached files** — all disabled by the kind.
- **Renaming an existing enum** — Cyrillic folder/file names already present in `enum/` are referenced by the system and must not be renamed.
- **Modifying existing entries in `system/dataTypes.json`** — append only.
