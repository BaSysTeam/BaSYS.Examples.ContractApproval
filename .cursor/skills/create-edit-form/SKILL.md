---
name: create-edit-form
description: >-
  Create a constructor edit form (форма редактирования) for a BaSYS metaobject
  (catalog, register, operation, etc.) — generates the
  {kind}.{name}.form.edit_{suffix}.json file with the standard
  title / buttons / divider / header (optionally inside a collapsible group) /
  tabs-with-details-tables skeleton and wires it as the metaobject's
  ItemFormUid. Use when the user asks to create / build / generate an edit
  form, форму редактирования, форму-конструктор редактирования, форму элемента,
  edit form, или to assign / set / replace the item form (ItemFormUid) of a
  metaobject. Accepts two optional parameters: HeaderColumnsCount (default 3)
  and UseCollapsibleGroup (default true).
---

# Create Constructor Edit Form

Mirrors the algorithm of `BaSys.Constructor.FormBuilders.EditFormBuilder` (server-side form builder) — produces a constructor form (`FormKind = 1`) and assigns it as the target metaobject's `ItemFormUid`.

For the full constructor-form grammar (component registry, bindings, property syntax, etc.) the skill defers to the [constructor-forms](../../rules/constructor-forms.mdc) rule. This skill only encodes the edit-form skeleton, the per-data-type input dispatch and the per-data-type details-table column dispatch.

## Prerequisites — Ask the User

Before generating anything:

1. **Target metaobject** — required. If not stated in the request, ask explicitly via `AskQuestion`:
   > "Для какого объекта создаём форму редактирования?"
   List storable metaobjects discovered under `{kindName}/{objectName}/{kindName}.{objectName}.json` as options (typically under `catalog/`, `register/`, `operation/`). Never guess.
2. **HeaderColumnsCount** — integer, default `3` (matches `EditFormConstructorRequest.HeaderColumnsCount`). Reasonable range: 1..4. Ask only if the user already hinted at a non-default layout.
3. **UseCollapsibleGroup** — boolean, default `true` (matches `EditFormConstructorRequest.UseCollapsibleGroup`). When `true`, header rows are wrapped in a `bs-collapsible-group` titled «Основные». Ask only if the user already hinted at a different choice.
4. **Column / table / command subset** — optional. Default selection (confirmed convention):
   - **Header columns**: every column of `Header.Columns` with `RenderSettings.ShowInItem = true`, minus the operation-only exclusions in §6.4.
   - **Detail tables**: every entry of `DetailTables`.
   - **Detail table columns**: every column with `IsStandard = false` AND `RenderSettings.ShowInItem = true`.
   - **Commands**: every entry of `Commands` (both header-bound and table-bound).
   Note the default in chat so the user can ask to narrow it.

---

## Pre-flight Checks

1. **Kind supports forms.** Read `system/kinds/kind.{kindName}.json`:
   - `UseForms` must be `true`. If `false` — stop and tell the user the kind does not support forms.
   - Capture `Title`, `IsReference`, `CanCreateRecords`, `AllowAttachedFiles` and (for operations) `RecordsSettings.SourceCreateRecordsColumnUid`.
2. **Metaobject is storable.** Read `{kind}/{object}/{kind}.{object}.json`:
   - Capture `Uid`, `Title`, `Name`, `Header.Uid`, `Header.Columns`, `DetailTables` (each with `Uid`, `Title`, `Name`, `Columns`) and `Commands` (each with `Uid`, `Name`, `Title`, `TableUid`).
   - The metaobject's `$schema` must point to `metaObjectStorableSettings.schema.json`. If it does not, the kind has no `Header` and an edit form does not apply — stop and tell the user.
3. **Print forms.** Glob the metaobject folder for `*.print_form.*.json` files (ignore `*.template.xlsx`). Read each to capture `Title` and `Name` — the resulting list feeds the «Печать» split-button in §6.2.
4. **Do not regenerate** if an item form already exists. If `ItemFormUid` on the metaobject is non-empty, confirm with the user whether to replace it or skip.

---

