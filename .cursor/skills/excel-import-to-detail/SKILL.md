---
name: excel-import-to-detail
description: >-
  Create a workflow that loads an operation's detail table from an attached Excel
  file, plus a command to invoke it. Use when the user asks to import data from
  Excel, fill a detail table from a file, or add a "load from file" button.
---

# Excel Import to Detail Table

## Prerequisites — Ask the User

Before creating anything, clarify (if not obvious from context):

1. **Target operation** — which operation receives the data? (its `name`)
2. **Detail table** — which `detailTables` entry to load into? (its `name`)
3. **Excel structure** — column headers, target field names, data types. Specifically:
   - Sheet name (default `"Лист1"`)
   - Source column headers (`sourceFieldName` — exact text in the Excel header row)
   - Destination field names (`destinationFieldName` — column names in the detail table)
   - `dataTypeUid` for each mapping row (look up in `system/dataTypes.json`)
4. **Formula columns** — inspect the target detail table's columns for any with a non-empty `formula` field. These values **must** be computed explicitly in the workflow because formulas do not auto-fire during `$t.load(source)`. If formula columns exist, a `result` step is mandatory.
5. **Post-processing** — is any other transformation needed after mapping (join, filter, etc.)? If not and there are no formula columns, the mapping step result is returned directly.

---

## Solution Structure

The solution consists of **two parts**:

### A. Workflow (server-side)

A workflow with sequential steps:

| # | Step Name | `kindName` | Purpose |
|---|-----------|----------|---------|
| 1 | `find_file` | `java_script` | Find attached file by document id |
| 2 | `read_file` | `read_file` | Read the found file |
| 3 | `mapping` | `excel_mapping` | Map Excel columns → DataTable |
| 4 | *(optional)* `result` | `java_script` | Post-processing (join, filter, etc.) |

### B. Command in the operation

A programmable command (`kind = 0`) bound to the target detail table, calling the workflow via `runWorkflow(...)`.

---

## Step 1. Create the Workflow

### Naming and location

- Name: `load_excel_{operation_name}` (or a meaningful name, ≤30 chars)
- Folder: `workflow/{name}/`
- Settings file: `workflow/{name}/workflow.{name}.json`

### JSON template

```json
{
  "$schema": "../../system/schemas/workflowSettings.schema.json",
  "uid": "<new-uuid>",
  "name": "<workflow_name>",
  "title": "<Human-readable title>",
  "memo": "Загрузка табличной части операции из прикреплённого Excel-файла",
  "isActive": true,
  "version": 1,
  "steps": [
    {
      "expression": "workflow.<name>.step.find_file.bjs",
      "uid": "<step1-uuid>",
      "previousStepUid": "",
      "kindUid": "dff616ce-0f40-4e44-a82b-14aa5ee2e4d6",
      "kindName": "java_script",
      "title": "Find file",
      "name": "find_file",
      "memo": "Поиск прикреплённого файла операции",
      "isActive": true
    },
    {
      "regime": 1,
      "outputFormat": 0,
      "attachedFileUidExpression": "_data.find_file.rows[0].uid",
      "uid": "<step2-uuid>",
      "previousStepUid": "<step1-uuid>",
      "kindUid": "800c9045-1c1c-46d0-a15f-968a43220d1a",
      "kindName": "read_file",
      "title": "Read file",
      "name": "read_file",
      "memo": "Чтение прикреплённого файла",
      "isActive": true
    },
    {
      "sourcePath": "read_file",
      "sheetName": "<sheet_name>",
      "startRow": 1,
      "endRow": 0,
      "mapping": [
        {
          "uid": "<mapping-row-uuid>",
          "sourceFieldName": "<Excel column header>",
          "destinationFieldName": "<target_field_name>",
          "dataTypeUid": "<uuid from system/dataTypes.json>"
        }
      ],
      "uid": "<step3-uuid>",
      "previousStepUid": "<step2-uuid>",
      "kindUid": "762db492-58b2-4e7e-86ca-0b80b0e3aaae",
      "kindName": "excel_mapping",
      "title": "mapping",
      "name": "mapping",
      "memo": "Маппинг колонок Excel в таблицу данных",
      "isActive": true
    }
  ]
}
```

