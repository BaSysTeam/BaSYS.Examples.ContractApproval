---
name: create-list-form
description: >-
  Create a constructor list form (forma spiska) for a BaSYS metaobject (catalog,
  register, operation, etc.) — generates the {kind}.{name}.form.list_{suffix}.json
  file with the standard title / buttons / divider / table-view skeleton and wires
  it as the metaobject's ListFormUid. Use when the user asks to create / build /
  generate a list form, форма списка, форма-список, форма-конструктор списка, or
  to assign / set / replace the list form (ListFormUid) of a metaobject.
---

# Create Constructor List Form

Mirrors the algorithm of `BaSys.Constructor.FormBuilders.ListFormBuilder` (server-side form builder) — produces a constructor form (`FormKind = 1`) and assigns it as the target metaobject's `ListFormUid`.

For the full constructor-form grammar (component registry, bindings, property syntax, etc.) the skill defers to the [constructor-forms](../../rules/constructor-forms.mdc) rule. This skill only encodes the list-form skeleton and the per-data-type column dispatch.

## Prerequisites — Ask the User

Before generating anything:

1. **Target metaobject** — required. If not stated in the request, ask explicitly via `AskQuestion`:
   > "Для какого объекта создаём форму списка?"
   List storable metaobjects discovered under `{kindName}/{objectName}/{kindName}.{objectName}.json` as options (typically under `catalog/`, `register/`, `operation/`). Never guess.
2. **Column subset** — optional. If the user did not specify which columns to put into the table view, default to **all** entries of `Header.Columns` (every stored and virtual column). Note the default in chat so the user can ask to narrow it.

---

## Pre-flight Checks

1. **Kind supports forms.** Read `system/kinds/kind.{kindName}.json`:
   - `UseForms` must be `true`. If `false` — stop and tell the user the kind does not support forms.
   - Capture `Title` (used in the form title) and `CanCreateRecords` (controls the «Записи» button and «Создать/Удалить записи» split-button items).
2. **Metaobject is storable.** Read `{kind}/{object}/{kind}.{object}.json`:
   - Capture `Uid`, `Title`, `Name`, `Header.Uid`, `Header.Columns`.
   - The metaobject's `$schema` should point to `metaObjectStorableSettings.schema.json`. If it does not, the kind has no `Header` and a list form does not apply — stop and tell the user.
3. **Do not regenerate** if a list form already exists. If `ListFormUid` on the metaobject is non-empty, confirm with the user whether to replace it or skip.

---

## Build the Form

### Filename and top-level fields

