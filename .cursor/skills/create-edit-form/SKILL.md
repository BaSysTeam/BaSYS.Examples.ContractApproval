---
name: create-edit-form
description: >-
  Create a constructor edit form (форма редактирования) for a BaSYS metaobject
  (catalog, register, operation, etc.) — generates the
  {kind}.{name}.form.edit_{suffix}.json file with the standard
  title / buttons / divider / header (optionally inside a collapsible group) /
  tabs-with-details-tables skeleton and wires it as the metaobject's
  itemFormUid. Use when the user asks to create / build / generate an edit
  form, форму редактирования, форму-конструктор редактирования, форму элемента,
  edit form, или to assign / set / replace the item form (itemFormUid) of a
  metaobject. Accepts two optional parameters: HeaderColumnsCount (default 3)
  and UseCollapsibleGroup (default true).
---

# Create Constructor Edit Form

Mirrors the algorithm of `BaSys.Constructor.FormBuilders.EditFormBuilder` (server-side form builder) — produces a constructor form (`formKind = 1`) and assigns it as the target metaobject's `itemFormUid`.

For the full constructor-form grammar (component registry, bindings, property syntax, etc.) the skill defers to the [constructor-forms](../../rules/constructor-forms.mdc) rule. This skill only encodes the edit-form skeleton, the per-data-type input dispatch and the per-data-type details-table column dispatch.

## Prerequisites — Ask the User

Before generating anything:

1. **Target metaobject** — required. If not stated in the request, ask explicitly via `AskQuestion`:
   > "Для какого объекта создаём форму редактирования?"
   List storable metaobjects discovered under `{kindName}/{objectName}/{kindName}.{objectName}.json` as options (typically under `catalog/`, `register/`, `operation/`). Never guess.
2. **HeaderColumnsCount** — integer, default `3` (matches `EditFormConstructorRequest.HeaderColumnsCount`). Reasonable range: 1..4. Ask only if the user already hinted at a non-default layout.
3. **UseCollapsibleGroup** — boolean, default `true` (matches `EditFormConstructorRequest.UseCollapsibleGroup`). When `true`, header rows are wrapped in a `bs-collapsible-group` titled «Основные». Ask only if the user already hinted at a different choice.
4. **Column / table / command subset** — optional. Default selection (confirmed convention):
   - **Header columns**: every column of `header.columns` with `renderSettings.showInItem = true`, minus the operation-only exclusions in §6.4.
   - **Detail tables**: every entry of `detailTables`.
   - **Detail table columns**: every column with `isStandard = false` AND `renderSettings.showInItem = true`.
   - **Commands**: every entry of `commands` (both header-bound and table-bound).
   Note the default in chat so the user can ask to narrow it.

---

## Pre-flight Checks

1. **Kind supports forms.** Read `system/kinds/kind.{kindName}.json`:
   - `useForms` must be `true`. If `false` — stop and tell the user the kind does not support forms.
   - Capture `title`, `isReference`, `canCreateRecords`, `allowAttachedFiles` and (for operations) `recordsSettings.sourceCreateRecordsColumnUid`.
2. **Metaobject is storable.** Read `{kind}/{object}/{kind}.{object}.json`:
   - Capture `uid`, `title`, `name`, `header.uid`, `header.columns`, `detailTables` (each with `uid`, `title`, `name`, `columns`) and `commands` (each with `uid`, `name`, `title`, `tableUid`).
   - The metaobject's `$schema` must point to `metaObjectStorableSettings.schema.json`. If it does not, the kind has no `header` and an edit form does not apply — stop and tell the user.
3. **Print forms.** Glob the metaobject folder for `*.print_form.*.json` files (ignore `*.template.xlsx`). Read each to capture `title` and `name` — the resulting list feeds the «Печать» split-button in §6.2.
4. **Do not regenerate** if an item form already exists. If `itemFormUid` on the metaobject is non-empty, confirm with the user whether to replace it or skip.

