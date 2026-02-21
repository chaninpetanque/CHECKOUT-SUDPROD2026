import React, { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, CircleCheck, TriangleAlert, CircleX, QrCode, ExternalLink, Download, FileText, Calendar as CalendarIcon } from 'lucide-react';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

import StatCard from './dashboard/StatCard';
import UploadSection from './dashboard/UploadSection';
import ScanSection from './dashboard/ScanSection';
import HistoryTable from './dashboard/HistoryTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
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
      toast.success('อัปโหลดไฟล์สำเร็จ!');
      setFile(null);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['history']);
    },
    onError: () => {
      toast.error('อัปโหลดล้มเหลว กรุณาตรวจสอบรูปแบบไฟล์');
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
      if (data.status === 'match') toast.success(`จับคู่สำเร็จ: ${data.awb}`);
      else if (data.status === 'duplicate') toast.warning(`ซ้ำ: ${data.awb}`);
      else if (data.status === 'surplus') toast.error(`เกินจำนวน: ${data.awb}`);
    },
    onError: () => {
      const errorMsg = 'ข้อผิดพลาดเครือข่าย';
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
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะล้างข้อมูลเก่า?')) {
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
        toast.info('ส่งออกรายงานอัตโนมัติเรียบร้อยแล้ว');
        setScanStatus({
          status: 'export',
          message: 'ส่งออกรายงานอัตโนมัติ',
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

  const getScanUrl = () => {
    if (typeof window === 'undefined') return '';
    
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocalhost && ipData?.ip && ipData.ip !== 'localhost') {
      const protocol = window.location.protocol;
      const port = window.location.port;
      return `${protocol}//${ipData.ip}${port ? `:${port}` : ''}/scan`;
    }
    
    return `${window.location.origin}/scan`;
  };

  const scanUrl = getScanUrl();

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
      
      {/* Date Picker Header */}
      <div className="flex flex-col items-center justify-center space-y-2 mb-6">
        <h2 className="text-lg font-semibold text-gray-700">สรุปผลประจำวัน</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal border-blue-200 hover:bg-blue-50 hover:text-blue-600",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
              {selectedDate ? format(new Date(selectedDate + 'T00:00:00'), "PPP", { locale: th }) : <span>เลือกวันที่</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined}
              onSelect={(date) => {
                if (date) {
                  // Adjust for timezone offset to prevent day shift
                  const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                  setSelectedDate(offsetDate.toISOString().split('T')[0]);
                }
              }}
              initialFocus
              locale={th}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
           Array(4).fill(0).map((_, i) => (
             <Skeleton key={i} className="h-32 rounded-xl" />
           ))
        ) : (
          <>
            <StatCard 
              title="ทั้งหมดที่คาดหวัง" 
              value={stats?.total_expected || 0} 
              icon={Package} 
              className="border-blue-100 bg-blue-50/50"
              valueClassName="text-blue-700"
            />
            <StatCard 
              title="สแกนแล้ว" 
              value={stats?.scanned || 0} 
              icon={CircleCheck} 
              className="border-green-100 bg-green-50/50"
              valueClassName="text-green-700"
            />
            <StatCard 
              title="ตกหล่น" 
              value={stats?.missing || 0} 
              icon={CircleX} 
              className="border-gray-100 bg-gray-50/50"
              valueClassName="text-gray-700"
            />
            <StatCard 
              title="เกินจำนวน" 
              value={stats?.surplus || 0} 
              icon={TriangleAlert} 
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
                <QrCode className="h-5 w-5" /> สแกนเนอร์มือถือ
              </CardTitle>
              <CardDescription className="text-yellow-700/80">
                ใช้มือถือของคุณเป็นเครื่องสแกน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100 flex justify-center">
                 <QRCode
                    value={scanUrl}
                    size={128}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                 />
              </div>
              <div className="text-center">
                <p className="text-sm font-mono bg-white/50 p-2 rounded border border-yellow-100 text-yellow-800 break-all">
                  {scanUrl}
                </p>
              </div>
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" asChild>
                <a href="/scan" target="_blank" rel="noreferrer">
                  เปิดหน้าสแกน <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" /> ส่งออกรายงาน
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
                  <FileText className="mr-2 h-4 w-4" /> ส่งออกข้อมูลทั้งหมด
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleExport('missing')}>
                  <TriangleAlert className="mr-2 h-4 w-4" /> ส่งออกรายการตกหล่น
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleExport('surplus')}>
                  <CircleX className="mr-2 h-4 w-4" /> ส่งออกรายการเกิน
                </Button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm font-medium text-gray-700">ส่งออกอัตโนมัติเมื่อครบ</span>
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
