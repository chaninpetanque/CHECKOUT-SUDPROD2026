import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeModeEnabled, setBarcodeModeEnabled] = useState(false);
  const [scannerInput, setScannerInput] = useState('');
  const [scannerFocused, setScannerFocused] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [autoExportEnabled, setAutoExportEnabled] = useState(true);
  const [lastAutoExportDate, setLastAutoExportDate] = useState('');
  const [exporting, setExporting] = useState(false);
  
  const scannerInputRef = useRef(null);
  
  const queryClient = useQueryClient();
  const API_URL = '/api';

  // --- Queries ---
  const { data: stats = { total_expected: 0, scanned: 0, missing: 0, surplus: 0 } } = useQuery({
    queryKey: ['dashboard', selectedDate],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/dashboard?date=${selectedDate}`);
      return res.data;
    },
    refetchInterval: 2000, // Real-time polling
  });

  const { data: history = [] } = useQuery({
    queryKey: ['history', selectedDate, searchTerm],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/history?date=${selectedDate}&search=${searchTerm}`);
      return res.data;
    },
    refetchInterval: 5000,
  });

  const { data: ipData } = useQuery({
    queryKey: ['ip'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/ip`);
      return res.data;
    },
    staleTime: Infinity,
  });

  // --- Mutations ---
  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      return await axios.post(`${API_URL}/upload`, formData);
    },
    onSuccess: () => {
      alert('File uploaded successfully!');
      setFile(null);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['history']);
    },
    onError: () => {
      alert('Upload failed');
    }
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      return await axios.post(`${API_URL}/clear`);
    },
    onSuccess: (data) => {
      alert(data.data.message);
      queryClient.invalidateQueries(['dashboard']);
    },
    onError: () => {
      alert('Failed to clear data');
    }
  });
  
  const scanMutation = useMutation({
    mutationFn: async (awb) => {
      const res = await axios.post(`${API_URL}/scan`, { awb });
      return res.data;
    },
    onSuccess: (data) => {
      setScanStatus({
        status: data.status,
        message: data.message,
        awb: data.awb,
        time: new Date().toLocaleTimeString('th-TH')
      });
    },
    onError: () => {
      setScanStatus({
        status: 'error',
        message: 'Network Error',
        awb: scannerInput,
        time: new Date().toLocaleTimeString('th-TH')
      });
    }
  });

  // --- Handlers ---
  const handleUpload = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear OLD pending records?')) {
      clearMutation.mutate();
    }
  };

  const downloadReport = useCallback(async (type, format, isAuto = false) => {
    try {
      setExporting(true);
      const res = await axios.get(`${API_URL}/export?type=${type}&format=${format}&date=${selectedDate}`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format === 'excel' ? 'xlsx' : format;
      a.href = url;
      a.download = `report-${type}-${selectedDate}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (isAuto) {
        setScanStatus({
          status: 'export',
          message: 'ดาวน์โหลดรายงานอัตโนมัติแล้ว',
          awb: '',
          time: new Date().toLocaleTimeString('th-TH')
        });
      }
    } finally {
      setExporting(false);
    }
  }, [API_URL, selectedDate]);

  const handleExport = (type) => {
    downloadReport(type, exportFormat);
  };

  const handleScanSubmit = () => {
    if (!scannerInput.trim()) return;
    scanMutation.mutate(scannerInput.trim());
    setScannerInput('');
    if (scannerInputRef.current) scannerInputRef.current.focus();
  };

  useEffect(() => {
    if (barcodeModeEnabled && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [barcodeModeEnabled]);

  useEffect(() => {
    if (!autoExportEnabled) return;
    if (stats.total_expected > 0 && stats.missing === 0) {
      if (lastAutoExportDate !== selectedDate) {
        setLastAutoExportDate(selectedDate);
        downloadReport('all', exportFormat, true);
      }
    }
  }, [autoExportEnabled, stats.total_expected, stats.missing, selectedDate, exportFormat, lastAutoExportDate, downloadReport]);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          📦 Inventory<span className="text-blue-600">Check</span>
        </h1>
        <div className="text-sm text-gray-500 font-medium">
          Date: <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="ml-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </header>
      
      {/* Action Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Shipment File (.xlsx / .csv)</label>
            <div className="flex gap-3">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer border border-gray-200 rounded-xl"
              />
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleUpload} 
              disabled={!file || uploadMutation.isPending}
              className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-sm hover:shadow-md"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
            </button>
            <button 
              onClick={handleClear}
              className="flex-1 md:flex-none bg-white text-red-600 border border-red-200 px-6 py-2.5 rounded-xl hover:bg-red-50 transition-colors font-medium"
            >
              Clear Old Data
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Link */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <div>
                <p className="font-bold text-yellow-900 text-lg">Mobile Scanner URL</p>
                <p className="text-yellow-700 font-mono text-base md:text-lg select-all">{`${ipData?.origin || window.location.origin}/scan`}</p>
            </div>
        </div>
        <a href="/scan" target="_blank" className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2">
            <span>Open Scanner</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </a>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setBarcodeModeEnabled(!barcodeModeEnabled)}
                className={`px-4 py-2 rounded-xl font-semibold transition-colors ${barcodeModeEnabled ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {barcodeModeEnabled ? 'เปิดอยู่: เครื่องยิงบาร์โค้ด' : 'เปิดโหมดเครื่องยิงบาร์โค้ด'}
              </button>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${barcodeModeEnabled && scannerFocused ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {barcodeModeEnabled && scannerFocused ? 'เชื่อมต่อแล้ว (USB/Bluetooth)' : 'รอการเชื่อมต่อ'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ช่องรับค่าจากเครื่องยิงบาร์โค้ด</label>
              <input
                ref={scannerInputRef}
                type="text"
                value={scannerInput}
                disabled={!barcodeModeEnabled}
                onChange={(e) => setScannerInput(e.target.value)}
                onFocus={() => setScannerFocused(true)}
                onBlur={() => setScannerFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScanSubmit();
                }}
                placeholder={barcodeModeEnabled ? 'ยิงบาร์โค้ดได้เลย' : 'กรุณาเปิดโหมดเครื่องยิงบาร์โค้ด'}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleScanSubmit}
                disabled={!barcodeModeEnabled || !scannerInput.trim() || scanMutation.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {scanMutation.isPending ? 'กำลังตรวจสอบ...' : 'ตรวจสอบบาร์โค้ด'}
              </button>
              <span className="text-xs text-gray-500">รองรับ USB และ Bluetooth (ทำงานแบบ Keyboard)</span>
            </div>
            {scanStatus && (
              <div className={`p-4 rounded-xl text-sm font-medium ${scanStatus.status === 'match' ? 'bg-green-50 text-green-700' : scanStatus.status === 'duplicate' ? 'bg-yellow-50 text-yellow-700' : scanStatus.status === 'surplus' ? 'bg-red-50 text-red-700' : scanStatus.status === 'export' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}>
                <div className="flex justify-between items-center">
                  <span>{scanStatus.message}</span>
                  <span className="text-xs">{scanStatus.time}</span>
                </div>
                {scanStatus.awb && <div className="font-mono mt-1">{scanStatus.awb}</div>}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Export ผลลัพธ์หลังเช็ค</h3>
              <span className="text-xs text-gray-500">ดาวน์โหลดทันที</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">รูปแบบไฟล์</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoExportEnabled}
                    onChange={(e) => setAutoExportEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  ส่งออกอัตโนมัติเมื่อเช็คครบ
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => downloadReport('all', exportFormat)}
                disabled={exporting}
                className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 disabled:bg-gray-300 font-medium"
              >
                {exporting ? 'กำลังส่งออก...' : 'ส่งออกผลรวมทั้งหมด'}
              </button>
              <button
                onClick={() => downloadReport('scanned', exportFormat)}
                disabled={exporting}
                className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-300 font-medium"
              >
                ส่งออกที่สแกนแล้ว
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
            title="Total Expected" 
            value={stats.total_expected} 
            color="blue" 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>}
        />
        <StatCard 
            title="Scanned Successfully" 
            value={stats.scanned} 
            color="green" 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
        />
        <StatCard 
            title="Missing / Pending" 
            value={stats.missing} 
            color="red" 
            action={() => handleExport('missing')}
            actionText="Export CSV"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
        />
        <StatCard 
            title="Surplus (Extra)" 
            value={stats.surplus} 
            color="purple" 
            action={() => handleExport('surplus')}
            actionText="Export CSV"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>}
        />
      </div>

      {/* History & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
            <div className="relative w-full md:w-64">
                <input 
                    type="text" 
                    placeholder="Search AWB..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">AWB Number</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {history.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">{row.awb}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                    ${row.status === 'scanned' ? 'bg-green-100 text-green-800' : 
                                      row.status === 'surplus' ? 'bg-purple-100 text-purple-800' : 
                                      'bg-gray-100 text-gray-800'}`}>
                                    {row.status === 'scanned' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>}
                                    {row.status === 'surplus' && <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1.5"></span>}
                                    {row.status.toUpperCase()}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(row.updated_at).toLocaleTimeString('th-TH')}
                            </td>
                        </tr>
                    ))}
                    {history.length === 0 && (
                        <tr>
                            <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center">
                                    <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    No records found for this date
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color, icon, action, actionText }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        red: 'bg-red-50 text-red-700 border-red-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
    };

    return (
        <div className={`p-6 rounded-2xl border ${colors[color]} flex flex-col justify-between h-full shadow-sm`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white rounded-lg shadow-sm bg-opacity-60">{icon}</div>
                {action && (
                    <button onClick={action} className="text-xs font-bold underline hover:opacity-80 transition-opacity">
                        {actionText}
                    </button>
                )}
            </div>
            <div>
                <h3 className="text-sm font-semibold opacity-80 mb-1">{title}</h3>
                <p className="text-4xl font-extrabold tracking-tight">{value}</p>
            </div>
        </div>
    );
};

export default Dashboard;
