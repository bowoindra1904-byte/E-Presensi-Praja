import React from 'react';
import { 
  BookOpen, 
  X, 
  Smartphone, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Printer, 
  Archive, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface OperationalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: 'pegawai' | 'admin';
}

export const OperationalGuideModal: React.FC<OperationalGuideModalProps> = ({
  isOpen,
  onClose,
  currentRole
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        
        {/* Accent Glow */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-10" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
                <span className="truncate">Panduan Operasional</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono shrink-0">
                  SOP
                </span>
              </h3>
              <p className="text-[10.5px] sm:text-xs text-slate-400 truncate">
                Petunjuk Teknis Presensi GPS & Kunci Perangkat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="py-4 space-y-4 overflow-y-auto pr-1 text-xs">
          
          {/* Section 1: Device Lock */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Smartphone className="w-4 h-4" />
              <span>1. Aturan Kunci Perangkat (1 Anggota = 1 Smartphone Permanen)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Pada saat pertama kali personel masuk menggunakan NIP, sistem secara otomatis mengikat ID perangkat unik smartphone tersebut. Sistem menolak presensi jika personel menggunakan HP rekan lain untuk mencegah praktik joki/titip absen.
            </p>
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-amber-200/90 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>Jika HP Rusak/Hilang:</strong> Personel wajib melapor ke Administrator Komando untuk dilakukan verifikasi dan <em>Reset Kunci Perangkat</em> di menu Kunci & Audit.</span>
            </div>
          </div>

          {/* Section 2: GPS Geofence */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <MapPin className="w-4 h-4" />
              <span>2. Aturan Geofence Lokasi Dinas (8 Pos Slot)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Presensi hanya valid apabila personel berada di dalam radius resmi pos tugas yang telah ditentukan (radius 50–100 meter dari titik koordinat pos). Pastikan fitur GPS/Lokasi Akurasi Tinggi di HP aktif dan browser diizinkan mengakses lokasi.
            </p>
          </div>

          {/* Section 3: Time Windows */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold">
              <Clock className="w-4 h-4" />
              <span>3. Ketentuan Jendela Waktu & Jadwal Dinas</span>
            </div>
            <ul className="list-disc list-inside text-slate-300 space-y-1.5 pl-1">
              <li><strong>Jadwal Harian (Senin - Kamis):</strong> Masuk 07.30 WIB (dibuka mulai 07.00 WIB) - Pulang 16.00 WIB.</li>
              <li><strong>Jadwal Harian Khusus Jumat:</strong> Masuk 07.00 WIB (dibuka mulai 06.30 WIB) - Pulang 16.30 WIB.</li>
              <li><strong>Jadwal Shift Pagi:</strong> Masuk 08.00 WIB (dibuka mulai 07.30 WIB) - Pulang 20.00 WIB.</li>
              <li><strong>Jadwal Shift Malam:</strong> Masuk 20.00 WIB (dibuka mulai 19.30 WIB) - Pulang 08.00 WIB (keesokan harinya).</li>
              <li><strong>Aturan Toleransi & 30 Menit:</strong> Tombol absen masuk baru terbuka 30 menit sebelum jam dinas dimulai. Absen setelah jam dinas dinyatakan <em>Terlambat</em>.</li>
            </ul>
          </div>

          {/* Section 4: Reports & Print */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <Printer className="w-4 h-4" />
              <span>4. Pencetakan Dokumen Resmi & Laporan</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Admin dapat mencetak 5 format laporan kedinasan resmi lengkap dengan Kop Surat Satpol PP Bangka Barat, stempel, logo, tanggal kota Mentok, dan nama penanda tangan (Kasatpol PP / Sekdin) yang dapat disesuaikan.
            </p>
          </div>

          {/* Section 5: Cloud Storage & Archive */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Archive className="w-4 h-4" />
              <span>5. Pemeliharaan Kuota Cloud Firebase (&gt; 6 Bulan)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Gunakan tombol <strong>"Arsip & Bersihkan &gt; 6 Bulan"</strong> di menu Laporan Bulanan setiap akhir semester. Unduh file cadangan CSV ke komputer dinas terlebih dahulu, lalu pilih opsi <em>"Hanya Kosongkan Foto Selfie"</em> agar kuota Firebase selalu 100% lega tanpa menghilangkan catatan jam kehadiran.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>SOP Satuan Polisi Pamong Praja Kab. Bangka Barat</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow transition-colors"
          >
            Mengerti & Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
