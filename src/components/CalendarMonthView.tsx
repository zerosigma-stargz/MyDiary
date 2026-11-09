import React, { useState } from 'react';
import { DiaryEntry } from '../types/diary';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

interface CalendarMonthViewProps {
  entries: DiaryEntry[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  entries,
  selectedDate,
  onSelectDate,
}) => {
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // November

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const entryMap = new Map<string, DiaryEntry>();
  entries.forEach((e) => {
    entryMap.set(e.date, e);
  });

  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const thisMonthEntries = entries.filter((e) => e.date.startsWith(currentMonthPrefix));
  const emotionCounts: Record<string, { count: number; emoji: string; label: string }> = {};
  thisMonthEntries.forEach((e) => {
    if (!emotionCounts[e.primaryMoodLabel]) {
      emotionCounts[e.primaryMoodLabel] = { count: 0, emoji: e.primaryMood, label: e.primaryMoodLabel };
    }
    emotionCounts[e.primaryMoodLabel].count++;
  });
  const dominant = Object.values(emotionCounts).sort((a, b) => b.count - a.count)[0];

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm text-slate-800">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <p className="text-[11px] text-slate-500">
              {thisMonthEntries.length} entri catatan tersimpan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            aria-label="Bulan sebelumnya"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(10);
              onSelectDate('2026-11-08');
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-[11px] font-semibold text-slate-700 transition"
          >
            Hari Ini
          </button>
          <button
            onClick={handleNextMonth}
            aria-label="Bulan berikutnya"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dominant Mood Badge for Month */}
      {dominant && (
        <div className="mb-3 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Suasana Hati Dominan:
          </span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <span>{dominant.emoji}</span> {dominant.label} ({dominant.count} hari)
          </span>
        </div>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <span className="text-rose-600/80">Min</span>
        <span>Sen</span>
        <span>Sel</span>
        <span>Rab</span>
        <span>Kam</span>
        <span>Jum</span>
        <span className="text-sky-700">Sab</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-12 rounded-2xl bg-slate-50/50" />;
          }

          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`;
          const entry = entryMap.get(dateStr);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === '2026-11-08';

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative h-12 rounded-2xl p-1.5 text-left flex flex-col justify-between border transition-all ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                  : entry
                  ? 'bg-slate-50/90 hover:bg-slate-100/90 border-slate-200 text-slate-800 hover:border-slate-300'
                  : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-400'
              }`}
            >
              {/* Date Number on Top Left */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-semibold ${
                    isSelected
                      ? 'text-blue-700 font-bold'
                      : isToday
                      ? 'text-indigo-600 font-extrabold'
                      : entry
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {day}
                </span>

                {/* Linked Emoji Badge on Top Right of each calendar date cell */}
                {entry && (
                  <span
                    className="text-sm leading-none"
                    title={`Suasana: ${entry.primaryMoodLabel}`}
                  >
                    {entry.primaryMood}
                  </span>
                )}
              </div>

              {/* Bottom Indicators for Ideas & Schedule */}
              <div className="flex items-center gap-1 text-[9px] leading-none">
                {entry?.ideas && entry.ideas.length > 0 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-cyan-600"
                    title={`${entry.ideas.length} ide tersimpan`}
                  />
                )}
                {entry?.scheduleTomorrow && entry.scheduleTomorrow.length > 0 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-600"
                    title={`${entry.scheduleTomorrow.length} jadwal esok hari`}
                  />
                )}
                {isToday && (
                  <span className="text-[9px] text-indigo-600 font-bold ml-auto scale-90">
                    Hari ini
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
