import express, { Express, Request, Response } from "express";
import Datastore from "nedb";
import path from "path";
import bodyParser from "body-parser";
import moment from "moment";
import { generateChartData } from "./engine/chart";
import { getAllData, getIndexData, getShortcutData } from "./engine/data";
import { getAddData, getDailyFormData } from "./engine/forms";
import { getCategoryToEdit, getRecordToEdit, getVariableToEdit } from "./engine/edit";
import { generateScalarHeatmapData } from "./engine/heatmap";

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

    res.render('index', getIndexData(categories, variables, records));
});

app.get('/add', (req: Request, res: Response) => {
    res.render('add', getAddData(categories, variables));
});

app.get('/shortcuts', (req: Request, res: Response) => {
    res.render('shortcuts', { shortcutData: getShortcutData(categories, variables)});
});

app.get('/daily', (req: Request, res: Response) => {
    labels.loadDatabase();
    res.render('daily', getDailyFormData(labels, variables));
});

app.get('/heatmap', (req: Request, res: Response) => {
    res.render('heatmap', generateScalarHeatmapData(categories, variables, records));
});

app.get('/charts', (req: Request, res: Response) => {
    categories.loadDatabase();
    variables.loadDatabase();
    records.loadDatabase();
    res.render('charts', generateChartData(categories, variables, records));
});

app.get('/all', (req: Request, res: Response) => {
    res.render('all', { records: getAllData(records.getAllData()) });
});

app.get('/edit/category/:id', (req: Request, res: Response) => {
    res.render('edit', getCategoryToEdit(categories, req.params.id));
});

app.get('/edit/variable/:id', (req: Request, res: Response) => {
    res.render('edit', getVariableToEdit(categories, variables, req.params.id));
});

app.get('/edit/record/:id', (req: Request, res: Response) => {
    res.render('edit', getRecordToEdit(variables, records, req.params.id));
});

app.post('/add/category', (req: Request, res: Response) => {
    categories.insert(req.body);
    res.redirect('/add');
});

app.post('/add/variable', (req: Request, res: Response) => {
    variables.insert(req.body);
    res.redirect('/add');
});

app.post('/add', (req: Request, res: Response) => {
    if (req.body.date && req.body.time) {
        records.insert({
            variable: req.body.variable,
            data: req.body.data,
            timestamp: moment(req.body.date + ' ' + req.body.time).valueOf()
        });
    } else {
        records.insert(req.body);
    }
    res.redirect('/all');
});

app.post('/add/history', (req: Request, res: Response) => {
    const variable = req.body.variable;
    delete req.body.variable;

    var currentDate: String = new String();
    for (const [key, value] of Object.entries(req.body)) {
        if (key.startsWith('day')) {
            currentDate = new String(value);
        } else {
            const datetime = moment(currentDate.valueOf()).add(12, 'hours').valueOf();
            records.insert({ variable: variable, data: value, timestamp: datetime });
        }
    }
    res.redirect('/all');
});

app.post('/edit/variable/:id', (req: Request, res: Response) => {
    variables.update({ _id: req.params.id }, req.body);
    res.redirect('/');
});

app.post('/edit/category/:id', (req: Request, res: Response) => {
    var cat_to_update = categories.getAllData().find(c => c._id == req.params.id);
    categories.update({ _id: req.params.id }, req.body);
    if (cat_to_update.color != req.body.color) {
        // update color for all variables in this category
        variables.update({ category: req.params.id, shortcut: "0" }, { $set: { color: req.body.color }}, { multi: true });
    }
    res.redirect('/');
});

app.post('/edit/record/:id', (req: Request, res: Response) => {
    records.update({ _id: req.params.id }, {
        $set: { 
            data: req.body.data,
            timestamp: moment(req.body.date + ' ' + req.body.time).valueOf()
        }
    });
    res.redirect('/all');
});

app.post('/daily', (req: Request, res: Response) => {
    const timestamp = moment(req.body.date + ' ' + req.body.time).valueOf();
    delete req.body.date;
    delete req.body.time;
    for (const [key, value] of Object.entries(req.body)) {
        records.insert({ variable: key, data: value, timestamp });
    }
    res.redirect('/all');
});

app.post('/delete/variable/:id', (req: Request, res: Response) => {
    variables.update({ _id: req.params.id }, { $set: { deleted: true }} );
    res.redirect('/');
});

app.post('/delete/record/:id', (req: Request, res: Response) => {
    records.remove({ _id: req.params.id });
    res.redirect('/all');
});

app.use(express.static(__dirname + '/public'));

app.listen(process.env.PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${process.env.PORT}`);
});