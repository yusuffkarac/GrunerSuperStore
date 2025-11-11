import PDFDocument from 'pdfkit';
import prisma from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Stock Order List PDF Service
 * Sipariş listesi PDF oluşturma
 */
class StockOrderListPDFService {
  /**
   * Sipariş listesi için PDF oluştur
   * @param {string} listId - Liste ID
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateStockOrderListPDF(listId) {
    // Liste bilgilerini getir
    const orderList = await prisma.stockOrderList.findUnique({
      where: { id: listId },
      include: {
        admin: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
        orders: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                supplier: true,
                unit: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!orderList) {
      throw new NotFoundError('Sipariş listesi bulunamadı');
    }

    // Settings'ten şirket bilgilerini al
    const settings = await prisma.settings.findFirst();
    const storeSettings = settings?.storeSettings || {};
    const companyInfo = storeSettings?.companyInfo || {};

    // Logo path'ini al
    let logoPath = null;
    if (storeSettings?.logo) {
      const logoUrl = storeSettings.logo;
      if (logoUrl.startsWith('/uploads/')) {
        logoPath = path.join(__dirname, '../../', logoUrl.substring(1));
      } else if (!logoUrl.startsWith('http')) {
        logoPath = path.join(__dirname, '../../uploads/general', path.basename(logoUrl));
      }

      if (logoPath) {
        try {
          await fs.access(logoPath);
        } catch {
          logoPath = null;
        }
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const chunks = [];

        // PDF stream'i buffer'a topla
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // === HEADER ===
        let headerY = 50;

        // Logo ekle (varsa)
        if (logoPath) {
          try {
            doc.image(logoPath, 50, headerY, { width: 100, height: 40, fit: [100, 40] });
            doc
              .fontSize(24)
              .font('Helvetica-Bold')
              .fillColor('#059669')
              .text(companyInfo.name || 'Gruner SuperStore', 100, headerY + 8);
            headerY = 100;
          } catch (error) {
            console.error('Logo yüklenirken hata:', error);
            doc
              .fontSize(24)
              .font('Helvetica-Bold')
              .fillColor('#059669')
              .text(companyInfo.name || 'Gruner SuperStore', 50, headerY);
            headerY = 80;
          }
        } else {
          doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .fillColor('#059669')
            .text(companyInfo.name || 'Gruner SuperStore', 50, headerY);
          headerY = 80;
        }

        // Şirket bilgileri
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(companyInfo.address || '', 50, headerY, { width: 200 })
          .text(companyInfo.phone || '', 50, headerY + 15)
          .text(companyInfo.email || '', 50, headerY + 27);

        // BESTELLLISTE başlığı
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('BESTELLLISTE', 350, 50, { align: 'right', width: 200 });

        // Liste bilgileri
        const listDate = new Date(orderList.createdAt).toLocaleDateString('de-DE');
        const statusLabels = {
          pending: 'Ausstehend',
          ordered: 'Bestellt',
          delivered: 'Geliefert',
          cancelled: 'Storniert',
        };

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(`Liste: ${orderList.name}`, 350, 80, { align: 'right', width: 200 })
          .text(`Datum: ${listDate}`, 350, 95, { align: 'right', width: 200 })
          .text(`Status: ${statusLabels[orderList.status] || orderList.status}`, 350, 110, { align: 'right', width: 200 });

        // === LİSTE BİLGİLERİ ===
        const listInfoY = 140;
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Listeinformationen:', 50, listInfoY);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#374151')
          .text(`Erstellt von: ${orderList.admin.firstName}`, 50, listInfoY + 18)
          .text(`Erstellt am: ${listDate}`, 50, listInfoY + 32);

        if (orderList.supplierEmail) {
          doc.text(`Lieferant E-Mail: ${orderList.supplierEmail}`, 50, listInfoY + 46);
        }

        if (orderList.note) {
          doc
            .fontSize(9)
            .fillColor('#6b7280')
            .text(`Notiz: ${orderList.note}`, 50, listInfoY + 60, { width: 500 });
        }

        // === ÜRÜN LİSTESİ ===
        let tableY = listInfoY + (orderList.note ? 90 : 70);

        // Tablo başlıkları
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Nr.', 50, tableY)
          .text('Produkt', 80, tableY)
          .text('Menge', 300, tableY)
          .text('Einheit', 360, tableY)
          .text('Barcode', 420, tableY);

        // Çizgi
        doc
          .moveTo(50, tableY + 15)
          .lineTo(550, tableY + 15)
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .stroke();

        tableY += 25;

        // Ürünleri listele
        orderList.orders.forEach((order, index) => {
          const product = order.product;
          const rowHeight = 20;

          // Satır numarası
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#374151')
            .text(`${index + 1}.`, 50, tableY);

          // Ürün adı
          doc
            .text(product.name || '-', 80, tableY, { width: 210 });

          // Miktar
          doc
            .text(String(order.orderQuantity), 300, tableY, { width: 50, align: 'right' });

          // Birim
          doc
            .text(order.orderUnit || product.unit || '-', 360, tableY, { width: 50 });

          // Barcode
          doc
            .font('Courier')
            .text(product.barcode || '-', 420, tableY, { width: 100 });

          // Kategori bilgisi (küçük font)
          if (product.category) {
            doc
              .fontSize(7)
              .font('Helvetica')
              .fillColor('#9ca3af')
              .text(`(${product.category.name})`, 80, tableY + 12);
          }

          tableY += rowHeight;

          // Sayfa sonu kontrolü
          if (tableY > 700) {
            doc.addPage();
            tableY = 50;
          }
        });

        // Toplam bilgisi
        const totalY = tableY + 20;
        doc
          .moveTo(50, totalY)
          .lineTo(550, totalY)
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text(`Gesamt: ${orderList.orders.length} Produkt(e)`, 50, totalY + 10);

        // PDF'i sonlandır
        doc.end();
      } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        reject(error);
      }
    });
  }
}

export default new StockOrderListPDFService();

