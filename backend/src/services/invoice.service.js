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
                taxRate: true, // Vergi oranını al
                barcode: true, // Barkod bilgisi
              },
            },
          },
        },
        address: true,
        billingAddress: true,
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
            customerY + 16
          );

        // Fatura adresi varsa onu kullan, yoksa teslimat adresini kullan
        const invoiceAddress = order.billingAddress || order.address;
        if (invoiceAddress) {
          doc
            .text(`${invoiceAddress.street} ${invoiceAddress.houseNumber}`, 50, customerY + 28)
            .text(`${invoiceAddress.postalCode} ${invoiceAddress.city}`, 50, customerY + 40);
        }

        doc
          .text(order.user.email, 50, customerY + 52)
          .text(order.user.phone || '', 50, customerY + 64);

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
            orderInfoY + 16,
            { align: 'right' }
          )
          .text(
            `Status: ${this.getStatusText(order.status)}`,
            350,
            orderInfoY + 28,
            { align: 'right' }
          );

        const paymentText =
          order.paymentType === 'cash'
            ? 'Barzahlung'
            : order.paymentType === 'card_on_delivery'
            ? 'Kartenzahlung'
            : 'Keine';
        doc.text(`Zahlung: ${paymentText}`, 350, orderInfoY + 40, {
          align: 'right',
        });

        // Müşteri notu (varsa)
        if (order.note) {
          doc.text(`Notiz: ${order.note}`, 350, orderInfoY + 52, {
            align: 'right',
            width: 195,
          });
        }

        // === ÜRÜN TABLOSU ===
        const tableTop = 220; // Tabloyu daha yukarı aldık
        doc.strokeColor('#e5e7eb').lineWidth(1);

        // Tablo başlıkları
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Pos', 50, tableTop)
          .text('Produkt', 75, tableTop)
          .text('Menge', 260, tableTop, { width: 50, align: 'right' })
          .text('Preis (netto)', 320, tableTop, { width: 70, align: 'right' })
          .text('MWSt', 400, tableTop, { width: 70, align: 'right' })
          .text('Gesamt', 480, tableTop, { width: 65, align: 'right' });
        
        // Başlık altı çizgi
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(545, tableTop + 15)
          .stroke();

        // Ürünler
        let currentY = tableTop + 30;
        doc.fontSize(9).font('Helvetica').fillColor('#374151');

        // Tablo başlıklarını tekrar çizmek için fonksiyon
        const drawTableHeaders = (y) => {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('Pos', 50, y)
            .text('Produkt', 75, y)
            .text('Menge', 260, y, { width: 50, align: 'right' })
            .text('Preis (netto)', 320, y, { width: 70, align: 'right' })
            .text('MWSt', 400, y, { width: 70, align: 'right' })
            .text('Gesamt', 480, y, { width: 65, align: 'right' });
          
          // Başlık altı çizgi
          doc
            .strokeColor('#e5e7eb')
            .moveTo(50, y + 15)
            .lineTo(545, y + 15)
            .stroke();
        };

        // Vergi gruplarını toplamak için
        const taxGroups = {}; // { "19": { grossTotal: 0, netTotal: 0 }, "7": { grossTotal: 0, netTotal: 0 } }
        let totalNet = 0; // Toplam NET tutar
        let totalGross = 0; // Toplam BRÜT tutar

        order.orderItems.forEach((item, index) => {
          // Sayfa sonu kontrolü - yeni sayfada başlıkları tekrar çiz
          // Toplam hesaplamaları için yer bırakmak için 600'de kontrol ediyoruz
          if (currentY > 600) {
            doc.addPage();
            currentY = 50;
            drawTableHeaders(currentY);
            currentY = 65; // Başlık altından başla
          }

          let productName = item.variantName
            ? `${item.productName} - ${item.variantName}`
            : item.productName;
          
          // Barkod bilgisini ekle (varsa)
          // if (item.product?.barcode) {
          //   productName = `${productName} [${item.product.barcode}]`;
          // }

          // Vergi oranını al (product'tan)
          const taxRate = item.product?.taxRate ? parseFloat(item.product.taxRate) : null;
          
          // BRÜT fiyat (veritabanından gelen)
          const grossPrice = parseFloat(item.price);
          const grossTotal = Math.round(grossPrice * item.quantity * 100) / 100;
          
          // NET fiyat ve toplam hesapla
          let netPrice = grossPrice;
          let netTotal = grossTotal;
          
          if (taxRate && taxRate > 0) {
            // Brüt fiyattan NET'e çevir: NET = BRÜT / (1 + vergi/100)
            netPrice = grossPrice / (1 + taxRate / 100);
            netTotal = Math.round(netPrice * item.quantity * 100) / 100;
            
            // Vergi grubuna ekle
            const taxKey = taxRate.toFixed(0); // "19" veya "7" gibi
            if (!taxGroups[taxKey]) {
              taxGroups[taxKey] = { grossTotal: 0, netTotal: 0, rate: taxRate };
            }
            taxGroups[taxKey].grossTotal += grossTotal;
            taxGroups[taxKey].netTotal += netTotal;
          }
          
          totalNet += netTotal;
          totalGross += grossTotal;

          const rowStartY = currentY;

          // Sıra numarası
          doc.text(`${index + 1}.`, 50, currentY, { width: 25 });
          
          // Ürün ismini çok satırlı göster (maksimum 3 satır)
          const maxWidth = 180;
          const productNameHeight = doc.heightOfString(productName, {
            width: maxWidth,
            lineBreak: true,
          });
          const maxProductHeight = 9 * 3; // Maksimum 3 satır (font size 9 * 3)
          const actualProductHeight = Math.min(productNameHeight, maxProductHeight);
          
          doc.text(productName, 75, currentY, { 
            width: maxWidth, 
            lineBreak: true,
            ellipsis: true
          });
          
          // Diğer bilgileri ilk satırda göster
          doc.text(`${item.quantity}x`, 260, rowStartY, { width: 50, align: 'right' });
          // NET fiyatı göster
          doc.text(`€${netPrice.toFixed(2)}`, 320, rowStartY, {
            width: 70,
            align: 'right',
          });
          
          // KDV bilgisi (yüzde ve tutar)
          if (taxRate && taxRate > 0) {
            const itemTaxAmount = Math.round((netTotal * taxRate / 100) * 100) / 100;
            doc.text(`${taxRate.toFixed(0)}%: €${itemTaxAmount.toFixed(2)}`, 400, rowStartY, {
              width: 70,
              align: 'right',
            });
          } else {
            doc.text('-', 400, rowStartY, {
              width: 70,
              align: 'right',
            });
          }
          
          // NET toplamı göster
          doc.text(`€${netTotal.toFixed(2)}`, 480, rowStartY, {
            width: 65,
            align: 'right',
          });

          // Satır yüksekliğini dinamik olarak ayarla (minimum 18px, ürün ismi yüksekliği + 5px padding)
          const rowHeight = Math.max(18, actualProductHeight + 5);
          currentY += rowHeight;
        });

        // Alt çizgi
        currentY += 5;
        doc
          .strokeColor('#e5e7eb')
          .moveTo(50, currentY)
          .lineTo(545, currentY)
          .stroke();

        // === TOPLAM HESAPLAMALAR ===
        // Toplam hesaplamaları için gereken minimum yüksekliği hesapla
        // Zwischensumme: 20px + Liefergebühr (varsa): 20px + Rabatt (varsa): 20px
        // + Mehrwertsteuer (her biri 20px) + çizgi (8px) + Gesamt (24px) = ~150px
        const hasDeliveryFee = parseFloat(order.deliveryFee) > 0;
        const hasDiscount = order.discount && parseFloat(order.discount) > 0;
        const taxKeysCount = Object.keys(taxGroups).length;
        const totalSummaryHeight = 20 + (hasDeliveryFee ? 20 : 0) + (hasDiscount ? 20 : 0) + 
                                   (taxKeysCount > 0 ? 15 + (taxKeysCount * 20) : 0) + 8 + 12 + 12;
        
        // Eğer toplam hesaplamaları için yeterli yer yoksa yeni sayfaya geç
        if (currentY + totalSummaryHeight > 700) {
          doc.addPage();
          currentY = 50;
        } else {
          currentY += 20;
        }
        doc.fontSize(10).font('Helvetica').fillColor('#374151');

        // NET Ara toplam (ürünlerin NET toplamı - KDV hariç)
        const subtotalNet = Math.round(totalNet * 100) / 100;
        doc.text('Zwischensumme (netto):', 350, currentY, { width: 100, align: 'right' });
        doc.text(`€${subtotalNet.toFixed(2)}`, 460, currentY, {
          width: 85,
          align: 'right',
        });
        currentY += 20;
        
        // Sayfa sonu kontrolü - her satırdan sonra kontrol et
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        // Kargo ücreti (vergi dahil değil, direkt göster)
        if (parseFloat(order.deliveryFee) > 0) {
          currentY += 10; // Üstten margin
          // Sayfa sonu kontrolü
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
          doc.text('Liefergebühr:', 350, currentY, { width: 100, align: 'right' });
          doc.text(`€${parseFloat(order.deliveryFee).toFixed(2)}`, 460, currentY, {
            width: 85,
            align: 'right',
          });
          currentY += 20;
        }

        // İndirim
        if (order.discount && parseFloat(order.discount) > 0) {
          // Sayfa sonu kontrolü
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
          doc.fillColor('#059669');
          doc.text('Rabatt:', 350, currentY, { width: 100, align: 'right' });
          doc.text(`-€${parseFloat(order.discount).toFixed(2)}`, 460, currentY, {
            width: 85,
            align: 'right',
          });
          currentY += 20;
          doc.fillColor('#374151');
        }

        // Vergi detayları (özet) - NET toplam üzerinden hesaplanan KDV
        const taxKeys = Object.keys(taxGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
        if (taxKeys.length > 0) {
          currentY += 15; // Üstten margin artırıldı
          // Sayfa sonu kontrolü
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#374151');
          
          // Başlık ve değerleri aynı satırda göster
          taxKeys.forEach((taxKey, index) => {
            // Her vergi satırı için sayfa sonu kontrolü
            if (currentY > 700) {
              doc.addPage();
              currentY = 50;
            }
            const taxGroup = taxGroups[taxKey];
            // KDV = NET toplam * (KDV oranı / 100)
            const taxAmount = Math.round((taxGroup.netTotal * taxGroup.rate / 100) * 100) / 100;
            // Vergi oranı ve tutarı tek satırda göster
            const taxText = `${taxGroup.rate.toFixed(0)}%: €${taxAmount.toFixed(2)}`;
            
            if (index === 0) {
              // İlk satırda başlık ve değer yan yana
              doc.text('Mehrwertsteuer:', 350, currentY, { width: 100, align: 'right' });
              doc.text(taxText, 460, currentY, { width: 85, align: 'right' });
            } else {
              // Sonraki satırlarda sadece değer
              doc.text(taxText, 460, currentY, { width: 85, align: 'right' });
            }
            currentY += 20;
          });
        }

        // Toplam çizgi
        currentY += 8;
        
        // "Gesamt (brutto):" ve fiyatının aynı sayfada kalması için kontrol
        if (currentY + 30 > 700) {
          doc.addPage();
          currentY = 50;
        }
        
        doc
          .strokeColor('#111827')
          .lineWidth(1.5)
          .moveTo(350, currentY)
          .lineTo(545, currentY)
          .stroke();

        currentY += 12;

        // TOPLAM (Brüt - vergi dahil) - aynı satırda yaz
        const totalY = currentY;
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Gesamt (brutto):', 350, totalY, { width: 100, align: 'right' });
        doc
          .fillColor('#059669')
          .text(`€${parseFloat(order.total).toFixed(2)}`, 460, totalY, {
            width: 85,
            align: 'right',
          });

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

        // Firma bilgileri (adres, telefon, email)
        let footerInfoY = footerY + 12;
        if (companyInfo.address || companyInfo.phone || companyInfo.email) {
          const footerInfo = [
            companyInfo.address || '',
            companyInfo.phone ? `Tel: ${companyInfo.phone}` : '',
            companyInfo.email ? `E-Mail: ${companyInfo.email}` : '',
          ]
            .filter(Boolean)
            .join(' | ');
          
          doc
            .fontSize(7)
            .text(footerInfo, 50, footerInfoY, { align: 'center', width: 495 });
          footerInfoY += 12;
        }

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
              footerInfoY,
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

        // Müşteri notu (varsa)
        if (order.note) {
          doc.text(`Notiz: ${order.note}`, 50, orderInfoY + 60, { width: 495 });
        }

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

        // Tablo başlıklarını tekrar çizmek için fonksiyon
        const drawDeliveryTableHeaders = (y) => {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('Produkt', 50, y)
            .text('Menge', 280, y, { width: 60, align: 'right' })
            .text('Preis', 360, y, { width: 80, align: 'right' })
            .text('Gesamt', 460, y, { width: 90, align: 'right' });
          
          // Başlık altı çizgi
          doc
            .strokeColor('#e5e7eb')
            .moveTo(50, y + 15)
            .lineTo(545, y + 15)
            .stroke();
        };

        order.orderItems.forEach((item, index) => {
          // Sayfa sonu kontrolü - yeni sayfada başlıkları tekrar çiz
          if (currentY > 680) {
            doc.addPage();
            currentY = 50;
            drawDeliveryTableHeaders(currentY);
            currentY = 65; // Başlık altından başla
          }

          const productName = item.variantName
            ? `${item.productName} - ${item.variantName}`
            : item.productName;

          const itemTotal = parseFloat(item.price) * item.quantity;

          const rowStartY = currentY;

          // Sıra numarası
          doc.text(`${index + 1}.`, 50, currentY, { width: 25 });
          
          // Ürün ismini çok satırlı göster (maksimum 3 satır)
          const maxWidth = 195;
          const productNameHeight = doc.heightOfString(productName, {
            width: maxWidth,
            lineBreak: true,
          });
          const maxProductHeight = 9 * 3; // Maksimum 3 satır (font size 9 * 3)
          const actualProductHeight = Math.min(productNameHeight, maxProductHeight);
          
          doc.text(productName, 75, currentY, { 
            width: maxWidth, 
            lineBreak: true,
            ellipsis: true
          });
          
          // Diğer bilgileri ilk satırda göster
          doc.text(`${item.quantity}x`, 280, rowStartY, { width: 60, align: 'right' });
          doc.text(`€${parseFloat(item.price).toFixed(2)}`, 360, rowStartY, {
            width: 80,
            align: 'right',
          });
          doc.text(`€${itemTotal.toFixed(2)}`, 460, rowStartY, {
            width: 90,
            align: 'right',
          });

          // Satır yüksekliğini dinamik olarak ayarla (minimum 18px, ürün ismi yüksekliği + 5px padding)
          const rowHeight = Math.max(18, actualProductHeight + 5);
          currentY += rowHeight;
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

        // Firma bilgileri (adres, telefon, email)
        let footerInfoY = footerY + 12;
        if (companyInfo.address || companyInfo.phone || companyInfo.email) {
          const footerInfo = [
            companyInfo.address || '',
            companyInfo.phone ? `Tel: ${companyInfo.phone}` : '',
            companyInfo.email ? `E-Mail: ${companyInfo.email}` : '',
          ]
            .filter(Boolean)
            .join(' | ');
          
          doc
            .fontSize(7)
            .text(footerInfo, 50, footerInfoY, { align: 'center', width: 495 });
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
