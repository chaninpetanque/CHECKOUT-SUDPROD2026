import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';

const parseBody = async (req) => {
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString();
    return raw ? JSON.parse(raw) : {};
};

export default async function handler(req, res) {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const body = await parseBody(req);
    const id = body.id;

    if (!id) {
        res.status(400).json({ error: 'กรุณาระบุ id' });
        return;
    }

    // --- Mock Service Fallback ---
    if (!isSupabaseReady) {
        const result = mockService.deleteById(id);
        if (!result.success) {
            res.status(404).json({ error: 'ไม่พบรายการ' });
            return;
        }
        res.json({ message: 'ลบรายการเรียบร้อยแล้ว' });
        return;
    }

    // --- Supabase Logic ---
    const { error, count } = await supabase
        .from('parcels')
        .delete({ count: 'exact' })
        .eq('id', id);

    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }

    if (count === 0) {
        res.status(404).json({ error: 'ไม่พบรายการ' });
        return;
    }

    res.json({ message: 'ลบรายการเรียบร้อยแล้ว' });
}
