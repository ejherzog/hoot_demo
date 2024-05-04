import moment from "moment";

export function timeToUse(record: any): string {
    return record.timestamp || record.createdAt;
}

export function timestamp(record: any): number {
    const time = moment(timeToUse(record)).valueOf();
    return time;
}