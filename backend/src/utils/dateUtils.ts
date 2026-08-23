export interface DayRange {
    start: Date;
    end: Date;
}

/**
 * Half-open range [start, end) covering the calendar day that `baseDate` falls
 * in, using the server's local timezone.
 *
 * `end` is midnight of the *next* day, so every query against it must use `$lt`
 * and never `$lte` — `$lte` would pull in a session scheduled exactly at the
 * next day's midnight.
 */
export const getDayRange = (baseDate = new Date()): DayRange => {
    const start = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate()
    );
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    return { start, end };
};

/**
 * Stable `YYYY-MM-DD` key for the calendar day `baseDate` falls in, in the
 * server's local timezone. Persisted on sessions so the database can enforce
 * one-session-per-patient-per-day with a unique index.
 */
export const getDayKey = (baseDate = new Date()): string => {
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};
