import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

const uploadRouter = Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'data/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer config — store file in memory for text extraction, cap at 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Supported extensions for text extraction
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.rtf']);

function extname(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

// Extract plain text from buffer based on extension
function extractText(buf: Buffer, ext: string): string {
  if (TEXT_EXTENSIONS.has(ext)) {
    return buf.toString('utf-8');
  }
  // For PDF/DOC/DOCX — return placeholder; real extraction requires heavy deps
  return `[Uploaded ${ext} file — content not extracted inline; advisor will reference filename and metadata]`;
}

interface MulterRequest extends Request {
  file?: Express.Multer.File;
  body: Record<string, string>;
}

uploadRouter.post('/', upload.single('file'), (req: MulterRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const rawType = req.body.docType || 'other';
  const docType = ['resume', 'essay', 'other'].includes(rawType) ? rawType : 'other';
  const ext = extname(req.file.originalname);
  const id = uuid();

  // Persist file to disk
  const diskName = `${id}${ext}`;
  const diskPath = path.join(UPLOADS_DIR, diskName);
  fs.writeFileSync(diskPath, req.file.buffer);

  // Extract text (best effort)
  const text = extractText(req.file.buffer, ext);

  const doc = {
    id,
    filename: req.file.originalname,
    type: docType as 'resume' | 'essay' | 'other',
    uploadedAt: Date.now(),
    size: req.file.size,
    _extractedText: text, // internal; sent to agent but not stored in profile
  };

  res.json(doc);
});

// POST endpoint: retrieve extracted text for a list of doc IDs (used by agent)
uploadRouter.post('/extract', (req: Request, res: Response) => {
  const { docIds }: { docIds: string[] } = req.body;
  if (!Array.isArray(docIds)) {
    res.status(400).json({ error: 'docIds must be an array' });
    return;
  }

  const results: Array<{ id: string; filename: string; text: string }> = [];
  for (const docId of docIds) {
    // Find matching file on disk
    let files: string[];
    try { files = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith(docId)); } catch { continue; }
    if (files.length === 0) continue;
    const diskPath = path.join(UPLOADS_DIR, files[0]);
    const ext = extname(files[0]);
    try {
      const buf = fs.readFileSync(diskPath);
      const text = extractText(buf, ext);
      results.push({ id: docId, filename: files[0], text });
    } catch {
      // skip unreadable files
    }
  }

  res.json(results);
});

export default uploadRouter;