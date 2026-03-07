/**
 * Thailand Timezone Utility (Asia/Bangkok, UTC+7)
 * All date/time operations should use these helpers to ensure
 * timestamps are always in Thailand timezone.
 */

const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

/**
 * Get current date in Thailand timezone as YYYY-MM-DD string.
 */
export const getTodayDateTH = () => {
    const now = new Date(Date.now() + THAILAND_OFFSET_MS);
    return now.toISOString().split('T')[0];
};

/**
 * Get current timestamp in Thailand timezone as ISO string.
 */
export const getNowTH = () => {
    const now = new Date(Date.now() + THAILAND_OFFSET_MS);
    return now.toISOString();
};
