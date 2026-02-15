import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { mockService } from '../lib/mock-service.js';

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getQuery = (req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return {
    date: url.searchParams.get('date') || getTodayDate(),
    type: url.searchParams.get('type') || 'all',
    format: (url.searchParams.get('format') || 'csv').toLowerCase()
  };
};

const filterRows = (rows, type) => {
  if (type === 'missing') return rows.filter((row) => row.status === 'uploaded');
  if (type === 'surplus') return rows.filter((row) => row.status === 'surplus');
  if (type === 'scanned') return rows.filter((row) => row.status === 'scanned');
  return rows;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { date, type, format } = getQuery(req);

  let rows = [];
  if (!isSupabaseReady) {
    rows = mockService.exportRows(date, type);
  } else {
    const { data, error } = await supabase
      .from('parcels')
      .select('awb, status, date, updated_at')
      .eq('date', date);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    rows = filterRows(data, type);
  }

  if (format === 'csv') {
    const header = ['AWB', 'Status', 'Date', 'Time'];
    const csvRows = [header.join(',')];
    rows.forEach((row) => {
      csvRows.push([row.awb, row.status, row.date, row.updated_at].join(','));
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${date}.csv`);
    res.send(csvRows.join('\n'));
    return;
  }

  if (format === 'xlsx' || format === 'excel') {
    const sheetData = rows.map((row) => ({
      AWB: row.awb,
      Status: row.status,
      Date: row.date,
      Time: row.updated_at
    }));
    const worksheet = xlsx.utils.json_to_sheet(sheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Report');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${date}.xlsx`);
    res.send(buffer);
    return;
  }

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${date}.pdf`);
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(16).text(`Inventory Report (${date})`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Type: ${type}`);
    doc.moveDown();
    rows.forEach((row, index) => {
      doc.text(`${index + 1}. ${row.awb} | ${row.status} | ${row.date} | ${row.updated_at}`);
    });
    doc.end();
    return;
  }

  res.status(400).json({ error: 'Invalid format. Use csv, xlsx, or pdf.' });
}
