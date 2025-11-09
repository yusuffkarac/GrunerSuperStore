import PDFDocument from 'pdfkit';
import prisma from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';

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
    const companyInfo = settings?.companyInfo || {};

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
        // Logo/Şirket adı
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#059669')
          .text(companyInfo.name || 'Gruner SuperStore', 50, 50);

        // Şirket bilgileri
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(companyInfo.address || '', 50, 80, { width: 200 })
          .text(companyInfo.phone || '', 50, 95)
          .text(companyInfo.email || '', 50, 107);

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

        for (const item of order.orderItems) {
          const productName = item.variantName
            ? `${item.productName} - ${item.variantName}`
            : item.productName;

          const itemTotal = parseFloat(item.price) * item.quantity;

          // Uzun ürün isimlerini kes
          const maxWidth = 220;
          doc.text(productName, 50, currentY, { width: maxWidth, lineBreak: false, ellipsis: true });
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
        }

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
    const companyInfo = settings?.companyInfo || {};

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
        // Logo/Şirket adı
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .fillColor('#059669')
          .text(companyInfo.name || 'Gruner SuperStore', 50, 50, { align: 'center', width: 495 });

        // Lieferschein başlığı
        doc
          .fontSize(32)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('LIEFERSCHEIN', 50, 90, { align: 'center', width: 495 });

        // === SIPARIŞ NUMARASI (BÜYÜK) ===
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#059669')
          .text(`Bestellnummer: #${order.orderNo}`, 50, 130, { align: 'center', width: 495 });

        // Tarih
        const orderDate = new Date(order.createdAt).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(`Datum: ${orderDate}`, 50, 160, { align: 'center', width: 495 });

        // === MÜŞTERI BİLGİLERİ (BÜYÜK VE NET) ===
        let currentY = 200;
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('KUNDE:', 50, currentY);

        currentY += 25;
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text(`${order.user.firstName} ${order.user.lastName}`, 50, currentY);

        currentY += 20;
        if (order.user.phone) {
          doc
            .fontSize(13)
            .font('Helvetica')
            .fillColor('#111827')
            .text(`Telefon: ${order.user.phone}`, 50, currentY);
          currentY += 20;
        }

        // === ADRES BİLGİLERİ (TESLİMAT İÇİN) ===
        if (order.type === 'delivery' && order.address) {
          currentY += 10;
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('LIEFERADRESSE:', 50, currentY);

          currentY += 25;
          doc
            .fontSize(13)
            .font('Helvetica-Bold')
            .fillColor('#374151');

          if (order.address.title) {
            doc.text(order.address.title, 50, currentY);
            currentY += 18;
          }

          doc.text(`${order.address.street} ${order.address.houseNumber}`, 50, currentY);
          currentY += 18;

          if (order.address.addressLine2) {
            doc.text(order.address.addressLine2, 50, currentY);
            currentY += 18;
          }

          doc.text(`${order.address.postalCode} ${order.address.city}`, 50, currentY);
          currentY += 18;

          if (order.address.state) {
            doc.text(order.address.state, 50, currentY);
            currentY += 18;
          }
        } else if (order.type === 'pickup') {
          currentY += 10;
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('ABHOLUNG:', 50, currentY);

          currentY += 25;
          doc
            .fontSize(13)
            .font('Helvetica')
            .fillColor('#374151')
            .text('Selbstabholung im Geschäft', 50, currentY);
          currentY += 18;

          if (companyInfo.address) {
            doc.text(companyInfo.address, 50, currentY);
            currentY += 18;
          }
        }

        // === ÖDEME BİLGİSİ ===
        currentY += 20;
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('ZAHLUNG:', 50, currentY);

        currentY += 25;
        const paymentText =
          order.paymentType === 'cash'
            ? 'Barzahlung bei Lieferung'
            : order.paymentType === 'card_on_delivery'
            ? 'Kartenzahlung bei Lieferung'
            : 'Keine Zahlung';
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#059669')
          .text(paymentText, 50, currentY);

        // === ÜRÜN LİSTESİ ===
        currentY += 40;
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('ARTIKEL:', 50, currentY);

        currentY += 25;
        doc.strokeColor('#e5e7eb').lineWidth(1);

        // Ürünler
        doc.fontSize(12).font('Helvetica').fillColor('#374151');

        for (const item of order.orderItems) {
          const productName = item.variantName
            ? `${item.productName} - ${item.variantName}`
            : item.productName;

          // Ürün adı ve miktar (büyük ve net)
          doc
            .fontSize(13)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text(`${item.quantity}x ${productName}`, 50, currentY, { width: 400 });

          currentY += 20;

          // Sayfa sonu kontrolü
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
        }

        // === TOPLAM ===
        currentY += 20;
        doc
          .strokeColor('#111827')
          .lineWidth(2)
          .moveTo(50, currentY)
          .lineTo(545, currentY)
          .stroke();

        currentY += 15;
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('GESAMT:', 50, currentY);

        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#059669')
          .text(`€${parseFloat(order.total).toFixed(2)}`, 400, currentY, { width: 145, align: 'right' });

        // === NOTLAR ===
        if (order.note) {
          currentY += 40;
          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('HINWEISE:', 50, currentY);

          currentY += 20;
          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#374151')
            .text(order.note, 50, currentY, { width: 495 });
        }

        // === FOOTER ===
        const footerY = 750;
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#9ca3af')
          .text(
            companyInfo.phone ? `Kontakt: ${companyInfo.phone}` : '',
            50,
            footerY,
            { align: 'center', width: 495 }
          );

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
