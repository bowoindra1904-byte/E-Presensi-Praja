import React, { useState, useMemo } from 'react';
import { LeaveRequest, Employee, WorkLocation, AdminAccount, ReguType } from '../../types';
import { 
  HeartHandshake, 
  Stethoscope, 
  Check, 
  X, 
  Clock, 
  Search, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  ExternalLink,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Plus,
  Upload,
  Printer,
  Shield,
  ShieldCheck,
  Lock
} from 'lucide-react';

interface AdminLeaveApprovalsProps {
  leaveRequests: LeaveRequest[];
  currentAdmin?: AdminAccount;
  employees?: Employee[];
  locations?: WorkLocation[];
  onApproveLeaveRequest: (requestId: string, adminNote?: string) => void;
  onRejectLeaveRequest: (requestId: string, adminNote?: string) => void;
  onResetLeaveRequests?: (mode: 'completed' | 'all' | 'default') => void;
  onCreateOfficeDispensation?: (data: {
    employeeId: string;
    startDate: string;
    endDate: string;
    letterNumber: string;
    issuedBy: string;
    reason: string;
    sessionMode?: 'full_day' | 'check_in_only' | 'check_out_only';
    statusMode?: 'dispensasi_kantor' | 'tepat_waktu';
    attachmentUrl?: string;
    attachmentName?: string;
  }) => void;
  onOpenPrintMenu?: (menu: 'daily' | 'monthly') => void;
  onClose?: () => void;
}

