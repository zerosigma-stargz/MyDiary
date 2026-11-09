import { GoogleGenAI, Type } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export interface AnalyzeDiaryPayload {
  title: string;
  date: string;
  content: string;
  stage: 'plan' | 'evaluation';
  ideas?: Array<{ text: string; category?: string }>;
  scheduleTomorrow?: Array<{ time: string; task: string; priority?: string }>;
  currentMood?: string;
}

export async function analyzeDiaryEntry(payload: AnalyzeDiaryPayload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateFallbackAnalysis(payload);
  }

  const ai = getAiClient();

  const prompt = `Analisis halaman catatan harian pribadi berikut secara mendalam, empati, dan penuh kehangatan manusiawi:

Tanggal Catatan: ${payload.date}
Judul: ${payload.title || 'Tanpa Judul'}
Status Penulisan: ${payload.stage === 'plan' ? 'Rencana Sebelum Kegiatan (Pra-Aktivitas)' : 'Evaluasi Pasca-Kegiatan (Setelah Selesai)'}

Narasi Harian / Cerita Pengalaman:
"""
${payload.content || '(Penulis belum menuangkan narasi panjang, hanya ide/rencana)'}
"""

Daftar Ide & Gagasan (Opsi 1):
${payload.ideas?.map((i) => `- [${i.category || 'Gagasan'}] ${i.text}`).join('\n') || 'Tidak ada ide khusus yang dicantumkan.'}

Rencana Jadwal Esok Hari (Opsi 2):
${payload.scheduleTomorrow?.map((s) => `- ${s.time}: ${s.task} (Prioritas: ${s.priority})`).join('\n') || 'Tidak ada jadwal esok hari yang disusun.'}

Suasana Hati yang Dipilih Pengguna: ${payload.currentMood || 'Belum ditentukan'}

Instruksi Analisis:
1. Pahami wacana konteks kalimat dan perasaan batin yang tersirat dalam narasi catatan harian.
2. Buat "Ringkasan Emosional": rangkuman singkat (2-3 kalimat) mengenai lanskap emosi dan kondisi mental penulis hari ini.
3. Berikan "Afirmasi Perasaan Emosi": kalimat afirmasi yang tulus, penuh validasi, menenangkan, atau menguatkan perasaan penulis hari ini.
4. Berikan "Pemaknaan Ide & Gagasan": refleksi kritis dan filosofis yang memaknai ide/gagasan yang diangkat atau pelajaran dari kejadian yang dialami, serta bagaimana ide tersebut berharga untuk ditinjau di masa depan.
5. Tentukan persentase keterwakilan emosi dari spektrum emosi wajib:
   - Kebahagiaan (🌟)
   - Kesenangan (🎉)
   - Ketakjuban (🤩)
   - Ketertarikan (💡)
   - Kekhawatiran (😟)
   - Kesedihan (😢)
   - Ketakutan (😨)
   - Kekecewaan (😞)
   - Merasa Dicintai (🥰)
   - Sedang Mencintai (❤️)
   Total persentase harus mendekati 100%.
6. Hitung koordinat 3D untuk titik sebar (scatter plot):
   - valence: skala -1.0 (reflektif/duka/berat) hingga +1.0 (bahagia/riang/hangat)
   - energy: skala 0.0 (tenang/hening/lelah) hingga 1.0 (bersemangat/intens/aktif)
   - ideationDepth: skala 0.0 (rutinitas harian biasa) hingga 1.0 (ide kreatif berbobot tinggi/filosofis)
7. Buat 2-3 "Saran Produktivitas / Langkah Tindak Lanjut" untuk jadwal esok hari.
Gunakan Bahasa Indonesia yang elegan, hangat, santun, dan puitis-reflektif.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Kamu adalah AI Companion dan Psikolog Reflektif cerdas dalam aplikasi MyDiary. Tugasmu adalah membaca catatan harian pengguna dengan kehangatan, memberikan afirmasi emosional yang tulus, serta mengekstraksi pemaknaan mendalam dari ide-ide dan rencana kegiatan yang mereka tulis.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotionalSummary: {
              type: Type.STRING,
              description: 'Ringkasan emosional 2-3 kalimat yang empati.',
            },
            affirmation: {
              type: Type.STRING,
              description: 'Kalimat afirmasi mendalam yang memvalidasi emosi penulis.',
            },
            ideaMeaning: {
              type: Type.STRING,
              description: 'Pemaknaan filosofis dan praktis dari ide/gagasan yang diangkat.',
            },
            suggestedMoods: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  category: { type: Type.STRING },
                  percentage: { type: Type.NUMBER },
                },
                required: ['name', 'emoji', 'percentage'],
              },
            },
            actionableInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            valence: {
              type: Type.NUMBER,
              description: 'Nilai valence antara -1.0 dan 1.0',
            },
            energy: {
              type: Type.NUMBER,
              description: 'Nilai energy antara 0.0 dan 1.0',
            },
            ideationDepth: {
              type: Type.NUMBER,
              description: 'Kedalaman gagasan antara 0.0 dan 1.0',
            },
          },
          required: [
            'emotionalSummary',
            'affirmation',
            'ideaMeaning',
            'suggestedMoods',
            'valence',
            'energy',
            'ideationDepth',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      ...parsed,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Error invoking Gemini 3.8 Flash:', error);
    return generateFallbackAnalysis(payload);
  }
}

function generateFallbackAnalysis(payload: AnalyzeDiaryPayload) {
  const text = `${payload.title} ${payload.content} ${payload.ideas?.map((i) => i.text).join(' ')}`.toLowerCase();

  let valence = 0.5;
  let energy = 0.6;
  let ideationDepth = (payload.ideas && payload.ideas.length > 0) ? 0.8 : 0.4;
  let primaryName = 'Kebahagiaan';
  let primaryEmoji = '🌟';

  if (text.includes('sedih') || text.includes('kecewa') || text.includes('lelah') || text.includes('hampa')) {
    valence = -0.5;
    energy = 0.35;
    primaryName = 'Kesedihan';
    primaryEmoji = '😢';
  } else if (text.includes('khawatir') || text.includes('takut') || text.includes('cemas') || text.includes('bingung')) {
    valence = -0.3;
    energy = 0.7;
    primaryName = 'Kekhawatiran';
    primaryEmoji = '😟';
  } else if (text.includes('cinta') || text.includes('sayang') || text.includes('hangat') || text.includes('syukur')) {
    valence = 0.9;
    energy = 0.75;
    primaryName = 'Merasa Dicintai';
    primaryEmoji = '🥰';
  } else if (text.includes('ide') || text.includes('inovasi') || text.includes('proyek') || text.includes('kreatif')) {
    valence = 0.75;
    energy = 0.85;
    ideationDepth = 0.9;
    primaryName = 'Ketertarikan';
    primaryEmoji = '💡';
  }

  return {
    emotionalSummary: `Hari ini dipenuhi dengan alur perenungan yang bermakna. Anda telah menuangkan dinamika batin dengan jujur, menyeimbangkan antara peristiwa yang dihadapi dan aspirasi yang ingin diwujudkan.`,
    affirmation: `Setiap perasaan yang hadir hari ini adalah bagian berharga dari perjalanan bertumbuh Anda. Terimalah kelelahan, rayakan pencapaian kecil, dan percayalah pada langkah yang sedang Anda bangun.`,
    ideaMeaning: `Gagasan dan refleksi yang Anda catat mencerminkan kedewasaan berpikir. Terus jaga momentum ide ini agar menjadi bahan bakar nyata saat Anda mengeksekusi rencana esok hari.`,
    suggestedMoods: [
      { name: primaryName, emoji: primaryEmoji, category: 'utama', percentage: 65 },
      { name: 'Ketertarikan', emoji: '💡', category: 'positif', percentage: 20 },
      { name: 'Kebahagiaan', emoji: '🌟', category: 'positif', percentage: 15 },
    ],
    actionableInsights: [
      'Tinjau kembali ide utama di pagi hari dengan secangkir kopi sebelum memulai aktifitas.',
      'Fokuskan energi pada jadwal berprioritas tinggi dan beri jeda istirahat berkala.',
    ],
    valence,
    energy,
    ideationDepth,
    analyzedAt: new Date().toISOString(),
  };
}
