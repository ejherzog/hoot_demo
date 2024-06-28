import moment, { Moment } from "moment";
import { HeatPoint, Point } from "./classes";

export function timeToUse(record: any): string {
    return record.timestamp || record.createdAt;
}

export function timestamp(record: any): number {
    const time = moment(timeToUse(record)).valueOf();
    return time;
}

export function dayRecorded(record: any): number {;
    return moment(timeToUse(record)).startOf('day').valueOf();
}

export function dayRecordedString(record: any): string {
    return moment(timeToUse(record)).startOf('day').format("MMM DD");
}

export function dayString(timestamp: Moment): string {
    return timestamp.startOf('day').format("MMMM DD");
}