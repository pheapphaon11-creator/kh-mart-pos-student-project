'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { Camera, RefreshCw, Send, AlertCircle, CheckCircle } from 'lucide-react';

declare const Html5Qrcode: any;

export default function MobileScanPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const sessionIdRef = useRef<string>('');
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const scannerRef = useRef<any>(null);
 
  // Extract session ID from URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sId = params.get('session') || '';
    setSessionId(sId);
    sessionIdRef.current = sId;
 
    // Check for Secure Context (HTTPS or Localhost)
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
 
      if (!isLocalhost && !isHttps) {
        setErrorMsg('⚠️ Camera access is BLOCKED by your browser over insecure connections (HTTP). You MUST access the scanner using HTTPS (like https://kh-mart-pos.vercel.app/scan).');
      } else if (!hasMediaDevices) {
        setErrorMsg('⚠️ Camera API (getUserMedia) is not supported or blocked by your browser settings. Try Google Chrome or Safari.');
      }
    }
  }, []);

  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz frequency
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); // Vol

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12); // Duration 120ms
      
      if (navigator.vibrate) {
        navigator.vibrate(80); // Vibrate phone 80ms
      }
    } catch (e) {
      console.warn('Feedback failed', e);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    if (isSending) return;
    
    // Prevent double-triggering for the same barcode within 1.5 seconds
    if (barcode === lastScanned) {
      return;
    }
    
    setScanResult(barcode);
    setLastScanned(barcode);
    setTimeout(() => setLastScanned(''), 1500); // Reset cooldown
    
    playBeep();
    await sendBarcode(barcode);
  };

  const sendBarcode = async (code: string) => {
    setIsSending(true);
    setErrorMsg('');
    setSuccessMsg('');
    const currentSession = sessionIdRef.current;
    try {
      const res = await fetch('/api/pos/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code, sessionId: currentSession })
      });

      if (!res.ok) {
        throw new Error('Failed to send barcode');
      }

      setSuccessMsg(`Sent barcode: ${code}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsSending(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    playBeep();
    sendBarcode(manualBarcode.trim());
    setManualBarcode('');
  };

  const initScanner = () => {
    if (typeof Html5Qrcode === 'undefined') return;

    Html5Qrcode.getCameras().then((devices: any[]) => {
      setCameras(devices);
      if (devices.length > 0) {
        // Prefer back camera if available
        const backCam = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        const camId = backCam ? backCam.id : devices[devices.length - 1].id;
        setSelectedCameraId(camId);
        startScanning(camId);
      } else {
        setErrorMsg('No cameras found.');
      }
    }).catch((err: any) => {
      console.error(err);
      setErrorMsg('Camera access permission denied.');
    });
  };

  const startScanning = (cameraId: string) => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setupAndStart(cameraId);
      }).catch(console.error);
    } else {
      setupAndStart(cameraId);
    }
  };

  const setupAndStart = (cameraId: string) => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      cameraId,
      {
        fps: 15,
        qrbox: (width: number, height: number) => {
          // Responsive box targeting barcodes (wide and short)
          const qrboxWidth = Math.floor(width * 0.75);
          const qrboxHeight = Math.floor(height * 0.35);
          return { width: qrboxWidth, height: qrboxHeight };
        },
        aspectRatio: 1.0
      },
      (decodedText: string) => {
        handleBarcodeScanned(decodedText);
      },
      (errorMessage: string) => {
        // Verbose scan failures, ignored to prevent console clutter
      }
    ).then(() => {
      setScannerInitialized(true);
    }).catch((err: any) => {
      console.error(err);
      setErrorMsg('Failed to start camera feed.');
    });
  };

  // Stop scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const camId = e.target.value;
    setSelectedCameraId(camId);
    if (scannerInitialized) {
      startScanning(camId);
    }
  };

  return (
    <>
      <Script 
        src="https://unpkg.com/html5-qrcode" 
        strategy="afterInteractive" 
        onLoad={initScanner}
      />
      
      <div className="mobile-scanner-layout">
        <header className="scanner-header">
          <div className="logo-section">
            <span className="logo-icon">🛒</span>
            <div>
              <h1>KH Mart Scanner</h1>
              <p>{sessionId ? 'Scanned items go to POS terminal' : 'Standalone Mode'}</p>
            </div>
          </div>
        </header>

        <main className="scanner-body">
          {/* Camera Feed Viewport */}
          <div className="scanner-viewport-wrapper">
            <div id="reader" className="scanner-viewport"></div>
            {!scannerInitialized && (
              <div className="scanner-placeholder">
                <Camera size={48} className="camera-icon animate-pulse" />
                <p>Initializing camera feed...</p>
                <button className="btn btn-primary btn-sm" onClick={initScanner} style={{ marginTop: 12 }}>
                  Grant Permission
                </button>
              </div>
            )}
            {scannerInitialized && (
              <div className="scanner-crosshair">
                <div className="crosshair-box"></div>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {cameras.length > 1 && (
            <div className="camera-controls">
              <label className="form-label">Active Camera</label>
              <select className="form-control" value={selectedCameraId} onChange={handleCameraChange}>
                {cameras.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Feedback Section */}
          <div className="feedback-section">
            {isSending && (
              <div className="status-banner info">
                <RefreshCw size={16} className="spinner" />
                <span>Sending barcode to POS...</span>
              </div>
            )}
            {errorMsg && (
              <div className="status-banner error">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="status-banner success">
                <CheckCircle size={16} />
                <span>{successMsg}</span>
              </div>
            )}
            {scanResult && !successMsg && !errorMsg && !isSending && (
              <div className="status-banner result">
                <span>Scanned Barcode: <strong>{scanResult}</strong></span>
              </div>
            )}
          </div>

          {/* Manual Input Form */}
          <form className="manual-input-form" onSubmit={handleManualSubmit}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Can't scan? Type Barcode</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                className="form-control" 
                type="text" 
                pattern="[a-zA-Z0-9-]+"
                placeholder="Type barcode manually..." 
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" type="submit" style={{ padding: '0 16px' }} disabled={!manualBarcode.trim()}>
                <Send size={16} />
              </button>
            </div>
          </form>
        </main>

        <style jsx global>{`
          .mobile-scanner-layout {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background: #0f172a;
            color: #f8fafc;
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 480px;
            margin: 0 auto;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
          }
          
          .scanner-header {
            padding: 16px;
            background: #1e293b;
            border-bottom: 1px solid #334155;
          }
          
          .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .logo-icon {
            font-size: 28px;
            background: #10b981;
            padding: 8px;
            border-radius: 12px;
          }

          .logo-section h1 {
            font-size: 16px;
            font-weight: 700;
            margin: 0;
            color: #ffffff;
          }

          .logo-section p {
            font-size: 11px;
            color: #94a3b8;
            margin: 2px 0 0 0;
          }

          .scanner-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 16px;
            gap: 16px;
          }

          .scanner-viewport-wrapper {
            position: relative;
            width: 100%;
            aspect-ratio: 1;
            background: #000;
            border-radius: 16px;
            overflow: hidden;
            border: 2px solid #334155;
          }

          .scanner-viewport {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          /* Hide html5-qrcode controls inside reader div */
          #reader__dashboard, #reader__status_span {
            display: none !important;
          }
          #reader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }

          .scanner-placeholder {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            padding: 24px;
            text-align: center;
            background: #1e293b;
          }

          .camera-icon {
            color: #10b981;
            margin-bottom: 12px;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .4; }
          }
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          .scanner-crosshair {
            position: absolute;
            inset: 0;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .crosshair-box {
            width: 75%;
            height: 35%;
            border: 2px dashed #10b981;
            border-radius: 8px;
            box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.45);
          }

          .camera-controls {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .camera-controls .form-label {
            color: #94a3b8;
            font-size: 12px;
            font-weight: 500;
          }

          .feedback-section {
            min-height: 48px;
          }

          .status-banner {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 500;
          }

          .status-banner.info {
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
          }

          .status-banner.error {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
          }

          .status-banner.success {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
          }

          .status-banner.result {
            background: #1e293b;
            color: #f8fafc;
            border: 1px solid #334155;
            justify-content: center;
          }

          .spinner {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .manual-input-form {
            background: #1e293b;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid #334155;
            margin-top: auto;
          }

          /* Override globals styling for dark mobile scanner view */
          .mobile-scanner-layout .form-control {
            background: #0f172a;
            border-color: #334155;
            color: #ffffff;
          }
          .mobile-scanner-layout .form-control:focus {
            border-color: #10b981;
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
          }
        `}</style>
      </div>
    </>
  );
}
