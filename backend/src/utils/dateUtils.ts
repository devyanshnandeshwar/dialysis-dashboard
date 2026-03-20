export interface TodayRange {
    start: Date;
    end: Date;
}

export const getTodayRange = (baseDate = new Date()): TodayRange => {
    const start = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate()
    );
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    return { start, end };
};
