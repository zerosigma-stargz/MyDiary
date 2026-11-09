import { ScheduleItem } from '../types/diary';
import { getAccessToken } from './auth';

export async function syncScheduleToGoogleCalendar(
  baseDate: string,
  items: ScheduleItem[]
): Promise<{ createdCount: number; errors: string[] }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum aktif. Silakan masuk dengan Google terlebih dahulu.');
  }

  // Calculate tomorrow's date based on entry date
  const dateObj = new Date(baseDate + 'T12:00:00');
  dateObj.setDate(dateObj.getDate() + 1);
  const targetDateStr = dateObj.toISOString().split('T')[0];

  let createdCount = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      let startTime = '09:00:00';
      let endTime = '10:00:00';

      if (item.time) {
        const timeParts = item.time.split(/[-–—]/).map((s) => s.trim());
        if (timeParts[0] && timeParts[0].includes(':')) {
          const [h, m] = timeParts[0].split(':');
          startTime = `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}:00`;
        }
        if (timeParts[1] && timeParts[1].includes(':')) {
          const [h, m] = timeParts[1].split(':');
          endTime = `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}:00`;
        } else {
          // default +1 hour
          const [h, m] = startTime.split(':');
          const nextH = (parseInt(h, 10) + 1) % 24;
          endTime = `${String(nextH).padStart(2, '0')}:${m}:00`;
        }
      }

      const eventBody = {
        summary: `[MyDiary] ${item.task}`,
        description: `Rencana kegiatan dari aplikasi MyDiary (Prioritas: ${item.priority})`,
        start: {
          dateTime: `${targetDateStr}T${startTime}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        },
        end: {
          dateTime: `${targetDateStr}T${endTime}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        },
        reminders: {
          useDefault: true,
        },
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        errors.push(errJson.error?.message || `Gagal membuat event "${item.task}"`);
      } else {
        createdCount++;
      }
    } catch (e: any) {
      errors.push(e.message || 'Error membuat event kalender');
    }
  }

  return { createdCount, errors };
}
