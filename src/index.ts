import express, { Express, Request, Response } from "express";
import ngrok from "@ngrok/ngrok";
import Datastore from "nedb";
import path from "path";
import bodyParser from "body-parser";
import moment from "moment";
import { insertRecord, generateStackedBooleanBarData, generateStackedHighLowData, generateScalarData } from "./functions";

const app: Express = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const labels = new Datastore({ filename: 'labels.db', autoload: true });
const categories = new Datastore({ filename: 'categories.db', autoload: true });
const variables = new Datastore({ filename: 'variables.db', autoload: true });
const records = new Datastore({ filename: 'records.db', timestampData: true, autoload: true });

app.get('/', (req: Request, res: Response) => {
    categories.loadDatabase();
    variables.loadDatabase();
    records.loadDatabase();

    const categoryData = categories.getAllData().sort((a, b) => a.group.localeCompare(b.group));

    const catMap: Map<string, string> = new Map();
    categoryData.forEach(c => {
        catMap.set(c._id, c.name);
    });

    const variableData = variables.getAllData()
        .filter(v => !v.deleted)
        .sort((a, b) => a.category.localeCompare(b.category))
        .map(v => {
            const variable = v;
            variable.category = catMap.get(v.category);   
            return variable;
        });

    const fortyEightHoursAgo = moment().subtract(48, 'hours').startOf('day').valueOf();

    const recordData = records.getAllData()
        .filter(r => r.updatedAt > fortyEightHoursAgo)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(record => {
            return {
                'variable': record['variable'],
                'data': record['data'],
                'moment': moment(record['updatedAt']).format("MMM Do h:mm A").toString()
            }
        });
    res.render('index', {
        records: recordData,
        variables: variableData,
        categories: categoryData
      });
});

app.get('/add', (req: Request, res: Response) => {
    const varData = variables.getAllData();
    const catData = categories.getAllData().map(c => {
        return {
            id: c._id,
            name: c.name
        };
    });
    res.render('add', {
        variables: varData,
        categories: catData
      });
});

app.get('/edit/category/:id', (req: Request, res: Response) => {
    var cat_to_edit = categories.getAllData().find(c => c._id == req.params.id);
    res.render('edit', {
        type: 'category',
        category: cat_to_edit
    });
});

app.get('/edit/variable/:id', (req: Request, res: Response) => {

    var var_to_edit: any = {};
    const catData = categories.getAllData().map(c => {
        return {
            id: c._id,
            name: c.name,
            color: c.color
        };
    });
    var color;
    const var_types: string[] = [];
    const sub_types: string[] = [];
    variables.getAllData()
        .forEach(variable => {
            var_types.push(variable.type);
            sub_types.push(variable.subtype);
            if (variable._id == req.params.id) {
                var_to_edit = variable;
                if (variable.color != "#000000") {
                    color = variable.color;
                }
            }
        });

    if (!color) {
        color = catData.find(c => c.name == var_to_edit.category || c.id == var_to_edit.category)!.color;
    }
    res.render('edit', {
        type: 'variable',
        color: color,
        variable: var_to_edit,
        categories: catData,
        types: new Set(var_types),
        subtypes: new Set(sub_types)
    });
});

app.get('/shortcuts', (req: Request, res: Response) => {

    const categoryData = categories.getAllData().sort((a, b) => a.group.localeCompare(b.group));

    const catMap = new Map<string, { name: string, color: string }>();
    categoryData.forEach(c => {
        catMap.set(c._id, { name: c.name, color: c.color });
    });

    const varData = variables.getAllData()
        .filter(v => !v.deleted && v.shortcut == '1')
        .map(v => {
            return { variable: v.variable, color: v.color, category: catMap.get(v.category)!.name };
        })
        .sort((a, b) => a.category.localeCompare(b.category));

    const shortcutData: Map<string, { variable: string, color: string}[]> = new Map();
    varData.forEach(v => {
        if (!shortcutData.has(v.category!)) {
            shortcutData.set(v.category!, []);
        }
        shortcutData.get(v.category!)!.push({ variable: v.variable, color: v.color });
    });

    res.render('shortcuts', {
        shortcutData: shortcutData
    });
});

