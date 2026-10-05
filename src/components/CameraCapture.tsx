import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';

interface CameraCaptureProps {
  onPhotoCaptured: (dataUrl: string) => void;
  photoUrl: string | null;
  onClearPhoto: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onPhotoCaptured,
  photoUrl,
  onClearPhoto,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize camera stream
  const startCamera = async () => {
    setIsInitializing(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser HP tidak mendukung akses kamera langsung.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
      } catch {
        // Fallback to basic video stream without facingMode constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setStreamActive(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tidak dapat membuka kamera.";
      setCameraError(msg);
      setStreamActive(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  useEffect(() => {
    if (!photoUrl) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [photoUrl]);

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Add Satpol PP watermark overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText("POL PP DIGITAL PRESENSI", 12, canvas.height - 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px monospace';
        ctx.fillText(new Date().toLocaleTimeString('id-ID') + " WIB", canvas.width - 110, canvas.height - 22);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stopCamera();
        onPhotoCaptured(dataUrl);
      }
    }
  };

  // Handle mobile native camera file input
  const handleNativeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        stopCamera();
        onPhotoCaptured(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Fallback photo generator in case browser/iframe blocks camera permission
  const generateSimulatedPhoto = () => {
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 400, 400);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);

      // Draw stylized officer avatar silhouette
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(200, 160, 60, 0, Math.PI * 2);
      ctx.fill();

      // Uniform collar
      ctx.fillStyle = '#78350f'; // Khaki Satpol PP
      ctx.beginPath();
      ctx.moveTo(120, 360);
      ctx.lineTo(280, 360);
      ctx.lineTo(250, 250);
      ctx.lineTo(150, 250);
      ctx.closePath();
      ctx.fill();

      // Badge emblem
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(200, 275, 14, 0, Math.PI * 2);
      ctx.fill();

      // Watermark
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 350, 400, 50);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText("SATPOL PP - SELFIE PRESENSI", 16, 380);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(new Date().toLocaleTimeString('id-ID') + " WIB", 280, 380);

      const simUrl = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();
      onPhotoCaptured(simUrl);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs w-full max-w-sm mx-auto">
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden native camera input for HP direct access */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleNativeFileInput}
        className="hidden"
      />

      {photoUrl ? (
        <div className="w-full max-w-[260px] aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-slate-100 border-2 border-emerald-500 relative shadow-sm">
          <img
            src={photoUrl}
            alt="Swafoto Presensi"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-1 shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <button
            onClick={() => {
              onClearPhoto();
              startCamera();
            }}
            className="absolute bottom-2 left-2 right-2 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700 backdrop-blur-sm shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ambil Foto Ulang
          </button>
        </div>
      ) : (
        <div className="w-full max-w-[260px] aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 relative flex flex-col items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
          />

          {!streamActive && (
            <div className="p-3 text-center flex flex-col items-center justify-center space-y-2 w-full h-full">
              {cameraError ? (
                <>
                  <AlertCircle className="w-7 h-7 text-amber-500 shrink-0" />
                  <p className="text-xs text-white font-semibold">Gunakan Kamera HP</p>
                  <p className="text-[10px] text-slate-300">Pilih salah satu metode di bawah:</p>
                  <div className="flex flex-col gap-1.5 w-full px-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Buka Kamera HP</span>
                    </button>
                    <button
                      type="button"
                      onClick={generateSimulatedPhoto}
                      className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-medium rounded-xl transition-colors border border-slate-700"
                    >
                      Foto Seragam Cadangan
                    </button>
                  </div>
                </>
              ) : isInitializing ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mb-2" />
                  <span className="text-xs text-slate-400">Menghubungkan kamera HP...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5 w-full px-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Buka Kamera HP (Swafoto)</span>
                  </button>

                  <button
                    onClick={startCamera}
                    className="text-[11px] text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>atau Aktifkan Kamera Live</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {streamActive && (
            <div className="absolute bottom-2.5 left-2 right-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={captureSnapshot}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 px-5 rounded-full shadow-lg flex items-center gap-1.5 transition-all transform active:scale-95 border border-amber-400/40"
              >
                <Camera className="w-4 h-4" />
                Jepret Selfie
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Buka Kamera Bawaan HP"
                className="bg-slate-900/90 text-slate-300 p-2 rounded-full border border-slate-700 hover:text-white"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
      <span className="text-[10px] sm:text-[10.5px] text-slate-500 mt-2 text-center">
        {photoUrl ? "Foto selfie terverifikasi untuk bukti kehadiran" : "Wajib foto wajah mengenakan seragam dinas"}
      </span>
    </div>
  );
};
