const getTodayDate = () => new Date().toISOString().split('T')[0];

const normalizeAwb = (value) => String(value ?? '').trim();

const getStore = () => {
  if (!globalThis.__mockParcels) {
    globalThis.__mockParcels = { seq: 1, parcels: [] };
  }
  return globalThis.__mockParcels;
};

const uploadRows = (rows, date) => {
  const store = getStore();
  const now = new Date().toISOString();
  let inserted = 0;
  let errors = 0;

  const uniqueAwbs = [];
  const seen = new Set();

  rows.forEach((row) => {
    const awb = normalizeAwb(row);
    if (!awb) {
      errors += 1;
      return;
    }
    if (!seen.has(awb)) {
      seen.add(awb);
      uniqueAwbs.push(awb);
    }
  });

  uniqueAwbs.forEach((awb) => {
    const existing = store.parcels.find((p) => p.awb === awb && p.date === date);
    if (!existing) {
      store.parcels.push({
        id: store.seq++,
        awb,
        status: 'uploaded',
        date,
        created_at: now,
        updated_at: now
      });
      inserted += 1;
      return;
    }
    if (existing.status === 'surplus') {
      existing.status = 'scanned';
      existing.updated_at = now;
    }
  });

  return { inserted, errors };
};

const scan = (awb, date) => {
  const store = getStore();
  const now = new Date().toISOString();
  const existing = store.parcels.find((p) => p.awb === awb && p.date === date);

  if (existing) {
    if (existing.status === 'uploaded') {
      existing.status = 'scanned';
      existing.updated_at = now;
      return { status: 'match', message: '✅ Match Found', awb };
    }
    if (existing.status === 'scanned') {
      return { status: 'duplicate', message: '⚠️ Duplicate Scan', awb };
    }
    if (existing.status === 'surplus') {
      return { status: 'duplicate', message: '⚠️ Duplicate Scan (Surplus)', awb };
    }
    return { status: 'unknown', message: 'Unknown status', awb };
  }

  store.parcels.push({
    id: store.seq++,
    awb,
    status: 'surplus',
    date,
    created_at: now,
    updated_at: now
  });
  return { status: 'surplus', message: '❌ Not in List (Surplus)', awb };
};

const dashboard = (date) => {
  const store = getStore();
  const rows = store.parcels.filter((p) => p.date === date);
  const pending = rows.filter((p) => p.status === 'uploaded').length;
  const scanned = rows.filter((p) => p.status === 'scanned').length;
  const surplus = rows.filter((p) => p.status === 'surplus').length;
  return {
    total_expected: pending + scanned,
    scanned,
    missing: pending,
    surplus
  };
};

const history = (date, search) => {
  const store = getStore();
  const keyword = search ? String(search).toLowerCase() : '';
  return store.parcels
    .filter((p) => p.date === date)
    .filter((p) => (keyword ? p.awb.toLowerCase().includes(keyword) : true))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, 100);
};

const clearOld = () => {
  const store = getStore();
  const today = getTodayDate();
  const before = store.parcels.length;
  store.parcels = store.parcels.filter((p) => !(p.status === 'uploaded' && p.date !== today));
  return { cleared: before - store.parcels.length };
};

const exportRows = (date, type) => {
  const store = getStore();
  return store.parcels.filter((p) => {
    if (p.date !== date) return false;
    if (type === 'missing') return p.status === 'uploaded';
    if (type === 'surplus') return p.status === 'surplus';
    if (type === 'scanned') return p.status === 'scanned';
    return true;
  });
};

export const mockService = {
  uploadRows,
  scan,
  dashboard,
  history,
  clearOld,
  exportRows
};