## Build the Form

### Filename and top-level fields

- File path: `{kind}/{object}/{kind}.{object}.form.edit_{suffix6}.json`.
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
  "Title": "Форма редактирования",
  "Name": "edit_<suffix6>",
  "Memo": "Форма редактирования <object.Title>",
  "Version": 1,
  "ChildComponents": [],
  "Display": "Форма редактирования"
}
```

### Element Id format

Every `FormElement.Id` is `{componentName}-{6chars}`. The 6-character tail is a fresh random string from `0-9a-zA-Z`, unique within the form. Generate one per element, including children.

Wrappers (`bs-form`, `bs-row`, `bs-col`) always have `DataUid = null`, `Style = ""`, `Properties = []`. `bs-form` has `CssClass = ""`, every `bs-row` — `CssClass = "grid"`, every `bs-col` — `CssClass = "col"` (or `"col-2"` for the narrow «Записи» column in the title row, see §6.1).

### Root skeleton

Always under the single `bs-form`:

```
bs-form
├── 1. Title row     bs-row[grid]                                ← always
├── 2. Buttons row   bs-row[grid]                                ← always
├── 3. Divider row   bs-row[grid] / pv-divider                   ← always
├── 4. Header        bs-collapsible-group OR N×bs-row[grid]      ← UseCollapsibleGroup
└── 5. Tabs row      bs-row[grid] / pv-tab-view / pv-tab-panel*  ← only if DetailTables.Any()
```

---

## 6. Row-by-row Recipe

### 6.1. Title row

`bs-row[grid]` → one `bs-col[col]` with a `bs-view-title`.

- **Operation** (`kindName == "operation"`):
  - `:title` (binding) =
    ```
    `{Kind.Title}.{Object.Title} # ${data.header.number} от ${formatter.formatDateTime(data.header.date)}`
    ```
    (literal backticks — it is a JavaScript template literal).
  - Add a second `bs-col[col-2]` next to the title column, containing a `bs-form-field`:
    - `bs-form-field`: `text = "Записи"`, `labelCols = "4"`, `DataUid = <uid of create_records column>` (look up by `kind.RecordsSettings.SourceCreateRecordsColumnUid` matched against `StandardColumnUid` in `Header.Columns`). If the column is missing — skip the second col.
    - Inside it: `pv-checkbox`, `vModel = "$h.create_records"`, `binary = "true"`, same `DataUid`.
- **Non-operation** (catalog, register, …):
  - `title` (literal) = `"{Kind.Title}.{Object.Title}"`.
  - No second column.

In **both** cases the `bs-view-title` also has:

```json
{ "Name": ":isWaiting",  "Value": "isWaiting" },
{ "Name": ":isModified", "Value": "isModified" }
```

### 6.2. Buttons row

`bs-row[grid]` → one `bs-col[col]`. Children in this exact order:

1. **`pv-button-group`** (no own props, no CssClass) with three `pv-button` children:

   | Label | Icon | `@Click` | Severity |
   |---|---|---|---|
   | Вернуться | `pi pi-arrow-left` | `standard.return` | `primary` |
   | Сохранить&Закрыть | `pi pi-save` | `standard.save_close` | `primary` |
   | Сохранить | `pi pi-save` | `standard.save` | `primary` |

   Every `pv-button` has properties in this exact order: `label`, `icon`, `@Click`, `severity`, `size = "small"`, `outlined = "outlined"`.

2. **`pv-button` (Создать на основании)** — **only if `kind.IsReference = true`.** `CssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-file-import"`, `@Click = "standard.create_from"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

