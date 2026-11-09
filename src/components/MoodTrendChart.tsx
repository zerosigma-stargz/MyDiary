import React, { useState, useMemo } from 'react';
import { DiaryEntry } from '../types/diary';
import { EMOTION_DEFINITIONS, getEmotionByName } from '../constants/emotions';
import {
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Activity,
  BarChart3,
  Sparkles,
  Layers,
} from 'lucide-react';

interface MoodTrendChartProps {
  entries: DiaryEntry[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

interface DayDataPoint {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "10 Okt"
  dayNumber: number;
  entry?: DiaryEntry;
  // Valence score from -1.0 to 1.0 (defaults to neutral 0 if no entry)
  valence: number;
  hasEntry: boolean;
  moodCounts: Record<string, number>;
}

type ChartViewMode = 'stream' | 'focus' | 'breakdown';

export const MoodTrendChart: React.FC<MoodTrendChartProps> = ({
  entries,
  selectedDate,
  onSelectDate,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [viewMode, setChartViewMode] = useState<ChartViewMode>('stream');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Single active emotion when in 'focus' mode to prevent overlapping/clashing colors
  const [focusedEmotionId, setFocusedEmotionId] = useState<string>('kebahagiaan');

  // Build 30-day timeline ending at current anchor (2026-11-08)
  const timelineData: DayDataPoint[] = useMemo(() => {
    const end = new Date('2026-11-08T12:00:00');
    const points: DayDataPoint[] = [];

    // Map entries by date for fast lookup
    const entryMap = new Map<string, DiaryEntry>();
    entries.forEach((e) => entryMap.set(e.date, e));

    for (let i = 29; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
      ];
      const dayLabel = `${d.getDate()} ${monthNames[d.getMonth()]}`;

      const matchedEntry = entryMap.get(dateStr);
      const moodCounts: Record<string, number> = {};
      let valence = 0;

      if (matchedEntry) {
        const primary = matchedEntry.primaryMoodLabel;
        const emoDef = getEmotionByName(primary);
        valence = emoDef ? emoDef.valence : 0.5;

        moodCounts[primary] = (moodCounts[primary] || 0) + 1;

        if (matchedEntry.emotionPercentages) {
          Object.keys(matchedEntry.emotionPercentages).forEach((name) => {
            if (!moodCounts[name]) moodCounts[name] = 0.5;
          });
        }
      }

      points.push({
        dateStr,
        dayLabel,
        dayNumber: d.getDate(),
        entry: matchedEntry,
        valence,
        hasEntry: !!matchedEntry,
        moodCounts,
      });
    }

    return points;
  }, [entries]);

  // Overall 30-day stats
  const totalEntries30Days = useMemo(() => {
    return timelineData.filter((p) => p.hasEntry).length;
  }, [timelineData]);

  // Distribution counts across all 10 emotions
  const emotionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    EMOTION_DEFINITIONS.forEach((e) => {
      counts[e.id] = 0;
    });

    timelineData.forEach((p) => {
      if (p.entry?.primaryMoodLabel) {
        const emo = getEmotionByName(p.entry.primaryMoodLabel);
        if (emo) {
          counts[emo.id] = (counts[emo.id] || 0) + 1;
        }
      }
    });

    return EMOTION_DEFINITIONS.map((def) => {
      const count = counts[def.id] || 0;
      const percentage =
        totalEntries30Days > 0 ? Math.round((count / totalEntries30Days) * 100) : 0;
      return {
        ...def,
        count,
        percentage,
      };
    }).sort((a, b) => b.count - a.count);
  }, [timelineData, totalEntries30Days]);

  const dominantMood = emotionStats[0] || EMOTION_DEFINITIONS[0];

  // SVG Chart Geometry
  const svgWidth = 840;
  const svgHeight = 150;
  const paddingLeft = 36;
  const paddingRight = 28;
  const paddingTop = 22;
  const paddingBottom = 28;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  // Selected focused emotion definition
  const currentFocusedEmotion = useMemo(() => {
    return (
      EMOTION_DEFINITIONS.find((e) => e.id === focusedEmotionId) ||
      EMOTION_DEFINITIONS[0]
    );
  }, [focusedEmotionId]);

