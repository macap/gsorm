var fs = require('fs');
eval(fs.readFileSync('src/Data.js')+'');

const spreadsheets = () => ({
    names: [
        ["name", "surname", "email", "projects"],
        ["john", "doe", "johndoe@msn.com", "1"],
        ["1john", "dean", "johndoe@msn.com", "1"],
        ["2john", "dean", "johndoe@msn.com", "2"],
    ],
    projects: [
        ["name", "names"],
        ["Foo", "1,2"],
        ["Bar", "3"],
    ],
});

global.SpreadsheetApp = {
    openById: sheetId => ({
        getSheetByName: spreadsheet => {
            let data = spreadsheets()[spreadsheet];
            return {
                getDataRange: () => ({
                    getDisplayValues: () => [...data],
                }),
                // returns first row:
                getRange: (x,y,z,s) => ({
                    getValues: () => {
                      if (x ===1 && y === 1 && z === 1) return [...data];
                      if (x > 1) {
                          //get
                          return [data[x-1]];
                      }
                    },
                    setValue: (value) => {
                        data[x - 1][y - 1] = value;
                    },
                    getDisplayValues: () => {
                        return data[x-1] ? [data[x-1]] : [];
                    },
                    createTextFinder: (value) => ({
                        findAll: () => {
                            const res = [];
                            data.forEach((el, index) => {
                                if (el[y - 1] === value) {
                                    res.push({
                                        getRow: () => index + 1
                                    })
                                }
                            });
                            return res;
                        }
                    }),
                }),
                appendRow: (row) => {
                    data = [...data, row];
                },
                deleteRow: (index) => {
                    data.splice(index - 1, 1);
                },
                getLastColumn: () => data[0].length,
                getLastRow: () => data.length,
            }
        }
    }) 
};

describe('DataModelFactory_', () => {
    const model = DataModelFactory_('test', 'names');
    it('works', () => {
        expect(model.all()).toEqual([            
            { email: "johndoe@msn.com", index: 1, name: "john", surname: "doe", projects: "1"},
            { email: "johndoe@msn.com", index: 2, name: "1john", surname: "dean", projects: "1"},
            { email: "johndoe@msn.com", index: 3, name: "2john", surname: "dean", projects: "2"},
        ]);
    })
    it('gets one value', () => {
        expect(model.get(2)).toEqual(
            { email: "johndoe@msn.com", index: 2, name: "1john", surname: "dean", projects: "1"}
        );
    });
    it('updates value', () => {
        model.update(1, { projects: ''});
        expect(model.get(1)).toEqual({ email: "johndoe@msn.com", index: 1, name: "john", surname: "doe", projects: ""});
    });
    it('gets all with filter', () => {
        expect(model.find('surname','dean')).toEqual([
            { email: "johndoe@msn.com", index: 2, name: "1john", surname: "dean", projects: "1"},
            { email: "johndoe@msn.com", index: 3, name: "2john", surname: "dean", projects: "2"} 
        ])
    })
    it('destroys value', () => {
        const element = model.get(1);
        model.destroy(1);
        expect(model.get(1)).not.toEqual(element);
    });

});


const relations = {
    projects: {
        column: 'names',
    },
    names: {
        column: 'projects',
    }
}

describe('Data_', () => {
    let models;
    let decModels;
    beforeEach(() => {
        models = Data_('dd', ['names', 'projects']);
        decModels = ModelRelations_(models, relations);
    });
    it('creates model', () => {
        expect(models.names).toBeDefined();
        expect(models.projects).toBeDefined();
    });
    it('decorates projects', () => {
        expect(decModels.projects.all()).toEqual([ { index: 1,
            name: 'Foo',
            names:
             [  { index: 1,
                   name: 'john',
                   surname: 'doe',
                   email: 'johndoe@msn.com',
                   projects: '1' } ,
                { index: 2,
                   name: '1john',
                   surname: 'dean',
                   email: 'johndoe@msn.com',
                   projects: '1' }  ] },
          { index: 2,
            name: 'Bar',
            names:
             [  { index: 3,
                   name: '2john',
                   surname: 'dean',
                   email: 'johndoe@msn.com',
                   projects: '2' } ] } ]);
        expect(decModels.names.all()).toEqual([ { index: 1,
            name: 'john',
            surname: 'doe',
            email: 'johndoe@msn.com',
            projects: [  { index: 1, name: 'Foo', names: '1,2' }  ] },
          { index: 2,
            name: '1john',
            surname: 'dean',
            email: 'johndoe@msn.com',
            projects: [  { index: 1, name: 'Foo', names: '1,2' }  ] },
          { index: 3,
            name: '2john',
            surname: 'dean',
            email: 'johndoe@msn.com',
            projects: [ { index: 2,
                name: 'Bar', names: '3'} ] } ]);
    });
    it('destroys other side of relation', () => {
        expect(models.projects.get(2).names).toEqual("3");
        decModels.names.destroy(3);
        expect(models.names.get(3)).toBeNull();
        expect(models.projects.get(2).names).toEqual("");
    });
    it('adds foreign relation on update', () => {
        expect(models.projects.get(1).names).toEqual("1,2");
        
        decModels.names.update(3, {projects: "1,2"});
       
        expect(models.projects.get(1).names).toEqual("1,2,3");
        expect(models.names.get(3).projects).toEqual("1,2");
    });
    it('destroys foreing relation on update', () => {
        expect(models.projects.get(2).names).toEqual("3");
        
        decModels.names.update(3, {projects: ""});
        
        expect(models.projects.get(2).names).toEqual("");
        expect(models.names.get(3).projects).toEqual("");
    })
});