import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SatpolPPLogo } from './SatpolPPLogo';
import { RotateCcw, AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Si-Praja Uncaught Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReset = () => {
    try {
      // Clear app state in localStorage
      const keys = [
        'sipraja_is_logged_in_v2',
        'sipraja_active_officer_v2',
        'sipraja_current_role_v2',
        'sipraja_device_fingerprint_v2'
      ];
      keys.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    window.location.href = window.location.origin + window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none">
          {/* Subtle Ambient Glow */}
          <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl relative z-10 text-center">
            {/* Logo Satpol PP */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 p-2 flex items-center justify-center mb-4">
              <SatpolPPLogo className="w-full h-full object-contain" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Pemulihan Tampilan HP</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              SI-PRAJA SATPOL PP
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Aplikasi mendeteksi kendala rendering pada browser HP. Anda dapat menyegarkan halaman atau membersihkan cache memori.
            </p>

            {/* Error Detail (collapsed/technical preview) */}
            {this.state.error && (
              <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Diagnostik Error:</span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 break-all leading-normal">
                  {this.state.error.message || 'Unknown render error'}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman (Reload)</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReset}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Bersihkan Cache & Buka Ulang</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 mt-5">
              Sistem Informasi Presensi Digital Satpol PP · Praja Wibawa
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
