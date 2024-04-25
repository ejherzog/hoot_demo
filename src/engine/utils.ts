export function timeToUse(record: any): string {
    return record.timestamp || record.createdAt;
}