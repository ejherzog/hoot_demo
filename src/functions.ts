import moment from "moment";
import { Point } from "./classes";
import Datastore from "nedb";

export function insertRecord(newRecord: any, records: Datastore, type: string) { 
    newRecord['data'] = newRecord[type];
    delete newRecord[type];
    records.insert(newRecord);
}

export function generateStackedBooleanBarData(categoryMap: Map<string, string>, 
    posNegMap: Map<string, boolean>, colorMap: Map<string, string>, records: any[]): Object[] {

    var recordsByDayMap: Map<string, Map<number, number>> = new Map();
    records
        .filter(record => categoryMap.get(record.variable) != undefined)
        .forEach(record => {
            if (!recordsByDayMap.has(record.variable)) {
                recordsByDayMap.set(record.variable, new Map());
            }
            var dayCountMap = recordsByDayMap.get(record.variable)!;
            const currentDay = moment(record.updatedAt).startOf('day').valueOf();
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

export function generateScalarData(colorMap: Map<string, string>, records: any[]): Object[] {

    var scalarSets: Object[] = [];
    var scalarData: Map<string, Point[]> = new Map();
    records
        .filter(record => colorMap.get(record.variable) != undefined)
        .forEach(record => {
            const datapoint = new Point(
                moment(record.updatedAt).valueOf(),
                parseInt(record.data)
            )
            if (!scalarData.has(record.variable)) {
                scalarData.set(record.variable, []);
            }
            scalarData.get(record.variable)?.push(datapoint);
        });
    scalarData.forEach((value, key) => {
        scalarSets.push({
            backgroundColor: colorMap.get(key),
            label: key,
            data: value
        });
    });

    return scalarSets;
}

// function interpolateData(values: Point[]): Point[] {
//     var max: number = -1;
//     values.forEach(value => {
//         if (value['y'] > max) {
//             max = value['y'];
//         }
//     });

//     var reduced: Point[] = [];
//     values.forEach(value => {
//         reduced.push(new Point(value['x'], Math.floor(value['y'] * 3 / max)));
//     });
//     return reduced;
// }