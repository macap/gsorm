# gsorm
ORM for Spreadsheet in Google App Script

## Overview

It automatically maps your sheet to javascript objects, using field names defined in first row. Allows you to easily do CRUD operations on your sheets.

## Usage

### Initialize model

```
const Model = Data_("SomeGoogleSpreadSheetId", ['foo', 'bar']);
```

foo, bar are sheet names you will use as a model. First row should contain field names

### Use

```
// Get all objects
Model.foo.all();
// Update name column in first row with value "test" 
Model.foo.update(1, { name: "test" });
// Get name from first row
Model.foo.get(1).name;
// Remove first row
Model.foo.destroy(1);
// Create new row with value "test" in column "name"
Model.foo.create({name: "test"});
// Find row with value "test" in column "name"
Model.foo.find("name", "test");
```


## Development

Tests:

```yarn test```
