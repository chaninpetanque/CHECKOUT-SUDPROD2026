import React, { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, CircleCheck, TriangleAlert, CircleX, QrCode, ExternalLink, Download, FileText, Calendar as CalendarIcon, Volume2, VolumeX, Ban } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

import StatCard from './dashboard/StatCard';
import UploadSection from './dashboard/UploadSection';
import ScanSection from './dashboard/ScanSection';
import HistoryTable from './dashboard/HistoryTable';
import AwbListSection from './dashboard/AwbListSection';
import SummaryTotals from './dashboard/SummaryTotals';
import ClearDataModal from './dashboard/ClearDataModal';
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
  deleteRecord,
  cancelAwb
} from '../lib/api';
import { playSound, initAudio } from '../lib/sound';

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeModeEnabled, setBarcodeModeEnabled] = useState(false);
  const [scannerInput, setScannerInput] = useState('');
  const [scannerFocused, setScannerFocused] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const exportFormat = 'xlsx';
  const [autoExportEnabled, setAutoExportEnabled] = useState(true);
  const [lastAutoExportDate, setLastAutoExportDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelInput, setCancelInput] = useState('');

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
    mutationFn: (mode) => clearData(mode),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['history']);
    },
    onError: () => {
      toast.error('ล้างข้อมูลล้มเหลว กรุณาลองใหม่');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteRecord(id),
    onSuccess: () => {
      toast.success('ลบรายการเรียบร้อยแล้ว');
      queryClient.invalidateQueries(['history']);
      queryClient.invalidateQueries(['dashboard']);
    },
    onError: () => {
      toast.error('ลบรายการล้มเหลว');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (awb) => cancelAwb(awb),
    onSuccess: (data) => {
      if (data.status === 'cancelled') {
        toast.success(data.message);
      } else if (data.status === 'already_cancelled') {
        toast.warning(data.message);
      } else {
        toast.error(data.message || 'ไม่พบเลขพัสดุ');
      }
      setCancelInput('');
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['history']);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'ยกเลิกล้มเหลว');
    }
  });

  const scanMutation = useMutation({
    mutationFn: (awb) => scanAwb(awb),
    onSuccess: (data) => {
      setScanStatus({
        status: data.status,
        message: data.message,
        awb: data.awb,
        time: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })
      });
      if (data.status === 'match') toast.success(`จับคู่สำเร็จ: ${data.awb}`);
      else if (data.status === 'duplicate') toast.warning(`ซ้ำ: ${data.awb}`);
      else if (data.status === 'surplus') toast.error(`เกินจำนวน: ${data.awb}`);
      if (audioEnabled) playSound(data.status);
      // Refresh history and dashboard immediately after scan
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      const errorMsg = 'ข้อผิดพลาดเครือข่าย';
      setScanStatus({
        status: 'error',
        message: errorMsg,
        awb: scannerInput,
        time: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })
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
    setShowClearModal(true);
  };

  const handleConfirmClear = (mode) => {
    clearMutation.mutate(mode);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const downloadReportFn = useCallback(async (type, format, isAuto = false) => {
    try {
      setExporting(true);
      // Use direct URL to get proper Content-Disposition filename
      const ext = format === 'excel' ? 'xlsx' : format;
      const url = `/api/export?type=${type}&format=${ext}&date=${selectedDate}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${type}-${selectedDate}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      if (isAuto) {
        toast.info('ส่งออกรายงานอัตโนมัติเรียบร้อยแล้ว');
        setScanStatus({
          status: 'export',
          message: 'ส่งออกรายงานอัตโนมัติ',
          awb: '',
          time: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setExporting(false);
    }
  }, [selectedDate]);

  const handleExport = (type) => {
    downloadReportFn(type, exportFormat);
  };

  const handleScanSubmit = () => {
    const value = scannerInput.trim();
    if (!value) return;
    if (!value.startsWith('864')) {
      toast.error('เลขพัสดุไม่ถูกต้อง (ต้องขึ้นต้นด้วย 864)');
      if (audioEnabled) playSound('surplus');
      setScannerInput('');
      return;
    }
    scanMutation.mutate(value);
    setScannerInput('');
  };

  const handleCancelSubmit = (e) => {
    e.preventDefault();
    const value = cancelInput.trim();
    if (!value) return;
    if (!value.startsWith('864')) {
      toast.error('รูปแบบเลขพัสดุไม่ถูกต้อง (ต้องขึ้นต้นด้วย 864)');
      setCancelInput('');
      return;
    }
    cancelMutation.mutate(value);
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
      <ClearDataModal
        open={showClearModal}
        onOpenChange={setShowClearModal}
        onConfirm={handleConfirmClear}
        isLoading={clearMutation.isPending}
      />

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

      {/* Summary Totals */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <SummaryTotals stats={stats} />
      )}

      {/* Surplus & Missing AWB Lists */}
      {!statsLoading && (
        <AwbListSection
          surplusAwbs={stats?.surplus_awbs || []}
          missingAwbs={stats?.missing_awbs || []}
        />
      )}

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

          <div className="flex items-center justify-between mb-2">
            <div />
            <Button
              variant={audioEnabled ? 'default' : 'outline'}
              size="sm"
              className={audioEnabled ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() => {
                if (!audioEnabled) initAudio();
                setAudioEnabled(!audioEnabled);
              }}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
              {audioEnabled ? 'เสียงเปิด' : 'เปิดเสียง'}
            </Button>
          </div>

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
              history={(history || []).filter(item => {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'match') return item.status === 'match' || item.status === 'scanned';
                return item.status === statusFilter;
              })}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleExport={handleExport}
              isExporting={exporting}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
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

          {/* Stats Report Link */}
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                📊 สรุปสถิติ
              </CardTitle>
              <CardDescription className="text-purple-700/80">
                ดูสถิติรายวัน/รายสัปดาห์
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white" asChild>
                <a href="/stats">
                  เปิดหน้าสถิติ <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" /> ส่งออกรายงาน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

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

          {/* Cancel AWB */}
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Ban className="h-5 w-5" /> ยกเลิกพัสดุ
              </CardTitle>
              <CardDescription className="text-red-700/80">
                กรอกเลขพัสดุที่ต้องการยกเลิก
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCancelSubmit} className="space-y-3">
                <input
                  type="text"
                  value={cancelInput}
                  onChange={(e) => setCancelInput(e.target.value)}
                  placeholder="เลขพัสดุ..."
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <Button
                  type="submit"
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                  disabled={!cancelInput.trim() || cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'กำลังยกเลิก...' : 'ยกเลิกพัสดุ'}
                </Button>
              </form>
              {stats?.cancelled > 0 && (
                <div className="mt-3 text-sm text-red-700">
                  ยกเลิกแล้ว: <span className="font-bold">{stats.cancelled}</span> รายการ
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Clear Data Modal is rendered at top of component as <ClearDataModal /> */}
    </div>
  );
};

export default Dashboard;
