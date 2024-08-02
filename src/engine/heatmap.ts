import moment, { Moment } from "moment";
import Datastore from "nedb";
import { HeatPoint } from "./classes";
import { dayRecordedString, timestamp } from "./utils";

export function generateHeatmapData(categories: Datastore, variables: Datastore, records: Datastore): any {

    let oldest = Number.MAX_VALUE;
    let newest = Number.MIN_VALUE;

    records.getAllData().forEach(record => {
        const time = timestamp(record);
        if (time > newest) {
            newest = time;
        }
        if (time < oldest) {
            oldest = time;
        }
    });

    const dates: string[] = generateDates(oldest, newest);

    var categoryById = new Map<string, string>(); // category ID -> {_id, color}
    categories.getAllData()
        .forEach(category => {
            categoryById.set(category._id, category.color);
        });
    categoryById.set('none', '#5294C4');

    const scalarData = generateScalarHeatmapData(categoryById, variables, records.getAllData(), dates);
    const booleanData = generateBooleanHeatmapData(categoryById, variables, records.getAllData(), dates);
    const heatmapData = scalarData.scalarHeatData.concat(booleanData.booleanHeatData);
    const heatmapColors = scalarData.scalarHeatColorData.concat(booleanData.booleanHeatColorData);

    console.log(heatmapData);
    return { heatmapData, heatmapColors, xAxisDates: dates, xAxisCount: Math.floor(dates.length / 3) }
}

export function generateScalarHeatmapData(categoryById: Map<string, string>, variables: Datastore, recentRecords: any[], dates: string[]): any {

    var variableMap: Map<string, Map<string, number | null>> = new Map(); // variable name => date => [data values]
    var colorMap: Map<string, string> = new Map(); // variable name => hex color

    variables.getAllData()
        .filter(variable => {
            return !variable.deleted && variable.type == 'scalar';
        })
        .sort((a, b) => (a.category.localeCompare(b.category)))
        .forEach(variable => {
            const colorA = variable.color ? variable.color : categoryById.get(variable.variable)!;
            const colorB = colorA ? colorA : '#5294C4';
            colorMap.set(variable.variable, colorB);
            variableMap.set(variable.variable, generateNullMap(dates));
        });

    recentRecords.filter(record => colorMap.has(record.variable))
        .forEach(record => {
            const date = dayRecordedString(record);
            var dataMap = variableMap.get(record.variable)!;
            dataMap.set(date, parseFloat(record.data));
        });

    var scalarHeatColorData: string[] = [];
    var scalarHeatData: { name: string, data: HeatPoint[] }[] = [];

    variableMap.forEach((dataMap, variable) => {
        const dataArray: HeatPoint[] | undefined = interpolateScalarData(dataMap);
        if (dataArray) {
            scalarHeatData.push({ name: variable, data: dataArray });
            scalarHeatColorData.push(colorMap.get(variable)!);
        }
    });

    return { scalarHeatData, scalarHeatColorData };
}

function generateBooleanHeatmapData(categoryById: Map<string, string>, variables: Datastore, recentRecords: any[], dates: string[]): any {

    var variableMap: Map<string, Map<string, number | null>> = new Map(); // variable name => date => [data values]
    var colorMap: Map<string, string> = new Map(); // variable name => hex color

    variables.getAllData()
        .filter(variable => {
            return !variable.deleted && variable.type == 'boolean';
        })
        .sort((a, b) => (b.category.localeCompare(a.category)))
        .forEach(variable => {
            const colorA = variable.color ? variable.color : categoryById.get(variable.variable)!;
            const colorB = colorA ? colorA : '#5294C4';
            colorMap.set(variable.variable, colorB);
            variableMap.set(variable.variable, generateNullMap(dates));
        });

    recentRecords.filter(record => colorMap.has(record.variable))
        .forEach(record => {
            const date = dayRecordedString(record);
            var dataMap = variableMap.get(record.variable)!;

            var currentCount = dataMap.get(date);
            if (currentCount) {
                dataMap.set(date, currentCount + 1)
            } else {
                dataMap.set(date, 1);
            }
        });

    var booleanHeatColorData: string[] = [];
    var booleanHeatData: { name: string, data: HeatPoint[] }[] = [];

    variableMap.forEach((dataMap, variable) => {
        const dataArray: HeatPoint[] | undefined = interpolateBooleanData(dataMap);
        if (dataArray) {
            booleanHeatData.push({ name: variable, data: dataArray });
            booleanHeatColorData.push(colorMap.get(variable)!);
        }
    });

    return { booleanHeatData, booleanHeatColorData };
}

function generateDates(start: number, end: number): string[] {

    const endTime = moment(end);
    var current = moment(start);
    var dates: string[] = [];

    while (current.isBefore(endTime)) {
        dates.push(current.startOf('day').format("MMM DD"));
        current.add(1, 'day');
    }

    return dates;
}

function generateNullMap(dates: string[]): Map<string, null> {
    const nullMap: Map<string, null> = new Map();
    dates.forEach(date => {
        nullMap.set(date, null);
    });
    return nullMap;
}

function interpolateScalarData(dataMap: Map<string, number | null>): HeatPoint[] | undefined {

    var max: number = Number.MIN_SAFE_INTEGER;
    var min: number = Number.MAX_SAFE_INTEGER;
    var allNull: boolean = true;
    dataMap.forEach((data) => {
        if (data) {
            allNull = false;
            if (data > max) max = data;
            if (data < min) min = data;
        }
    });

    if (allNull) return undefined;

    var datapoints: HeatPoint[] = [];
    if (max <= 3) {
        dataMap.forEach((data, date) => {
            const value = data ? data + 1 : null;
            datapoints.push(new HeatPoint(date, value));
        });
    } else {
        dataMap.forEach((data, date) => {
            const newMax = max - min;
            const value = data ? Math.floor(((data - min) * 3) / newMax) + 1 : null;
            datapoints.push(new HeatPoint(date, value));
        });
    }

    return datapoints;
}

function interpolateBooleanData(dataMap: Map<string, number | null>): HeatPoint[] | undefined {

    var allNull = true;
    var datapoints: HeatPoint[] = [];

    dataMap.forEach((data, date) => {
        if (data) allNull = false;
        datapoints.push(new HeatPoint(date, data));
    });

    return allNull ? undefined : datapoints;
}