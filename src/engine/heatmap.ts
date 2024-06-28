import moment, { Moment } from "moment";
import Datastore from "nedb";
import { HeatPoint } from "./classes";
import { dayRecordedString, timestamp } from "./utils";

export function generateScalarHeatmapData(categories: Datastore, variables: Datastore, records: Datastore): any {

    const twoMonthsAgo = moment().subtract(2, 'months').startOf('day');
    const recentRecords = records.getAllData().filter(record => timestamp(record) > twoMonthsAgo.valueOf());

    var categoryById = new Map<string, string>(); // category ID -> {_id, color}
    categories.getAllData()
        .forEach(category => {
            categoryById.set(category._id, category.color);
        });
    categoryById.set('none', '#5294C4');

    var colorMap: Map<string, string> = new Map();
    var variableMap: Map<string, Map<string, number | null>> = new Map();
    const dates = generateDates(twoMonthsAgo);

    variables.getAllData()
        .filter(variable => {
            return variable.type == 'scalar';
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

    var colorData: string[] = [];
    var seriesData: { name: string, data: HeatPoint[] }[] = [];

    variableMap.forEach((dataMap, variable) => {
        const dataArray: HeatPoint[] | undefined = interpolateHeatData(dataMap);
        if (dataArray) {
            seriesData.push({ name: variable, data: dataArray });
            colorData.push(colorMap.get(variable)!);
        }
    });

    return { seriesData, colorData, xAxisDates: dates, axisCount: Math.floor(dates.length / 3) };
}

function generateBooleanHeatmapData() {
    // TO DO increase 0 and 1 to 1 and 2, respectively
    // This will distinguish between 0 and null,
    // which are rendered the same when no negative values are present in the data
}

function generateDates(startDate: Moment): string[] {

    const now = moment();
    var current = startDate;
    var dates: string[] = [];

    while (current.isBefore(now)) {
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

function interpolateHeatData(dataMap: Map<string, number | null>): HeatPoint[] | undefined {

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