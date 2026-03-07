import { supabase, isSupabaseReady } from '../lib/supabase.js';

/**
 * Monthly Summary API
 * ---------------------------------------------------------
 * GET /api/monthly-summary          — list all saved monthly summaries
 * GET /api/monthly-summary?id=1     — get a specific summary (JSON)
 * GET /api/monthly-summary?id=1&format=csv — download CSV file
 */

const getQuery = (req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return {
        id: url.searchParams.get('id'),
        format: (url.searchParams.get('format') || 'json').toLowerCase(),
    };
};

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    if (!isSupabaseReady) {
        res.status(503).json({ error: 'Supabase is not configured' });
        return;
    }

    const { id, format } = getQuery(req);

    try {
        // --- List all summaries ---
        if (!id) {
            const { data, error } = await supabase
                .from('monthly_summaries')
                .select('id, period, records_deleted, created_at, summary')
                .order('created_at', { ascending: false });

            if (error) {
                res.status(500).json({ error: error.message });
                return;
            }

            // Return list without csv_data (too large)
            const list = (data || []).map((row) => ({
                id: row.id,
                period: row.period,
                records_deleted: row.records_deleted,
                created_at: row.created_at,
                total: row.summary?.total ?? 0,
                scanned: row.summary?.scanned ?? 0,
                uploaded: row.summary?.uploaded ?? 0,
                surplus: row.summary?.surplus ?? 0,
            }));

            res.json(list);
            return;
        }

        // --- Get specific summary ---
        const { data: row, error } = await supabase
            .from('monthly_summaries')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }

        if (!row) {
            res.status(404).json({ error: 'ไม่พบสรุปรายเดือนนี้' });
            return;
        }

        // --- CSV download ---
        if (format === 'csv') {
            const csvContent = row.csv_data || '';
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=monthly-summary-${row.period}.csv`
            );
            // Add BOM for Excel Thai encoding support
            res.send('\uFEFF' + csvContent);
            return;
        }

        // --- JSON response ---
        res.json({
            id: row.id,
            period: row.period,
            records_deleted: row.records_deleted,
            created_at: row.created_at,
            summary: row.summary,
        });
    } catch (err) {
        console.error('Monthly summary error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
