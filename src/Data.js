function DataModelFactory_(sheetId, spreadsheet, toObject, toRow) {
    const ss = SpreadsheetApp.openById(sheetId).getSheetByName(spreadsheet);

    const width = ss.getLastColumn();
    const columns = ss.getRange(1, 1, 1, width).getValues()[0];
    const objectToRow = toRow || (data => columns.map(col => data[col] == null ? '' : data[col] ));
    const rowToObject = toObject || ((data, index) => data.reduce((acc, val, index) => { acc[columns[index]] = val; return acc; },{ index: index + 1 }));

    return {
        all: () => 
           ss.getDataRange().getDisplayValues().splice(1).map(rowToObject),
        find: (column, value) => {
            const finder = ss.getRange(1, columns.indexOf(column) + 1, ss.getLastRow(), 1).createTextFinder(value);
            return finder.findAll().map(r => r.getRow()-1).map(index => {
                const res = ss.getRange(index+1, 1, 1, width).getDisplayValues().map(rowToObject);
                return {...res[0], index: index};
            })
        },
        get: index => {
            const res = ss.getRange(index+1, 1, 1, width).getDisplayValues().map(rowToObject);
            if (res.length) return {...res[0], index};
            return null;
        },
        create: data =>
            ss.appendRow(objectToRow(data)),
        update: (index, data) => {
            Object.keys(data).map(key => {
                const value = data[key];
                if (columns.indexOf(key) >=0)
                    ss.getRange(index + 1, columns.indexOf(key)+1).setValue(value);
            })
        },
        destroy: (index) => {
            ss.deleteRow(index + 1);
        }
    }
}


function Data_(sheetId, spreadsheet = [], mappers = {}) {
    return spreadsheet.reduce((acc, val) => { acc[val] = DataModelFactory_(sheetId, val, mappers[val]); return acc; }, {});
}

function ModelRelations_(models, relations) {
    const modelsWithRelations = {...models};
    Object.keys(models).map(modelName => {
        const relation = relations[modelName];
        if (relation && relation.column) {
            modelsWithRelations[modelName] = {
                ...modelsWithRelations[modelName],
                all: () => models[modelName].all().map(row => ({...row, [relation.column]: row[relation.column].split(',').map(index => models[relation.column].get(Number(index)) )})),
                get: (index) => {
                    const row = models[modelName].get(index);
                    return {...row, [relation.column]: row[relation.column].split(',').map(index => models[relation.column].get(Number(index)) )};
                },
                create: (data) => {
                    models[modelName].create(data);
                    const index = ss.getLastRow() - 1;
                    if (data[relation.column]) {
                        data[relation.column].map(Number).map(relatedIndex => {
                            const relatedElement = models[relation.column].get(relatedIndex);
                            const newRelated = [...relatedElement[modelName].split(','), index];
                            models[relation.column].update(relatedIndex, { [modelName]: newRelated.join(',') });
                        })
                    }
                },
                update: (index, data) => {
                    if (data[relation.column] !== null) {
                        // update other side of relation respectively
                        const element = models[modelName].get(index);

                        const currentRelatedIndexes = element[relation.column].split(',');
                        const nextRelatedIndexes = data[relation.column].split(',');
                        
                        const toAdd = nextRelatedIndexes.filter(i => i.length && !currentRelatedIndexes.includes(i));
                        const toRemove = currentRelatedIndexes.filter(i => i.length && !nextRelatedIndexes.includes(i));

                        toRemove.map(Number).map(relatedIndex => {
                            const relatedElement = models[relation.column].get(relatedIndex);
                            const newRelated = relatedElement[modelName].split(',').map(Number).filter(i => i !== index);
                            models[relation.column].update(relatedIndex, { [modelName]: newRelated.join(',') });
                        })

                        toAdd.map(Number).map(relatedIndex => {
                            const relatedElement = models[relation.column].get(relatedIndex);
                            const newRelated = [...relatedElement[modelName].split(','), index];
                            models[relation.column].update(relatedIndex, { [modelName]: newRelated.join(',') });
                        })
                    }
                    models[modelName].update(index, data);
                },
                destroy: (index) => {
                    const element =  models[modelName].get(index);
                    
                    //destroy relation on foreign side
                    element[relation.column].split(',').map(Number).map(relatedIndex => {
                        const relatedElement = models[relation.column].get(relatedIndex);
                        const newRelated = relatedElement[modelName].split(',').filter(i => Number(i) !== index);
                        models[relation.column].update(relatedIndex, { [modelName]: newRelated.join(',') });
                    })
                    models[modelName].destroy(index);
                }
            }
        }
    });
    return modelsWithRelations;
}