  // Path generator for "Arus Harmoni" (Unified Valence Stream - ZERO color collisions)
  const streamPathData = useMemo(() => {
    const baselineY = paddingTop + chartH / 2; // neutral 0.0 valence line
    const coords: { x: number; y: number; point: DayDataPoint }[] = [];

    timelineData.forEach((point, idx) => {
      const x = paddingLeft + (idx / (timelineData.length - 1)) * chartW;
      // Valence ranges from -1.0 to 1.0. Map to chart height (1.0 = top, -1.0 = bottom)
      // If no entry, interpolate slightly towards neutral (0)
      const val = point.hasEntry ? point.valence : 0;
      const y = baselineY - val * (chartH * 0.42);
      coords.push({ x, y, point });
    });

    if (coords.length < 2) return { linePath: '', areaPath: '', coords: [] };

    // Spline curve
    let linePath = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = i > 0 ? coords[i - 1] : coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = i < coords.length - 2 ? coords[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const bottomY = paddingTop + chartH;
    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`;

    return { linePath, areaPath, coords };
  }, [timelineData, chartW, chartH]);

  // Path generator for "Fokus Emosi Tunggal" (One single emotion curve - ZERO clashing colors)
  const focusPathData = useMemo(() => {
    const coords: { x: number; y: number; count: number; point: DayDataPoint }[] = [];
    const targetName = currentFocusedEmotion.name;
    const maxVal = 1.2;

    timelineData.forEach((point, idx) => {
      const x = paddingLeft + (idx / (timelineData.length - 1)) * chartW;
      const count = point.moodCounts[targetName] || 0;
      const y = paddingTop + chartH - (count / maxVal) * chartH;
      coords.push({ x, y, count, point });
    });

    if (coords.length < 2) return { linePath: '', areaPath: '', coords: [] };

    let linePath = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = i > 0 ? coords[i - 1] : coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = i < coords.length - 2 ? coords[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = paddingTop + chartH;
    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

    return { linePath, areaPath, coords };
  }, [timelineData, currentFocusedEmotion, chartW, chartH]);

  const hoveredPoint = hoveredIndex !== null ? timelineData[hoveredIndex] : null;

  return (
    <div className="w-full bg-white border-t border-slate-200/80 text-slate-800 select-none shadow-2xs transition-all">
      {/* Clean Header Bar */}
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#fcfdfe]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-2xs">
            <TrendingUp className="w-4 h-4 text-slate-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold tracking-tight text-slate-900">
                Grafik Tren Keseimbangan Emosi
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                30 Hari Terakhir
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block">
              Visualisasi jernih ritme emosi tanpa percampuran warna yang bertabrakan
            </p>
          </div>
        </div>

        {/* Right Action Tools: Tabs & Collapse Button */}
        <div className="flex items-center gap-2.5">
          {/* View Mode Switcher */}
          {!isCollapsed && (
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs">
              <button
                onClick={() => setChartViewMode('stream')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-[11px] transition ${
                  viewMode === 'stream'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Tampilan satu alur keseimbangan emosi harmonis"
              >
                <Activity className="w-3 h-3 text-emerald-600" />
                <span>Arus Harmoni</span>
              </button>
              <button
                onClick={() => setChartViewMode('focus')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-[11px] transition ${
                  viewMode === 'focus'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Fokus mendalam pada satu suasana hati tanpa gangguan"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Fokus Emosi</span>
              </button>
              <button
                onClick={() => setChartViewMode('breakdown')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-[11px] transition ${
                  viewMode === 'breakdown'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Rekapitulasi persentase & frekuensi 30 hari"
              >
                <BarChart3 className="w-3 h-3 text-sky-600" />
                <span>Distribusi</span>
              </button>
            </div>
          )}

          {/* Dominant Mood Badge in Desktop */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600">
            <span>Dominan:</span>
            <span>{dominantMood.emoji}</span>
            <strong className="text-slate-800 font-semibold">{dominantMood.name}</strong>
            <span className="text-slate-400">({dominantMood.percentage}%)</span>
          </div>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition shadow-2xs"
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Buka Grafik</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Sembunyikan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Chart Body */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 bg-white">
          {/* Subheader Context / Filter Bar */}
          {viewMode === 'focus' ? (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mr-1">
                  Pilih Suasana Hati:
                </span>
                {EMOTION_DEFINITIONS.map((emo) => {
                  const isSelected = focusedEmotionId === emo.id;
                  return (
                    <button
                      key={emo.id}
                      onClick={() => setFocusedEmotionId(emo.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs scale-102'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <span className="text-xs">{emo.emoji}</span>
                      <span>{emo.name}</span>
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] text-slate-400 italic hidden xl:inline">
                Satu emosi ditampilkan mandiri untuk kejernihan data tanpa tabrakan visual
              </span>
            </div>
          ) : viewMode === 'stream' ? (
            <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                <span className="text-slate-700 font-medium">
                  Aliran Keseimbangan Afektif (Valensi Positif & Reflektif)
                </span>
                <span className="text-slate-400 text-[11px] hidden md:inline">
                  • Garis tunggal harmonis menghubungkan seluruh riwayat 30 hari
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Klik titik untuk membuka catatan
              </span>
            </div>
          ) : null}

          {/* View Mode 1 & 2: SVG Chart Canvas */}
          {viewMode !== 'breakdown' && (
            <div className="relative w-full overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-inner/5">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-36 sm:h-44 overflow-visible"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <defs>
                  {/* Clean, pure subtle gradient for Stream View (Slate / Emerald serenity) */}
                  <linearGradient id="grad_stream_pure" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity="0.12" />
                    <stop offset="50%" stopColor="#0f766e" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity="0.00" />
                  </linearGradient>

                  {/* Sanitized Clean ID gradient for Focused Emotion */}
                  <linearGradient
                    id={`grad_${currentFocusedEmotion.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={currentFocusedEmotion.color}
                      stopOpacity="0.14"
                    />
                    <stop
                      offset="100%"
                      stopColor={currentFocusedEmotion.color}
                      stopOpacity="0.00"
                    />
                  </linearGradient>
                </defs>

                {/* Subtle Clean Horizontal Gridlines */}
                {viewMode === 'stream' ? (
                  // Neutral midline & valence bands
                  <>
                    <line
                      x1={paddingLeft}
                      y1={paddingTop + chartH / 2}
                      x2={svgWidth - paddingRight}
                      y2={paddingTop + chartH / 2}
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={paddingTop + 6}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="sans-serif"
                    >
                      Positif
                    </text>
                    <text
                      x={paddingLeft - 8}
                      y={paddingTop + chartH / 2 + 3}
                      textAnchor="end"
                      fill="#cbd5e1"
                      fontSize="9"
                      fontFamily="sans-serif"
                    >
                      Hening
                    </text>
                    <text
                      x={paddingLeft - 8}
                      y={paddingTop + chartH - 2}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="sans-serif"
                    >
                      Reflektif
                    </text>
                  </>
                ) : (
                  // Focus view counts: 0, 1x, 2x
                  [0, 0.5, 1.0].map((ratio, i) => {
                    const y = paddingTop + chartH - ratio * chartH;
                    return (
                      <g key={`grid-focus-${i}`}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={svgWidth - paddingRight}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingLeft - 8}
                          y={y + 3}
                          textAnchor="end"
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="sans-serif"
                        >
                          {ratio === 0 ? '0' : ratio === 0.5 ? '1x' : '2x'}
                        </text>
                      </g>
                    );
                  })
                )}

                {/* Render Stream View (Aliran Keseimbangan Emosi) */}
                {viewMode === 'stream' && (
                  <g>
                    {/* Soft Single Area Fill */}
                    <path d={streamPathData.areaPath} fill="url(#grad_stream_pure)" />

                    {/* Pristine Single Contour Line */}
                    <path
                      d={streamPathData.linePath}
                      fill="none"
                      stroke="#0f766e"
                      strokeWidth="2.0"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Nodes on days with diary entries */}
                    {streamPathData.coords.map((item, idx) => {
                      if (!item.point.hasEntry || !item.point.entry) return null;
                      const isSelected = item.point.dateStr === selectedDate;

                      return (
                        <g
                          key={`node-stream-${idx}`}
                          className="cursor-pointer transition-transform"
                          onClick={() => onSelectDate(item.point.dateStr)}
                        >
                          {/* Circular Halo */}
                          <circle
                            cx={item.x}
                            cy={item.y}
                            r={isSelected ? 11 : 8}
                            fill="#ffffff"
                            stroke={isSelected ? '#0f766e' : '#cbd5e1'}
                            strokeWidth={isSelected ? 2 : 1.2}
                            className="shadow-2xs"
                          />
                          {/* Tiny Emoji Badge inside */}
                          <text
                            x={item.x}
                            y={item.y + (isSelected ? 3.5 : 3)}
                            textAnchor="middle"
                            fontSize={isSelected ? '9.5' : '8'}
                            style={{ pointerEvents: 'none' }}
                          >
                            {item.point.entry.primaryMood}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Render Focus View (Single Selected Emotion Only) */}
                {viewMode === 'focus' && (
                  <g>
                    <path
                      d={focusPathData.areaPath}
                      fill={`url(#grad_${currentFocusedEmotion.id})`}
                    />
                    <path
                      d={focusPathData.linePath}
                      fill="none"
                      stroke={currentFocusedEmotion.color}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {focusPathData.coords.map((item, idx) => {
                      if (item.count <= 0) return null;
                      const isSelected = item.point.dateStr === selectedDate;

                      return (
                        <circle
                          key={`focus-node-${idx}`}
                          cx={item.x}
                          cy={item.y}
                          r={isSelected ? 5.5 : 3.5}
                          fill={isSelected ? '#ffffff' : currentFocusedEmotion.color}
                          stroke={currentFocusedEmotion.color}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          className="cursor-pointer transition-transform hover:scale-140"
                          onClick={() => onSelectDate(item.point.dateStr)}
                        />
                      );
                    })}
                  </g>
                )}

                {/* X-Axis Clean Date Ticks (Every 5 days & last day) */}
                {timelineData.map((point, idx) => {
                  if (idx % 5 === 0 || idx === timelineData.length - 1) {
                    const x = paddingLeft + (idx / (timelineData.length - 1)) * chartW;
                    const isSelected = point.dateStr === selectedDate;

                    return (
                      <text
                        key={`x-label-${idx}`}
                        x={x}
                        y={svgHeight - 8}
                        textAnchor="middle"
                        fill={isSelected ? '#0f172a' : '#94a3b8'}
                        fontWeight={isSelected ? '700' : '500'}
                        fontSize="9.5"
                        fontFamily="sans-serif"
                      >
                        {point.dayLabel}
                      </text>
                    );
                  }
                  return null;
                })}

                {/* Subtle Hover Crosshair */}
                {hoveredIndex !== null && (
                  <g>
                    <line
                      x1={paddingLeft + (hoveredIndex / (timelineData.length - 1)) * chartW}
                      y1={paddingTop}
                      x2={paddingLeft + (hoveredIndex / (timelineData.length - 1)) * chartW}
                      y2={paddingTop + chartH}
                      stroke="#475569"
                      strokeWidth="1.2"
                      strokeDasharray="2 3"
                    />
                  </g>
                )}

                {/* Invisible Hover & Click Hitboxes */}
                {timelineData.map((point, idx) => {
                  const colW = chartW / timelineData.length;
                  const x = paddingLeft + idx * colW - colW / 2;

                  return (
                    <rect
                      key={`hitbox-${idx}`}
                      x={x}
                      y={paddingTop}
                      width={colW}
                      height={chartH + 15}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onClick={() => onSelectDate(point.dateStr)}
                    />
                  );
                })}
              </svg>

              {/* Floating Tooltip Card */}
              {hoveredPoint && (
                <div
                  className="absolute top-2 pointer-events-none bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-md text-xs z-30 transition-all duration-75"
                  style={{
                    left: `${Math.min(
                      Math.max((hoveredIndex! / (timelineData.length - 1)) * 88, 3),
                      72
                    )}%`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3 font-semibold text-slate-800">
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" /> {hoveredPoint.dayLabel}
                    </span>
                    {hoveredPoint.hasEntry && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        Ada Catatan
                      </span>
                    )}
                  </div>

                  {hoveredPoint.entry ? (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <span className="text-sm">{hoveredPoint.entry.primaryMood}</span>
                        <span>{hoveredPoint.entry.primaryMoodLabel}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 max-w-[200px]">
                        {hoveredPoint.entry.title || 'Catatan Harian'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      Ruang hening (tanpa catatan pada tanggal ini)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* View Mode 3: Clean Horizontal Distribution Breakdown (Zero Overlap) */}
          {viewMode === 'breakdown' && (
            <div className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  Distribusi 10 Suasana Hati (30 Hari Terakhir)
                </span>
                <span>
                  Total Terdata:{' '}
                  <strong className="text-slate-900 font-bold">{totalEntries30Days} Entri</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {emotionStats.map((emo) => (
                  <div
                    key={emo.id}
                    onClick={() => {
                      setFocusedEmotionId(emo.id);
                      setChartViewMode('focus');
                    }}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-2xs cursor-pointer transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <span className="text-base">{emo.emoji}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{emo.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {emo.category}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${emo.percentage}%`,
                            backgroundColor: emo.color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-10 text-right">
                        {emo.count}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
