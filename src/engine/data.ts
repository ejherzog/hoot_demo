import moment from "moment";
import Datastore from "nedb";
import { timeToUse } from "./utils";

/**
 * 
 * @param records All records in database
 * @returns All records, sorted in reverse time order, formatted for table view
 */
export function getAllData(records: any[]): any[] {
    const recordData = records
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(record => {
            return {
                'variable': record['variable'],
                'data': record['data'],
                'moment': moment(timeToUse(record)).format("MMM Do h:mm A").toString(),
                'id': record['_id']
            }
        });
    return recordData;
}

/**
 * 
 * @param categories Categories Datastore
 * @param variables Variables Datastore
 * @param records Records Datastore
 * @returns Last 48 hours of records (time sorted); all categories and variables formatted for display
 */
export function getIndexData(categories: Datastore, variables: Datastore, records: Datastore): any {

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

    return {
        records: recordData,
        variables: variableData,
        categories: categoryData
      };
}

export function getShortcutData(categories: Datastore, variables: Datastore): Map<string, { variable: string, color: string}[]> {
    const categoryData = categories.getAllData().sort((a, b) => a.group.localeCompare(b.group));

    const catMap = new Map<string, { name: string, color: string }>();
    categoryData.forEach(c => {
        catMap.set(c._id, { name: c.name, color: c.color });
    });

    const varData = variables.getAllData()
        .filter(v => !v.deleted && v.shortcut == '1')
        .sort((a, b) => a.variable.localeCompare(b.variable))
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

    return shortcutData;
}