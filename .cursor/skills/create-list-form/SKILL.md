---
name: create-list-form
description: >-
  Create a constructor list form (forma spiska) for a BaSYS metaobject (catalog,
  register, operation, etc.) — generates the {kind}.{name}.form.list_{suffix}.json
  file with the standard title / buttons / divider / table-view skeleton and wires
  it as the metaobject's listFormUid. Use when the user asks to create / build /
  generate a list form, форма списка, форма-список, форма-конструктор списка, or
  to assign / set / replace the list form (listFormUid) of a metaobject.
---

# Create Constructor List Form

Mirrors the algorithm of `BaSys.Constructor.FormBuilders.ListFormBuilder` (server-side form builder) — produces a constructor form (`formKind = 1`) and assigns it as the target metaobject's `listFormUid`.

For the full constructor-form grammar (component registry, bindings, property syntax, etc.) the skill defers to the [constructor-forms](../../rules/constructor-forms.mdc) rule. This skill only encodes the list-form skeleton and the per-data-type column dispatch.

## Prerequisites — Ask the User

Before generating anything:

1. **Target metaobject** — required. If not stated in the request, ask explicitly via `AskQuestion`:
   > "Для какого объекта создаём форму списка?"
   List storable metaobjects discovered under `{kindName}/{objectName}/{kindName}.{objectName}.json` as options (typically under `catalog/`, `register/`, `operation/`). Never guess.
2. **Column subset** — optional. If the user did not specify which columns to put into the table view, default to **all** entries of `header.columns` (every stored and virtual column). Note the default in chat so the user can ask to narrow it.

---

## Pre-flight Checks

1. **Kind supports forms.** Read `system/kinds/kind.{kindName}.json`:
   - `useForms` must be `true`. If `false` — stop and tell the user the kind does not support forms.
   - Capture `title` (used in the form title) and `canCreateRecords` (controls the «Записи» button and «Создать/Удалить записи» split-button items).
2. **Metaobject is storable.** Read `{kind}/{object}/{kind}.{object}.json`:
   - Capture `uid`, `title`, `name`, `header.uid`, `header.columns`.
   - The metaobject's `$schema` should point to `metaObjectStorableSettings.schema.json`. If it does not, the kind has no `header` and a list form does not apply — stop and tell the user.
3. **Do not regenerate** if a list form already exists. If `listFormUid` on the metaobject is non-empty, confirm with the user whether to replace it or skip.

---

## Build the Form

### Filename and top-level fields

