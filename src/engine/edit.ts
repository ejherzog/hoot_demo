import Datastore from "nedb";
import moment from "moment";
import { timeToUse } from "./utils";

export function getCategoryToEdit(categories: Datastore, category_id: string): any {
    var cat_to_edit = categories.getAllData().find(c => c._id == category_id);
    return {
        type: 'category',
        category: cat_to_edit
    };
}

export function getVariableToEdit(categories: Datastore, variables: Datastore, variable_id: string): any {

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
            if (variable._id == variable_id) {
                var_to_edit = variable;
                if (variable.color != "#000000") {
                    color = variable.color;
                }
            }
        });

    if (!color) {
        color = catData.find(c => c.name == var_to_edit.category || c.id == var_to_edit.category)!.color;
    }
    return {
        type: 'variable',
        color: color,
        variable: var_to_edit,
        categories: catData,
        types: new Set(var_types),
        subtypes: new Set(sub_types)
    };
}

export function getRecordToEdit(variables: Datastore, records: Datastore, record_id: string): any {
    const record_to_edit = records.getAllData().find(record => record._id == record_id);
    const variable_data = variables.getAllData().filter(variable => !variable.deleted).find(variable => variable.variable == record_to_edit.variable);

    return {
        type: variable_data.type,
        record: record_to_edit,
        record_date: moment(timeToUse(record_to_edit)).format("YYYY-MM-DD"),
        record_time: moment(timeToUse(record_to_edit)).format("HH:mm")
    };
}