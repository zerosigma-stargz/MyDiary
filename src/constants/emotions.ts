import { EmotionDefinition } from '../types/diary';

export const EMOTION_DEFINITIONS: EmotionDefinition[] = [
  {
    id: 'kebahagiaan',
    name: 'Kebahagiaan',
    emoji: '🌟',
    category: 'positif',
    description: 'Rasa syukur mendalam, kedamaian hati, dan kepuasan hidup.',
    color: '#F59E0B', // Amber
    glowColor: '#FDE68A',
    valence: 0.9,
    energy: 0.75,
  },
  {
    id: 'kesenangan',
    name: 'Kesenangan',
    emoji: '🎉',
    category: 'positif',
    description: 'Keriangan, antusiasme, keceriaan saat momen menyenangkan.',
    color: '#10B981', // Emerald
    glowColor: '#A7F3D0',
    valence: 0.85,
    energy: 0.9,
  },
  {
    id: 'ketakjuban',
    name: 'Ketakjuban',
    emoji: '🤩',
    category: 'positif',
    description: 'Rasa kagum luar biasa atas keindahan alam, karya, atau peristiwa.',
    color: '#8B5CF6', // Purple
    glowColor: '#DDD6FE',
    valence: 0.8,
    energy: 0.85,
  },
  {
    id: 'ketertarikan',
    name: 'Ketertarikan',
    emoji: '💡',
    category: 'positif',
    description: 'Keingintahuan intelektual, inspirasi ide baru, dan rasa penasaran.',
    color: '#06B6D4', // Cyan
    glowColor: '#A5F3FC',
    valence: 0.7,
    energy: 0.7,
  },
  {
    id: 'kekhawatiran',
    name: 'Kekhawatiran',
    emoji: '😟',
    category: 'reflektif',
    description: 'Kecemasan akan hal mendatang, ketidakpastian, dan beban pikiran.',
    color: '#F97316', // Orange
    glowColor: '#FED7AA',
    valence: -0.4,
    energy: 0.6,
  },
  {
    id: 'kesedihan',
    name: 'Kesedihan',
    emoji: '😢',
    category: 'reflektif',
    description: 'Rasa duka, kehilangan, kesunyian, atau luka batin yang butuh ruang.',
    color: '#3B82F6', // Blue
    glowColor: '#BFDBFE',
    valence: -0.8,
    energy: 0.3,
  },
  {
    id: 'ketakutan',
    name: 'Ketakutan',
    emoji: '😨',
    category: 'reflektif',
    description: 'Rasa gentar, was-was terhadap ancaman atau risiko di luar kendali.',
    color: '#64748B', // Slate
    glowColor: '#CBD5E1',
    valence: -0.7,
    energy: 0.75,
  },
  {
    id: 'kekecewaan',
    name: 'Kekecewaan',
    emoji: '😞',
    category: 'reflektif',
    description: 'Ekspektasi yang tak tercapai atau harapan yang belum terwujud.',
    color: '#71717A', // Zinc
    glowColor: '#D4D4D8',
    valence: -0.6,
    energy: 0.35,
  },
  {
    id: 'merasa_dicintai',
    name: 'Merasa Dicintai',
    emoji: '🥰',
    category: 'kasih_sayang',
    description: 'Perasaan hangat dihargai, diterima apa adanya, dan disayangi orang terdekat.',
    color: '#EC4899', // Pink
    glowColor: '#FBCFE8',
    valence: 0.95,
    energy: 0.65,
  },
  {
    id: 'sedang_mencintai',
    name: 'Sedang Mencintai',
    emoji: '❤️',
    category: 'kasih_sayang',
    description: 'Kasih sayang tulus, keinginan memberi yang terbaik, dan empati mendalam.',
    color: '#EF4444', // Red
    glowColor: '#FECACA',
    valence: 0.95,
    energy: 0.8,
  },
];

export function getEmotionByEmoji(emoji: string): EmotionDefinition {
  return (
    EMOTION_DEFINITIONS.find((e) => e.emoji === emoji) ||
    EMOTION_DEFINITIONS[0]
  );
}

export function getEmotionByName(name: string): EmotionDefinition {
  return (
    EMOTION_DEFINITIONS.find(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    ) || EMOTION_DEFINITIONS[0]
  );
}
