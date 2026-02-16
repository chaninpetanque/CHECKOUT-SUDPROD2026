import React, { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, CheckCircle, AlertTriangle, XCircle, QrCode, ExternalLink, Download, FileText } from 'lucide-react';

import StatCard from './dashboard/StatCard';
import UploadSection from './dashboard/UploadSection';
import ScanSection from './dashboard/ScanSection';
import HistoryTable from './dashboard/HistoryTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { cn } from '../lib/utils';
import { 
  fetchDashboardStats, 
  fetchHistory, 
  fetchIpData, 
  uploadFile, 
  clearData, 
  scanAwb, 
  exportReport 
} from '../lib/api';

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
  
  const queryClient = useQueryClient();

  // --- Queries ---
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', selectedDate],
    queryFn: () => fetchDashboardStats(selectedDate),
    refetchInterval: 2000,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['history', selectedDate, searchTerm],
    queryFn: () => fetchHistory(selectedDate, searchTerm),
    refetchInterval: 5000,
  });

  const { data: ipData } = useQuery({
    queryKey: ['ip'],
    queryFn: fetchIpData,
    staleTime: Infinity,
  });

  // --- Mutations ---
  const uploadMutation = useMutation({
    mutationFn: (formData) => uploadFile(formData),
    onSuccess: () => {
      toast.success('File uploaded successfully!');
      setFile(null);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['history']);
    },
    onError: () => {
      toast.error('Upload failed. Please check the file format.');
    }
  });

  const clearMutation = useMutation({
    mutationFn: clearData,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(['dashboard']);
    },
    onError: () => {
      toast.error('Failed to clear data');
    }
  });
  
  const scanMutation = useMutation({
    mutationFn: (awb) => scanAwb(awb),
    onSuccess: (data) => {
      setScanStatus({
        status: data.status,
        message: data.message,
        awb: data.awb,
        time: new Date().toLocaleTimeString('th-TH')
      });
      if (data.status === 'match') toast.success(`Matched: ${data.awb}`);
      else if (data.status === 'duplicate') toast.warning(`Duplicate: ${data.awb}`);
      else if (data.status === 'surplus') toast.error(`Surplus: ${data.awb}`);
    },
    onError: () => {
      const errorMsg = 'Network Error';
      setScanStatus({
        status: 'error',
        message: errorMsg,
        awb: scannerInput,
        time: new Date().toLocaleTimeString('th-TH')
      });
      toast.error(errorMsg);
    }
  });

  // --- Handlers ---
  const handleUpload = () => {
    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear OLD pending records?')) {
      clearMutation.mutate();
    }
  };

  const downloadReportFn = useCallback(async (type, format, isAuto = false) => {
    try {
      setExporting(true);
      const res = await exportReport(type, format, selectedDate);
      
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
        toast.info('Auto-exported completed report');
        setScanStatus({
          status: 'export',
          message: 'Auto-exported report',
          awb: '',
          time: new Date().toLocaleTimeString('th-TH')
        });
      }
    } catch (error) {
      // toast handled in api.js for demo mode, or here for generic error
      console.error(error);
    } finally {
      setExporting(false);
    }
  }, [selectedDate]);

  const handleExport = (type) => {
    downloadReportFn(type, exportFormat);
  };

  const handleScanSubmit = () => {
    if (!scannerInput.trim()) return;
    scanMutation.mutate(scannerInput.trim());
    setScannerInput('');
  };

  useEffect(() => {
    if (!autoExportEnabled || !stats) return;
    if (stats.total_expected > 0 && stats.missing === 0) {
      if (lastAutoExportDate !== selectedDate) {
        setLastAutoExportDate(selectedDate);
        downloadReportFn('all', exportFormat, true);
      }
    }
  }, [autoExportEnabled, stats, selectedDate, exportFormat, lastAutoExportDate, downloadReportFn]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
           Array(4).fill(0).map((_, i) => (
             <Skeleton key={i} className="h-32 rounded-xl" />
           ))
        ) : (
          <>
            <StatCard 
              title="Total Expected" 
              value={stats?.total_expected || 0} 
              icon={Package} 
              className="border-blue-100 bg-blue-50/50"
              valueClassName="text-blue-700"
            />
            <StatCard 
              title="Scanned" 
              value={stats?.scanned || 0} 
              icon={CheckCircle} 
              className="border-green-100 bg-green-50/50"
              valueClassName="text-green-700"
            />
            <StatCard 
              title="Missing" 
              value={stats?.missing || 0} 
              icon={XCircle} 
              className="border-gray-100 bg-gray-50/50"
              valueClassName="text-gray-700"
            />
            <StatCard 
              title="Surplus" 
              value={stats?.surplus || 0} 
              icon={AlertTriangle} 
              className="border-red-100 bg-red-50/50"
              valueClassName="text-red-700"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <div className="space-y-8 lg:col-span-2">
          <UploadSection 
            file={file} 
            setFile={setFile} 
            onUpload={handleUpload} 
            isUploading={uploadMutation.isPending}
            onClear={handleClear}
            isClearing={clearMutation.isPending}
          />
          
          <ScanSection 
            barcodeModeEnabled={barcodeModeEnabled}
            setBarcodeModeEnabled={setBarcodeModeEnabled}
            scannerInput={scannerInput}
            setScannerInput={setScannerInput}
            handleScanSubmit={handleScanSubmit}
            scanStatus={scanStatus}
            isScanning={scanMutation.isPending}
            scannerFocused={scannerFocused}
            setScannerFocused={setScannerFocused}
          />

          {historyLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <HistoryTable 
              history={history || []}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleExport={handleExport}
              isExporting={exporting}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
          )}
        </div>

        {/* Right Column: Utilities */}
        <div className="space-y-8">
           {/* Mobile Scanner QR */}
           <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <QrCode className="h-5 w-5" /> Mobile Scanner
              </CardTitle>
              <CardDescription className="text-yellow-700/80">
                Use your phone as a scanner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100 flex justify-center">
                 {/* Placeholder for QR Code */}
                 <div className="h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                    QR Code Here
                 </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-mono bg-white/50 p-2 rounded border border-yellow-100 text-yellow-800 break-all">
                  {`${ipData?.origin || (typeof window !== 'undefined' ? window.location.origin : '')}/scan`}
                </p>
              </div>
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" asChild>
                <a href="/scan" target="_blank" rel="noreferrer">
                  Open Scanner UI <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" /> Export Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant={exportFormat === 'csv' ? 'default' : 'outline'} 
                  onClick={() => setExportFormat('csv')}
                  className="flex-1"
                >
                  CSV
                </Button>
                <Button 
                  variant={exportFormat === 'xlsx' ? 'default' : 'outline'} 
                  onClick={() => setExportFormat('xlsx')}
                  className="flex-1"
                >
                  Excel
                </Button>
              </div>
              
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => handleExport('all')}>
                  <FileText className="mr-2 h-4 w-4" /> Export All Data
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleExport('missing')}>
                  <AlertTriangle className="mr-2 h-4 w-4" /> Export Missing Only
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleExport('surplus')}>
                  <XCircle className="mr-2 h-4 w-4" /> Export Surplus Only
                </Button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm font-medium text-gray-700">Auto-export on complete</span>
                <div 
                  className={cn("w-10 h-6 rounded-full p-1 cursor-pointer transition-colors", autoExportEnabled ? "bg-green-500" : "bg-gray-300")}
                  onClick={() => setAutoExportEnabled(!autoExportEnabled)}
                >
                  <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", autoExportEnabled ? "translate-x-4" : "")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