---

## Build the Form

### Filename and top-level fields

- File path: `{kind}/{object}/{kind}.{object}.form.edit_{suffix6}.json`.
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
  "title": "Форма редактирования",
  "name": "edit_<suffix6>",
  "memo": "Форма редактирования <object.title>",
  "version": 1,
  "childComponents": [],
  "display": "Форма редактирования"
}
```

### Element id format

Every `FormElement.id` is `{componentName}-{6chars}`. The 6-character tail is a fresh random string from `0-9a-zA-Z`, unique within the form. Generate one per element, including children.

Wrappers (`bs-form`, `bs-row`, `bs-col`) always have `dataUid = null`, `style = ""`, `properties = []`. `bs-form` has `cssClass = ""`, every `bs-row` — `cssClass = "grid"`, every `bs-col` — `cssClass = "col"` (or `"col-2"` for the narrow «Записи» column in the title row, see §6.1).

### root skeleton

Always under the single `bs-form`:

```
bs-form
├── 1. title row     bs-row[grid]                                ← always
├── 2. Buttons row   bs-row[grid]                                ← always
├── 3. Divider row   bs-row[grid] / pv-divider                   ← always
├── 4. header        bs-collapsible-group OR N×bs-row[grid]      ← UseCollapsibleGroup
└── 5. Tabs row      bs-row[grid] / pv-tab-view / pv-tab-panel*  ← only if detailTables.Any()
```

---

## 6. Row-by-row Recipe

### 6.1. title row

`bs-row[grid]` → one `bs-col[col]` with a `bs-view-title`.

- **Operation** (`kindName == "operation"`):
  - `:title` (binding) =
    ```
    `{kind.title}.{object.title} # ${data.header.number} от ${formatter.formatDateTime(data.header.date)}`
    ```
    (literal backticks — it is a JavaScript template literal).
  - Add a second `bs-col[col-2]` next to the title column, containing a `bs-form-field`:
    - `bs-form-field`: `text = "Записи"`, `labelCols = "4"`, `dataUid = <uid of create_records column>` (look up by `kind.recordsSettings.sourceCreateRecordsColumnUid` matched against `standardColumnUid` in `header.columns`). If the column is missing — skip the second col.
    - Inside it: `pv-checkbox`, `vModel = "$h.create_records"`, `binary = "true"`, same `dataUid`.
- **Non-operation** (catalog, register, …):
  - `title` (literal) = `"{kind.title}.{object.title}"`.
  - No second column.

In **both** cases the `bs-view-title` also has:

```json
{ "name": ":isWaiting",  "value": "isWaiting" },
{ "name": ":isModified", "value": "isModified" }
```

### 6.2. Buttons row

`bs-row[grid]` → one `bs-col[col]`. Children in this exact order:

1. **`pv-button-group`** (no own props, no cssClass) with three `pv-button` children:

   | Label | Icon | `@Click` | Severity |
   |---|---|---|---|
   | Вернуться | `pi pi-arrow-left` | `standard.return` | `primary` |
   | Сохранить&Закрыть | `pi pi-save` | `standard.save_close` | `primary` |
   | Сохранить | `pi pi-save` | `standard.save` | `primary` |

   Every `pv-button` has properties in this exact order: `label`, `icon`, `@Click`, `severity`, `size = "small"`, `outlined = "outlined"`.

2. **`pv-button` (Создать на основании)** — **only if `kind.isReference = true`.** `cssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-file-import"`, `@Click = "standard.create_from"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

3. **`pv-button` (Записи)** — **only if `kind.canCreateRecords = true`.** `cssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-list"`, `@Click = "standard.open_records"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

4. **`pv-button` (Файлы)** — **only if `kind.allowAttachedFiles = true`.** `cssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-paperclip"`, `@Click = "standard.open_files"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

