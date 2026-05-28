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

1. **Target operation** — which operation receives the data? (its `Name`)
2. **Detail table** — which `DetailTables` entry to load into? (its `Name`)
3. **Excel structure** — column headers, target field names, data types. Specifically:
   - Sheet name (default `"Лист1"`)
   - Source column headers (`SourceFieldName` — exact text in the Excel header row)
   - Destination field names (`DestinationFieldName` — column names in the detail table)
   - `DataTypeUid` for each mapping row (look up in `system/dataTypes.json`)
4. **Formula columns** — inspect the target detail table's columns for any with a non-empty `Formula` field. These values **must** be computed explicitly in the workflow because formulas do not auto-fire during `$t.load(source)`. If formula columns exist, a `result` step is mandatory.
5. **Post-processing** — is any other transformation needed after mapping (join, filter, etc.)? If not and there are no formula columns, the mapping step result is returned directly.

---

## Solution Structure

The solution consists of **two parts**:

### A. Workflow (server-side)

A workflow with sequential steps:

| # | Step Name | KindName | Purpose |
|---|-----------|----------|---------|
| 1 | `find_file` | `java_script` | Find attached file by document id |
| 2 | `read_file` | `read_file` | Read the found file |
| 3 | `mapping` | `excel_mapping` | Map Excel columns → DataTable |
| 4 | *(optional)* `result` | `java_script` | Post-processing (join, filter, etc.) |

### B. Command in the operation

A programmable command (`Kind = 0`) bound to the target detail table, calling the workflow via `runWorkflow(...)`.

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
  "Uid": "<new-uuid>",
  "Name": "<workflow_name>",
  "Title": "<Human-readable title>",
  "Memo": "Загрузка табличной части операции из прикреплённого Excel-файла",
  "IsActive": true,
  "Version": 1,
  "Steps": [
    {
      "Expression": "workflow.<name>.step.find_file.bjs",
      "Uid": "<step1-uuid>",
      "PreviousStepUid": "",
      "KindUid": "dff616ce-0f40-4e44-a82b-14aa5ee2e4d6",
      "KindName": "java_script",
      "Title": "Find file",
      "Name": "find_file",
      "Memo": "Поиск прикреплённого файла операции",
      "IsActive": true
    },
    {
      "Regime": 1,
      "OutputFormat": 0,
      "AttachedFileUidExpression": "_data.find_file.rows[0].uid",
      "Uid": "<step2-uuid>",
      "PreviousStepUid": "<step1-uuid>",
      "KindUid": "800c9045-1c1c-46d0-a15f-968a43220d1a",
      "KindName": "read_file",
      "Title": "Read file",
      "Name": "read_file",
      "Memo": "Чтение прикреплённого файла",
      "IsActive": true
    },
    {
      "SourcePath": "read_file",
      "SheetName": "<sheet_name>",
      "StartRow": 1,
      "EndRow": 0,
      "Mapping": [
        {
          "Uid": "<mapping-row-uuid>",
          "SourceFieldName": "<Excel column header>",
          "DestinationFieldName": "<target_field_name>",
          "DataTypeUid": "<uuid from system/dataTypes.json>"
        }
      ],
      "Uid": "<step3-uuid>",
      "PreviousStepUid": "<step2-uuid>",
      "KindUid": "762db492-58b2-4e7e-86ca-0b80b0e3aaae",
      "KindName": "excel_mapping",
      "Title": "Mapping",
      "Name": "mapping",
      "Memo": "Маппинг колонок Excel в таблицу данных",
      "IsActive": true
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

### Formula columns — important

Column formulas defined in the operation's detail table settings (`Formula` field on columns) **do not fire automatically** when data is loaded via `$t.load(source)`. Therefore, if the detail table has columns with formulas, the workflow **must** compute those values explicitly and include them in the returned `DataTable`.

Typical approach:
1. Check the target detail table's columns for any that have a non-empty `Formula`.
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

### Commands entry (in the operation JSON)

```json
{
  "Uid": "<new-uuid>",
  "TableUid": "<Uid of the target detail table>",
  "Kind": 0,
  "Title": "Заполнить из файла",
  "Name": "load_from_file",
  "Expression": "operation.<operation_name>.command.load_from_file.bjs",
  "Memo": "Загрузка данных из прикреплённого Excel-файла",
  "IsActive": true,
  "Parameters": [
    {
      "Name": "data_source",
      "Value": "",
      "DbType": 16
    },
    {
      "Name": "clear",
      "Value": "false",
      "DbType": 3
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
- `<workflow_name>` — the workflow's `Name`.
- `<last_step_name>` — `Name` of the final step whose result is the ready DataTable (typically `mapping` or `result`).
- `$h.number` — standard `number` column of the operation header, used as the document identifier for file lookup.
- `$t.<detail_table_name>.load(source)` — loads the result into the detail table.

---

## Checklist

- [ ] Workflow JSON validates against `workflowSettings.schema.json`
- [ ] All Uid values are unique fresh UUID v4
- [ ] `PreviousStepUid` forms a chain (first = `""`)
- [ ] `.bjs` files follow naming: `workflow.{name}.step.{stepName}.bjs`
- [ ] `Expression` in JSON matches the actual filename
- [ ] `find_file.bjs` references the correct operation (`operation.<name>.attached_files`)
- [ ] `DataTypeUid` values in Mapping are taken from `system/dataTypes.json`
- [ ] Command is bound to the correct detail table (`TableUid`)
- [ ] `runWorkflow` call references the correct workflow name and step
- [ ] Formula columns of the target detail table are computed explicitly in the workflow (formulas do not auto-fire on `$t.load`)
- [ ] `Memo` is filled (in Russian) for the workflow, steps, and command
