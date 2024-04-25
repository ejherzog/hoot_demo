import moment from "moment";
import Datastore from "nedb";
import { Point } from "./classes";
import { timeToUse } from "./utils";

export function generateChartData(categories: Datastore, variables: Datastore, records: Datastore): any {

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
            } else if (variable.subtype == 'hours' || variable.subtype == 'number') {
                scalarColorMap.set(variable.variable, catColorMap.get(variable.category)!);
            } else if (variable.type == 'boolean') {
                booleanColorMap.set(variable.variable, catColorMap.get(variable.category)!);
                booleanCatMap.set(variable.variable, variable.category);
                posNegMap.set(variable.variable, variable.sign == 'positive' ? true : false);
            }
        });
    
    const allRecords = records.getAllData();
    var highLowSets = generateStackedHighLowData(highLowCatMap, posNegMap, highLowColorMap, allRecords);
    var scalarSets = generateScalarData(scalarColorMap, allRecords);
    var booleanSets = generateStackedBooleanBarData(booleanCatMap, posNegMap, booleanColorMap, allRecords);
    var tempSets = generateTemperatureData(allRecords, catColorMap.get('t0ANSfmglzv6cU8s')!);

    return {
        highLowData: highLowSets,
        scalarData: scalarSets,
        booleanData: booleanSets,
        tempData: tempSets
    };
}

/**
 * 
 * @param categoryMap variable -> category
 * @param posNegMap variable -> positive or negative
 * @param colorMap variable -> color
 * @param records all records from database
 * @returns array of { color, variable label, category stack, data points by day }
 */
function generateStackedBooleanBarData(categoryMap: Map<string, string>, 
    posNegMap: Map<string, boolean>, colorMap: Map<string, string>, records: any[]): any[] {

    var recordsByDayMap: Map<string, Map<number, number>> = new Map();
    records
        .filter(record => categoryMap.get(record.variable) != undefined)
        .forEach(record => {
            if (!recordsByDayMap.has(record.variable)) {
                recordsByDayMap.set(record.variable, new Map());
            }
            var dayCountMap = recordsByDayMap.get(record.variable)!;
            const currentDay = dayRecorded(record);
            if (!dayCountMap.has(currentDay)) {
                dayCountMap.set(currentDay, 0);
            }
            const newCount = dayCountMap.get(currentDay)! + parseInt(record.data);
            dayCountMap.set(currentDay, newCount);
            recordsByDayMap.set(record.variable, dayCountMap);
        });

    var fullDataSet: any[] = [];

    recordsByDayMap
        .forEach((dayCountMap, variable) => {
            var dayCountArray: Point[] = [];
            dayCountMap.forEach((count, date) => {
                const finalCount: number = posNegMap.get(variable) ? count : count * -1;
                dayCountArray.push(new Point(date, finalCount));
            });
            fullDataSet.push({
                backgroundColor: colorMap.get(variable),
                label: variable,
                stack: categoryMap.get(variable),
                data: dayCountArray
            });
        });

    return fullDataSet;
}

function generateStackedHighLowData(categoryMap: Map<string, string>, posNegMap: Map<string, boolean>,
    colorMap: Map<string, string>, records: any[]): any[] {

    var highLowSets: any[] = [];
    var highLowData: Map<string, Point[]> = new Map();
    records
        .filter(record => colorMap.get(record.variable) != undefined)
        .forEach(record => {
            const finalData: number = posNegMap.get(record.variable) ? parseInt(record.data) : parseInt(record.data) * -1;
            const datapoint = new Point(dayRecorded(record), finalData);
            if (!highLowData.has(record.variable)) {
                highLowData.set(record.variable, []);
            }
            highLowData.get(record.variable)!.push(datapoint);
        });
    highLowData.forEach((data, variable) => {
        highLowSets.push({
            backgroundColor: colorMap.get(variable),
            label: variable,
            data: data,
            stack: categoryMap.get(variable)
        });
    });

    return highLowSets;
}

function generateScalarData(colorMap: Map<string, string>, records: any[]): any[] {

    var scalarSets: any[] = [];
    var scalarData = new Map<string, Point[]>();
    records
        .filter(record => {
            return colorMap.has(record.variable)})
        .forEach(record => {
            const datapoint = new Point(dayRecorded(record), parseInt(record.data));
            if (!scalarData.has(record.variable)) {
                scalarData.set(record.variable, []);
            }
            scalarData.get(record.variable)!.push(datapoint);
        });
    scalarData.forEach((data, variable) => {
        scalarSets.push({
            backgroundColor: colorMap.get(variable),
            label: variable,
            data: data,
            yAxisID: variable == 'Cycle Day' ? 'yc' : 'y'
        });
    });
    return scalarSets;
}

function generateTemperatureData(records: any[], color: string): any[] {

    var datapoints: Point[] = [];
    records
        .filter(record => record.variable == 'Temperature')
        .forEach(record => {
            const datapoint = new Point(timeRecorded(record), parseFloat(record.data));
            datapoints.push(datapoint);
        });
    
    datapoints.sort((a, b) => a.x - b.x);
    return [{
        backgroundColor: color,
        label: 'Temperature',
        data: datapoints,
        pointRadius: 10,
        pointStyle: 'rectRounded'
    }];
}

function timeRecorded(record: any): number {
    return moment(timeToUse(record)).valueOf();
}

function dayRecorded(record: any): number {;
    return moment(timeToUse(record)).startOf('day').valueOf();
}