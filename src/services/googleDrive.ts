import { jsPDF } from 'jspdf';
import { DiaryEntry } from '../types/diary';
import { getAccessToken } from './auth';

export function generateDiaryMarkdown(entry: DiaryEntry): string {
  const emotionList = Object.entries(entry.emotionPercentages || {})
    .map(([name, pct]) => `${name}: ${pct}%`)
    .join(', ');

  let md = `---
title: "${entry.title || 'Catatan Harian'}"
date: ${entry.date}
primaryMood: "${entry.primaryMood} ${entry.primaryMoodLabel}"
stage: "${entry.stage === 'plan' ? 'Rencana Awal (Sebelum Kegiatan)' : 'Evaluasi / Selesai (Setelah Kegiatan)'}"
emotions: "${emotionList}"
updatedAt: "${entry.updatedAt}"
---

# ${entry.title || `Catatan Harian - ${entry.date}`}

**Tanggal:** ${entry.date}  
**Suasana Hati:** ${entry.primaryMood} ${entry.primaryMoodLabel}  
**Status Catatan:** ${entry.stage === 'plan' ? '📝 Rencana Awal (Pra-Kegiatan)' : '✅ Evaluasi Akhir (Pasca-Kegiatan)'}

---

## 📖 Narasi Kegiatan & Kejadian Hari Ini
${entry.content || '_Belum ada narasi catatan harian._'}

`;

  if (entry.ideas && entry.ideas.length > 0) {
    md += `\n## 💡 Opsi 1: Ide & Gagasan yang Akan Diimplementasikan\n`;
    entry.ideas.forEach((idea) => {
      const check = idea.reviewed ? '[x]' : '[ ]';
      md += `- ${check} **[${idea.category || 'Ide'}]** ${idea.text}\n`;
      if (idea.notes) {
        md += `  > Catatan: ${idea.notes}\n`;
      }
    });
    md += '\n';
  }

  if (entry.scheduleTomorrow && entry.scheduleTomorrow.length > 0) {
    md += `\n## 🗓️ Opsi 2: Rencana & Jadwal Kegiatan Esok Hari\n`;
    entry.scheduleTomorrow.forEach((item) => {
      const check = item.completed ? '[x]' : '[ ]';
      md += `- ${check} **${item.time || 'Waktu fleksibel'}** - ${item.task} *(Prioritas: ${item.priority})*\n`;
    });
    md += '\n';
  }

  if (entry.aiAnalysis) {
    md += `\n---

## ✨ Pemaknaan & Afirmasi AI Engine

### 🤍 Ringkasan Emosional
${entry.aiAnalysis.emotionalSummary}

### 🌿 Afirmasi Perasaan
> ${entry.aiAnalysis.affirmation}

### 🔮 Pemaknaan Ide & Gagasan
${entry.aiAnalysis.ideaMeaning}
`;

    if (entry.aiAnalysis.actionableInsights?.length) {
      md += `\n### 🚀 Saran Produktivitas & Langkah Esok Hari\n`;
      entry.aiAnalysis.actionableInsights.forEach((insight) => {
        md += `- ${insight}\n`;
      });
    }
  }

  md += `\n\n---\n*Dibuat & disimpan melalui MyDiary App*\n`;
  return md;
}