- File path: `{kind}/{object}/{kind}.{object}.form.list_{suffix6}.json`.
- `suffix6` — six characters from `0-9a-zA-Z`, randomly generated (matches the platform's `IdentifiersGenerator`). Verify the filename does not already exist in the folder.
- Top-level JSON:

```json
{
  "$schema": "../../system/schemas/constructorFormSettings.schema.json",
  "root": { /* see skeleton below */ },
  "onInitializedScript": "",
  "uid": "<new-uuid-v4>",
  "metaObjectUid": "<metaobject.uid>",
  "formKind": 1,
  "title": "Форма списка",
  "name": "list_<suffix6>",
  "memo": "Форма списка <object.title>",
  "version": 1,
  "childComponents": [],
  "display": "Форма списка"
}
```

### Element id format

Every `FormElement.id` is `{componentName}-{6chars}`. The 6-character tail is a fresh random string from `0-9a-zA-Z`, unique within the form. Generate one per element, including children.

### root skeleton

Always four rows under the single `bs-form`:

```
bs-form
├── bs-row[grid] / bs-col[col] / bs-view-title                       ← 1. title row
├── bs-row[grid] / bs-col[col] / pv-button-group + buttons           ← 2. Buttons row
├── bs-row[grid] / bs-col[col] / pv-divider                          ← 3. Divider
└── bs-row[grid] / bs-col[col] / bs-table-view + columns             ← 4. Table view row
```

Every wrapper (`bs-form`, `bs-row`, `bs-col`) has `dataUid = null`, `style = ""`, `properties = []`. `bs-form` has `cssClass = ""`, every `bs-row` — `cssClass = "grid"`, every `bs-col` — `cssClass = "col"`.

### 1. title row

```json
{
  "id": "bs-view-title-<6>",
  "dataUid": null,
  "componentName": "bs-view-title",
  "cssClass": "",
  "style": "",
  "properties": [
    { "name": "title",       "value": "<kind.title>.<object.title>" },
    { "name": ":isWaiting",  "value": "isWaiting" },
    { "name": ":isModified", "value": "isModified" }
  ],
  "items": []
}
```

### 2. Buttons row

order of children inside the single `bs-col`:

1. **`pv-button-group`** (no own props, no cssClass) with three `pv-button` children:

   | Label | Icon | `@Click` | Severity |
   |---|---|---|---|
   | Добавить | `pi pi-plus` | `standard.add` | `primary` |
   | Редактировать | `pi pi-pencil` | `standard.edit` | `primary` |
   | Удалить | `pi pi-times` | `standard.delete:list` | `danger` |

   Every `pv-button` has properties in this exact order: `label`, `icon`, `@Click`, `severity`, `size = "small"`, `outlined = "outlined"`.

2. **`pv-button` (Копировать)** — `cssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-copy"`, `@Click = "standard.copy"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

3. **`pv-button` (Записи)** — **only if `kind.canCreateRecords = true`.** `cssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-list"`, `@Click = "standard.open_records"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

4. **`pv-split-button` «Действия»** — `cssClass = "ml-1"`, properties: `label = "Действия"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`. Children are `pv-split-button-item` entries in this order:

   - **Only if `kind.canCreateRecords = true`:**
     - `label = "Создать записи"`, `icon = "pi pi-check"`, `command = "standard.create_records"`.
     - `label = "Удалить записи"`, `icon = "pi pi-times"`, `command = "standard.delete_records"`.
   - **Always:**
     - `label = "Обновить"`, `icon = "pi pi-refresh"`, `command = "standard.refresh:list"`.
     - `label = "Очистить фильтры"`, `icon = "pi pi-filter-slash"`, `command = "standard.clear_filters:list"`.
     - `label = "Excel"`, `icon = "pi pi-file-excel"`, `command = "standard.export_excel:list"`.

   Split-button items use **`command`**, not `@Click`. Every `pv-split-button-item` has properties in this order: `label`, `icon`, `command`. No cssClass, no style.

### 3. Divider row

Single `pv-divider` inside the `bs-col`:

```json
{
  "id": "pv-divider-<6>",
  "dataUid": null,
  "componentName": "pv-divider",
  "cssClass": "",
  "style": "margin: 5px",
  "properties": [],
  "items": []
}
```

### 4. Table view row

`bs-table-view` with `dataUid = {object.header.uid}` and these properties in this exact order:

```json
{
  "id": "bs-table-view-<6>",
  "dataUid": "<object.header.uid>",
  "componentName": "bs-table-view",
  "cssClass": "",
  "style": "",
  "properties": [
    { "name": "dataSource",   "value": "<kind.name>.<object.name>" },
    { "name": "@RowSelect",   "value": "standard.row_select" },
    { "name": "@RowDblClick", "value": "standard.row_dbl_click" },
    { "name": "name",         "value": "list" },
    { "name": "height",       "value": "stretch" }
  ],
  "items": [ /* bs-table-view-column entries */ ]
}
```

Then one `bs-table-view-column` per selected column. See dispatch below.

---

## Column Dispatch by Data Type

For each `column` from `object.header.columns` selected by the user (or all of them by default):

1. Create a base column element:
   ```json
   {
     "id": "bs-table-view-column-<6>",
     "dataUid": "<column.uid>",
     "componentName": "bs-table-view-column",
     "cssClass": "",
     "style": "",
     "properties": [
       { "name": "title", "value": "<column.title>" }
     ],
     "items": []
   }
   ```
2. If `column.isStandard = true` — append `{ "name": "frozen", "value": "true" }` right after `title`.
3. Look up the data type by `column.dataSettings.dataTypeUid` in [system/dataTypes.json](../../../system/dataTypes.json). Match by `uid`. Then append the per-type properties below.

### Per-type properties

| Data type | UID | properties to append (in order) |
|---|---|---|
| **Bool** | `4bff64cf-eb01-4933-9f3d-b902336751f4` | `name=<column.name>`, `width=100px`, `sortable=true`, `format=boolean`, `filterKind=boolean` |
| **Int** | `b327f82a-ea96-416f-9836-785db28eccac` | `name=<column.name>`, `width=120px`, `sortable=true`, `filterKind=number` |
| **Long** | `daa57cb0-32eb-4709-b61f-4ea023ae31c3` | `name=<column.name>`, `width=120px`, `sortable=true`, `filterKind=number` |
| **Decimal** | `a05516ac-baae-4f66-9b67-6703998a6a1b` | `name=<column.name>`, `width=120px`, `sortable=true`, `format=number`, `filterKind=number`, `numberDigits=<column.dataSettings.numberDigits>` |
| **DateTime** | `9001eafb-efb1-442f-b288-723bb8002b12` | `name=<column.name>`, `sortable=true`, then either the date- or date-time block below |
| **String** | `0234c067-7868-46b2-ba8e-e22fae5255cb` | `name=<column.name>`, `width=auto`, `sortable=true`, `filterKind=string` |
| **Any other primitive** (`isPrimitive = true`) | — | same as **String** |
| **Reference** (`isPrimitive = false`) | — | `name=<column.name>_display`, `width=auto`, `filterKind=objectReference`, `filterSource=<column.dataSettings.dataTypeUid>` — **no `sortable`** |

#### DateTime sub-dispatch

If `column.renderSettings.controlKindUid == "909adf77-0b49-4a32-8a24-9e29429a2d90"` (`PrimeVue.DateInput`) — date-only:

```
width=120px, format=date, filterKind=date
```

Otherwise (default — `PrimeVue.DateTimeInput` or empty) — date-time:

```
width=160px, format=dateTime, filterKind=dateTime
```

### Reference columns — `name` suffix

Reference columns are stored as `<column.name>` (the FK id) and rendered through `<column.name>_display` (the human-readable text resolved server-side). The `name` of a reference table-view-column **must** be `<column.name>_display` so the grid shows titles, not raw ids.

---

## Wire listFormUid

After writing the form file, update the metaobject JSON:

1. Read `{kind}/{object}/{kind}.{object}.json`.
2. Replace the `"listFormUid": "<old-uid-or-empty-string>"` line with `"listFormUid": "<new-form.uid>"` via a single `StrReplace` targeting the unique `listFormUid` line.
3. **Do not** touch any other field. **Do not** add anything to `system/dataTypes.json` — constructor forms are not a reference type.

---

## Building Checklist

Copy and track:

```
- [ ] Target metaobject confirmed with the user
- [ ] kind.{kindName}.json has useForms = true
- [ ] Captured kind.title and kind.canCreateRecords
- [ ] Captured metaobject uid, title, name, header.uid, header.columns
- [ ] If listFormUid is already set — user confirmed replacement
- [ ] Generated fresh form uid (UUID v4, lowercase, hyphenated)
- [ ] Generated suffix6 for form name and filename (unique in folder)
- [ ] Form file created at correct path with correct $schema
- [ ] title row: bs-view-title with "<kind.title>.<object.title>"
- [ ] Buttons row: button-group (Add/Edit/Delete), Copy, Records (iff canCreateRecords), split-button "Действия"
- [ ] Split-button items include Create/Delete Records iff canCreateRecords
- [ ] Divider row present
- [ ] bs-table-view: dataUid = header.uid, dataSource = "{kind.name}.{object.name}", name = "list", height = "stretch"
- [ ] For every column: dataUid = column.uid, title set, frozen iff isStandard
- [ ] For every column: per-type properties match the dispatch table
- [ ] Reference columns use "<name>_display" and filterSource = dataTypeUid (no sortable)
- [ ] Every FormElement.id matches {componentName}-{6chars} and is unique within the form
- [ ] Metaobject JSON: listFormUid updated to the new form's uid
- [ ] system/dataTypes.json untouched
```

---

## Reference

- [constructor-forms rule](../../rules/constructor-forms.mdc) — full grammar of `FormElement`, component registry, bindings.
- [constructorFormSettings.schema.json](../../../system/schemas/constructorFormSettings.schema.json) — the schema the produced file must validate against.

---

## Out of Scope

- Adding columns to an **existing** list form (the `AddColumnsToList` method of `ListFormBuilder`). Future extension.
- Programmable (Vue) list forms — different artefact (`*.form.*.vue`, `formKind = 0`).
- Edit forms — separate algorithm (`EditFormBuilder`), separate skill if needed later.
