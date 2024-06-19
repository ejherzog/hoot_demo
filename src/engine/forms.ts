import Datastore from "nedb";
import moment from "moment";

export function getAddData(categories: Datastore, variables: Datastore): any {
    const now = moment();
    return {
        variables: variables.getAllData(),
        categories: buildCategoryList(categories),
        today: now.format("YYYY-MM-DD"),
        time: now.format("HH:mm")
      };
}

export function getDailyFormData(labels: Datastore, variables: Datastore): any {

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
    return {
        highLowLabels,
        morningVariables,
        eveningVariables
    };
}

export function getEditData() {

}

function buildCategoryList(categories: Datastore): any[] {
    return categories.getAllData().map(category => {
        return {
            id: category._id,
            name: category.name
        };
    });
}