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

// Uploads klasörünü oluştur
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage yapılandırması
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Klasör tipine göre yönlendir - query string'den al (multer body'yi henüz parse etmemiş olabilir)
    const folder = req.query.folder || req.body?.folder || 'general';
    const folderPath = path.join(uploadsDir, folder);
    
    // Klasör yoksa oluştur
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    // Sadece rastgele numara ve uzantı kullan - dosya adını hiç kullanma
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Dosya filtresi - resim dosyaları ve PDF
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Nur Bilddateien und PDF-Dateien sind erlaubt (JPEG, JPG, PNG, GIF, WEBP, PDF)'
      ),
      false
    );
  }
};

// Multer yapılandırması - max 100MB (PDF'ler için artırıldı)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

export default upload;

