import PDFDocument from 'pdfkit';
import prisma from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Invoice Service
 * Sipariş faturası PDF oluşturma
 */
class InvoiceService {
  /**
   * Sipariş için fatura PDF oluştur
   * @param {string} orderId - Sipariş ID
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateInvoicePDF(orderId) {
    // Sipariş bilgilerini getir
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                unit: true,
              },
            },
          },
        },
        address: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    // Settings'ten şirket bilgilerini al
    const settings = await prisma.settings.findFirst();
    const storeSettings = settings?.storeSettings || {};
    const companyInfo = storeSettings?.companyInfo || {};
    
    // Logo path'ini al
    let logoPath = null;
    if (storeSettings?.logo) {
      // Logo path'i /uploads/... formatında olabilir veya tam path olabilir
      const logoUrl = storeSettings.logo;
      if (logoUrl.startsWith('/uploads/')) {
        // /uploads/general/filename.png -> backend/uploads/general/filename.png
        logoPath = path.join(__dirname, '../../', logoUrl.substring(1)); // /uploads -> uploads
      } else if (!logoUrl.startsWith('http')) {
        // Sadece dosya adı varsa general klasöründe ara
        logoPath = path.join(__dirname, '../../uploads/general', path.basename(logoUrl));
      }
      
      // Logo dosyasının varlığını kontrol et
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
            // Logo sağında şirket adı
            doc
              .fontSize(24)
              .font('Helvetica-Bold')
              .fillColor('#059669')
              .text(companyInfo.name || 'Gruner SuperStore', 100, headerY + 8);
            headerY = 100;
          } catch (error) {
            console.error('Logo yüklenirken hata:', error);
            // Logo yüklenemezse şirket adını göster
            doc
              .fontSize(24)
              .font('Helvetica-Bold')
              .fillColor('#059669')
              .text(companyInfo.name || 'Gruner SuperStore', 50, headerY);
            headerY = 80;
          }
        } else {
          // Logo yoksa şirket adını göster
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

        // RECHNUNG başlığı
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('RECHNUNG', 350, 50, { align: 'right' });

        // Fatura numarası ve tarih
        const invoiceDate = new Date(order.createdAt).toLocaleDateString('de-DE');
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(`Rechnungsnr.: ${order.orderNo}`, 350, 90, { align: 'right' })
          .text(`Datum: ${invoiceDate}`, 350, 105, { align: 'right' });

        // === MÜŞTERI BİLGİLERİ ===
        const customerY = 140;
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Rechnungsadresse:', 50, customerY);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#374151')
          .text(
            `${order.user.firstName} ${order.user.lastName}`,
            50,
            customerY + 18
          );

        if (order.address) {
          doc
            .text(`${order.address.street} ${order.address.houseNumber}`, 50, customerY + 32)
            .text(`${order.address.postalCode} ${order.address.city}`, 50, customerY + 46);
        }

        doc
          .text(order.user.email, 50, customerY + 60)
          .text(order.user.phone || '', 50, customerY + 74);

        // === SIPARIŞ BİLGİLERİ ===
        const orderInfoY = customerY;
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Bestellinformationen:', 350, orderInfoY, { align: 'right' });

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#374151')
          .text(
            `Typ: ${order.type === 'delivery' ? 'Lieferung' : 'Abholung'}`,
            350,
            orderInfoY + 18,
            { align: 'right' }
          )
          .text(
            `Status: ${this.getStatusText(order.status)}`,
            350,
            orderInfoY + 32,
            { align: 'right' }
          );

        const paymentText =
          order.paymentType === 'cash'
            ? 'Barzahlung'
            : order.paymentType === 'card_on_delivery'
            ? 'Kartenzahlung'
            : 'Keine';
        doc.text(`Zahlung: ${paymentText}`, 350, orderInfoY + 46, {
          align: 'right',
        });

        // === ÜRÜN TABLOSU ===
        const tableTop = 280;
        doc.strokeColor('#e5e7eb').lineWidth(1);

        // Tablo başlıkları
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Produkt', 50, tableTop)
          .text('Menge', 280, tableTop, { width: 60, align: 'right' })
          .text('Preis', 360, tableTop, { width: 80, align: 'right' })
          .text('Gesamt', 460, tableTop, { width: 90, align: 'right' });

        // Başlık altı çizgi
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(545, tableTop + 15)
          .stroke();

        // Ürünler
        let currentY = tableTop + 25;
        doc.fontSize(9).font('Helvetica').fillColor('#374151');

        order.orderItems.forEach((item, index) => {
          const productName = item.variantName
            ? `${item.productName} - ${item.variantName}`
            : item.productName;

          const itemTotal = parseFloat(item.price) * item.quantity;

          // Sıra numarası
          doc.text(`${index + 1}.`, 50, currentY, { width: 25 });
          
          // Uzun ürün isimlerini kes
          const maxWidth = 195;
          doc.text(productName, 75, currentY, { width: maxWidth, lineBreak: false, ellipsis: true });
          doc.text(`${item.quantity}x`, 280, currentY, { width: 60, align: 'right' });
          doc.text(`€${parseFloat(item.price).toFixed(2)}`, 360, currentY, {
            width: 80,
            align: 'right',
          });
          doc.text(`€${itemTotal.toFixed(2)}`, 460, currentY, {
            width: 90,
            align: 'right',
          });

          currentY += 20;

          // Sayfa sonu kontrolü
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
        });

        // Alt çizgi
        currentY += 5;
        doc
          .strokeColor('#e5e7eb')
          .moveTo(50, currentY)
          .lineTo(545, currentY)
          .stroke();

        // === TOPLAM HESAPLAMALAR ===
        currentY += 15;
        doc.fontSize(10).font('Helvetica').fillColor('#374151');

        // Ara toplam
        doc.text('Zwischensumme:', 360, currentY, { width: 100, align: 'right' });
        doc.text(`€${parseFloat(order.subtotal).toFixed(2)}`, 460, currentY, {
          width: 90,
          align: 'right',
        });
        currentY += 18;

        // Kargo ücreti
        if (parseFloat(order.deliveryFee) > 0) {
          doc.text('Liefergebühr:', 360, currentY, { width: 100, align: 'right' });
          doc.text(`€${parseFloat(order.deliveryFee).toFixed(2)}`, 460, currentY, {
            width: 90,
            align: 'right',
          });
          currentY += 18;
        }

        // İndirim
        if (order.discount && parseFloat(order.discount) > 0) {
          doc.fillColor('#059669');
          doc.text('Rabatt:', 360, currentY, { width: 100, align: 'right' });
          doc.text(`-€${parseFloat(order.discount).toFixed(2)}`, 460, currentY, {
            width: 90,
            align: 'right',
          });
          currentY += 18;
        }

        // Toplam çizgi
        doc
          .strokeColor('#111827')
          .lineWidth(1.5)
          .moveTo(360, currentY)
          .lineTo(545, currentY)
          .stroke();

        currentY += 10;

        // TOPLAM
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Gesamt:', 360, currentY, { width: 100, align: 'right' });
        doc
          .fillColor('#059669')
          .text(`€${parseFloat(order.total).toFixed(2)}`, 460, currentY, {
            width: 90,
            align: 'right',
          });

        // === NOTLAR ===
        if (order.note) {
          currentY += 40;
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('Notizen:', 50, currentY);

          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#374151')
            .text(order.note, 50, currentY + 15, { width: 495 });
        }

        // === FOOTER ===
        const footerY = 750;
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#9ca3af')
          .text(
            'Vielen Dank für Ihren Einkauf bei Gruner SuperStore!',
            50,
            footerY,
            { align: 'center', width: 495 }
          );

        if (companyInfo.taxNumber || companyInfo.registrationNumber) {
          doc
            .fontSize(7)
            .text(
              `${companyInfo.taxNumber ? 'USt-IdNr: ' + companyInfo.taxNumber : ''} ${
                companyInfo.registrationNumber
                  ? 'HRB: ' + companyInfo.registrationNumber
                  : ''
              }`,
              50,
              footerY + 12,
              { align: 'center', width: 495 }
            );
        }

        // PDF'i sonlandır
        doc.end();
      } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        reject(error);
      }
    });
  }

  /**
   * Kurye için teslimat slip PDF oluştur
   * @param {string} orderId - Sipariş ID
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateDeliverySlipPDF(orderId) {
    // Sipariş bilgilerini getir
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                unit: true,
              },
            },
          },
        },
        address: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    // Settings'ten şirket bilgilerini al
    const settings = await prisma.settings.findFirst();
    const storeSettings = settings?.storeSettings || {};
    const companyInfo = storeSettings?.companyInfo || {};
    
    // Logo path'ini al
    let logoPath = null;
    if (storeSettings?.logo) {
      // Logo path'i /uploads/... formatında olabilir veya tam path olabilir
      const logoUrl = storeSettings.logo;
      if (logoUrl.startsWith('/uploads/')) {
        // /uploads/general/filename.png -> backend/uploads/general/filename.png
        logoPath = path.join(__dirname, '../../', logoUrl.substring(1)); // /uploads -> uploads
      } else if (!logoUrl.startsWith('http')) {
        // Sadece dosya adı varsa general klasöründe ara
        logoPath = path.join(__dirname, '../../uploads/general', path.basename(logoUrl));
      }
      
      // Logo dosyasının varlığını kontrol et
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
            // Logo sağında şirket adı
            doc
              .fontSize(24)
              .font('Helvetica-Bold')
              .fillColor('#059669')
              .text(companyInfo.name || 'Gruner SuperStore', 100, headerY + 8);
            headerY = 100;
          } catch (error) {
            console.error('Logo yüklenirken hata:', error);
            // Logo yüklenemezse şirket adını göster
            doc
              .fontSize(24)
              .font('Helvetica-Bold')
              .fillColor('#059669')
              .text(companyInfo.name || 'Gruner SuperStore', 50, headerY);
            headerY = 80;
          }
        } else {
          // Logo yoksa şirket adını göster
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

        // LIEFERSCHEIN başlığı (sağ üstte)
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('LIEFERSCHEIN', 350, 50, { align: 'right', width: 195 });

        // Sipariş numarası ve tarih (sağ üstte)
        const orderDate = new Date(order.createdAt).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(`Bestellnr.: ${order.orderNo}`, 350, 90, { align: 'right' })
          .text(`Datum: ${orderDate}`, 350, 105, { align: 'right' });

        // === MÜŞTERI BİLGİLERİ ===
        const customerY = 140;
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('KUNDE:', 50, customerY);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#374151')
          .text(`${order.user.firstName} ${order.user.lastName}`, 50, customerY + 18);

        let customerInfoY = customerY + 32;
        if (order.user.phone) {
          doc.text(`Telefon: ${order.user.phone}`, 50, customerInfoY);
          customerInfoY += 14;
        }
        if (order.user.email) {
          doc.text(`E-Mail: ${order.user.email}`, 50, customerInfoY);
          customerInfoY += 14;
        }

        // === ADRES BİLGİLERİ ===
        const addressY = customerY;
        if (order.type === 'delivery' && order.address) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('LIEFERADRESSE:', 350, addressY, { align: 'right' });

          let addressInfoY = addressY + 18;
          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#374151');

          if (order.address.title) {
            doc.text(order.address.title, 350, addressInfoY, { align: 'right' });
            addressInfoY += 14;
          }

          doc.text(`${order.address.street} ${order.address.houseNumber}`, 350, addressInfoY, { align: 'right' });
          addressInfoY += 14;

          if (order.address.addressLine2) {
            doc.text(order.address.addressLine2, 350, addressInfoY, { align: 'right' });
            addressInfoY += 14;
          }

          doc.text(`${order.address.postalCode} ${order.address.city}`, 350, addressInfoY, { align: 'right' });
          addressInfoY += 14;

          if (order.address.state) {
            doc.text(order.address.state, 350, addressInfoY, { align: 'right' });
          }
        } else if (order.type === 'pickup') {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('ABHOLUNG:', 350, addressY, { align: 'right' });

          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#374151')
            .text('Selbstabholung im Geschäft', 350, addressY + 18, { align: 'right' });

          if (companyInfo.address) {
            doc.text(companyInfo.address, 350, addressY + 32, { align: 'right', width: 200 });
          }
        }

        // === SIPARIŞ BİLGİLERİ ===
        const orderInfoY = customerY + 80;
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('BESTELLINFORMATIONEN:', 50, orderInfoY);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#374151')
          .text(`Typ: ${order.type === 'delivery' ? 'Lieferung' : 'Abholung'}`, 50, orderInfoY + 18)
          .text(`Status: ${this.getStatusText(order.status)}`, 50, orderInfoY + 32);

        const paymentText =
          order.paymentType === 'cash'
            ? 'Barzahlung bei Lieferung'
            : order.paymentType === 'card_on_delivery'
            ? 'Kartenzahlung bei Lieferung'
            : 'Keine Zahlung';
        doc.text(`Zahlung: ${paymentText}`, 50, orderInfoY + 46);

        // === ÜRÜN TABLOSU ===
        const tableTop = orderInfoY + 80;
        doc.strokeColor('#e5e7eb').lineWidth(1);

        // Tablo başlıkları
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Produkt', 50, tableTop)
          .text('Menge', 280, tableTop, { width: 60, align: 'right' })
          .text('Preis', 360, tableTop, { width: 80, align: 'right' })
          .text('Gesamt', 460, tableTop, { width: 90, align: 'right' });

        // Başlık altı çizgi
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(545, tableTop + 15)
          .stroke();

        // Ürünler
        let currentY = tableTop + 25;
        doc.fontSize(9).font('Helvetica').fillColor('#374151');

        order.orderItems.forEach((item, index) => {
          const productName = item.variantName
            ? `${item.productName} - ${item.variantName}`
            : item.productName;

          const itemTotal = parseFloat(item.price) * item.quantity;

          // Sıra numarası
          doc.text(`${index + 1}.`, 50, currentY, { width: 25 });
          
          // Uzun ürün isimlerini kes
          const maxWidth = 195;
          doc.text(productName, 75, currentY, { width: maxWidth, lineBreak: false, ellipsis: true });
          doc.text(`${item.quantity}x`, 280, currentY, { width: 60, align: 'right' });
          doc.text(`€${parseFloat(item.price).toFixed(2)}`, 360, currentY, {
            width: 80,
            align: 'right',
          });
          doc.text(`€${itemTotal.toFixed(2)}`, 460, currentY, {
            width: 90,
            align: 'right',
          });

          currentY += 20;

          // Sayfa sonu kontrolü
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
        });

        // Alt çizgi
        currentY += 5;
        doc
          .strokeColor('#e5e7eb')
          .moveTo(50, currentY)
          .lineTo(545, currentY)
          .stroke();

        // === TOPLAM HESAPLAMALAR ===
        currentY += 15;
        doc.fontSize(10).font('Helvetica').fillColor('#374151');

        // Ara toplam
        doc.text('Zwischensumme:', 360, currentY, { width: 100, align: 'right' });
        doc.text(`€${parseFloat(order.subtotal).toFixed(2)}`, 460, currentY, {
          width: 90,
          align: 'right',
        });
        currentY += 18;

        // Kargo ücreti
        if (parseFloat(order.deliveryFee) > 0) {
          doc.text('Liefergebühr:', 360, currentY, { width: 100, align: 'right' });
          doc.text(`€${parseFloat(order.deliveryFee).toFixed(2)}`, 460, currentY, {
            width: 90,
            align: 'right',
          });
          currentY += 18;
        }

        // İndirim
        if (order.discount && parseFloat(order.discount) > 0) {
          doc.fillColor('#059669');
          doc.text('Rabatt:', 360, currentY, { width: 100, align: 'right' });
          doc.text(`-€${parseFloat(order.discount).toFixed(2)}`, 460, currentY, {
            width: 90,
            align: 'right',
          });
          currentY += 18;
        }

        // Toplam çizgi
        doc
          .strokeColor('#111827')
          .lineWidth(1.5)
          .moveTo(360, currentY)
          .lineTo(545, currentY)
          .stroke();

        currentY += 10;

        // TOPLAM
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('GESAMT:', 360, currentY, { width: 100, align: 'right' });
        doc
          .fillColor('#059669')
          .text(`€${parseFloat(order.total).toFixed(2)}`, 460, currentY, {
            width: 90,
            align: 'right',
          });

        // === MÜŞTERİ NOTU (KURYE İÇİN ÖNEMLİ) ===
        if (order.note) {
          currentY += 40;
          // Vurgulu kutu içinde göster
          doc
            .rect(50, currentY, 495, 60)
            .fillColor('#fef3c7')
            .fill()
            .fillColor('#111827');

          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#92400e')
            .text('KUNDENNOTIZ ', 60, currentY + 10);

          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#78350f')
            .text(order.note, 60, currentY + 28, { width: 475 });
          
          currentY += 70;
        }

        // === FOOTER ===
        const footerY = 750;
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#9ca3af')
          .text(
            'Vielen Dank für Ihre Bestellung!',
            50,
            footerY,
            { align: 'center', width: 495 }
          );

        if (companyInfo.phone || companyInfo.email) {
          const contactInfo = [
            companyInfo.phone ? `Tel: ${companyInfo.phone}` : '',
            companyInfo.email ? `E-Mail: ${companyInfo.email}` : '',
          ]
            .filter(Boolean)
            .join(' | ');
          
          doc
            .fontSize(7)
            .text(contactInfo, 50, footerY + 12, { align: 'center', width: 495 });
        }

        // PDF'i sonlandır
        doc.end();
      } catch (error) {
        console.error('Lieferschein PDF oluşturma hatası:', error);
        reject(error);
      }
    });
  }

  /**
   * Sipariş durumu text'i
   */
  getStatusText(status) {
    const statusMap = {
      pending: 'Ausstehend',
      accepted: 'Akzeptiert',
      preparing: 'Vorbereitung',
      shipped: 'Versendet',
      delivered: 'Geliefert',
      cancelled: 'Storniert',
    };
    return statusMap[status] || status;
  }
}

export default new InvoiceService();
