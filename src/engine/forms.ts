import Datastore from "nedb";
import moment from "moment";

export function getAddData(categories: Datastore, variables: Datastore): any {
    return {
        variables: variables.getAllData().sort((a, b) => a.variable.localeCompare(b.variable)),
        categories: buildCategoryList(categories),
        ...getTimeData()
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
        eveningVariables,
        ...getTimeData()
    };
}

function buildCategoryList(categories: Datastore): any[] {
    return categories.getAllData().map(category => {
        return {
            id: category._id,
            name: category.name
        };
    });
}

function getTimeData() {
    const now = moment();
    return {
        today: now.format("YYYY-MM-DD"),
        time: now.format("HH:mm")
    };
}