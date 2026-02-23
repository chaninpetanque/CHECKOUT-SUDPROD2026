import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Volume2, VolumeX, Keyboard, Camera, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { scanAwb } from '../lib/api';

const Scanner = () => {
  const [scanResult, setScanResult] = useState(null); 
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  
  const scannerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const lastScannedRef = useRef(null);

  const enableAudio = () => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
    }
    setAudioEnabled(true);
    toast.success("เปิดเสียงแล้ว");
  };

  const playSound = useCallback((type) => {
    if (!audioCtxRef.current || !audioEnabled) return;
    
    const audioCtx = audioCtxRef.current;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;

    if (type === 'match') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now); 
      gainNode.gain.setValueAtTime(0.2, now);
      oscillator.start();
      oscillator.stop(now + 0.15);
    } else if (type === 'surplus') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, now); 
      gainNode.gain.setValueAtTime(0.3, now);
      oscillator.start();
      oscillator.stop(now + 0.6);
    } else if (type === 'duplicate') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, now);
      gainNode.gain.setValueAtTime(0.15, now);
      oscillator.start();
      oscillator.stop(now + 0.1);
      
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(440, now);
      gain2.gain.setValueAtTime(0.15, now);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.25);
    }
  }, [audioEnabled]);

  const scanMutation = useMutation({
    mutationFn: (awb) => scanAwb(awb),
    onSuccess: (data) => {
      setScanResult({ 
        status: data.status, 
        message: data.message, 
        awb: data.awb,
        timestamp: new Date().toLocaleTimeString('th-TH')
      });
      playSound(data.status);
      
      if (data.status === 'match') toast.success(`จับคู่สำเร็จ: ${data.awb}`);
      else if (data.status === 'duplicate') toast.warning(`ซ้ำ: ${data.awb}`);
      else if (data.status === 'surplus') toast.error(`เกินจำนวน: ${data.awb}`);
    },
    onError: (err) => {
      console.error("Scan error:", err);
      toast.error(err.message || 'การสแกนล้มเหลว');
    },
    onSettled: () => {
      // Clear last scanned ref after a delay to allow rescanning
      setTimeout(() => {
        lastScannedRef.current = null;
      }, 2000);
    }
  });

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      scanMutation.mutate(manualInput.trim());
      setManualInput('');
    }
  };

  useEffect(() => {
    // Clean up previous scanner instance if switching modes
    if (scannerRef.current) {
        try {
            scannerRef.current.clear().catch(console.error);
        } catch (e) {
            console.error("Error clearing scanner:", e);
        }
        scannerRef.current = null;
    }

    if (manualMode) {
      return;
    }

    // Initialize scanner
    const onScanSuccess = (decodedText) => {
      if (decodedText === lastScannedRef.current) return;
      lastScannedRef.current = decodedText;
      scanMutation.mutate(decodedText);
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
        // Only initialize if element exists
        if (!document.getElementById("reader")) return;

        const scanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true
            },
            false
        );
        
        scanner.render(onScanSuccess, (err) => {
           // ignore scan errors to prevent console spam
        });
        scannerRef.current = scanner;
        setScannerReady(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
            scannerRef.current.clear().catch(console.error);
        } catch (e) {
            console.error("Cleanup error:", e);
        }
        setScannerReady(false);
      }
    };
  }, [manualMode, scanMutation]);

  // Determine background color based on status
  const getStatusColor = () => {
    if (!scanResult) return 'bg-gray-900';
    switch (scanResult.status) {
      case 'match': return 'bg-green-600';
      case 'duplicate': return 'bg-yellow-500';
      case 'surplus': return 'bg-red-600';
      default: return 'bg-gray-900';
    }
  };

  return (
    <div className={cn("min-h-screen flex flex-col p-4 transition-colors duration-500", getStatusColor())}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 text-white">
        <Link to="/" className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
          <ArrowLeft className="h-6 w-6" />
          <span className="font-medium">แดชบอร์ด</span>
        </Link>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20 rounded-full"
            onClick={audioEnabled ? () => setAudioEnabled(false) : enableAudio}
          >
            {audioEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20 rounded-full"
            onClick={() => setManualMode(!manualMode)}
          >
            {manualMode ? <Camera className="h-6 w-6" /> : <Keyboard className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-6">
        
        {/* Scanner/Input Area */}
        <Card className="w-full overflow-hidden border-0 shadow-2xl bg-black/40 backdrop-blur-sm">
          <CardContent className="p-0">
            {manualMode ? (
              <div className="p-8 space-y-4 bg-white min-h-[300px] flex flex-col justify-center">
                <div className="text-center mb-4">
                  <Keyboard className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-900">กรอกข้อมูลเอง</h3>
                  <p className="text-sm text-gray-500">กรอกเลขพัสดุด้วยตนเอง</p>
                </div>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                    <Input 
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="สแกนหรือพิมพ์เลขพัสดุ..."
                        className="text-center text-lg h-12"
                        autoFocus
                    />
                    <Button 
                        type="submit" 
                        className="w-full h-12 text-lg" 
                        disabled={scanMutation.isPending || !manualInput.trim()}
                    >
                        {scanMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                กำลังประมวลผล...
                            </>
                        ) : (
                            "ตกลง"
                        )}
                    </Button>
                </form>
              </div>
            ) : (
                <div className="relative bg-black min-h-[300px]">
                    <div id="reader" className="w-full h-full"></div>
                    {/* Overlay for scanner loading or processing */}
                    {(!scannerReady || scanMutation.isPending) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
                            {scanMutation.isPending && (
                                <div className="bg-white/90 text-black px-4 py-2 rounded-full flex items-center shadow-lg">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังประมวลผล...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
          </CardContent>
        </Card>

        {/* Result Display */}
        {scanResult && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="bg-white/95 backdrop-blur shadow-xl border-0">
                    <CardContent className="p-6 text-center">
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                            scanResult.status === 'match' ? "bg-green-100 text-green-600" :
                            scanResult.status === 'duplicate' ? "bg-yellow-100 text-yellow-600" :
                            "bg-red-100 text-red-600"
                        )}>
                            {scanResult.status === 'match' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : scanResult.status === 'duplicate' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold mb-1">{scanResult.awb}</h2>
                        <p className={cn(
                            "text-lg font-medium",
                            scanResult.status === 'match' ? "text-green-600" :
                            scanResult.status === 'duplicate' ? "text-yellow-600" :
                            "text-red-600"
                        )}>
                            {scanResult.message}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">{scanResult.timestamp}</p>
                    </CardContent>
                </Card>
            </div>
        )}

      </div>
      
      {/* Footer Instructions */}
      <div className="text-center text-white/60 text-sm mt-8">
        <p>ส่องกล้องไปที่บาร์โค้ดหรือกรอกข้อมูลเอง</p>
      </div>
    </div>
  );
};

export default Scanner;
