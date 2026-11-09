import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { analyzeDiaryEntry } from './src/server/geminiHandler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API route for Gemini diary analysis
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const result = await analyzeDiaryEntry(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Server error analyzing diary:', err);
    res.status(500).json({ error: err?.message || 'Gagal memproses analisis' });
  }
});

// Serve static assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MyDiary server running on port ${PORT}`);
});