export function generateDiaryPdf(entry: DiaryEntry): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(14, y, pageWidth - 28, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MYDIARY - Catatan Harian Pribadi & Refleksi Emosi', 18, y + 10);
  y += 24;

  // Metadata Card
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(14, y, pageWidth - 28, 26, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 26, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Judul: ${entry.title || 'Catatan Harian'}`, 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal: ${entry.date}  |  Status: ${entry.stage === 'plan' ? 'Rencana Awal' : 'Evaluasi Pasca-Kegiatan'}`, 18, y + 14);
  doc.text(`Suasana Hati: [${entry.primaryMood}] ${entry.primaryMoodLabel}`, 18, y + 21);
  y += 33;

  // Content Narrative
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Narasi Kegiatan & Kejadian Hari Ini', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const contentLines = doc.splitTextToSize(entry.content || '(Belum ada catatan narasi)', pageWidth - 28);
  doc.text(contentLines, 14, y);
  y += contentLines.length * 5 + 6;

  // Option 1: Ideas
  if (entry.ideas && entry.ideas.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Opsi 1: Ide & Gagasan yang Akan Diimplementasikan', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    entry.ideas.forEach((idea, i) => {
      const line = `• [${idea.category || 'Ide'}] ${idea.text}`;
      const lines = doc.splitTextToSize(line, pageWidth - 32);
      doc.text(lines, 18, y);
      y += lines.length * 4.8;
    });
    y += 4;
  }

  // Option 2: Schedule Tomorrow
  if (entry.scheduleTomorrow && entry.scheduleTomorrow.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('3. Opsi 2: Rencana & Jadwal Kegiatan Esok Hari', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    entry.scheduleTomorrow.forEach((item) => {
      const line = `• ${item.time || 'Fleksibel'} : ${item.task} (Prioritas: ${item.priority})`;
      const lines = doc.splitTextToSize(line, pageWidth - 32);
      doc.text(lines, 18, y);
      y += lines.length * 4.8;
    });
    y += 4;
  }

  // AI Insights Box
  if (entry.aiAnalysis) {
    if (y > 210) { doc.addPage(); y = 20; }
    doc.setFillColor(243, 232, 255); // Purple-100
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(107, 33, 168);
    doc.text('Pemaknaan & Afirmasi Emosi oleh AI Engine', 18, y + 5.5);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Ringkasan Emosional:', 14, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(entry.aiAnalysis.emotionalSummary, pageWidth - 28);
    doc.text(summaryLines, 14, y);
    y += summaryLines.length * 4.8 + 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Afirmasi Perasaan:', 14, y);
    y += 4.5;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(88, 28, 135);
    const affirmLines = doc.splitTextToSize(`"${entry.aiAnalysis.affirmation}"`, pageWidth - 28);
    doc.text(affirmLines, 14, y);
    y += affirmLines.length * 4.8 + 4;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Pemaknaan Ide & Gagasan:', 14, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    const ideaLines = doc.splitTextToSize(entry.aiAnalysis.ideaMeaning, pageWidth - 28);
    doc.text(ideaLines, 14, y);
    y += ideaLines.length * 4.8 + 4;
  }

  // Footer on each page
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${i} dari ${pageCount} • MyDiary Personal Journal • ${new Date().toLocaleDateString('id-ID')}`,
      pageWidth / 2,
      287,
      { align: 'center' }
    );
  }

  return doc;
}

export async function uploadToGoogleDrive(
  entry: DiaryEntry,
  format: 'markdown' | 'pdf'
): Promise<{ fileId: string; webViewLink?: string; name: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum aktif. Silakan masuk terlebih dahulu dengan Google.');
  }

  const sanitizedTitle = (entry.title || 'Catatan')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '')
    .trim();
  const fileName = `MyDiary_${entry.date}_${sanitizedTitle}.${format === 'markdown' ? 'md' : 'pdf'}`;
  const mimeType = format === 'markdown' ? 'text/markdown' : 'application/pdf';

  let fileContentBlob: Blob;
  if (format === 'markdown') {
    const mdText = generateDiaryMarkdown(entry);
    fileContentBlob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
  } else {
    const pdfDoc = generateDiaryPdf(entry);
    const pdfArrayBuffer = pdfDoc.output('arraybuffer');
    fileContentBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  }

  // Multi-part upload to Google Drive v3
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: `Catatan diary tanggal ${entry.date} disimpan melalui aplikasi MyDiary`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileContentBlob);
  });
  const base64Data = await base64Promise;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gagal mengunggah file ke Google Drive (Status: ${response.status})`
    );
  }

  const result = await response.json();
  return {
    fileId: result.id,
    webViewLink: result.webViewLink,
    name: result.name || fileName,
  };
}

export function downloadLocalFile(entry: DiaryEntry, format: 'markdown' | 'pdf') {
  const sanitizedTitle = (entry.title || 'Catatan')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '')
    .trim();
  const fileName = `MyDiary_${entry.date}_${sanitizedTitle}.${format === 'markdown' ? 'md' : 'pdf'}`;

  if (format === 'markdown') {
    const text = generateDiaryMarkdown(entry);
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const pdfDoc = generateDiaryPdf(entry);
    pdfDoc.save(fileName);
  }
}
