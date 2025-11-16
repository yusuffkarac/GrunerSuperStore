import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// .env dosyasını yükle
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenant-specific upload path (UPLOAD_PATH environment variable'ından)
// Eğer UPLOAD_PATH yoksa varsayılan olarak uploads klasörünü kullan
const uploadsDir = process.env.UPLOAD_PATH
  ? path.join(__dirname, '../..', process.env.UPLOAD_PATH)
  : path.join(__dirname, '../../uploads');

// Weekly discounts klasörünü oluştur
const weeklyDiscountsDir = path.join(uploadsDir, 'weekly-discounts');
if (!fs.existsSync(weeklyDiscountsDir)) {
  fs.mkdirSync(weeklyDiscountsDir, { recursive: true });
}

// Storage yapılandırması
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, weeklyDiscountsDir);
  },
  filename: (req, file, cb) => {
    // Her zaman aynı dosya adını kullan (magazine.pdf) - üzerine yaz
    cb(null, 'magazine.pdf');
  },
});

// Dosya filtresi - sadece PDF dosyaları
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Nur PDF-Dateien sind erlaubt'),
      false
    );
  }
};

// Multer yapılandırması - max 20MB
const uploadPdf = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

export default uploadPdf;

