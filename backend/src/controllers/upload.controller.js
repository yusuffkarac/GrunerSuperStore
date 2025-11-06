import { asyncHandler } from '../middleware/errorHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UploadController {
  // POST /api/admin/upload - Dosya yükle
  uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen',
      });
    }

    // Dosya URL'sini oluştur - req.file.destination'ı kullanarak gerçek klasörü bul
    const folder = req.query.folder || req.body?.folder || 
      (req.file.destination ? path.basename(req.file.destination) : 'general');
    const fileUrl = `/uploads/${folder}/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Datei erfolgreich hochgeladen',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  });

  // POST /api/admin/upload/multiple - Birden fazla dosya yükle
  uploadMultiple = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Dateien hochgeladen',
      });
    }

    // Gerçek klasörü bul - ilk dosyanın destination'ından
    const folder = req.query.folder || req.body?.folder || 
      (req.files[0]?.destination ? path.basename(req.files[0].destination) : 'general');
    const files = req.files.map((file) => ({
      url: `/uploads/${folder}/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.status(200).json({
      success: true,
      message: `${files.length} Datei(en) erfolgreich hochgeladen`,
      data: { files },
    });
  });
}

export default new UploadController();