5. **`pv-split-button` «Печать»** — **only if at least one `*.print_form.*.json` exists.** `cssClass = "ml-1"`, properties: `label = "Печать"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`, `icon = "pi pi-print"`. One `pv-split-button-item` per print form: `label = <printForm.title>`, `icon = ""`, `command = "standard.print:<printForm.name>"`.

6. **`pv-split-button` «Действия»** — **always.** `cssClass = "ml-1"`, properties: `label = "Действия"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`. Children are `pv-split-button-item` entries in this order:
   - **Always:** `Лог вычислений` (`pi pi-list`, `standard.open_log`).
   - **Always:** `Пересчитать` (`pi pi-refresh`, `standard.recalculate`).
   - **Only if `kind.canCreateRecords = true`:**
     - `Создать записи` (`pi pi-check`, `standard.create_records`).
     - `Удалить записи` (`pi pi-times`, `standard.delete_records`).
   - **Always:** `Excel` (`pi pi-file-excel`, `standard.export_excel`).
   - For each header command (`command.tableUid == header.uid`) — append an item: `label = command.title`, `icon = ""`, `command = command.name`.

   Split-button items use **`command`**, not `@Click`. Every `pv-split-button-item` has properties in this order: `label`, `icon`, `command`. No cssClass, no style.

### 6.3. Divider row

`bs-row[grid]` → one `bs-col[col]` → single `pv-divider`:

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

### 6.4. header (fields layout)

Build the list of **eligible** header columns:

1. Iterate `header.columns` in declaration order.
2. Keep only those with `renderSettings.showInItem == true` (default subset; if the user explicitly narrowed the list, intersect with that selection).
3. **Operation-only exclusions** (mirror `EditFormBuilder.BuildHeader`):
   - Skip the column whose `uid == kind.recordsSettings.sourceCreateRecordsColumnUid` (rendered in the title row instead).
   - Skip the column with `dataSettings.primaryKey == true` (typically `number` — rendered in the title row expression).
   - Skip the column with `name.toLowerCase() == "date"` (rendered in the title row expression).

