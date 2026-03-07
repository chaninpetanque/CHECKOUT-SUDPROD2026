import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { getTodayDateTH } from '../lib/timezone.js';

/**
 * Monthly Cleanup Cron Job
 * ---------------------------------------------------------
 * Vercel Cron calls this on the 1st of every month (00:00 UTC / 07:00 TH).
 *
 * Flow:
 *   1. Calculate cutoff date (30 days ago, Thailand timezone)
 *   2. Fetch all parcels with date < cutoff
 *   3. Build summary (counts by status & by date)
 *   4. Generate CSV string of all records
 *   5. Save summary + CSV to `monthly_summaries` table
 *   6. Delete the old parcels
 *
 * Security: validates `Authorization: Bearer <CRON_SECRET>` header.
 */

const BATCH_SIZE = 1000; // Supabase row limit per request

/**
 * Get cutoff date string (YYYY-MM-DD) — 30 days before today (TH).
 */
const getCutoffDate = () => {
    const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000;
    const now = new Date(Date.now() + THAILAND_OFFSET_MS);
    now.setDate(now.getDate() - 30);
    return now.toISOString().split('T')[0];
};

/**
 * Derive the period label from the data, e.g. "2026-01" or "2026-01 ~ 2026-02".
 */
const derivePeriod = (rows) => {
    if (!rows.length) {
        const cutoff = getCutoffDate();
        return cutoff.slice(0, 7); // fallback
    }
    const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort();
    return months.length === 1 ? months[0] : `${months[0]} ~ ${months[months.length - 1]}`;
};

/**
 * Build summary object from rows.
 */
const buildSummary = (rows) => {
    const byDate = {};
    let totalUploaded = 0;
    let totalScanned = 0;
    let totalSurplus = 0;

    for (const row of rows) {
        if (!byDate[row.date]) {
            byDate[row.date] = { date: row.date, uploaded: 0, scanned: 0, surplus: 0, total: 0 };
        }
        byDate[row.date][row.status] = (byDate[row.date][row.status] || 0) + 1;
        byDate[row.date].total += 1;

        if (row.status === 'uploaded') totalUploaded++;
        else if (row.status === 'scanned') totalScanned++;
        else if (row.status === 'surplus') totalSurplus++;
    }

    return {
        total: rows.length,
        uploaded: totalUploaded,
        scanned: totalScanned,
        surplus: totalSurplus,
        by_date: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
    };
};

/**
 * Build CSV string from rows.
 */
const buildCsv = (rows) => {
    const header = ['เลขพัสดุ', 'สถานะ', 'วันที่', 'เวลาสร้าง', 'เวลาอัปเดต'];
    const lines = [header.join(',')];
    for (const row of rows) {
        lines.push([row.awb, row.status, row.date, row.created_at, row.updated_at].join(','));
    }
    return lines.join('\n');
};

/**
 * Fetch all parcels older than cutoff in batches.
 */
const fetchAllOldParcels = async (cutoffDate) => {
    const allRows = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('parcels')
            .select('id, awb, status, date, created_at, updated_at')
            .lt('date', cutoffDate)
            .order('date', { ascending: true })
            .range(offset, offset + BATCH_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            allRows.push(...data);
            offset += data.length;
            if (data.length < BATCH_SIZE) hasMore = false;
        }
    }

    return allRows;
};

/**
 * Delete parcels older than cutoff.
 */
const deleteOldParcels = async (cutoffDate) => {
    const { error, count } = await supabase
        .from('parcels')
        .delete({ count: 'exact' })
        .lt('date', cutoffDate);

    if (error) throw error;
    return count ?? 0;
};

export default async function handler(req, res) {
    // Only allow GET (Vercel Cron) or POST (manual trigger)
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // --- Security: verify CRON_SECRET ---
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (token !== cronSecret) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
    }

    if (!isSupabaseReady) {
        res.status(503).json({ error: 'Supabase is not configured' });
        return;
    }

    try {
        const cutoffDate = getCutoffDate();
        const today = getTodayDateTH();

        // 1. Fetch all old parcels
        const rows = await fetchAllOldParcels(cutoffDate);

        if (rows.length === 0) {
            res.json({
                message: 'ไม่มีข้อมูลเก่าที่ต้องลบ',
                cutoff_date: cutoffDate,
                records_found: 0,
                records_deleted: 0,
            });
            return;
        }

        // 2. Build summary & CSV
        const summary = buildSummary(rows);
        const csvData = buildCsv(rows);
        const period = derivePeriod(rows);

        // 3. Save to monthly_summaries table (upsert by period)
        const { error: saveError } = await supabase
            .from('monthly_summaries')
            .upsert(
                {
                    period,
                    summary,
                    csv_data: csvData,
                    records_deleted: rows.length,
                    created_at: new Date().toISOString(),
                },
                { onConflict: 'period' }
            );

        if (saveError) {
            console.error('Failed to save monthly summary:', saveError.message);
            // Continue with deletion even if summary save fails — log the error
        }

        // 4. Delete old parcels
        const deletedCount = await deleteOldParcels(cutoffDate);

        res.json({
            message: `สรุปเดือน ${period} เรียบร้อย และลบข้อมูลเก่าแล้ว`,
            period,
            cutoff_date: cutoffDate,
            run_date: today,
            records_found: rows.length,
            records_deleted: deletedCount,
            summary,
        });
    } catch (err) {
        console.error('Monthly cleanup error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
