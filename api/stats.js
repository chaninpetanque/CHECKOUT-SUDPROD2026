import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';

const VALID_PIN = '7410258';

const getQuery = (req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return {
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        pin: url.searchParams.get('pin'),
    };
};

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { from, to, pin } = getQuery(req);

    // PIN verification
    if (pin !== VALID_PIN) {
        res.status(403).json({ error: 'PIN ไม่ถูกต้อง' });
        return;
    }

    if (!from || !to) {
        res.status(400).json({ error: 'กรุณาระบุ from และ to' });
        return;
    }

    // --- Mock Fallback ---
    if (!isSupabaseReady) {
        const result = mockService.stats ? mockService.stats(from, to) : generateMockStats(from, to);
        res.json(result);
        return;
    }

    // --- Supabase: Query parcels grouped by date and status ---
    try {
        const { data, error } = await supabase
            .from('parcels')
            .select('date, status')
            .gte('date', from)
            .lte('date', to);

        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }

        // Aggregate by date
        const dateMap = {};
        (data || []).forEach((row) => {
            if (!dateMap[row.date]) {
                dateMap[row.date] = { date: row.date, uploaded: 0, scanned: 0, surplus: 0 };
            }
            if (row.status === 'uploaded') dateMap[row.date].uploaded++;
            else if (row.status === 'scanned') dateMap[row.date].scanned++;
            else if (row.status === 'surplus') dateMap[row.date].surplus++;
        });

        // Build sorted array with computed fields
        const days = Object.values(dateMap)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((d) => ({
                date: d.date,
                total_expected: d.uploaded + d.scanned,
                scanned: d.scanned,
                missing: d.uploaded,
                surplus: d.surplus,
                total_scanned: d.scanned + d.surplus,
            }));

        res.setHeader('Cache-Control', 'public, max-age=60');
        res.json(days);
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
}

// Generate mock stats for demo
function generateMockStats(from, to) {
    const days = [];
    const start = new Date(from);
    const end = new Date(to);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const total = Math.floor(Math.random() * 150) + 50;
        const scanned = Math.floor(total * (0.7 + Math.random() * 0.3));
        const missing = total - scanned;
        const surplus = Math.floor(Math.random() * 10);

        days.push({
            date: dateStr,
            total_expected: total,
            scanned,
            missing,
            surplus,
            total_scanned: scanned + surplus,
        });
    }
    return days;
}