app.get('/daily', (req: Request, res: Response) => {
    const highLowLabels = labels.getAllData().find(label => label.type == 'high_low').labels;
    const morningVariables: any[] = [];
    const eveningVariables: any[] = [];
    variables.getAllData()
        .filter(v => v.subtype)
        .sort((a, b) => a.subtype.localeCompare(b.subtype))
        .forEach(variable => {
            if (variable.morning == "1") {
                morningVariables.push({ name: variable.variable, type: variable.subtype });
            }
            if (variable.evening == "1") {
                eveningVariables.push({ name: variable.variable, type: variable.subtype });
            }
        });
    res.render('daily', {
        highLowLabels,
        morningVariables,
        eveningVariables
    });
});

app.get('/chart', (req: Request, res: Response) => {

    var catColorMap = new Map<string, string>(); // category ID -> color
    categories.getAllData()
        .forEach(category => {
            catColorMap.set(category._id, category.color);
        });

    var highLowColorMap: Map<string, string> = new Map();
    var scalarColorMap: Map<string, string> = new Map();
    var booleanColorMap: Map<string, string> = new Map();

    var highLowCatMap: Map<string, string> = new Map();
    var booleanCatMap: Map<string, string> = new Map();
    var posNegMap: Map<string, boolean> = new Map();

    variables.getAllData()
        .forEach(variable => {
            if (variable.subtype == 'high_low') {
                highLowColorMap.set(variable.variable, catColorMap.get(variable.category)!);
                highLowCatMap.set(variable.variable, variable.category);
                posNegMap.set(variable.variable, variable.sign == 'positive' ? true : false);
            } else if (variable.type == 'scalar') {
                scalarColorMap.set(variable.variable, catColorMap.get(variable.category)!);
                posNegMap.set(variable.variable, variable.sign == 'positive' ? true : false);
            } else if (variable.type == 'boolean') {
                booleanColorMap.set(variable.variable, catColorMap.get(variable.category)!);
                booleanCatMap.set(variable.variable, variable.category);
                posNegMap.set(variable.variable, variable.sign == 'positive' ? true : false);
            }
        });
    
    const allRecords = records.getAllData();
    var highLowSets = generateStackedHighLowData(highLowCatMap, posNegMap, highLowColorMap, allRecords);
    var scalarSets = generateScalarData(scalarColorMap, posNegMap, allRecords);
    var booleanSets = generateStackedBooleanBarData(booleanCatMap, posNegMap, booleanColorMap, allRecords);

    res.render('chart', {
        highLowData: highLowSets,
        scalarData: scalarSets,
        booleanData: booleanSets
    });
});

app.post('/add/category', (req: Request, res: Response) => {
    categories.insert(req.body);
    res.redirect('/add');
});

app.post('/add/variable', (req: Request, res: Response) => {
    variables.insert(req.body);
    res.redirect('/add');
});

app.post('/add/boolean', (req: Request, res: Response) => {
    insertRecord(req.body, records, 'boolean');
    res.redirect('/');
});

app.post('/add/scalar', (req: Request, res: Response) => {
    insertRecord(req.body, records, 'scalar');
    res.redirect('/');
});

app.post('/edit/variable/:id', (req: Request, res: Response) => {
    variables.update({ _id: req.params.id }, req.body);
    res.redirect('/');
});

app.post('/edit/category/:id', (req: Request, res: Response) => {
    categories.update({ _id: req.params.id }, req.body);
    res.redirect('/');
});

app.post('/daily', (req: Request, res: Response) => {
    for (const [key, value] of Object.entries(req.body)) {
        records.insert({ variable: key, data: value });
    }
    res.redirect('/');
});

app.post('/delete/variable/:id', (req: Request, res: Response) => {
    variables.update({ _id: req.params.id }, { $set: { deleted: true }} );
    res.redirect('/');
});

app.use(express.static(__dirname + '/public'));

app.listen(process.env.PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${process.env.PORT}`);
});