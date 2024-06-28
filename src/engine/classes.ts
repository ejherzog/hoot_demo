export class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export class HeatPoint {
    x: string;
    y: number | null;

    constructor(x: string, y: number | null) {
        this.x = x;
        this.y = y;
    }
}