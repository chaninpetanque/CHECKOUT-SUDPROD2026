import xlsx from 'xlsx';

// Simulate user's Excel structure:
// Column A: Order ID (906...)
// Column B: something
// Column C: AWB (864...)
const data = [
  ['Order ID', 'Customer', 'เลขพัสดุ'],
  ['906714357224549632', 'Cust1', '8641234567890'],
  ['906714358784831744', 'Cust2', '8649876543210'],
  ['906715753294440960', 'Cust3', '8641111111111'],
];

const ws = xlsx.utils.aoa_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');

const sheetName = wb.SheetNames[0];
const rawRows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

console.log('=== Raw rows (header:1) ===');
rawRows.forEach((r, i) => console.log(`Row ${i}:`, r));

console.log('\n=== Column C extraction (r[2]) ===');
const rows = rawRows.slice(1).map(r => ({ AWB: r[2] })).filter(r => r.AWB);
console.log('Rows:', rows);

const extractAwb = (row) => {
  if (!row || typeof row !== 'object') return '';
  let awb = row.AWB ?? row.awb;
  if (!awb) {
    const keys = Object.keys(row);
    const targetKey = keys.find((k) => /awb|track|serial|order/i.test(k));
    if (targetKey) awb = row[targetKey];
    else if (keys.length > 0) awb = row[keys[0]];
  }
  return String(awb ?? '').trim();
};

const awbList = rows.map(extractAwb).filter(awb => awb && awb.startsWith('864'));
console.log('AWB list (864 only):', awbList);
console.log(awbList.length === 3 ? '✅ PASS' : '❌ FAIL');
