import express, { Express, Request, Response } from "express";
import ngrok from "@ngrok/ngrok";
import Datastore from "nedb";
import path from "path";
import bodyParser from "body-parser";
import moment from "moment";
import { insertRecord, generateStackedBooleanBarData, generateScalarData } from "./functions";
import { Medicine, Bowel, Intake, Self, Sleep, Activity } from "./constants";
import { types } from "util";

const app: Express = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));

const variables = new Datastore({ filename: 'variables.db', autoload: true });
const records = new Datastore({ filename: 'records.db', autoload: true, timestampData: true });

app.get('/', (req: Request, res: Response) => {
    const recordData = records.getAllData()
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(record => {
            return {
                'variable': record['variable'],
                'data': record['data'],
                'moment': moment(record['updatedAt']).format("MMM Do h:mm A").toString()
            }
        });
    const variableData = variables.getAllData().sort((a, b) => a.category.localeCompare(b.category));
    res.render('index', {
        records: recordData,
        variables: variableData
      });
});

app.get('/add', (req: Request, res: Response) => {
    const data = variables.getAllData();
    const categories = data.map(entry => entry.category);
    res.render('add', {
        variables: data,
        categories: new Set(categories)
      });
});

app.get('/edit/variable/:id', (req: Request, res: Response) => {
    var var_to_edit = {};
    const categories: string[] = [];
    const var_types: string[] = [];
    const sub_types: string[] = [];
    variables.getAllData()
        .forEach(variable => {
            categories.push(variable.category);
            var_types.push(variable.type);
            sub_types.push(variable.subtype);
            if (variable._id == req.params.id) var_to_edit = variable; 
        });
    res.render('edit', {
        variable: var_to_edit,
        categories: new Set(categories),
        types: new Set(var_types),
        subtypes: new Set(sub_types)
    });
});

app.get('/shortcuts', (req: Request, res: Response) => {
    res.render('shortcuts', {
        bowel: {
            name: Bowel.BOWEL,
            diarrhea: Bowel.DIARRHEA,
            normal: Bowel.NORMAL
        },
        self: {
            name: Self.SELF,
            bath: Self.BATH,
            nails: Self.NAILS,
            nap: Self.NAP
        },
        medicine: {
            name: Medicine.MEDICINE,
            wellbutrin: Medicine.WELLBUTRIN,
            vit_d: Medicine.VIT_D,
            digest: Medicine.DIGEST,
            flonase: Medicine.FLONASE,
            vitex: Medicine.VITEX,
            zyrtec: Medicine.ZYRTEC
        },
        intake: {
            name: Intake.INTAKE,
            water: Intake.WATER,
            coffee: Intake.COFFEE,
            vegetable: Intake.VEGETABLE,
            fruit: Intake.FRUIT,
            soda: Intake.SODA,
            liquor: Intake.LIQUOR,
            wine: Intake.WINE,
            juice: Intake.JUICE
        },
        activity : {
            name: Activity.ACTIVITY,
            pt: Activity.PT,
            skin: Activity.SKIN,
            hair: Activity.HAIR
        },
        variable: "variable"
    });
});

app.get('/daily', (req: Request, res: Response) => {
    res.render('daily');
});

app.get('/chart', (req: Request, res: Response) => {

    var scalarCatMap: Map<string, string> = new Map();
    var booleanCatMap: Map<string, string> = new Map();
    var posNegMap: Map<string, boolean> = new Map();

    variables.getAllData()
        .forEach(variable => {
            if (variable.type == 'scalar') {
                scalarCatMap.set(variable.variable, variable.subtype);
            } else if (variable.type == 'boolean') {
                booleanCatMap.set(variable.variable, variable.category);
                posNegMap.set(variable.variable, variable.subtype == 'positive' ? true : false);
            }
        });
    
    var scalarSets = generateScalarData(scalarCatMap, records.getAllData());
    var booleanSets = generateStackedBooleanBarData(booleanCatMap, posNegMap, records.getAllData());

    res.render('chart', {
        scalarData: scalarSets,
        booleanData: booleanSets
    });
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

app.post('/add/text', (req: Request, res: Response) => {
    insertRecord(req.body, records, 'text');
    res.redirect('/');
});

app.post('/edit/variable/:id', (req: Request, res: Response) => {
    variables.update({ _id: req.params.id }, req.body);
    res.redirect('/');
});

app.post('/daily/morning', (req: Request, res: Response) => {
    // parse form data
    const dreams = { variable: Sleep.DREAMS, data: req.body['dreams'] };
    const quality = { variable: Sleep.QUALITY, data: req.body['quality'] };
    const hours = { variable: Sleep.SLEEP_HRS, data: req.body['hours'] };

    // insert records
    records.insert(hours);
    records.insert(quality);
    records.insert(dreams);

    res.redirect('/');
});

app.use(express.static(__dirname + '/public'));

app.listen(process.env.PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${process.env.PORT}`);
});

if (process.env.ENV == "prod") {
    (async function() {
        // Establish connectivity
        const listener = await ngrok.forward({ 
            addr: `${process.env.PORT}`, 
            authtoken_from_env: true,
            basic_auth: process.env.AUTH,
            domain: process.env.DOMAIN
        });

        // Output ngrok url to console
        console.log(`Ingress established at: ${listener.url()}`);
    })();
}