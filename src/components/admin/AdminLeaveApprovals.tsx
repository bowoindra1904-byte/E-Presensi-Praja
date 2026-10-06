import React, { useState, useMemo } from 'react';
import { LeaveRequest } from '../../types';
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
  AlertTriangle
} from 'lucide-react';

interface AdminLeaveApprovalsProps {
  leaveRequests: LeaveRequest[];
  onApproveLeaveRequest: (requestId: string, adminNote?: string) => void;
  onRejectLeaveRequest: (requestId: string, adminNote?: string) => void;
  onResetLeaveRequests?: (mode: 'completed' | 'all' | 'default') => void;
  onClose?: () => void;
}

export const AdminLeaveApprovals: React.FC<AdminLeaveApprovalsProps> = ({
  leaveRequests,
  onApproveLeaveRequest,
  onRejectLeaveRequest,
  onResetLeaveRequests,
  onClose,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected modal for action
  const [activeActionModal, setActiveActionModal] = useState<{
    request: LeaveRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [actionNote, setActionNote] = useState('');

  // Reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedResetMode, setSelectedResetMode] = useState<'completed' | 'all' | 'default'>('completed');
  const [isResetting, setIsResetting] = useState(false);

  // Counts
  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

  const filteredRequests = useMemo(() => {
    return leaveRequests.filter(r => {
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
  }, [leaveRequests, filterStatus, searchQuery]);

  const handleOpenAction = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setActiveActionModal({ request, action });
    setActionNote(action === 'approve' ? 'Disetujui oleh Komando Satpol PP.' : 'Permohonan ditolak karena kebutuhan operasional lapangan.');
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
              Semua ({leaveRequests.length})
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
                    req.type === 'sakit'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {req.type === 'sakit' ? <Stethoscope className="w-5 h-5" /> : <HeartHandshake className="w-5 h-5" />}
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
                    </div>

                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-slate-800">
                        Jenis: <strong className={req.type === 'sakit' ? 'text-purple-700' : 'text-amber-800'}>{req.type === 'sakit' ? 'Sakit (Dokter)' : 'Izin Resmi'}</strong>
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
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada permohonan izin atau sakit pada filter ini.
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

              {/* Option 3: Reset ke Awal (Default) */}
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
                      Kembalikan ke Contoh Data Bawaan Satpol PP
                    </strong>
                    <p className="text-slate-600 text-[11px] mt-1">
                      Mengisi ulang sistem dengan 4 contoh data permohonan izin & sakit standar.
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
    </div>
  );
};
