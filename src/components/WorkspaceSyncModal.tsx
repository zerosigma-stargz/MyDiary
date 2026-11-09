import React from 'react';
import { DiaryEntry } from '../types/diary';
import { HardDrive, Calendar, CheckSquare, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export type WorkspaceActionType = 'drive_md' | 'drive_pdf' | 'calendar_sync' | 'tasks_sync';

interface WorkspaceSyncModalProps {
  isOpen: boolean;
  actionType: WorkspaceActionType;
  entry: DiaryEntry;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const WorkspaceSyncModal: React.FC<WorkspaceSyncModalProps> = ({
  isOpen,
  actionType,
  entry,
  isLoading,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const getActionDetails = () => {
    switch (actionType) {
      case 'drive_md':
        return {
          title: 'Simpan ke Google Drive (.md)',
          icon: <HardDrive className="w-5 h-5 text-slate-700" />,
          description: `Aplikasi akan mengunggah berkas teks Markdown berformat .md ke Google Drive akun Anda dengan izin yang telah Anda berikan.`,
          fileName: `MyDiary_${entry.date}_${(entry.title || 'Catatan').replace(/\s+/g, '_')}.md`,
          formatLabel: 'Markdown (.md)',
          warning: 'Berkas akan dibuat di ruang penyimpanan Google Drive Anda.',
        };
      case 'drive_pdf':
        return {
          title: 'Simpan ke Google Drive (.pdf)',
          icon: <HardDrive className="w-5 h-5 text-slate-700" />,
          description: `Aplikasi akan membuat dokumen PDF rapi dengan tata letak visual, rincian emosi, pemaknaan AI, serta jadwal, dan menyimpannya langsung ke Google Drive Anda.`,
          fileName: `MyDiary_${entry.date}_${(entry.title || 'Catatan').replace(/\s+/g, '_')}.pdf`,
          formatLabel: 'Dokumen PDF (.pdf)',
          warning: 'Berkas akan dibuat di ruang penyimpanan Google Drive Anda.',
        };
      case 'calendar_sync':
        return {
          title: 'Sinkronisasi Jadwal ke Google Calendar',
          icon: <Calendar className="w-5 h-5 text-slate-700" />,
          description: `Aplikasi akan menambahkan ${
            entry.scheduleTomorrow?.length || 0
          } agenda kegiatan esok hari ke Google Calendar utama Anda.`,
          fileName: `${entry.scheduleTomorrow?.length || 0} agenda kegiatan`,
          formatLabel: 'Google Calendar Events',
          warning: 'Event akan dijadwalkan pada tanggal esok hari di kalender Anda.',
        };
      case 'tasks_sync':
        return {
          title: 'Sinkronisasi Ide & Tugas ke Google Tasks',
          icon: <CheckSquare className="w-5 h-5 text-slate-700" />,
          description: `Aplikasi akan menambahkan ${
            entry.ideas?.length || 0
          } butir ide dan gagasan ke daftar Google Tasks utama Anda untuk ditinjau.`,
          fileName: `${entry.ideas?.length || 0} item gagasan`,
          formatLabel: 'Google Tasks List',
          warning: 'Item akan ditambahkan ke daftar tugas bawaan akun Google Anda.',
        };
    }
  };

  const details = getActionDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-800">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            {details.icon}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{details.title}</h3>
            <span className="text-xs text-slate-500">Konfirmasi Integrasi Google Workspace</span>
          </div>
        </div>

        {/* Content details */}
        <div className="space-y-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600">
          <p className="leading-relaxed">{details.description}</p>

          <div className="pt-2 border-t border-slate-200/80 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Nama Item:</span>
              <span className="text-slate-800 font-bold truncate max-w-[200px]">
                {details.fileName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tanggal Catatan:</span>
              <span className="text-slate-700 font-semibold">{entry.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Format Tujuan:</span>
              <span className="text-slate-700 font-semibold">{details.formatLabel}</span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-3.5 flex items-start gap-2.5 text-[11px] text-amber-900 bg-amber-50 border border-amber-200/80 rounded-2xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>{details.warning} Anda dapat membatalkan aksi ini kapan saja.</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm active:scale-95 transition disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Lanjutkan & Simpan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