- File path: `{kind}/{object}/{kind}.{object}.form.list_{suffix6}.json`.
- `suffix6` — six characters from `0-9a-zA-Z`, randomly generated (matches the platform's `IdentifiersGenerator`). Verify the filename does not already exist in the folder.
- Top-level JSON:

```json
{
  "$schema": "../../system/schemas/constructorFormSettings.schema.json",
  "Root": { /* see skeleton below */ },
  "OnInitializedScript": "",
  "Uid": "<new-uuid-v4>",
  "MetaObjectUid": "<metaobject.Uid>",
  "FormKind": 1,
  "Title": "Форма списка",
  "Name": "list_<suffix6>",
  "Memo": "Форма списка <object.Title>",
  "Version": 1,
  "ChildComponents": [],
  "Display": "Форма списка"
}
```

### Element Id format

Every `FormElement.Id` is `{componentName}-{6chars}`. The 6-character tail is a fresh random string from `0-9a-zA-Z`, unique within the form. Generate one per element, including children.

### Root skeleton

Always four rows under the single `bs-form`:

```
bs-form
├── bs-row[grid] / bs-col[col] / bs-view-title                       ← 1. Title row
├── bs-row[grid] / bs-col[col] / pv-button-group + buttons           ← 2. Buttons row
├── bs-row[grid] / bs-col[col] / pv-divider                          ← 3. Divider
└── bs-row[grid] / bs-col[col] / bs-table-view + columns             ← 4. Table view row
```

Every wrapper (`bs-form`, `bs-row`, `bs-col`) has `DataUid = null`, `Style = ""`, `Properties = []`. `bs-form` has `CssClass = ""`, every `bs-row` — `CssClass = "grid"`, every `bs-col` — `CssClass = "col"`.

### 1. Title row

```json
{
  "Id": "bs-view-title-<6>",
  "DataUid": null,
  "ComponentName": "bs-view-title",
  "CssClass": "",
  "Style": "",
  "Properties": [
    { "Name": "title",       "Value": "<Kind.Title>.<Object.Title>" },
    { "Name": ":isWaiting",  "Value": "isWaiting" },
    { "Name": ":isModified", "Value": "isModified" }
  ],
  "Items": []
}
```

### 2. Buttons row

Order of children inside the single `bs-col`:

1. **`pv-button-group`** (no own props, no CssClass) with three `pv-button` children:

   | Label | Icon | `@Click` | Severity |
   |---|---|---|---|
   | Добавить | `pi pi-plus` | `standard.add` | `primary` |
   | Редактировать | `pi pi-pencil` | `standard.edit` | `primary` |
   | Удалить | `pi pi-times` | `standard.delete:list` | `danger` |

   Every `pv-button` has properties in this exact order: `label`, `icon`, `@Click`, `severity`, `size = "small"`, `outlined = "outlined"`.

2. **`pv-button` (Копировать)** — `CssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-copy"`, `@Click = "standard.copy"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

3. **`pv-button` (Записи)** — **only if `kind.CanCreateRecords = true`.** `CssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-list"`, `@Click = "standard.open_records"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

4. **`pv-split-button` «Действия»** — `CssClass = "ml-1"`, properties: `label = "Действия"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`. Children are `pv-split-button-item` entries in this order:

   - **Only if `kind.CanCreateRecords = true`:**
     - `label = "Создать записи"`, `icon = "pi pi-check"`, `command = "standard.create_records"`.
     - `label = "Удалить записи"`, `icon = "pi pi-times"`, `command = "standard.delete_records"`.
   - **Always:**
     - `label = "Обновить"`, `icon = "pi pi-refresh"`, `command = "standard.refresh:list"`.
     - `label = "Очистить фильтры"`, `icon = "pi pi-filter-slash"`, `command = "standard.clear_filters:list"`.
     - `label = "Excel"`, `icon = "pi pi-file-excel"`, `command = "standard.export_excel:list"`.

   Split-button items use **`command`**, not `@Click`. Every `pv-split-button-item` has properties in this order: `label`, `icon`, `command`. No CssClass, no Style.

### 3. Divider row

Single `pv-divider` inside the `bs-col`:

```json
{
  "Id": "pv-divider-<6>",
  "DataUid": null,
  "ComponentName": "pv-divider",
  "CssClass": "",
  "Style": "margin: 5px",
  "Properties": [],
  "Items": []
}
```

### 4. Table view row

`bs-table-view` with `DataUid = {object.Header.Uid}` and these properties in this exact order:

```json
{
  "Id": "bs-table-view-<6>",
  "DataUid": "<object.Header.Uid>",
  "ComponentName": "bs-table-view",
  "CssClass": "",
  "Style": "",
  "Properties": [
    { "Name": "dataSource",   "Value": "<kind.Name>.<object.Name>" },
    { "Name": "@RowSelect",   "Value": "standard.row_select" },
    { "Name": "@RowDblClick", "Value": "standard.row_dbl_click" },
    { "Name": "name",         "Value": "list" },
    { "Name": "height",       "Value": "stretch" }
  ],
  "Items": [ /* bs-table-view-column entries */ ]
}
```

Then one `bs-table-view-column` per selected column. See dispatch below.

---

## Column Dispatch by Data Type

For each `column` from `object.Header.Columns` selected by the user (or all of them by default):

1. Create a base column element:
   ```json
   {
     "Id": "bs-table-view-column-<6>",
     "DataUid": "<column.Uid>",
     "ComponentName": "bs-table-view-column",
     "CssClass": "",
     "Style": "",
     "Properties": [
       { "Name": "title", "Value": "<column.Title>" }
     ],
     "Items": []
   }
   ```
2. If `column.IsStandard = true` — append `{ "Name": "frozen", "Value": "true" }` right after `title`.
3. Look up the data type by `column.DataSettings.DataTypeUid` in [system/dataTypes.json](../../../system/dataTypes.json). Match by `Uid`. Then append the per-type properties below.

### Per-type properties

| Data type | UID | Properties to append (in order) |
|---|---|---|
| **Bool** | `4bff64cf-eb01-4933-9f3d-b902336751f4` | `name=<column.Name>`, `width=100px`, `sortable=true`, `format=boolean`, `filterKind=boolean` |
| **Int** | `b327f82a-ea96-416f-9836-785db28eccac` | `name=<column.Name>`, `width=120px`, `sortable=true`, `filterKind=number` |
| **Long** | `daa57cb0-32eb-4709-b61f-4ea023ae31c3` | `name=<column.Name>`, `width=120px`, `sortable=true`, `filterKind=number` |
| **Decimal** | `a05516ac-baae-4f66-9b67-6703998a6a1b` | `name=<column.Name>`, `width=120px`, `sortable=true`, `format=number`, `filterKind=number`, `numberDigits=<column.DataSettings.NumberDigits>` |
| **DateTime** | `9001eafb-efb1-442f-b288-723bb8002b12` | `name=<column.Name>`, `sortable=true`, then either the date- or date-time block below |
| **String** | `0234c067-7868-46b2-ba8e-e22fae5255cb` | `name=<column.Name>`, `width=auto`, `sortable=true`, `filterKind=string` |
| **Any other primitive** (`IsPrimitive = true`) | — | same as **String** |
| **Reference** (`IsPrimitive = false`) | — | `name=<column.Name>_display`, `width=auto`, `filterKind=objectReference`, `filterSource=<column.DataSettings.DataTypeUid>` — **no `sortable`** |

#### DateTime sub-dispatch

If `column.RenderSettings.ControlKindUid == "909adf77-0b49-4a32-8a24-9e29429a2d90"` (`PrimeVue.DateInput`) — date-only:

```
width=120px, format=date, filterKind=date
```

Otherwise (default — `PrimeVue.DateTimeInput` or empty) — date-time:

```
width=160px, format=dateTime, filterKind=dateTime
```

### Reference columns — `name` suffix

Reference columns are stored as `<column.Name>` (the FK id) and rendered through `<column.Name>_display` (the human-readable text resolved server-side). The `name` of a reference table-view-column **must** be `<column.Name>_display` so the grid shows titles, not raw ids.

---

## Wire ListFormUid

After writing the form file, update the metaobject JSON:

1. Read `{kind}/{object}/{kind}.{object}.json`.
2. Replace the `"ListFormUid": "<old-uid-or-empty-string>"` line with `"ListFormUid": "<new-form.Uid>"` via a single `StrReplace` targeting the unique `ListFormUid` line.
3. **Do not** touch any other field. **Do not** add anything to `system/dataTypes.json` — constructor forms are not a reference type.

---

## Building Checklist

Copy and track:

```
- [ ] Target metaobject confirmed with the user
- [ ] kind.{kindName}.json has UseForms = true
- [ ] Captured kind.Title and kind.CanCreateRecords
- [ ] Captured metaobject Uid, Title, Name, Header.Uid, Header.Columns
- [ ] If ListFormUid is already set — user confirmed replacement
- [ ] Generated fresh form Uid (UUID v4, lowercase, hyphenated)
- [ ] Generated suffix6 for form Name and filename (unique in folder)
- [ ] Form file created at correct path with correct $schema
- [ ] Title row: bs-view-title with "<Kind.Title>.<Object.Title>"
- [ ] Buttons row: button-group (Add/Edit/Delete), Copy, Records (iff CanCreateRecords), split-button "Действия"
- [ ] Split-button items include Create/Delete Records iff CanCreateRecords
- [ ] Divider row present
- [ ] bs-table-view: DataUid = Header.Uid, dataSource = "{kind.Name}.{object.Name}", name = "list", height = "stretch"
- [ ] For every column: DataUid = column.Uid, title set, frozen iff IsStandard
- [ ] For every column: per-type properties match the dispatch table
- [ ] Reference columns use "<name>_display" and filterSource = DataTypeUid (no sortable)
- [ ] Every FormElement.Id matches {componentName}-{6chars} and is unique within the form
- [ ] Metaobject JSON: ListFormUid updated to the new form's Uid
- [ ] system/dataTypes.json untouched
```

---

## Reference

- [constructor-forms rule](../../rules/constructor-forms.mdc) — full grammar of `FormElement`, component registry, bindings.
- [constructorFormSettings.schema.json](../../../system/schemas/constructorFormSettings.schema.json) — the schema the produced file must validate against.

---

## Out of Scope

- Adding columns to an **existing** list form (the `AddColumnsToList` method of `ListFormBuilder`). Future extension.
- Programmable (Vue) list forms — different artefact (`*.form.*.vue`, `FormKind = 0`).
- Edit forms — separate algorithm (`EditFormBuilder`), separate skill if needed later.
