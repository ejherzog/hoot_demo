import moment from "moment";
import Datastore from "nedb";
import { Point } from "./classes";
import { dayRecorded, timestamp } from "./utils";

export function generateChartData(categories: Datastore, variables: Datastore, records: Datastore): any {

    const twoWeeksAgo = moment().subtract(2, 'weeks').startOf('day').valueOf();

    var categoryById = new Map<string, any>(); // category ID -> {_id, color, name, group}
    categories.getAllData()
        .forEach(category => {
            categoryById.set(category._id, category);
        });
    categoryById.set('none', {name: 'Uncategorized', _id: 'none', color: '#cdbab6'});
    
    var highLowColorMap: Map<string, string> = new Map();
    var scalarColorMap: Map<string, string> = new Map();
    var booleanColorMap: Map<string, string> = new Map();

    var categoryMap: Map<string, string> = new Map();
    var highLowCatMap: Map<string, string> = new Map();
    var booleanCatMap: Map<string, string> = new Map();
    var posNegMap: Map<string, boolean> = new Map();

    variables.getAllData()
        .forEach(variable => {
            if (categoryById.get(variable.category)!.name != 'Weather') {
                categoryMap.set(variable.variable, variable.category || 'none');
            }
            if (variable.subtype == 'high_low') {
                highLowColorMap.set(variable.variable, colorToUse(variable, categoryById));
                highLowCatMap.set(variable.variable, variable.category);
                posNegMap.set(variable.variable, variable.sign == 'positive' ? true : false);
            } else if (variable.subtype == 'hours' || variable.subtype == 'number') {
                scalarColorMap.set(variable.variable, colorToUse(variable, categoryById));
            } else if (variable.type == 'boolean') {
                booleanColorMap.set(variable.variable, categoryById.get(variable.category)!.color);
                booleanCatMap.set(variable.variable, variable.category);
                posNegMap.set(variable.variable, variable.sign == 'positive' ? true : false);
            }
        });
    
    const recentRecords = records.getAllData().filter(record => timestamp(record) > twoWeeksAgo);
    var categorySets = generateCategoryData(categoryMap, categoryById, recentRecords);
    var highLowSets = generateStackedHighLowData(highLowCatMap, posNegMap, highLowColorMap, recentRecords);
    var scalarSets = generateScalarData(scalarColorMap, recentRecords);
    var booleanSets = generateStackedBooleanBarData(booleanCatMap, posNegMap, booleanColorMap, recentRecords);

    return {
        categoryBarData: categorySets,
        highLowBarData: highLowSets,
        scalarBarData: scalarSets,
        booleanBarData: booleanSets
    };
}

function generateCategoryData(categoryMap: Map<string, string>, categoryById: Map<String, any>, records: any[]): any[] {

    var recordsByDayMap: Map<string, Map<number, number>> = new Map();
    records
        .forEach(record => {
            const category = categoryMap.get(record.variable);
            if (category) {
                if (!recordsByDayMap.has(category)) {
                    recordsByDayMap.set(category, new Map());
                }
                var dayCountMap = recordsByDayMap.get(category)!;
                const currentDay = dayRecorded(record);
                if (!dayCountMap.has(currentDay)) {
                    dayCountMap.set(currentDay, 0);
                }
                const newCount = dayCountMap.get(currentDay)! + parseInt(record.data);
                dayCountMap.set(currentDay, newCount);
                recordsByDayMap.set(category, dayCountMap);
            }
    });

    var categoryDataSet: any[] = [];

    recordsByDayMap
        .forEach((dayCountMap, category) => {
            var dayCountArray: Point[] = [];
            dayCountMap.forEach((count, date) => {
                dayCountArray.push(new Point(date, count));
            });
            categoryDataSet.push({
                backgroundColor: categoryById.get(category)!.color,
                label: categoryById.get(category)!.name,
                data: dayCountArray.sort((a, b) => a.x - b.x),
                yAxisID: isLargeScale(dayCountArray, 10) ? 'yc' : 'y'
            });
        });

    return categoryDataSet;
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

    fullDataSet.sort((a, b) => a.stack.localeCompare(b.stack));
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
    
    highLowSets.sort((a, b) => a.stack.localeCompare(b.stack));
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
            yAxisID: isLargeScale(data, 25) ? 'yc' : 'y'
        });
    });
    return scalarSets;
}

function isLargeScale(data: Point[], breakpoint: number): boolean {
    for (let p of data) {
        if (p.y >= breakpoint) return true;
    }
    return false;
}

function colorToUse(variable: any, categoryById: Map<string, any>): string {
    return variable.color || categoryById.get(variable.category)!.color;
}