3. **`pv-button` (Записи)** — **only if `kind.CanCreateRecords = true`.** `CssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-list"`, `@Click = "standard.open_records"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

4. **`pv-button` (Файлы)** — **only if `kind.AllowAttachedFiles = true`.** `CssClass = "ml-1"`, properties: `label = ""`, `icon = "pi pi-paperclip"`, `@Click = "standard.open_files"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`.

5. **`pv-split-button` «Печать»** — **only if at least one `*.print_form.*.json` exists.** `CssClass = "ml-1"`, properties: `label = "Печать"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`, `icon = "pi pi-print"`. One `pv-split-button-item` per print form: `label = <printForm.Title>`, `icon = ""`, `command = "standard.print:<printForm.Name>"`.

6. **`pv-split-button` «Действия»** — **always.** `CssClass = "ml-1"`, properties: `label = "Действия"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`. Children are `pv-split-button-item` entries in this order:
   - **Always:** `Лог вычислений` (`pi pi-list`, `standard.open_log`).
   - **Always:** `Пересчитать` (`pi pi-refresh`, `standard.recalculate`).
   - **Only if `kind.CanCreateRecords = true`:**
     - `Создать записи` (`pi pi-check`, `standard.create_records`).
     - `Удалить записи` (`pi pi-times`, `standard.delete_records`).
   - **Always:** `Excel` (`pi pi-file-excel`, `standard.export_excel`).
   - For each header command (`command.TableUid == Header.Uid`) — append an item: `label = command.Title`, `icon = ""`, `command = command.Name`.

   Split-button items use **`command`**, not `@Click`. Every `pv-split-button-item` has properties in this order: `label`, `icon`, `command`. No CssClass, no Style.

### 6.3. Divider row

`bs-row[grid]` → one `bs-col[col]` → single `pv-divider`:

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

### 6.4. Header (fields layout)

Build the list of **eligible** header columns:

1. Iterate `Header.Columns` in declaration order.
2. Keep only those with `RenderSettings.ShowInItem == true` (default subset; if the user explicitly narrowed the list, intersect with that selection).
3. **Operation-only exclusions** (mirror `EditFormBuilder.BuildHeader`):
   - Skip the column whose `Uid == kind.RecordsSettings.SourceCreateRecordsColumnUid` (rendered in the title row instead).
   - Skip the column with `DataSettings.PrimaryKey == true` (typically `number` — rendered in the title row expression).
   - Skip the column with `Name.toLowerCase() == "date"` (rendered in the title row expression).

Lay them out in rows of `HeaderColumnsCount` (default `3`) cells. Each row is a `bs-row[grid]` with exactly `HeaderColumnsCount` `bs-col[col]` children — the last row pads with **empty** `bs-col[col]` (no `Items`) up to `HeaderColumnsCount` (the C# loop always emits `HeaderColumnsCount` columns per row).

If `UseCollapsibleGroup = true`, wrap the whole set of `bs-row`s inside a single `bs-collapsible-group`:

```json
{
  "Id": "bs-collapsible-group-<6>",
  "DataUid": null,
  "ComponentName": "bs-collapsible-group",
  "CssClass": "",
  "Style": "",
  "Properties": [
    { "Name": "title",      "Value": "Основные" },
    { "Name": "open",       "Value": "true" },
    { "Name": "text-align", "Value": "right" }
  ],
  "Items": [ /* bs-row[grid] entries */ ]
}
```

Otherwise the rows are direct children of the root `bs-form`.

#### Form-field shape

For each eligible column, the non-empty `bs-col[col]` contains a `bs-form-field`:

```json
{
  "Id": "bs-form-field-<6>",
  "DataUid": "<column.Uid>",
  "ComponentName": "bs-form-field",
  "CssClass": "",
  "Style": "",
  "Properties": [
    { "Name": "text",       "Value": "<column.Title>" },
    { "Name": "labelCols",  "Value": "4" },
    { "Name": "labelAlign", "Value": "left" }
    // + { "Name": "required", "Value": "" } if column.DataSettings.Required
  ],
  "Items": [ /* single input element, see dispatch below */ ]
}
```

The single child is one input element. `DataUid` on the input equals `column.Uid` (same as on the wrapper).

If `column.Kind == 1` (Virtual), append `{ "Name": "disabled", "Value": "" }` to the **input** element's `Properties`.

#### Per-type input dispatch

Match by `column.DataSettings.DataTypeUid`:

| Data type | UID | Element + properties (in order) |
|---|---|---|
| **Bool** | `4bff64cf-eb01-4933-9f3d-b902336751f4` | `RenderSettings.ControlKindUid == "80ea55af-19fe-48e6-8f53-5091da45c6b7"` → `pv-input-switch` (`vModel = "$h.<name>"`, `size = "small"`); otherwise → `pv-checkbox` (`vModel = "$h.<name>"`, `binary = "true"`). |
| **Int** | `b327f82a-ea96-416f-9836-785db28eccac` | `pv-input-number` (`vModel = "$h.<name>"`, `size = "small"`, `:minFractionDigits = "0"`, `:maxFractionDigits = "0"`). |
| **Long** | `daa57cb0-32eb-4709-b61f-4ea023ae31c3` | same as **Int**. |
| **Decimal** | `a05516ac-baae-4f66-9b67-6703998a6a1b` | `pv-input-number` (`vModel`, `size = "small"`, `:minFractionDigits = "<NumberDigits>"`, `:maxFractionDigits = "<NumberDigits>"`). |
| **DateTime** | `9001eafb-efb1-442f-b288-723bb8002b12` | `pv-calendar` with `vModel = "$h.<name>"`, `size = "small"`, `showIcon = ""`, `showButtonBar = ""`, `iconDisplay = "input"`. Plus: `RenderSettings.ControlKindUid == "ee2cac4f-0749-4131-93f8-71bd5be399e6"` (DateTimeInput) → `:showTime = "true"`, `dateFormat = "dd.mm.yy hh:mm:ss"`; otherwise (DateInput / unset) → `:showTime = "false"`, `dateFormat = "dd.mm.yy"`. |
| **String** | `0234c067-7868-46b2-ba8e-e22fae5255cb` | `pv-input-text` (`vModel`, `size = "small"`). (TextArea variant — same `pv-input-text` for now, mirroring the C# TODO.) |
| **Any other primitive** (`IsPrimitive = true`) | — | `pv-input-text` (`vModel`, `size = "small"`). |
| **Reference** (`IsPrimitive = false`) | — | `bs-object-reference-select` with `vModel = "$h.<name>"`, `:text = "$h.<name>_display"`, `size = "small"`, `dataType = "<column.DataSettings.DataTypeUid>"`, plus `itemsSource = "<column.ItemsSource>"` if non-empty. |

Look up `IsPrimitive` in [system/dataTypes.json](../../../system/dataTypes.json) by `uid`.

### 6.5. Tabs row (only if `DetailTables.Any()`)

Wrap in `bs-row[grid]` → `bs-col[col]` → `pv-tab-view` (`DataUid = <object.Uid>`, no own properties). Inside the `pv-tab-view`, one `pv-tab-panel` per detail table (in declaration order):

```json
{
  "Id": "pv-tab-panel-<6>",
  "DataUid": "<table.Uid>",
  "ComponentName": "pv-tab-panel",
  "CssClass": "",
  "Style": "",
  "Properties": [
    { "Name": "header", "Value": "<table.Title>" }
  ],
  "Items": [
    /* 1. Toolbar row */,
    /* 2. Details table row */
  ]
}
```

#### Toolbar row

`bs-row[grid]` → `bs-col[col]` → `pv-toolbar`:

```json
{
  "Id": "pv-toolbar-<6>",
  "DataUid": null,
  "ComponentName": "pv-toolbar",
  "CssClass": "",
  "Style": "padding: 0.2rem; margin-bottom: 0.2rem",
  "Properties": [],
  "Items": [ /* see below */ ]
}
```

Children in this exact order:

1. **`pv-button` «+»** — `label = ""`, `icon = "pi pi-plus"`, `@Click = "standard.table_add:<table.Name>"`, `severity = "primary"`, `size = "small"`, `text = ""`, `slot = "start"`. (No `outlined`.)
2. **`pv-button` «Очистить фильтры»** — `label = ""`, `icon = "pi pi-filter-slash"`, `@Click = "standard.clear_filters:<table.Name>"`, `severity = "secondary"`, `size = "small"`, `text = ""`, `slot = "start"`. (No `outlined`.)
3. **`pv-split-button` «Действия»** — **only if at least one user command targets this table** (`command.TableUid == table.Uid`). `CssClass = "ml-1"`, properties: `label = "Действия"`, `severity = "primary"`, `size = "small"`, `outlined = "outlined"`, `slot = "start"`. One `pv-split-button-item` per command: `label = <command.Title>`, `icon = ""` (omit the property if null), `command = <command.Name>`.
4. **`bs-text`** — `text = "<table.Title>"`, `slot = "end"`.
5. **`pv-badge`** — `:value = "$t.<table.Name>?.count()"`, `severity = "primary"`, `size = "small"`, `slot = "end"`, `CssClass = "ml-1"`.

#### Details table row

`bs-row[grid]` → `bs-col[col]` → `bs-details-table`:

```json
{
  "Id": "bs-details-table-<6>",
  "DataUid": "<table.Uid>",
  "ComponentName": "bs-details-table",
  "CssClass": "",
  "Style": "",
  "Properties": [
    { "Name": ":header", "Value": "data.header" },
    { "Name": ":table",  "Value": "$t.<table.Name>" },
    { "Name": "height",  "Value": "stretch" }
  ],
  "Items": [ /* bs-table-view-column entries — see dispatch */ ]
}
```

#### Per-type details-table column dispatch

For each detail-table column with `IsStandard = false` AND `RenderSettings.ShowInItem = true`, build a `bs-table-view-column`:

```json
{
  "Id": "bs-table-view-column-<6>",
  "DataUid": "<column.Uid>",
  "ComponentName": "bs-table-view-column",
  "CssClass": "",
  "Style": "",
  "Properties": [
    { "Name": "title", "Value": "<column.Title>" }
    /* + per-type properties below, in order */
  ],
  "Items": []
}
```

| Data type | UID | Properties to append (in order) |
|---|---|---|
| **Bool** | `4bff64cf-...` | `name = <column.Name>`, `control = "input-checkbox"`, `width = <ListColumnWidth || "100px">` |
| **Int** | `b327f82a-...` | `name = <column.Name>`, `control = "input-number"`, `width = <ListColumnWidth || "120px">` |
| **Long** | `daa57cb0-...` | same as Int |
| **Decimal** | `a05516ac-...` | `name = <column.Name>`, `control = "input-number"`, `numberDigits = <NumberDigits>`, `width = <ListColumnWidth || "120px">` |
| **DateTime** | `9001eafb-...` | `name = <column.Name>`; then either the date- or date-time block below |
| **String** | `0234c067-...` | `name = <column.Name>`, `control = "input-text"`, `width = <ListColumnWidth || "auto">` |
| **Any other primitive** (`IsPrimitive = true`) | — | same as **String** |
| **Reference** (`IsPrimitive = false`) | — | `name = <column.Name>_display`, `control = "dropdown"`, `dataType = <column.DataSettings.DataTypeUid>`, `itemsSource = <column.ItemsSource>` (only if non-empty), `width = <ListColumnWidth || "auto">` |

##### DateTime sub-dispatch

- `RenderSettings.ControlKindUid == "909adf77-0b49-4a32-8a24-9e29429a2d90"` (PrimeVue.DateInput) → `control = "input-date"`, `width = <ListColumnWidth || "120px">`.
- Otherwise (DateTimeInput or empty) → `control = "input-datetime"`, `width = <ListColumnWidth || "160px">`.

Width fallback rule: if `RenderSettings.ListColumnWidth` is non-empty, use it as-is; otherwise use the per-type default shown after `||`.

##### Reference columns — `name` suffix

Reference columns are stored as `<column.Name>` (the FK id) and rendered through `<column.Name>_display` (the human-readable text resolved server-side). The `name` of a reference table-view-column **must** be `<column.Name>_display` so the grid shows titles, not raw ids.

---

## Wire ItemFormUid

After writing the form file, update the metaobject JSON:

1. Read `{kind}/{object}/{kind}.{object}.json`.
2. Replace the `"ItemFormUid": "<old-uid-or-empty-string>"` line with `"ItemFormUid": "<new-form.Uid>"` via a single `StrReplace` targeting the unique `ItemFormUid` line.
3. **Do not** touch any other field. **Do not** add anything to `system/dataTypes.json` — constructor forms are not a reference type.

---

## Building Checklist

Copy and track:

```
- [ ] Целевой объект подтверждён
- [ ] kind.{kindName}.json: UseForms = true
- [ ] Считаны kind.Title, IsReference, CanCreateRecords, AllowAttachedFiles, SourceCreateRecordsColumnUid
- [ ] Считаны objectSettings: Uid, Title, Name, Header.Uid, Header.Columns, DetailTables, Commands
- [ ] Найдены *.print_form.*.json (для split-button «Печать»)
- [ ] ItemFormUid уже стоит → подтверждена замена
- [ ] HeaderColumnsCount и UseCollapsibleGroup определены (defaults: 3 / true)
- [ ] Сгенерирован Uid формы (UUID v4) и suffix6 (уникален в папке)
- [ ] Title row собран по правилу operation / non-operation (+ «Записи» col-2 для operation)
- [ ] Buttons row: button-group + опц. кнопки (IsReference/CanCreateRecords/AllowAttachedFiles) + опц. split-button «Печать» + split-button «Действия» с header-командами
- [ ] Divider row на месте
- [ ] Header: фильтр ShowInItem=true + операционные исключения (PrimaryKey/date/create_records)
- [ ] Раскладка ровно HeaderColumnsCount колонок в строке, последний ряд добит пустыми bs-col
- [ ] UseCollapsibleGroup=true → шапка обёрнута в bs-collapsible-group «Основные»
- [ ] Per-type инпуты (Bool/Int/Long/Decimal/DateTime/String/Reference) и Virtual → disabled на инпуте
- [ ] DataUid одинаков на bs-form-field и его инпуте (= column.Uid)
- [ ] Required → атрибут required на bs-form-field
- [ ] DetailTables: каждая ТЧ → tab + toolbar (+ split-button «Действия» только при наличии table-команд) + bs-details-table
- [ ] Detail-table columns: ShowInItem=true И !IsStandard; reference-колонки → name = <name>_display
- [ ] Каждый FormElement.Id уникален в форме и совпадает с {componentName}-{6chars}
- [ ] Метаобъект: ItemFormUid обновлён единственной точечной заменой
- [ ] system/dataTypes.json не тронут
```

---

## Reference

- [constructor-forms rule](../../rules/constructor-forms.mdc) — full grammar of `FormElement`, component registry, bindings.
- [constructorFormSettings.schema.json](../../../system/schemas/constructorFormSettings.schema.json) — the schema the produced file must validate against.
- [system/dataTypes.json](../../../system/dataTypes.json) — `Uid` ↔ `IsPrimitive` lookup for type dispatch.
- Server-side builders (the source of truth for this skill):
  - `BaSys.Constructor.FormBuilders.EditFormBuilder` — overall edit-form algorithm.
  - `BaSys.Constructor.FormBuilders.FormElementFactory` — per-component constructors used by EditFormBuilder.
  - `BaSys.Constructor.FormBuilders.DetailsTableBuilder` — per-type details-table column dispatch.
- Real examples in this repo: look for files matching `*/*/*.form.edit_*.json` under the kind folders (`operation/`, `catalog/`, `register/`, …).

---

## Out of Scope

- **Adding fields / tables to an existing edit form** (the `AddHeaderField` / `AddTables` methods of `EditFormBuilder`). Future extension — keep existing element `Id`s and `DataUid`s as-is when implementing it.
- **Programmable (Vue) edit forms** — different artefact (`*.form.*.vue`, `FormKind = 0`). Never silently convert between constructor and programmable forms.
- **Auto forms** (`FormKind = -1`) — handled by the platform, no JSON to author.
- **Any edits to `system/manifest.json` or files under `system/`** — owned by the server. (Reference-type registration in `system/dataTypes.json` does not apply here: constructor forms are not a reference type.)
