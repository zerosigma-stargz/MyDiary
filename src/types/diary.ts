export type DiaryStage = 'plan' | 'evaluation';

export type DiaryOptionTab = 'all' | 'ideas' | 'schedule';

export interface IdeaItem {
  id: string;
  text: string;
  category: string;
  reviewed: boolean;
  notes?: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  task: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface EmotionScore {
  name: string;
  emoji: string;
  category: string;
  percentage: number;
}

export interface AiAnalysisResult {
  emotionalSummary: string;
  affirmation: string;
  ideaMeaning: string;
  suggestedMoods: EmotionScore[];
  actionableInsights: string[];
  valence: number; // -1 (reflective/melancholic) to +1 (uplifting/joyful)
  energy: number;  // 0 (serene/quiet) to 1 (high energy/excitement)
  ideationDepth: number; // 0 (practical/routine) to 1 (visionary/creative philosophy)
  analyzedAt: string;
}

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string; // narrative of daily events / reflections
  stage: DiaryStage;
  activeOption: DiaryOptionTab;
  ideas: IdeaItem[];
  scheduleTomorrow: ScheduleItem[];
  primaryMood: string;
  primaryMoodLabel: string;
  emotionPercentages: Record<string, number>;
  aiAnalysis?: AiAnalysisResult;
  updatedAt: string;
  createdAt: string;
  driveSync?: {
    fileId?: string;
    format?: 'markdown' | 'pdf';
    syncedAt?: string;
    webViewLink?: string;
  };
}

export interface EmotionDefinition {
  id: string;
  name: string;
  emoji: string;
  category: 'positif' | 'reflektif' | 'kasih_sayang';
  description: string;
  color: string;
  glowColor: string;
  valence: number;
  energy: number;
}
