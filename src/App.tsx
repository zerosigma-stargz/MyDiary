/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DiaryEntry } from './types/diary';
import { SEED_DIARY_ENTRIES } from './data/seedEntries';
import { DiaryEditor } from './components/DiaryEditor';
import { CalendarMonthView } from './components/CalendarMonthView';
import { ThreeScatterPlot } from './components/ThreeScatterPlot';
import { MoodTrendChart } from './components/MoodTrendChart';
import { WorkspaceSyncModal, WorkspaceActionType } from './components/WorkspaceSyncModal';
import { initAuth, googleSignIn, logout } from './services/auth';
import { uploadToGoogleDrive } from './services/googleDrive';
import { syncScheduleToGoogleCalendar } from './services/googleCalendar';
import { syncIdeasToGoogleTasks } from './services/googleTasks';
import { User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  Calendar,
  LogOut,
  Plus,
  Compass,
  ExternalLink,
  Info,
} from 'lucide-react';

export default function App() {
  const [entries, setEntries] = useState<DiaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('mydiary_entries_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading localStorage:', e);
    }
    return SEED_DIARY_ENTRIES;
  });

  const [selectedDate, setSelectedDate] = useState<string>('2026-11-08');
  const [mobileTab, setMobileTab] = useState<'editor' | 'scatter3d'>('editor');

  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    actionType: WorkspaceActionType;
    entry: DiaryEntry | null;
  }>({
    isOpen: false,
    actionType: 'drive_md',
    entry: null,
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ msg: string; link?: string } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('mydiary_entries_v2', JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [entries]);

  const activeEntry: DiaryEntry = React.useMemo(() => {
    const existing = entries.find((e) => e.date === selectedDate);
    if (existing) return existing;

    return {
      id: `entry-${selectedDate}`,
      date: selectedDate,
      title: '',
      content: '',
      stage: 'plan',
      activeOption: 'all',
      ideas: [],
      scheduleTomorrow: [],
      primaryMood: '🌟',
      primaryMoodLabel: 'Kebahagiaan',
      emotionPercentages: { Kebahagiaan: 100 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [entries, selectedDate]);

  const handleSaveEntry = (updated: DiaryEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.date === updated.date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      } else {
        return [updated, ...prev];
      }
    });
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        confetti({ particleCount: 40, spread: 50 });
        showNotification('Berhasil terhubung dengan Google Workspace');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Gagal masuk dengan Google. Silakan coba kembali.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    showNotification('Sesi Google telah keluar.');
  };

  const handleOpenWorkspaceModal = (actionType: WorkspaceActionType, entry: DiaryEntry) => {
    if (!user) {
      handleGoogleLogin();
      return;
    }
    setModalState({
      isOpen: true,
      actionType,
      entry,
    });
  };

  const handleConfirmWorkspaceAction = async () => {
    const { actionType, entry } = modalState;
    if (!entry) return;

    setIsSyncing(true);
    try {
      if (actionType === 'drive_md') {
        const res = await uploadToGoogleDrive(entry, 'markdown');
        setModalState((prev) => ({ ...prev, isOpen: false }));
        showNotification(
          `Berkas "${res.name}" berhasil disimpan ke Google Drive`,
          res.webViewLink
        );
      } else if (actionType === 'drive_pdf') {
        const res = await uploadToGoogleDrive(entry, 'pdf');
        setModalState((prev) => ({ ...prev, isOpen: false }));
        showNotification(
          `Dokumen PDF "${res.name}" berhasil disimpan ke Google Drive`,
          res.webViewLink
        );
      } else if (actionType === 'calendar_sync') {
        const res = await syncScheduleToGoogleCalendar(entry.date, entry.scheduleTomorrow || []);
        setModalState((prev) => ({ ...prev, isOpen: false }));
        if (res.errors.length > 0) {
          showNotification(
            `${res.createdCount} event dibuat. Masalah: ${res.errors[0]}`
          );
        } else {
          showNotification(
            `${res.createdCount} jadwal kegiatan esok hari berhasil disinkronkan ke Google Calendar`
          );
        }
      } else if (actionType === 'tasks_sync') {
        const res = await syncIdeasToGoogleTasks(entry.date, entry.ideas || []);
        setModalState((prev) => ({ ...prev, isOpen: false }));
        if (res.errors.length > 0) {
          showNotification(
            `${res.createdCount} ide ditambahkan ke Tasks. Masalah: ${res.errors[0]}`
          );
        } else {
          showNotification(
            `${res.createdCount} butir ide berhasil ditambahkan ke Google Tasks Anda`
          );
        }
      }

      confetti({ particleCount: 35, spread: 50, origin: { y: 0.5 } });
    } catch (err: any) {
      console.error(err);
      showNotification(`Gagal mengeksekusi integrasi: ${err.message || 'Error tidak terduga'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const showNotification = (msg: string, link?: string) => {
    setNotification({ msg, link });
    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans">
      {/* Top Navbar Header — Pristine White Surface */}
      <header className="h-14 shrink-0 bg-white/95 border-b border-slate-200/90 px-5 flex items-center justify-between gap-3 z-30 select-none shadow-2xs">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight text-slate-900">
                MyDiary
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70">
                Jurnal & Refleksi
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Ruang Hening Catatan Pribadi, Suasana Hati & Pemaknaan Gagasan
            </p>
          </div>
        </div>

        {/* Center: Current active date picker */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/90 px-3.5 py-1.5 rounded-xl text-xs shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-semibold text-slate-500">Tanggal:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="bg-transparent text-slate-900 font-mono text-xs font-semibold focus:outline-none cursor-pointer leading-normal h-6"
          />
        </div>

        {/* Right side: Google Workspace status & Sign In */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <span className="text-xs text-slate-700 font-medium max-w-[100px] truncate hidden sm:inline">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                title="Keluar dari Google"
                className="text-slate-400 hover:text-rose-600 p-1 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition active:scale-95 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span className="hidden sm:inline">Masuk Google</span>
            </button>
          )}

          {/* Quick Hari Ini button */}
          <button
            onClick={() => setSelectedDate('2026-11-08')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hari Ini</span>
          </button>
        </div>
      </header>

      {/* Global Notification Banner */}
      {notification && (
        <div className="bg-slate-900 text-white text-xs py-2 px-5 flex items-center justify-between z-40 animate-in slide-in-from-top duration-200 shadow-sm">
          <div className="flex items-center gap-2 truncate">
            <Info className="w-4 h-4 shrink-0 text-slate-400" />
            <span className="truncate">{notification.msg}</span>
          </div>
          {notification.link && (
            <a
              href={notification.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-bold underline ml-3 shrink-0 text-white hover:text-slate-300"
            >
              <span>Buka Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Mobile Segmented Tab Navigation */}
      <div className="lg:hidden shrink-0 bg-white border-b border-slate-200 p-2 flex items-center justify-center">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs w-full max-w-sm">
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl font-semibold transition ${
              mobileTab === 'editor'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tulis & Kalender</span>
          </button>
          <button
            onClick={() => setMobileTab('scatter3d')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl font-semibold transition ${
              mobileTab === 'scatter3d'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Grafik 3D Emosi</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Split 2-Column Interface on Laptop/PC */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Diary Writing/Editing & Monthly Calendar View */}
        <section
          className={`w-full lg:w-[48%] xl:w-[46%] h-full flex flex-col gap-3.5 p-3.5 lg:p-4.5 overflow-y-auto ${
            mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Calendar View on top */}
          <div className="shrink-0">
            <CalendarMonthView
              entries={entries}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
              }}
            />
          </div>

          {/* Diary Editor for the active date */}
          <div className="flex-1 min-h-[500px]">
            <DiaryEditor
              entry={activeEntry}
              onSaveEntry={handleSaveEntry}
              onInitiateWorkspaceAction={handleOpenWorkspaceModal}
              isGoogleConnected={!!user}
              onGoogleSignIn={handleGoogleLogin}
            />
          </div>
        </section>

        {/* Right Side: 3D Scatter Plot (Three.js) + 30-Day Mood Trend Line Chart Below */}
        <section
          className={`w-full lg:w-[52%] xl:w-[54%] h-full flex flex-col relative border-l border-slate-200/90 overflow-y-auto ${
            mobileTab === 'scatter3d' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Upper: 3D Scatter Plot */}
          <div className="w-full flex-1 min-h-[380px] lg:min-h-[460px] relative">
            <ThreeScatterPlot
              entries={entries}
              selectedDate={selectedDate}
              onSelectEntry={(entry) => {
                setSelectedDate(entry.date);
              }}
              onOpenEditorForDate={(date) => {
                setSelectedDate(date);
                setMobileTab('editor');
              }}
            />
          </div>

          {/* Lower: Trend Line Chart Below the 3D Scatter Plot */}
          <div className="shrink-0 w-full z-20">
            <MoodTrendChart
              entries={entries}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
              }}
            />
          </div>
        </section>
      </main>

      {/* Workspace Sync Confirmation Modal */}
      <WorkspaceSyncModal
        isOpen={modalState.isOpen}
        actionType={modalState.actionType}
        entry={modalState.entry || activeEntry}
        isLoading={isSyncing}
        onConfirm={handleConfirmWorkspaceAction}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
