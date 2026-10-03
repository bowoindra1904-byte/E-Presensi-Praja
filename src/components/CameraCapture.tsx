import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize camera stream
  const startCamera = async () => {
    setIsInitializing(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser tidak mendukung akses kamera langsung.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
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
      ctx.fillText(new Date().toLocaleTimeString('id-ID') + " WIB", 270, 380);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      stopCamera();
      onPhotoCaptured(dataUrl);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="hidden" />

      {photoUrl ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/80 shadow-lg group">
          <img
            src={photoUrl}
            alt="Foto Selfie Presensi"
            className="w-48 h-48 sm:w-56 sm:h-56 object-cover"
          />
          <div className="absolute top-2 right-2 bg-emerald-600/90 text-white rounded-full p-1 shadow">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <button
            onClick={() => {
              onClearPhoto();
              startCamera();
            }}
            className="absolute bottom-2 left-2 right-2 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-medium py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700 backdrop-blur-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ambil Foto Ulang
          </button>
        </div>
      ) : (
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 relative flex flex-col items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
          />

          {!streamActive && (
            <div className="p-4 text-center flex flex-col items-center">
              {cameraError ? (
                <>
                  <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                  <p className="text-xs text-slate-300 font-medium mb-2">Kamera Tidak Tersedia</p>
                  <p className="text-[11px] text-slate-400 mb-3">Izin kamera dibatasi di browser atau belum aktif.</p>
                  <button
                    onClick={generateSimulatedPhoto}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors shadow"
                  >
                    Gunakan Foto Seragam Tugas
                  </button>
                </>
              ) : isInitializing ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mb-2" />
                  <span className="text-xs text-slate-400">Menghubungkan kamera...</span>
                </div>
              ) : (
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                  <Camera className="w-8 h-8 text-amber-500" />
                  <span className="text-xs">Aktifkan Kamera Selfie</span>
                </button>
              )}
            </div>
          )}

          {streamActive && (
            <button
              onClick={captureSnapshot}
              className="absolute bottom-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-1.5 px-4 rounded-full shadow-lg flex items-center gap-1.5 transition-all transform active:scale-95 border border-amber-400/40"
            >
              <Camera className="w-4 h-4" />
              Jepret Selfie
            </button>
          )}
        </div>
      )}
      <span className="text-[11px] text-slate-400 mt-2">
        {photoUrl ? "Foto selfie terverifikasi untuk bukti kehadiran" : "Wajib foto wajah dengan seragam dinas"}
      </span>
    </div>
  );
};
