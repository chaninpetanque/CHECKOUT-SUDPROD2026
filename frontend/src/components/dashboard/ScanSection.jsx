import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Scan, Search, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const ScanSection = ({ 
  barcodeModeEnabled, 
  setBarcodeModeEnabled, 
  scannerInput, 
  setScannerInput, 
  handleScanSubmit, 
  scanStatus, 
  isScanning,
  scannerFocused,
  setScannerFocused
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (barcodeModeEnabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [barcodeModeEnabled]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleScanSubmit();
    }
  };

  return (
    <Card className={cn("border-l-4 transition-all duration-300", 
      barcodeModeEnabled ? "border-l-green-500 shadow-md ring-1 ring-green-100" : "border-l-gray-200"
    )}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Scan className={cn("h-5 w-5 transition-colors", barcodeModeEnabled ? "text-green-600" : "text-gray-400")} />
            เครื่องสแกนบาร์โค้ด
          </CardTitle>
          <Badge variant={barcodeModeEnabled ? (scannerFocused ? "success" : "warning") : "secondary"}>
            {barcodeModeEnabled 
              ? (scannerFocused ? "พร้อมสแกน" : "คลิกเพื่อเริ่ม") 
              : "โหมด: กรอกเอง"}
          </Badge>
        </div>
        <CardDescription>
          เชื่อมต่อเครื่องสแกน USB/Bluetooth หรือพิมพ์รหัสด้วยตนเอง
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={barcodeModeEnabled ? "default" : "outline"}
            onClick={() => setBarcodeModeEnabled(!barcodeModeEnabled)}
            className={cn("w-full md:w-auto transition-all", barcodeModeEnabled ? "bg-green-600 hover:bg-green-700" : "")}
          >
            {barcodeModeEnabled ? "เปิดใช้งานสแกนเนอร์" : "เปิดสแกนเนอร์"}
          </Button>
        </div>

        <div className="relative">
          <Input
            ref={inputRef}
            value={scannerInput}
            onChange={(e) => setScannerInput(e.target.value)}
            onFocus={() => setScannerFocused(true)}
            onBlur={() => setScannerFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={!barcodeModeEnabled}
            placeholder={barcodeModeEnabled ? "สแกนบาร์โค้ดที่นี่..." : "เปิดโหมดสแกนเนอร์ก่อน"}
            className={cn(
              "pl-10 h-12 text-lg font-mono transition-all",
              barcodeModeEnabled ? "border-green-300 focus:ring-green-500" : "bg-gray-50"
            )}
          />
          <Scan className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <div className="absolute right-2 top-2">
            <Button 
              size="sm" 
              onClick={handleScanSubmit}
              disabled={!barcodeModeEnabled || !scannerInput.trim() || isScanning}
              className={cn("h-8", barcodeModeEnabled ? "bg-green-600 hover:bg-green-700" : "")}
            >
              {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {scanStatus && (
          <div 
            className={cn(
              "p-4 rounded-lg border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300",
              scanStatus.status === 'match' ? "bg-green-50 border-green-200 text-green-800" :
              scanStatus.status === 'duplicate' ? "bg-yellow-50 border-yellow-200 text-yellow-800" :
              scanStatus.status === 'surplus' ? "bg-red-50 border-red-200 text-red-800" :
              "bg-blue-50 border-blue-200 text-blue-800"
            )}
          >
            <div>
              <div className="font-bold flex items-center gap-2">
                {scanStatus.status === 'match' && "✅ จับคู่สำเร็จ"}
                {scanStatus.status === 'duplicate' && "⚠️ ซ้ำ"}
                {scanStatus.status === 'surplus' && "❌ เกินจำนวน (ไม่พบข้อมูล)"}
                {scanStatus.status === 'export' && "⬇️ ส่งออกแล้ว"}
              </div>
              <div className="text-sm mt-1">{scanStatus.message}</div>
              {scanStatus.awb && <div className="font-mono text-xs mt-1 opacity-75">{scanStatus.awb}</div>}
            </div>
            <div className="text-xs opacity-50 font-mono">
              {scanStatus.time}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScanSection;