Lay them out in rows of `HeaderColumnsCount` (default `3`) cells. Each row is a `bs-row[grid]` with exactly `HeaderColumnsCount` `bs-col[col]` children — the last row pads with **empty** `bs-col[col]` (no `items`) up to `HeaderColumnsCount` (the C# loop always emits `HeaderColumnsCount` columns per row).

If `UseCollapsibleGroup = true`, wrap the whole set of `bs-row`s inside a single `bs-collapsible-group`:

```json
{
  "id": "bs-collapsible-group-<6>",
  "dataUid": null,
  "componentName": "bs-collapsible-group",
  "cssClass": "",
  "style": "",
  "properties": [
    { "name": "title",      "value": "Основные" },
    { "name": "open",       "value": "true" },
    { "name": "text-align", "value": "right" }
  ],
  "items": [ /* bs-row[grid] entries */ ]
}
```

Otherwise the rows are direct children of the root `bs-form`.

#### Form-field shape

For each eligible column, the non-empty `bs-col[col]` contains a `bs-form-field`:

```json
{
  "id": "bs-form-field-<6>",
  "dataUid": "<column.uid>",
  "componentName": "bs-form-field",
  "cssClass": "",
  "style": "",
  "properties": [
    { "name": "text",       "value": "<column.title>" },
    { "name": "labelCols",  "value": "4" },
    { "name": "labelAlign", "value": "left" }
    // + { "name": "required", "value": "" } if column.dataSettings.required
  ],
  "items": [ /* single input element, see dispatch below */ ]
}
```

The single child is one input element. `dataUid` on the input equals `column.uid` (same as on the wrapper).

If `column.kind == 1` (Virtual), append `{ "name": "disabled", "value": "" }` to the **input** element's `properties`.

#### Per-type input dispatch

Match by `column.dataSettings.dataTypeUid`:

| Data type | UID | Element + properties (in order) |
|---|---|---|
| **Bool** | `4bff64cf-eb01-4933-9f3d-b902336751f4` | `renderSettings.controlKindUid == "80ea55af-19fe-48e6-8f53-5091da45c6b7"` → `pv-input-switch` (`vModel = "$h.<name>"`, `size = "small"`); otherwise → `pv-checkbox` (`vModel = "$h.<name>"`, `binary = "true"`). |
| **Int** | `b327f82a-ea96-416f-9836-785db28eccac` | `pv-input-number` (`vModel = "$h.<name>"`, `size = "small"`, `:minFractionDigits = "0"`, `:maxFractionDigits = "0"`). |
| **Long** | `daa57cb0-32eb-4709-b61f-4ea023ae31c3` | same as **Int**. |
| **Decimal** | `a05516ac-baae-4f66-9b67-6703998a6a1b` | `pv-input-number` (`vModel`, `size = "small"`, `:minFractionDigits = "<numberDigits>"`, `:maxFractionDigits = "<numberDigits>"`). |
| **DateTime** | `9001eafb-efb1-442f-b288-723bb8002b12` | `pv-calendar` with `vModel = "$h.<name>"`, `size = "small"`, `showIcon = ""`, `showButtonBar = ""`, `iconDisplay = "input"`. Plus: `renderSettings.controlKindUid == "ee2cac4f-0749-4131-93f8-71bd5be399e6"` (DateTimeInput) → `:showTime = "true"`, `dateFormat = "dd.mm.yy hh:mm:ss"`; otherwise (DateInput / unset) → `:showTime = "false"`, `dateFormat = "dd.mm.yy"`. |
| **String** | `0234c067-7868-46b2-ba8e-e22fae5255cb` | `pv-input-text` (`vModel`, `size = "small"`). (TextArea variant — same `pv-input-text` for now, mirroring the C# TODO.) |
| **Any other primitive** (`isPrimitive = true`) | — | `pv-input-text` (`vModel`, `size = "small"`). |
| **Reference** (`isPrimitive = false`) | — | `bs-object-reference-select` with `vModel = "$h.<name>"`, `:text = "$h.<name>_display"`, `size = "small"`, `dataType = "<column.dataSettings.dataTypeUid>"`, plus `itemsSource = "<column.itemsSource>"` if non-empty. |

Look up `isPrimitive` in [system/dataTypes.json](../../../system/dataTypes.json) by `uid`.

### 6.5. Tabs row (only if `detailTables.Any()`)

Wrap in `bs-row[grid]` → `bs-col[col]` → `pv-tab-view` (`dataUid = <object.uid>`, no own properties). Inside the `pv-tab-view`, one `pv-tab-panel` per detail table (in declaration order):

```json
{
  "id": "pv-tab-panel-<6>",
  "dataUid": "<table.uid>",
  "componentName": "pv-tab-panel",
  "cssClass": "",
  "style": "",
  "properties": [
    { "name": "header", "value": "<table.title>" }
  ],
  "items": [
    /* 1. Toolbar row */,
    /* 2. Details table row */
  ]
}
```

#### Toolbar row

`bs-row[grid]` → `bs-col[col]` → `pv-toolbar`:

```json
{
  "id": "pv-toolbar-<6>",
  "dataUid": null,
  "componentName": "pv-toolbar",
  "cssClass": "",
  "style": "padding: 0.2rem; margin-bottom: 0.2rem",
  "properties": [],
  "items": [ /* see below */ ]
}
```

Children in this exact order:

1. **`pv-button` «+»** — `label = ""`, `icon = "pi pi-plus"`, `@Click = "standard.table_add:<table.name>"`, `severity = "primary"`, `size = "small"`, `text = ""`, `slot = "start"`. (No `outlined`.)
2. **`pv-button` «Очистить фильтры»** — `label = ""`, `icon = "pi pi-filter-slash"`, `@Click = "standard.clear_filters:<table.name>"`, `severity = "secondary"`, `size = "small"`, `text = ""`, `slot = "start"`. (No `outlined`.)
3. **`pv-split-button` «Действия»** — **only if at least one user command targets this table** (`command.tableUid == table.uid`). `cssClass = "ml-1"`, properties: `label = "Действия"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`, `slot = "start"`. One `pv-split-button-item` per command: `label = <command.title>`, `icon = ""` (omit the property if null), `command = <command.name>`.
4. **`bs-text`** — `text = "<table.title>"`, `slot = "end"`.
5. **`pv-badge`** — `:value = "$t.<table.name>?.count()"`, `severity = "primary"`, `size = "small"`, `slot = "end"`, `cssClass = "ml-1"`.

#### Details table row

`bs-row[grid]` → `bs-col[col]` → `bs-details-table`:

```json
{
  "id": "bs-details-table-<6>",
  "dataUid": "<table.uid>",
  "componentName": "bs-details-table",
  "cssClass": "",
  "style": "",
  "properties": [
    { "name": ":header", "value": "data.header" },
    { "name": ":table",  "value": "$t.<table.name>" },
    { "name": "height",  "value": "stretch" }
  ],
  "items": [ /* bs-table-view-column entries — see dispatch */ ]
}
```

#### Per-type details-table column dispatch

For each detail-table column with `isStandard = false` AND `renderSettings.showInItem = true`, build a `bs-table-view-column`:

```json
{
  "id": "bs-table-view-column-<6>",
  "dataUid": "<column.uid>",
  "componentName": "bs-table-view-column",
  "cssClass": "",
  "style": "",
  "properties": [
    { "name": "title", "value": "<column.title>" }
    /* + per-type properties below, in order */
  ],
  "items": []
}
```

| Data type | UID | properties to append (in order) |
|---|---|---|
| **Bool** | `4bff64cf-...` | `name = <column.name>`, `control = "input-checkbox"`, `width = <listColumnWidth || "100px">` |
| **Int** | `b327f82a-...` | `name = <column.name>`, `control = "input-number"`, `width = <listColumnWidth || "120px">` |
| **Long** | `daa57cb0-...` | same as Int |
| **Decimal** | `a05516ac-...` | `name = <column.name>`, `control = "input-number"`, `numberDigits = <numberDigits>`, `width = <listColumnWidth || "120px">` |
| **DateTime** | `9001eafb-...` | `name = <column.name>`; then either the date- or date-time block below |
| **String** | `0234c067-...` | `name = <column.name>`, `control = "input-text"`, `width = <listColumnWidth || "auto">` |
| **Any other primitive** (`isPrimitive = true`) | — | same as **String** |
| **Reference** (`isPrimitive = false`) | — | `name = <column.name>_display`, `control = "dropdown"`, `dataType = <column.dataSettings.dataTypeUid>`, `itemsSource = <column.itemsSource>` (only if non-empty), `width = <listColumnWidth || "auto">` |

##### DateTime sub-dispatch

- `renderSettings.controlKindUid == "909adf77-0b49-4a32-8a24-9e29429a2d90"` (PrimeVue.DateInput) → `control = "input-date"`, `width = <listColumnWidth || "120px">`.
- Otherwise (DateTimeInput or empty) → `control = "input-datetime"`, `width = <listColumnWidth || "160px">`.

width fallback rule: if `renderSettings.listColumnWidth` is non-empty, use it as-is; otherwise use the per-type default shown after `||`.

##### Reference columns — `name` suffix

Reference columns are stored as `<column.name>` (the FK id) and rendered through `<column.name>_display` (the human-readable text resolved server-side). The `name` of a reference table-view-column **must** be `<column.name>_display` so the grid shows titles, not raw ids.

---

## Wire itemFormUid

After writing the form file, update the metaobject JSON:

1. Read `{kind}/{object}/{kind}.{object}.json`.
2. Replace the `"itemFormUid": "<old-uid-or-empty-string>"` line with `"itemFormUid": "<new-form.uid>"` via a single `StrReplace` targeting the unique `itemFormUid` line.
3. **Do not** touch any other field. **Do not** add anything to `system/dataTypes.json` — constructor forms are not a reference type.

---

## Building Checklist

Copy and track:

```
- [ ] Целевой объект подтверждён
- [ ] kind.{kindName}.json: useForms = true
- [ ] Считаны kind.title, isReference, canCreateRecords, allowAttachedFiles, sourceCreateRecordsColumnUid
- [ ] Считаны objectSettings: uid, title, name, header.uid, header.columns, detailTables, commands
- [ ] Найдены *.print_form.*.json (для split-button «Печать»)
- [ ] itemFormUid уже стоит → подтверждена замена
- [ ] HeaderColumnsCount и UseCollapsibleGroup определены (defaults: 3 / true)
- [ ] Сгенерирован uid формы (UUID v4) и suffix6 (уникален в папке)
- [ ] title row собран по правилу operation / non-operation (+ «Записи» col-2 для operation)
- [ ] Buttons row: button-group + опц. кнопки (isReference/canCreateRecords/allowAttachedFiles) + опц. split-button «Печать» + split-button «Действия» с header-командами
- [ ] Divider row на месте
- [ ] header: фильтр showInItem=true + операционные исключения (primaryKey/date/create_records)
- [ ] Раскладка ровно HeaderColumnsCount колонок в строке, последний ряд добит пустыми bs-col
- [ ] UseCollapsibleGroup=true → шапка обёрнута в bs-collapsible-group «Основные»
- [ ] Per-type инпуты (Bool/Int/Long/Decimal/DateTime/String/Reference) и Virtual → disabled на инпуте
- [ ] dataUid одинаков на bs-form-field и его инпуте (= column.uid)
- [ ] required → атрибут required на bs-form-field
- [ ] detailTables: каждая ТЧ → tab + toolbar (+ split-button «Действия» только при наличии table-команд) + bs-details-table
- [ ] Detail-table columns: showInItem=true И !isStandard; reference-колонки → name = <name>_display
- [ ] Каждый FormElement.id уникален в форме и совпадает с {componentName}-{6chars}
- [ ] Метаобъект: itemFormUid обновлён единственной точечной заменой
- [ ] system/dataTypes.json не тронут
```

---

## Reference

- [constructor-forms rule](../../rules/constructor-forms.mdc) — full grammar of `FormElement`, component registry, bindings.
- [constructorFormSettings.schema.json](../../../system/schemas/constructorFormSettings.schema.json) — the schema the produced file must validate against.
- [system/dataTypes.json](../../../system/dataTypes.json) — `uid` ↔ `isPrimitive` lookup for type dispatch.
- Server-side builders (the source of truth for this skill):
  - `BaSys.Constructor.FormBuilders.EditFormBuilder` — overall edit-form algorithm.
  - `BaSys.Constructor.FormBuilders.FormElementFactory` — per-component constructors used by EditFormBuilder.
  - `BaSys.Constructor.FormBuilders.DetailsTableBuilder` — per-type details-table column dispatch.
- Real examples in this repo: look for files matching `*/*/*.form.edit_*.json` under the kind folders (`operation/`, `catalog/`, `register/`, …).

---

## Out of Scope

- **Adding fields / tables to an existing edit form** (the `AddHeaderField` / `AddTables` methods of `EditFormBuilder`). Future extension — keep existing element `id`s and `dataUid`s as-is when implementing it.
- **Programmable (Vue) edit forms** — different artefact (`*.form.*.vue`, `formKind = 0`). Never silently convert between constructor and programmable forms.
- **Auto forms** (`formKind = -1`) — handled by the platform, no JSON to author.
- **Any edits to `system/manifest.json` or files under `system/`** — owned by the server. (Reference-type registration in `system/dataTypes.json` does not apply here: constructor forms are not a reference type.)
