import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const Scanner = () => {
  const [scanResult, setScanResult] = useState(null); 
  const [audioEnabled, setAudioEnabled] = useState(false);
  const lastScannedRef = useRef(null);
  const scannerRef = useRef(null);
  const audioCtxRef = useRef(null);

  const API_URL = '/api';

  // Initialize AudioContext on user interaction
  const enableAudio = () => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
    }
    setAudioEnabled(true);
  };

  const playSound = (type) => {
    if (!audioCtxRef.current) return;
    
    const audioCtx = audioCtxRef.current;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'match') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'surplus') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.6);
    } else if (type === 'duplicate') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
      setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = 'square';
          osc2.frequency.setValueAtTime(440, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.1);
      }, 150);
    }
  };

  const scanMutation = useMutation({
    mutationFn: async (awb) => {
      const res = await axios.post(`${API_URL}/scan`, { awb });
      return res.data;
    },
    onSuccess: (data) => {
        setScanResult({ status: data.status, message: data.message, awb: data.awb });
        playSound(data.status);
    },
    onError: (err, awb) => {
        console.error(err);
        setScanResult({ status: 'error', message: 'Network Error', awb });
    },
    onSettled: () => {
        // Reset last scanned after delay
        setTimeout(() => {
            lastScannedRef.current = null;
        }, 2000);
    }
  });

  useEffect(() => {
    // Clean up any existing scanner
    if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
    }

    const onScanSuccess = (decodedText) => {
      if (decodedText === lastScannedRef.current) return; 
      
      lastScannedRef.current = decodedText;
      scanMutation.mutate(decodedText);
    };

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    
    scanner.render(onScanSuccess, () => {});
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [scanMutation]);

  let bgColor = 'bg-gray-900';
  
  if (scanResult) {
    if (scanResult.status === 'match') {
        bgColor = 'bg-green-600';
    } else if (scanResult.status === 'duplicate') {
        bgColor = 'bg-yellow-500';
    } else if (scanResult.status === 'surplus' || scanResult.status === 'error') {
        bgColor = 'bg-red-600';
    }
  }

  return (
    <div className={`min-h-screen flex flex-col items-center p-4 ${bgColor} transition-colors duration-300`}>
      <div className="w-full max-w-sm flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-md flex items-center gap-2">
            📱 Scanner
          </h1>
          <button onClick={() => window.location.href = '/'} className="text-white/80 text-sm hover:text-white underline">
            Dashboard
          </button>
      </div>

      {!audioEnabled && (
        <button 
            onClick={enableAudio}
            className="mb-4 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-full text-sm animate-pulse"
        >
            🔇 Tap to Enable Sound
        </button>
      )}
      
      <div className="relative w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
        <div id="reader" className="w-full"></div>
        {scanMutation.isPending && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                 <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
             </div>
        )}
      </div>

      {scanResult ? (
        <div className="mt-8 bg-white p-8 rounded-3xl shadow-2xl text-center w-full max-w-sm animate-bounce-short transform transition-all">
          <h2 className={`text-4xl font-black mb-2 tracking-tight ${
              scanResult.status === 'match' ? 'text-green-600' : 
              scanResult.status === 'duplicate' ? 'text-yellow-600' : 
              'text-red-600'
          }`}>
            {scanResult.status === 'match' ? '✅ MATCH' : 
             scanResult.status === 'duplicate' ? '⚠️ DUPLICATE' : 
             scanResult.status === 'surplus' ? '❌ SURPLUS' : 'ERROR'}
          </h2>
          <div className="bg-gray-100 rounded-xl p-3 mb-2">
            <p className="text-2xl font-mono font-bold text-gray-800 break-all">{scanResult.awb}</p>
          </div>
          <p className="text-gray-500 font-medium">{scanResult.message}</p>
        </div>
      ) : (
          <div className="mt-12 text-white/50 text-center">
              <p>Ready to scan...</p>
          </div>
      )}
    </div>
  );
};

export default Scanner;
