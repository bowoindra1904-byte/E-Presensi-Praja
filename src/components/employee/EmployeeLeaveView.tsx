import React, { useState } from 'react';
import { Employee, LeaveRequest, LeaveType } from '../../types';
import { 
  HeartHandshake, 
  Stethoscope, 
  Calendar, 
  FileText, 
  Send, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Upload, 
  AlertCircle,
  FileCheck,
  ShieldAlert
} from 'lucide-react';

interface EmployeeLeaveViewProps {
  employee: Employee;
  leaveRequests: LeaveRequest[];
  onSubmitLeaveRequest: (request: LeaveRequest) => void;
  currentDate: Date;
  initialType?: LeaveType;
}

export const EmployeeLeaveView: React.FC<EmployeeLeaveViewProps> = ({
  employee,
  leaveRequests,
  onSubmitLeaveRequest,
  currentDate,
  initialType = 'izin',
}) => {
  const todayStr = currentDate.toISOString().split('T')[0];

  // Form State
  const [leaveType, setLeaveType] = useState<LeaveType>(initialType);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [reason, setReason] = useState<string>('');
  const [dispensationLetterNumber, setDispensationLetterNumber] = useState<string>('');
  const [dispensationIssuedBy, setDispensationIssuedBy] = useState<string>('Kantor Satpol PP');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Sync if initialType changes from outside
  React.useEffect(() => {
    if (initialType) {
      setLeaveType(initialType);
    }
  }, [initialType]);

  // Calculate day count safely
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 1;
    const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) ? 1 : Math.max(1, diffDays);
  };

  const totalDays = calculateDays(startDate, endDate);

  // Handle file attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran berkas surat maksimal 2 MB.");
        return;
      }
      setAttachmentName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Harap isi alasan permohonan / kendala.");
      return;
    }

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      alert("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    if (leaveType === 'dispensasi_kantor' && !attachmentUrl) {
      alert("Untuk kendala HP rusak, harap lampirkan/unggah foto atau berkas scan surat izin resmi yang diterbitkan oleh kantor.");
      return;
    }

    setIsSubmitting(true);

    const nowStr = `${currentDate.toISOString().split('T')[0]} ${currentDate.toLocaleTimeString('id-ID', { hour12: false })}`;

    const newRequest: LeaveRequest = {
      id: `LEAVE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeNip: employee.nip,
      regu: employee.regu,
      type: leaveType,
      startDate,
      endDate,
      totalDays,
      reason: reason.trim(),
      attachmentName: attachmentName || undefined,
      attachmentUrl: attachmentUrl || undefined,
      status: 'pending',
      appliedAt: nowStr,
      isOfficeDispensation: leaveType === 'dispensasi_kantor',
      dispensationLetterNumber: leaveType === 'dispensasi_kantor' ? dispensationLetterNumber.trim() || undefined : undefined,
      dispensationIssuedBy: leaveType === 'dispensasi_kantor' ? dispensationIssuedBy.trim() || undefined : undefined,
    };

    onSubmitLeaveRequest(newRequest);
    setIsSubmitting(false);
    setSubmitSuccess(
      leaveType === 'dispensasi_kantor'
        ? `Surat izin kantor (Dispensasi HP Rusak) berhasil diunggah dan dikirim ke Admin Komando.`
        : `Permohonan ${leaveType === 'sakit' ? 'Sakit' : 'Izin'} berhasil dikirim ke Admin Komando.`
    );
    setReason('');
    setDispensationLetterNumber('');
    setAttachmentName('');
    setAttachmentUrl('');

    setTimeout(() => {
      setSubmitSuccess(null);
    }, 5000);
  };

  // Filter requests for this officer
  const myRequests = leaveRequests
    .filter(r => r.employeeId === employee.id)
    .sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-amber-600" />
            <span>Permohonan Izin & Sakit Kedinasan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengajuan izin resmi atau keterangan sakit yang langsung terhubung dan diverifikasi oleh Admin Komando Satpol PP
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3.5 py-1.5 rounded-2xl text-xs font-semibold text-amber-800">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Verifikasi Real-Time Admin</span>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* Grid: Form (Left) & History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Card */}
        <div className="lg:col-span-5 bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Formulir Pengajuan Baru</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Type Selector (2 Pilihan: Izin Resmi Kedinasan & Sakit) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Jenis Permohonan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveType('izin')}
                  className={`py-2.5 px-3 rounded-2xl font-bold border flex items-center justify-center gap-1.5 transition-all text-center ${
                    leaveType === 'izin'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4 shrink-0" />
                  <span>Izin Kedinasan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeaveType('sakit')}
                  className={`py-2.5 px-3 rounded-2xl font-bold border flex items-center justify-center gap-1.5 transition-all text-center ${
                    leaveType === 'sakit'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 shrink-0" />
                  <span>Sakit (Dokter)</span>
                </button>
              </div>
            </div>

            {/* Informational Box: Pemutihan HP Rusak Dilakukan di Admin */}
            <div className="p-3 bg-blue-50/80 border border-blue-200/90 rounded-2xl text-blue-900 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="font-bold text-blue-900">Kendala HP Rusak / Error di Lapangan?</strong>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Bagi personel yang mengalami HP rusak, mati total, atau error teknis saat dinas, <strong>Pemutihan Absensi</strong> akan diinput langsung oleh Admin Satpol PP di kantor/posko kapan saja. Cukup melapor ke Komandan Regu / Provost.
                </p>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Mulai Tanggal:
                </label>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Sampai Tanggal:
                </label>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full cursor-pointer"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Duration Display */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">Lama Permohonan:</span>
              <span className="font-bold text-slate-900 font-mono">
                {totalDays} Hari Kerja
              </span>
            </div>

            {/* Additional Fields for Dispensasi Kantor */}
            {leaveType === 'dispensasi_kantor' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/70 border border-slate-200 rounded-2xl">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nomor Surat Izin Kantor:
                  </label>
                  <input
                    type="text"
                    value={dispensationLetterNumber}
                    onChange={(e) => setDispensationLetterNumber(e.target.value)}
                    placeholder="Contoh: 005/DISP/POLPP/2026"
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    required={leaveType === 'dispensasi_kantor'}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Diterbitkan Oleh:
                  </label>
                  <input
                    type="text"
                    value={dispensationIssuedBy}
                    onChange={(e) => setDispensationIssuedBy(e.target.value)}
                    placeholder="Contoh: Kantor Satpol PP / Danru"
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {leaveType === 'dispensasi_kantor' ? 'Keterangan Kendala Lapangan (HP Rusak):' : 'Alasan / Keperluan Dinas atau Medis:'}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  leaveType === 'dispensasi_kantor'
                    ? 'Contoh: HP anggota mengalami kerusakan layar/mati total saat dinas pos pengamanan, sehingga menggunakan surat dispensasi resmi kantor...'
                    : leaveType === 'sakit'
                    ? 'Contoh: Mengalami demam dan disarankan istirahat oleh dokter klinik...'
                    : 'Contoh: Keperluan keluarga mendesak / dinas luar kota...'
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                required
              />
            </div>

            {/* Attachment */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {leaveType === 'dispensasi_kantor'
                  ? 'Unggah Foto / Scan Surat Izin Kantor (Wajib):'
                  : 'Lampiran Surat Keterangan / Surat Dokter (Opsional):'}
              </label>
              <div className={`relative border-2 border-dashed rounded-2xl p-3 text-center transition-colors ${
                leaveType === 'dispensasi_kantor'
                  ? 'border-blue-300 bg-blue-50/40 hover:border-blue-500'
                  : 'border-slate-200 hover:border-amber-400 bg-slate-50/50'
              }`}>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required={leaveType === 'dispensasi_kantor' && !attachmentUrl}
                />
                <div className="flex flex-col items-center justify-center gap-1 text-[11px] text-slate-500">
                  <Upload className={`w-4 h-4 ${leaveType === 'dispensasi_kantor' ? 'text-blue-600' : 'text-amber-600'}`} />
                  <span className="font-semibold text-slate-700">
                    {attachmentName ? attachmentName : (leaveType === 'dispensasi_kantor' ? "Pilih Foto Surat Izin Kantor" : "Pilih Berkas Foto / PDF")}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {leaveType === 'dispensasi_kantor' ? "Foto Surat Resmi Bertanda Tangan (Maks. 2MB)" : "Maks. 2MB (Surat Izin / Keterangan Dokter)"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Mengirimkan..." : "Kirimkan Permohonan ke Komando"}</span>
            </button>
          </form>
        </div>

        {/* History List (Right) */}
        <div className="lg:col-span-7 bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Riwayat Pengajuan Izin & Sakit ({myRequests.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Sinkronisasi Otomatis Absensi
            </span>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 bg-slate-50/50 space-y-2.5 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      req.type === 'dispensasi_kantor'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : req.type === 'sakit'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {req.type === 'dispensasi_kantor' ? (
                        <FileText className="w-4 h-4" />
                      ) : req.type === 'sakit' ? (
                        <Stethoscope className="w-4 h-4" />
                      ) : (
                        <HeartHandshake className="w-4 h-4" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 uppercase">
                          {req.type === 'dispensasi_kantor'
                            ? 'Dispensasi Kantor (HP Rusak)'
                            : req.type === 'sakit'
                            ? 'Permohonan Sakit'
                            : 'Izin Kedinasan'}{' '}
                          ({req.totalDays} Hari)
                        </h4>
                        {req.dispensationLetterNumber && (
                          <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                            No: {req.dispensationLetterNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Diajukan: {req.appliedAt}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {req.status === 'pending' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                        Menunggu Persetujuan
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Disetujui Komando
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Ditolak
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Rentang Tanggal:</span>
                    <strong className="text-slate-800 font-mono">
                      {req.startDate} s/d {req.endDate}
                    </strong>
                  </div>
                  <p className="text-[11.5px] text-slate-800 font-medium pt-1">
                    "{req.reason}"
                  </p>
                  {req.attachmentUrl && (
                    <div className="text-[10.5px] text-blue-700 flex items-center justify-between pt-1 font-medium bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-1 truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                        <span className="truncate">Berkas: {req.attachmentName || 'Surat Izin Kantor'}</span>
                      </div>
                      <a
                        href={req.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold underline hover:text-blue-900 shrink-0 ml-2"
                      >
                        Lihat Berkas
                      </a>
                    </div>
                  )}
                </div>

                {/* Admin Note if reviewed */}
                {req.adminNote && (
                  <div className={`p-2.5 rounded-xl text-[11px] border flex items-start gap-1.5 ${
                    req.status === 'approved'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Catatan Admin ({req.reviewedBy || 'Komando Satpol PP'}):</span>
                      <span>{req.adminNote}</span>
                      {req.reviewedAt && (
                        <span className="text-[9.5px] opacity-75 block mt-0.5 font-mono">{req.reviewedAt}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {myRequests.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada permohonan izin atau sakit yang diajukan.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