### find_file step script

File: `workflow.{name}.step.find_file.bjs`

```javascript
var fileData = await from("operation.<operation_name>.attached_files")
  .select(['uid', 'filename'])
  .where("objectuid = @id")
  .parameter("id", _parameters.id, 11)
  .query();

return fileData;
```

Key points:
- `operation.<operation_name>.attached_files` — attached files table of the target operation.
- `_parameters.id` — the document identifier passed from the command.
- Parameter type `11` = `Int32`.

### formula columns — important

Column formulas defined in the operation's detail table settings (`formula` field on columns) **do not fire automatically** when data is loaded via `$t.load(source)`. Therefore, if the detail table has columns with formulas, the workflow **must** compute those values explicitly and include them in the returned `DataTable`.

Typical approach:
1. Check the target detail table's columns for any that have a non-empty `formula`.
2. In the `result` step (or in a dedicated post-processing step), iterate over the mapped rows and calculate those values using the same logic as the formula.
3. Include the computed columns in the `DataTable` returned by the workflow.

This means the `result` step is **mandatory** whenever the target detail table has formula columns — even if no other post-processing (join, filter, etc.) is needed.

### Optional result step script

Add when post-processing is needed (join, column removal, filtering, computed formula columns, etc.). If the mapping output is already the final result **and** the target detail table has no formula columns, make `mapping` the last step. Otherwise, add a `result` step.

File: `workflow.{name}.step.result.bjs`

```javascript
// Example: join mapping data with another table
return _data.some_table
  .innerJoin(_data.mapping, (pr, jr) => pr.field == jr.field)
  .deleteColumn('extra_column');
```

```javascript
// Example: compute formula columns (amount = quantity * price)
var dt = _data.mapping;
for (var i = 0; i < dt.rows.length; i++) {
  var row = dt.rows[i];
  row.amount = (row.quantity || 0) * (row.price || 0);
}
return dt;
```

---

## Step 2. Create the Command in the Operation

### commands entry (in the operation JSON)

```json
{
  "uid": "<new-uuid>",
  "tableUid": "<uid of the target detail table>",
  "kind": 0,
  "title": "Заполнить из файла",
  "name": "load_from_file",
  "expression": "operation.<operation_name>.command.load_from_file.bjs",
  "memo": "Загрузка данных из прикреплённого Excel-файла",
  "isActive": true,
  "parameters": [
    {
      "name": "data_source",
      "value": "",
      "dbType": 16
    },
    {
      "name": "clear",
      "value": "false",
      "dbType": 3
    }
  ]
}
```

### Command body (.bjs)

File: `operation.{operation_name}.command.load_from_file.bjs`

```javascript
setIsWaiting(true);
var source = await runWorkflow('<workflow_name>',
                               '<last_step_name>',
                               [{name: 'id',
                                 dataType: 'integer',
                                 value: $h.number}]);
setIsWaiting(false);
$t.<detail_table_name>.load(source);
setIsModified(true);
```

Where:
- `<workflow_name>` — the workflow's `name`.
- `<last_step_name>` — `name` of the final step whose result is the ready DataTable (typically `mapping` or `result`).
- `$h.number` — standard `number` column of the operation header, used as the document identifier for file lookup.
- `$t.<detail_table_name>.load(source)` — loads the result into the detail table.

---

## Checklist

- [ ] Workflow JSON validates against `workflowSettings.schema.json`
- [ ] All Uid values are unique fresh UUID v4
- [ ] `previousStepUid` forms a chain (first = `""`)
- [ ] `.bjs` files follow naming: `workflow.{name}.step.{stepName}.bjs`
- [ ] `expression` in JSON matches the actual filename
- [ ] `find_file.bjs` references the correct operation (`operation.<name>.attached_files`)
- [ ] `dataTypeUid` values in Mapping are taken from `system/dataTypes.json`
- [ ] Command is bound to the correct detail table (`tableUid`)
- [ ] `runWorkflow` call references the correct workflow name and step
- [ ] Formula columns of the target detail table are computed explicitly in the workflow (formulas do not auto-fire on `$t.load`)
- [ ] `memo` is filled (in Russian) for the workflow, steps, and command
