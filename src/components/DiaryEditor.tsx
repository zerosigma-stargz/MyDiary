import React, { useState, useEffect } from 'react';
import { DiaryEntry, IdeaItem, ScheduleItem, DiaryStage, DiaryOptionTab } from '../types/diary';
import { EMOTION_DEFINITIONS, getEmotionByEmoji } from '../constants/emotions';
import { requestAiDiaryAnalysis } from '../services/geminiClient';
import { downloadLocalFile } from '../services/googleDrive';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Save,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Lightbulb,
  CalendarDays,
  FileText,
  Download,
  HardDrive,
  CheckSquare,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { WorkspaceActionType } from './WorkspaceSyncModal';

interface DiaryEditorProps {
  entry: DiaryEntry;
  onSaveEntry: (updatedEntry: DiaryEntry) => void;
  onInitiateWorkspaceAction: (action: WorkspaceActionType, entry: DiaryEntry) => void;
  isGoogleConnected: boolean;
  onGoogleSignIn: () => void;
}

export const DiaryEditor: React.FC<DiaryEditorProps> = ({
  entry,
  onSaveEntry,
  onInitiateWorkspaceAction,
  isGoogleConnected,
  onGoogleSignIn,
}) => {
  const [draft, setDraft] = useState<DiaryEntry>(entry);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DiaryOptionTab>(entry.activeOption || 'all');
  const [newIdeaText, setNewIdeaText] = useState<string>('');
  const [newIdeaCategory, setNewIdeaCategory] = useState<string>('Kreativitas');
  const [newScheduleTime, setNewScheduleTime] = useState<string>('09:00 - 10:00');
  const [newScheduleTask, setNewScheduleTask] = useState<string>('');
  const [newSchedulePriority, setNewSchedulePriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showMoodPicker, setShowMoodPicker] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    setDraft(entry);
    setActiveTab(entry.activeOption || 'all');
  }, [entry.id, entry.date]);

  const handleTitleChange = (val: string) => {
    setDraft((prev) => ({ ...prev, title: val }));
  };

  const handleContentChange = (val: string) => {
    setDraft((prev) => ({ ...prev, content: val }));
  };

  const handleStageChange = (stage: DiaryStage) => {
    setDraft((prev) => ({ ...prev, stage }));
  };

  const handleSelectPrimaryMood = (emoji: string, label: string) => {
    setDraft((prev) => {
      const currentPct = { ...(prev.emotionPercentages || {}) };
      currentPct[label] = 70;
      return {
        ...prev,
        primaryMood: emoji,
        primaryMoodLabel: label,
        emotionPercentages: currentPct,
      };
    });
    setShowMoodPicker(false);
  };

  const handleAddIdea = () => {
    if (!newIdeaText.trim()) return;
    const newItem: IdeaItem = {
      id: `idea-${Date.now()}`,
      text: newIdeaText.trim(),
      category: newIdeaCategory,
      reviewed: false,
    };
    setDraft((prev) => ({
      ...prev,
      ideas: [...(prev.ideas || []), newItem],
    }));
    setNewIdeaText('');
  };

  const handleToggleIdeaReview = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      ideas: prev.ideas.map((item) =>
        item.id === id ? { ...item, reviewed: !item.reviewed } : item
      ),
    }));
  };

  const handleDeleteIdea = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      ideas: prev.ideas.filter((item) => item.id !== id),
    }));
  };

  const handleAddSchedule = () => {
    if (!newScheduleTask.trim()) return;
    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}`,
      time: newScheduleTime.trim(),
      task: newScheduleTask.trim(),
      priority: newSchedulePriority,
      completed: false,
    };
    setDraft((prev) => ({
      ...prev,
      scheduleTomorrow: [...(prev.scheduleTomorrow || []), newItem],
    }));
    setNewScheduleTask('');
  };

  const handleToggleSchedule = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      scheduleTomorrow: prev.scheduleTomorrow.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const handleDeleteSchedule = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      scheduleTomorrow: prev.scheduleTomorrow.filter((item) => item.id !== id),
    }));
  };

  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await requestAiDiaryAnalysis(draft);
      setDraft((prev) => {
        let updatedPercentages = { ...prev.emotionPercentages };
        if (analysis.suggestedMoods && analysis.suggestedMoods.length > 0) {
          updatedPercentages = {};
          analysis.suggestedMoods.forEach((m) => {
            updatedPercentages[m.name] = m.percentage;
          });
        }
        return {
          ...prev,
          aiAnalysis: analysis,
          emotionPercentages: updatedPercentages,
        };
      });

      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.7 },
      });
      showToastNotification('Refleksi emosi & pemaknaan berhasil diperbarui');
    } catch (e: any) {
      console.error(e);
      showToastNotification('Gagal menganalisis catatan');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    const updated: DiaryEntry = {
      ...draft,
      activeOption: activeTab,
      updatedAt: new Date().toISOString(),
    };
    onSaveEntry(updated);
    showToastNotification('Catatan diary berhasil disimpan');
    confetti({
      particleCount: 30,
      spread: 45,
      origin: { y: 0.6 },
    });
  };

  const showToastNotification = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast(null);
    }, 3200);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Toast Notification */}
      {saveToast && (
        <div className="bg-slate-900 text-white text-xs font-semibold py-2 px-4 text-center shadow-md animate-in slide-in-from-top duration-200">
          {saveToast}
        </div>
      )}

      {/* Editor Top Bar */}
      <div className="p-4 border-b border-slate-100 bg-[#fbfcfd] flex flex-wrap items-center justify-between gap-3">
        {/* Date and Stage Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{draft.date}</span>
          </div>

          {/* Stage toggle: Rencana Awal vs Evaluasi Selesai */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/80 text-xs">
            <button
              onClick={() => handleStageChange('plan')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                draft.stage === 'plan'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tulis sebelum mengerjakan kegiatan sebagai rencana persiapan"
            >
              📝 Rencana Awal
            </button>
            <button
              onClick={() => handleStageChange('evaluation')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                draft.stage === 'evaluation'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tulis setelah kegiatan selesai untuk dievaluasi dan dimaknai"
            >
              ✅ Evaluasi Pasca-Kegiatan
            </button>
          </div>
        </div>

        {/* Primary Mood Emoji Selector */}
        <div className="relative">
          <button
            onClick={() => setShowMoodPicker(!showMoodPicker)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs transition"
          >
            <span className="text-xl leading-none">{draft.primaryMood}</span>
            <span className="hidden sm:inline">{draft.primaryMoodLabel}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
          </button>

          {/* Mood Popover */}
          {showMoodPicker && (
            <div className="absolute right-0 top-11 z-30 w-72 bg-white border border-slate-200 rounded-3xl p-3.5 shadow-xl animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Pilih Reaksi Suasana Hati:
              </span>
              <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                {EMOTION_DEFINITIONS.map((em) => (
                  <button
                    key={em.id}
                    onClick={() => handleSelectPrimaryMood(em.emoji, em.name)}
                    className={`flex items-center gap-2 p-2 rounded-2xl text-left text-xs transition border ${
                      draft.primaryMood === em.emoji
                        ? 'bg-slate-50 border-slate-400 text-slate-900 font-bold'
                        : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="text-xl">{em.emoji}</span>
                    <div className="truncate">
                      <div className="font-semibold truncate">{em.name}</div>
                      <div className="text-[10px] text-slate-400 truncate capitalize">
                        {em.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm active:scale-95 transition"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Catatan</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 overflow-y-auto space-y-5">
        {/* Title Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Judul Catatan Harian
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Contoh: Refleksi Hari yang Penuh Ketenangan & Ide..."
            className="w-full bg-slate-50/70 border border-slate-200/90 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition"
          />
        </div>

        {/* Narrative Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cerita & Narasi Pengalaman Hari Ini
            </label>
            <span className="text-[11px] text-slate-400">
              {draft.content ? `${draft.content.split(/\s+/).filter(Boolean).length} kata` : '0 kata'}
            </span>
          </div>
          <textarea
            rows={5}
            value={draft.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Tuliskan pengalaman yang Anda lewati hari ini, apa yang Anda rasakan, atau evaluasi setelah kegiatan terlaksana..."
            className="w-full bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition leading-relaxed resize-y font-normal"
          />
        </div>

        {/* 2 Opsi Section Switcher */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Fitur Dua Opsi Catatan:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                  activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua Opsi
              </button>
              <button
                onClick={() => setActiveTab('ideas')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                  activeTab === 'ideas' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                💡 Opsi 1: Ide
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                  activeTab === 'schedule' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🗓️ Opsi 2: Jadwal Esok
              </button>
            </div>
          </div>

          {/* OPSI 1: Ide & Gagasan yang Akan Diimplementasikan */}
          {(activeTab === 'all' || activeTab === 'ideas') && (
            <div className="bg-[#f8fbfd] border border-slate-200/80 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Opsi 1: Ide & Gagasan untuk Ditinjau & Diimplementasikan
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Cantumkan ide kreatif atau gagasan segar hari ini untuk dieksekusi di kemudian hari.
                    </p>
                  </div>
                </div>

                {isGoogleConnected && draft.ideas?.length > 0 && (
                  <button
                    onClick={() => onInitiateWorkspaceAction('tasks_sync', draft)}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold transition shadow-2xs"
                    title="Sinkronisasi ke Google Tasks"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-slate-600" />
                    <span>Kirim ke Tasks</span>
                  </button>
                )}
              </div>

              {/* Ideas list */}
              <div className="space-y-2 mb-3">
                {draft.ideas?.map((idea) => (
                  <div
                    key={idea.id}
                    className="flex items-start justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200/80 text-xs shadow-2xs"
                  >
                    <button
                      onClick={() => handleToggleIdeaReview(idea.id)}
                      className="mt-0.5 text-slate-400 hover:text-slate-700 transition"
                      title={idea.reviewed ? 'Tandai belum ditinjau' : 'Tandai sudah ditinjau'}
                    >
                      {idea.reviewed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1">
                      <span
                        className={`text-slate-800 font-medium ${
                          idea.reviewed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {idea.text}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200/60">
                          {idea.category || 'Ide'}
                        </span>
                        {idea.reviewed && (
                          <span className="text-emerald-700 font-semibold">Telah ditinjau</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {(!draft.ideas || draft.ideas.length === 0) && (
                  <p className="text-xs text-slate-400 italic py-1">
                    Belum ada ide yang ditambahkan pada entri ini.
                  </p>
                )}
              </div>

              {/* Add idea input */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newIdeaText}
                  onChange={(e) => setNewIdeaText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddIdea()}
                  placeholder="Ketikkan ide atau gagasan yang muncul..."
                  className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
                <select
                  value={newIdeaCategory}
                  onChange={(e) => setNewIdeaCategory(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none font-medium"
                >
                  <option value="Kreativitas">Kreativitas</option>
                  <option value="Produktivitas">Produktivitas</option>
                  <option value="Teknologi">Teknologi</option>
                  <option value="Pengembangan Diri">Pengembangan Diri</option>
                  <option value="Gaya Hidup">Gaya Hidup</option>
                </select>
                <button
                  onClick={handleAddIdea}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Ide</span>
                </button>
              </div>
            </div>
          )}

          {/* OPSI 2: Rencana & Jadwal Kegiatan Esok Hari */}
          {(activeTab === 'all' || activeTab === 'schedule') && (
            <div className="bg-[#f9fbf9] border border-slate-200/80 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Opsi 2: Rencana & Jadwal Kegiatan Esok Hari
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Bangun rencana terstruktur agar lebih produktif mengelola waktu esok hari.
                    </p>
                  </div>
                </div>

                {isGoogleConnected && draft.scheduleTomorrow?.length > 0 && (
                  <button
                    onClick={() => onInitiateWorkspaceAction('calendar_sync', draft)}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold transition shadow-2xs"
                    title="Sinkronisasi ke Google Calendar"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span>Sinkron ke Calendar</span>
                  </button>
                )}
              </div>

              {/* Schedule list */}
              <div className="space-y-2 mb-3">
                {draft.scheduleTomorrow?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200/80 text-xs shadow-2xs"
                  >
                    <button
                      onClick={() => handleToggleSchedule(item.id)}
                      className="text-slate-400 hover:text-emerald-600 transition"
                      title={item.completed ? 'Tandai belum selesai' : 'Tandai selesai'}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.time}
                      </span>
                      <span
                        className={`text-slate-800 font-medium ${
                          item.completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {item.task}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${
                          item.priority === 'high'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : item.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSchedule(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {(!draft.scheduleTomorrow || draft.scheduleTomorrow.length === 0) && (
                  <p className="text-xs text-slate-400 italic py-1">
                    Belum ada jadwal kegiatan esok hari yang disusun.
                  </p>
                )}
              </div>

              {/* Add schedule input */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newScheduleTime}
                  onChange={(e) => setNewScheduleTime(e.target.value)}
                  placeholder="Waktu (08:00 - 09:30)"
                  className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-mono"
                />
                <input
                  type="text"
                  value={newScheduleTask}
                  onChange={(e) => setNewScheduleTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSchedule()}
                  placeholder="Target kegiatan esok hari..."
                  className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
                <select
                  value={newSchedulePriority}
                  onChange={(e) => setNewSchedulePriority(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none font-medium"
                >
                  <option value="high">Prioritas Tinggi</option>
                  <option value="medium">Prioritas Sedang</option>
                  <option value="low">Prioritas Rendah</option>
                </select>
                <button
                  onClick={handleAddSchedule}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Jadwal</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Engine Afirmasi & Pemaknaan Section — Clean Editorial Style */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                Pemaknaan Emosi & Ide oleh AI Engine
              </h4>
              <p className="text-[11px] text-slate-500">
                Memahami wacana narasi, merangkum emosi, dan mengafirmasi gagasan yang Anda buat.
              </p>
            </div>

            <button
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm active:scale-95 transition disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menganalisis...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{draft.aiAnalysis ? 'Perbarui Pemaknaan' : 'Mulai Pemaknaan'}</span>
                </>
              )}
            </button>
          </div>

          {/* AI Result Card */}
          {draft.aiAnalysis ? (
            <div className="space-y-3 bg-[#fafbfc] border border-slate-200/90 rounded-2xl p-4 text-xs">
              {/* Ringkasan Emosional */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Ringkasan Emosional Hari Ini:
                </span>
                <p className="text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/70 font-normal">
                  {draft.aiAnalysis.emotionalSummary}
                </p>
              </div>

              {/* Afirmasi Perasaan */}
              <div>
                <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block mb-1">
                  Afirmasi Perasaan:
                </span>
                <blockquote className="italic text-purple-950 font-serif text-sm leading-relaxed bg-[#fbf8fe] p-3.5 rounded-xl border border-purple-100">
                  "{draft.aiAnalysis.affirmation}"
                </blockquote>
              </div>

              {/* Pemaknaan Ide & Gagasan */}
              <div>
                <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider block mb-1">
                  Pemaknaan Ide & Gagasan:
                </span>
                <p className="text-slate-800 leading-relaxed bg-[#f4fbf9] p-3 rounded-xl border border-teal-100 font-normal">
                  {draft.aiAnalysis.ideaMeaning}
                </p>
              </div>

              {/* Emotion Percentages Breakdown */}
              {draft.aiAnalysis.suggestedMoods && draft.aiAnalysis.suggestedMoods.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Keterwakilan Emosi Terdeteksi:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {draft.aiAnalysis.suggestedMoods.map((m) => (
                      <div
                        key={m.name}
                        className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-slate-200 text-xs shadow-2xs"
                      >
                        <span className="text-base">{m.emoji}</span>
                        <span className="font-semibold text-slate-700">{m.name}:</span>
                        <span className="font-mono text-slate-900 font-bold">{m.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 px-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <p className="text-xs text-slate-500">
                Klik tombol <strong className="text-slate-900 font-semibold">"Mulai Pemaknaan"</strong> untuk
                menganalisis konteks kalimat, memperoleh afirmasi emosional, dan mendalami makna ide hari ini.
              </p>
            </div>
          )}
        </div>

        {/* Google Workspace & Export Section */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Simpan & Ekspor (Google Drive / PDF / Markdown)</span>
            </span>

            {!isGoogleConnected && (
              <button
                onClick={onGoogleSignIn}
                className="text-[11px] text-blue-700 hover:text-blue-800 underline font-semibold"
              >
                Hubungkan Akun Google
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Google Drive Markdown */}
            <button
              onClick={() => {
                if (isGoogleConnected) {
                  onInitiateWorkspaceAction('drive_md', draft);
                } else {
                  downloadLocalFile(draft, 'markdown');
                  showToastNotification('Berkas Markdown diunduh lokal');
                }
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 transition text-left shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {isGoogleConnected ? 'Simpan ke Google Drive (.md)' : 'Unduh Markdown (.md)'}
                  </div>
                  <div className="text-[10px] text-slate-400">Format teks bersih & portabel</div>
                </div>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Google Drive PDF */}
            <button
              onClick={() => {
                if (isGoogleConnected) {
                  onInitiateWorkspaceAction('drive_pdf', draft);
                } else {
                  downloadLocalFile(draft, 'pdf');
                  showToastNotification('Dokumen PDF diunduh lokal');
                }
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 transition text-left shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {isGoogleConnected ? 'Simpan ke Google Drive (.pdf)' : 'Unduh Dokumen PDF (.pdf)'}
                  </div>
                  <div className="text-[10px] text-slate-400">Tata letak estetik & afirmasi</div>
                </div>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