export const AdminLeaveApprovals: React.FC<AdminLeaveApprovalsProps> = ({
  leaveRequests,
  currentAdmin,
  employees = [],
  locations = [],
  onApproveLeaveRequest,
  onRejectLeaveRequest,
  onResetLeaveRequests,
  onCreateOfficeDispensation,
  onOpenPrintMenu,
  onClose,
}) => {
  const isDanru = Boolean(currentAdmin && currentAdmin.role !== 'komando_pusat' && currentAdmin.reguScope !== 'all');
  const adminRegu = isDanru ? (currentAdmin?.reguScope as ReguType) : null;

  const scopedEmployees = useMemo(() => {
    if (isDanru && adminRegu) {
      return employees.filter(emp => emp.regu === adminRegu);
    }
    return employees;
  }, [employees, isDanru, adminRegu]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected modal for action
  const [activeActionModal, setActiveActionModal] = useState<{
    request: LeaveRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [actionNote, setActionNote] = useState('');

  // Office Dispensation / Pemutihan Absensi Modal State (Solusi HP Rusak / Error Lapangan)
  const [isDispensationModalOpen, setIsDispensationModalOpen] = useState(false);
  const todayIso = new Date().toISOString().split('T')[0];
  const [dispEmpId, setDispEmpId] = useState(scopedEmployees[0]?.id || '');
  const [dispStartDate, setDispStartDate] = useState(todayIso);
  const [dispEndDate, setDispEndDate] = useState(todayIso);
  const [dispLetterNumber, setDispLetterNumber] = useState(`005/DISP/POLPP/${new Date().getFullYear()}`);
  const [dispIssuedBy, setDispIssuedBy] = useState('Kantor Satpol PP Bangka Barat');
  const [dispReason, setDispReason] = useState('Kendala HP rusak/error saat apel pos pengamanan lapangan. Dilakukan pemutihan absensi kedinasan.');
  const [dispSessionMode, setDispSessionMode] = useState<'full_day' | 'check_in_only' | 'check_out_only'>('full_day');
  const [dispStatusMode, setDispStatusMode] = useState<'dispensasi_kantor' | 'tepat_waktu'>('dispensasi_kantor');
  const [dispEmpSearch, setDispEmpSearch] = useState('');
  const [dispFileUrl, setDispFileUrl] = useState('');
  const [dispFileName, setDispFileName] = useState('');

  const applyDatePreset = (preset: 'today' | 'yesterday' | 'this_week') => {
    const d = new Date();
    if (preset === 'today') {
      const iso = d.toISOString().split('T')[0];
      setDispStartDate(iso);
      setDispEndDate(iso);
    } else if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
      const iso = d.toISOString().split('T')[0];
      setDispStartDate(iso);
      setDispEndDate(iso);
    } else if (preset === 'this_week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setDispStartDate(monday.toISOString().split('T')[0]);
      setDispEndDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedResetMode, setSelectedResetMode] = useState<'completed' | 'all' | 'default'>('completed');
  const [isResetting, setIsResetting] = useState(false);

  // Purge sample default requests so only real input from admin or user shows
  const cleanRequests = useMemo(() => {
    const validEmpIds = new Set(scopedEmployees.map(e => e.id));
    return leaveRequests.filter(r => {
      // 1. Purge all bawaan / default sample requests
      if (
        r.id.startsWith('LEAVE-REQ-') ||
        r.id.startsWith('LEAVE-SAMPLE-') ||
        ['LEAVE-REQ-001', 'LEAVE-REQ-002', 'LEAVE-REQ-003'].includes(r.id)
      ) {
        return false;
      }
      // 2. Only show requests for registered employees in current scope (Danru or Komando)
      if (validEmpIds.size > 0 && !validEmpIds.has(r.employeeId)) {
        return false;
      }
      return true;
    });
  }, [leaveRequests, scopedEmployees]);

  // Counts
  const pendingCount = cleanRequests.filter(r => r.status === 'pending').length;
  const approvedCount = cleanRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = cleanRequests.filter(r => r.status === 'rejected').length;

  const filteredRequests = useMemo(() => {
    return cleanRequests.filter(r => {
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchSearch = 
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeNip.includes(searchQuery) ||
        r.reason.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    }).sort((a, b) => {
      // Pending first, then newest
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return (b.appliedAt || '').localeCompare(a.appliedAt || '');
    });
  }, [cleanRequests, filterStatus, searchQuery]);

  const handleDispensationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran berkas surat maksimal 2 MB.");
        return;
      }
      setDispFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDispFileUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateDispensationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispEmpId) {
      alert("Harap pilih personel Satpol PP.");
      return;
    }
    if (!dispLetterNumber.trim()) {
      alert("Harap isi nomor surat / memo pemutihan absensi.");
      return;
    }
    if (onCreateOfficeDispensation) {
      onCreateOfficeDispensation({
        employeeId: dispEmpId,
        startDate: dispStartDate,
        endDate: dispEndDate,
        letterNumber: dispLetterNumber.trim(),
        issuedBy: dispIssuedBy.trim() || 'Kantor Satpol PP Bangka Barat',
        reason: dispReason.trim(),
        sessionMode: dispSessionMode,
        statusMode: dispStatusMode,
        attachmentUrl: dispFileUrl || undefined,
        attachmentName: dispFileName || undefined,
      });
      setIsDispensationModalOpen(false);
      setDispReason('Kendala HP rusak/error saat apel pos pengamanan lapangan. Dilakukan pemutihan absensi kedinasan.');
      setDispFileUrl('');
      setDispFileName('');
    }
  };

  const handleOpenAction = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setActiveActionModal({ request, action });
    setActionNote(
      action === 'approve'
        ? request.type === 'dispensasi_kantor'
          ? `Disetujui Komando Satpol PP: Surat Dispensasi Kantor No. ${request.dispensationLetterNumber || '-'} sah & tersinkron ke rekapan.`
          : 'Disetujui oleh Komando Satpol PP.'
        : 'Permohonan ditolak karena kebutuhan operasional lapangan.'
    );
  };

  const handleConfirmAction = () => {
    if (!activeActionModal) return;
    if (activeActionModal.action === 'approve') {
      onApproveLeaveRequest(activeActionModal.request.id, actionNote);
    } else {
      onRejectLeaveRequest(activeActionModal.request.id, actionNote);
    }
    setActiveActionModal(null);
  };

  return (
    <div className="space-y-5">
      {/* Authority Banner (Danru vs Komando Pusat) */}
      {isDanru ? (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Shield className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-sm text-amber-950 flex items-center gap-2">
                <span>Wewenang Persetujuan Danru {adminRegu}</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">
                  Khusus {adminRegu}
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 mt-0.5 leading-relaxed">
                Anda hanya memvalidasi permohonan izin, sakit, dan pemutihan untuk <strong>{scopedEmployees.length} personel {adminRegu}</strong> (Shift & Harian).
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
            <span className="text-[11px] font-bold bg-white/80 border border-amber-300 px-3 py-1 rounded-xl text-amber-900 shadow-2xs">
              {cleanRequests.length} Permohonan Terdata
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md border border-slate-800">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-sm text-amber-300 flex items-center gap-2">
                <span>Pusat Verifikasi Komando Satpol PP</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
                  Seluruh 150 Pegawai
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Memegang hak persetujuan dan dispensasi kantor untuk seluruh personel Satpol PP lintas Regu 1, Regu 2, Regu 3, Regu 4, dan Harian.
              </p>
            </div>
          </div>
          <div className="shrink-0 self-end sm:self-center">
            <span className="text-[11px] font-mono bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl text-amber-400 font-bold">
              {employees.length} Personel Satpol PP
            </span>
          </div>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-amber-600" />
            <span>Persetujuan Izin & Sakit Personel</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verifikasi permohonan dinas. Izin/Sakit yang disetujui akan langsung tercatat otomatis pada rekap absensi harian dan bulanan pegawai.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-900 px-3.5 py-1.5 rounded-2xl text-xs font-bold animate-pulse shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{pendingCount} Menunggu</span>
            </div>
          )}

          {onCreateOfficeDispensation && (
            <button
              type="button"
              onClick={() => setIsDispensationModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Input Pemutihan Absensi untuk personel dengan kendala HP rusak/error kapan saja agar langsung terakomodir ke rekapan dan cetak absensi"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>⚡ Pemutihan Absensi (HP Rusak / Error)</span>
            </button>
          )}

          {onOpenPrintMenu && (
            <button
              type="button"
              onClick={() => onOpenPrintMenu('daily')}
              className="px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Cetak Berita Acara Rekapitulasi Presensi & Dispensasi"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Cetak Rekap Dinas</span>
            </button>
          )}

          {onResetLeaveRequests && (
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Reset dan bersihkan data lama permohonan izin & sakit"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Data Izin & Sakit</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Filter and Search */}
      <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Semua ({cleanRequests.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterStatus === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-50 text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <span>Menunggu ({pendingCount})</span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              Disetujui ({approvedCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-50 text-rose-800 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              Ditolak ({rejectedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / NIP / alasan..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className={`p-4 rounded-2xl border transition-all ${
                req.status === 'pending'
                  ? 'bg-amber-50/40 border-amber-200/90 shadow-xs'
                  : req.status === 'approved'
                  ? 'bg-white border-slate-200/90 hover:border-slate-300'
                  : 'bg-slate-50/60 border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    req.type === 'dispensasi_kantor'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : req.type === 'sakit'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {req.type === 'dispensasi_kantor' ? (
                      <FileText className="w-5 h-5" />
                    ) : req.type === 'sakit' ? (
                      <Stethoscope className="w-5 h-5" />
                    ) : (
                      <HeartHandshake className="w-5 h-5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="font-bold text-slate-900 text-sm">{req.employeeName}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {req.regu}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        NIP: {req.employeeNip}
                      </span>
                      {req.dispensationLetterNumber && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Surat No: {req.dispensationLetterNumber}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-slate-800">
                        Jenis:{' '}
                        <strong
                          className={
                            req.type === 'dispensasi_kantor'
                              ? 'text-blue-700'
                              : req.type === 'sakit'
                              ? 'text-purple-700'
                              : 'text-amber-800'
                          }
                        >
                          {req.type === 'dispensasi_kantor'
                            ? 'Dispensasi Kantor (HP Rusak)'
                            : req.type === 'sakit'
                            ? 'Sakit (Dokter)'
                            : 'Izin Resmi'}
                        </strong>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-mono text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        {req.startDate} s/d {req.endDate} ({req.totalDays} Hari)
                      </span>
                      <span>·</span>
                      <span className="text-[10.5px] text-slate-400">
                        Diajukan: {req.appliedAt}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 bg-white/80 p-2.5 rounded-xl border border-slate-200/80 mt-2 leading-relaxed">
                      "{req.reason}"
                    </p>

                    {req.attachmentName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium mt-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Lampiran: {req.attachmentName}</span>
                        {req.attachmentUrl && (
                          <a
                            href={req.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-600 underline hover:text-amber-700 ml-1 flex items-center gap-0.5 text-[10px]"
                          >
                            <span>Lihat Berkas</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {req.adminNote && (
                      <div className="text-[11px] text-slate-600 mt-2 flex items-center gap-1">
                        <span className="font-semibold text-slate-700">Catatan Admin:</span>
                        <span>{req.adminNote}</span>
                        {req.reviewedAt && (
                          <span className="text-[10px] text-slate-400 font-mono">({req.reviewedAt})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions & Status */}
                <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {req.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAction(req, 'approve')}
                        className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Setujui</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAction(req, 'reject')}
                        className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      {req.status === 'approved' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Telah Disetujui
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Ditolak
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredRequests.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2 bg-slate-50/60 rounded-2xl border border-slate-200/80 p-6">
              <HeartHandshake className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700">Belum Ada Permohonan Izin atau Sakit</p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Data bawaan aplikasi telah dibersihkan. Daftar ini hanya memuat permohonan riil dari personel atau input pemutihan dari Admin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                activeActionModal.action === 'approve'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {activeActionModal.action === 'approve' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeActionModal.action === 'approve' ? "Konfirmasi Setujui Permohonan" : "Konfirmasi Tolak Permohonan"}
                </h3>
                <span className="text-xs text-slate-500">
                  {activeActionModal.request.employeeName} ({activeActionModal.request.type.toUpperCase()})
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span>Rentang Waktu:</span>
                <strong className="font-mono">{activeActionModal.request.startDate} s/d {activeActionModal.request.endDate}</strong>
              </div>
              <div className="flex justify-between">
                <span>Lama Hari:</span>
                <strong>{activeActionModal.request.totalDays} Hari Kerja</strong>
              </div>
              <p className="text-[11px] text-slate-600 pt-1 italic">
                "{activeActionModal.request.reason}"
              </p>
            </div>

            {activeActionModal.action === 'approve' && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                💡 Setelah disetujui, sistem otomatis mencatat status <strong>{activeActionModal.request.type.toUpperCase()}</strong> pada log absensi harian dan rekap bulanan personel ini untuk seluruh tanggal tersebut.
              </p>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Catatan Komando (Opsional):
              </label>
              <input
                type="text"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Tuliskan catatan arahan dinas..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                  activeActionModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {activeActionModal.action === 'approve' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>{activeActionModal.action === 'approve' ? "Setujui Sekarang" : "Tolak Permohonan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Old / Completed Leave Requests Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reset & Pembersihan Data Izin / Sakit
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih opsi pembersihan data permohonan dinas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Option 1: Selesai / Lampau (Rekomendasi) */}
              <label 
                className={`p-3.5 rounded-2xl border cursor-pointer block transition-all ${
                  selectedResetMode === 'completed'
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="leaveResetMode"
                    checked={selectedResetMode === 'completed'}
                    onChange={() => setSelectedResetMode('completed')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-bold">
                        Hapus Data Lama Selesai (Disetujui & Ditolak)
                      </strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Rekomendasi
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      Menghapus {approvedCount + rejectedCount} permohonan yang statusnya sudah diproses. Permohonan baru yang masih <strong>menunggu ({pendingCount})</strong> tetap aman dipertahankan.
                    </p>
                  </div>
                </div>
              </label>

              {/* Option 2: Kosongkan Semua */}
              <label 
                className={`p-3.5 rounded-2xl border cursor-pointer block transition-all ${
                  selectedResetMode === 'all'
                    ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="leaveResetMode"
                    checked={selectedResetMode === 'all'}
                    onChange={() => setSelectedResetMode('all')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1">
                    <strong className="text-slate-900 font-bold">
                      Hapus Seluruh Data Permohonan (Kosongkan)
                    </strong>
                    <p className="text-slate-600 text-[11px] mt-1">
                      Menghapus total {leaveRequests.length} riwayat permohonan izin & sakit dari database sistem.
                    </p>
                  </div>
                </div>
              </label>

              {/* Option 3: Bersihkan Sampel Bawaan */}
              <label 
                className={`p-3.5 rounded-2xl border cursor-pointer block transition-all ${
                  selectedResetMode === 'default'
                    ? 'bg-sky-50/70 border-sky-300 ring-1 ring-sky-400/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="leaveResetMode"
                    checked={selectedResetMode === 'default'}
                    onChange={() => setSelectedResetMode('default')}
                    className="mt-0.5 text-sky-600 focus:ring-sky-500"
                  />
                  <div className="flex-1">
                    <strong className="text-slate-900 font-bold">
                      Bersihkan Data Sampel Bawaan Aplikasi
                    </strong>
                    <p className="text-slate-600 text-[11px] mt-1">
                      Menghapus data permohonan contoh bawaan aplikasi dan memastikan hanya data riil yang tampil.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={async () => {
                  if (onResetLeaveRequests) {
                    setIsResetting(true);
                    await onResetLeaveRequests(selectedResetMode);
                    setIsResetting(false);
                    setIsResetModalOpen(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? "Memproses..." : "Konfirmasi Reset"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pemutihan Absensi (Kendala HP Rusak / Error Lapangan) Modal */}
      {isDispensationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pemutihan Absensi (Kendala HP Rusak / Error)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Data dapat diinput kapan saja & terakomodir otomatis ke rekapan dan cetak absensi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDispensationModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-2xl text-blue-900 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Terakomodir Penuh ke Rekapan Harian, Bulanan & Cetak Dokumen</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Pemutihan ini mengesahkan kehadiran personel yang terkendala perangkat (HP rusak, mati total, atau aplikasi error di pos jaga). Sistem langsung memperbarui status presensi pada tanggal yang dipilih tanpa dikenakan sanksi alpha / tanpa keterangan.
              </p>
            </div>

            <form onSubmit={handleCreateDispensationSubmit} className="space-y-4 text-xs">
              {/* Select Employee with Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilih Personel Satpol PP (150 Anggota):
                </label>
                <input
                  type="text"
                  placeholder="Ketik nama atau NIP untuk memfilter daftar..."
                  value={dispEmpSearch}
                  onChange={(e) => setDispEmpSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <select
                  value={dispEmpId}
                  onChange={(e) => setDispEmpId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">-- Pilih Personel --</option>
                  {employees
                    .filter(emp => 
                      !dispEmpSearch.trim() || 
                      emp.name.toLowerCase().includes(dispEmpSearch.toLowerCase()) ||
                      emp.nip.includes(dispEmpSearch) ||
                      emp.regu.toLowerCase().includes(dispEmpSearch.toLowerCase())
                    )
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} (NIP: {emp.nip}) · {emp.regu} · Slot {emp.locationSlotId}
                      </option>
                    ))}
                </select>
              </div>

              {/* Tanggal Pemutihan (Input Kapan Saja) */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Pilih Tanggal Presensi (Bisa Kapan Saja / Tanggal Lampau):
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyDatePreset('today')}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset('yesterday')}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      Kemarin
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset('this_week')}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      Pekan Ini
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Mulai Tanggal:
                    </label>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <input
                        type="date"
                        value={dispStartDate}
                        onChange={(e) => setDispStartDate(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full cursor-pointer"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Sampai Tanggal:
                    </label>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <input
                        type="date"
                        value={dispEndDate}
                        onChange={(e) => setDispEndDate(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full cursor-pointer"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sesi Absensi & Status Pemutihan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Sesi Absensi yang Diputihkan:
                  </label>
                  <select
                    value={dispSessionMode}
                    onChange={(e) => setDispSessionMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="full_day">Seharian Penuh (Masuk & Pulang)</option>
                    <option value="check_in_only">Hanya Absen Masuk</option>
                    <option value="check_out_only">Hanya Absen Pulang</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Status Hasil di Rekapan & Cetak:
                  </label>
                  <select
                    value={dispStatusMode}
                    onChange={(e) => setDispStatusMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="dispensasi_kantor">Dispensasi Kantor (HP Rusak - Sah)</option>
                    <option value="tepat_waktu">Pemutihan Hadir Tepat Waktu</option>
                  </select>
                </div>
              </div>

              {/* Letter Number & Issued By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nomor Memo / Surat Disposisi:
                  </label>
                  <input
                    type="text"
                    value={dispLetterNumber}
                    onChange={(e) => setDispLetterNumber(e.target.value)}
                    placeholder="Contoh: 005/DISP/POLPP/2026"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Pejabat / Verifikator Disposisi:
                  </label>
                  <input
                    type="text"
                    value={dispIssuedBy}
                    onChange={(e) => setDispIssuedBy(e.target.value)}
                    placeholder="Contoh: Kantor Satpol PP Bangka Barat"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Reason / Field Constraints */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Keterangan Kendala Lapangan (HP Rusak / Error):
                </label>
                <textarea
                  rows={2}
                  value={dispReason}
                  onChange={(e) => setDispReason(e.target.value)}
                  placeholder="Jelaskan kondisi kendala lapangan (contoh: HP personel blank/mati saat apel pos pengamanan lapangan)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              {/* Upload Letter Photo */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Unggah Nota Dinas / Foto Memo Fisik (Opsional):
                </label>
                <div className="relative border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 rounded-2xl p-3 text-center transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleDispensationFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 text-[11px] text-slate-500">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-700">
                      {dispFileName ? dispFileName : "Pilih Berkas Foto / Scan Surat / Memo Kantor"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Maks. 2MB (Foto memo dinas atau disposisi komandan)
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDispensationModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Pemutihan & Sinkronkan ke Rekapan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
