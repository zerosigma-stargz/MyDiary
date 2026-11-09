import { IdeaItem } from '../types/diary';
import { getAccessToken } from './auth';

export async function syncIdeasToGoogleTasks(
  entryDate: string,
  ideas: IdeaItem[]
): Promise<{ createdCount: number; errors: string[] }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum aktif. Silakan masuk dengan Google terlebih dahulu.');
  }

  let createdCount = 0;
  const errors: string[] = [];

  for (const idea of ideas) {
    try {
      const taskBody = {
        title: `[Ide MyDiary] ${idea.text}`,
        notes: `Kategori: ${idea.category || 'Gagasan'} | Tanggal entri: ${entryDate}${
          idea.notes ? `\nCatatan tambahan: ${idea.notes}` : ''
        }`,
      };

      const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskBody),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        errors.push(errJson.error?.message || `Gagal menambahkan task "${idea.text}"`);
      } else {
        createdCount++;
      }
    } catch (e: any) {
      errors.push(e.message || 'Error menambahkan Google Task');
    }
  }

  return { createdCount, errors };
}
