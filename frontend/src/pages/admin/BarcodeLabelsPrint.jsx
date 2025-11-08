import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import barcodeLabelService from '../../services/barcodeLabelService';
import settingsService from '../../services/settingsService';
import Loading from '../../components/common/Loading';

function BarcodeLabelsPrint() {
  const [searchParams] = useSearchParams();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [labelSettings, setLabelSettings] = useState({
    labelHeaderFontSize: 16,
    labelPriceFontSize: 46,
    labelPriceCurrencyFontSize: 24,
    labelSkuFontSize: 11,
  });
  const barcodeRefs = useRef([]);

  useEffect(() => {
    loadLabels();
    loadLabelSettings();
  }, []);

  // Etiket ayarlarını yükle
  const loadLabelSettings = async () => {
    try {
      const response = await settingsService.getSettings();
      if (response.data?.settings?.barcodeLabelSettings) {
        setLabelSettings(response.data.settings.barcodeLabelSettings);
      }
    } catch (error) {
      console.error('Etiket ayarları yükleme hatası:', error);
    }
  };

  useEffect(() => {
    if (labels.length > 0 && labelSettings.labelHeaderFontSize) {
      // JsBarcode kütüphanesini yükle ve barkodları oluştur
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
      script.onload = () => {
        generateBarcodes();
        // Barkodlar oluşturulduktan sonra otomatik yazdırmayı kaldırdık
        // Kullanıcı manuel olarak yazdırabilir
      };
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [labels, labelSettings]);

  const generateBarcodes = () => {
    if (window.JsBarcode) {
      labels.forEach((label, index) => {
        const canvas = barcodeRefs.current[index];
        if (canvas && label.barcode) {
          try {
            // Barkod formatını otomatik algıla
            const barcodeValue = label.barcode.toString();
            let format = 'CODE128';
            let options = {
              width: 2,
              height: 50,
              displayValue: true,
              fontSize: 12,
              margin: 0,
              marginTop: 5,
              marginBottom: 5
            };
            
            // EAN13 için 13 haneli sayı kontrolü
            if (/^\d{13}$/.test(barcodeValue)) {
              format = 'EAN13';
              // EAN-13 için özel ayarlar (fotoğraftaki gibi)
              options = {
                format: 'EAN13',
                width: 2.5,           // Daha kalın çizgiler
                height: 60,            // Daha yüksek barkod
                displayValue: true,    // Altında sayıları göster
                fontSize: 14,          // Daha büyük font
                font: 'monospace',     // Monospace font (daha okunabilir)
                textAlign: 'center',   // Ortalanmış metin
                textPosition: 'bottom', // Altında göster
                textMargin: 2,         // Metin ile barkod arası boşluk
                margin: 0,
                marginTop: 5,
                marginBottom: 5,
                background: '#ffffff',  // Beyaz arka plan
                lineColor: '#000000'    // Siyah çizgiler
              };
            } 
            // EAN8 için 8 haneli sayı kontrolü
            else if (/^\d{8}$/.test(barcodeValue)) {
              format = 'EAN8';
              options = {
                format: 'EAN8',
                width: 2.5,
                height: 60,
                displayValue: true,
                fontSize: 14,
                font: 'monospace',
                textAlign: 'center',
                textPosition: 'bottom',
                textMargin: 2,
                margin: 0,
                marginTop: 5,
                marginBottom: 5,
                background: '#ffffff',
                lineColor: '#000000'
              };
            } else {
              // CODE128 için varsayılan ayarlar
              options = {
                format: 'CODE128',
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 12,
                margin: 0,
                marginTop: 5,
                marginBottom: 5
              };
            }

            window.JsBarcode(canvas, barcodeValue, options);
          } catch (error) {
            console.error('Barkod oluşturma hatası:', error);
            // Hata durumunda CODE128 ile tekrar dene
            try {
              window.JsBarcode(canvas, label.barcode.toString(), {
                format: 'CODE128',
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 12,
                margin: 0
              });
            } catch (e) {
              console.error('CODE128 ile de başarısız:', e);
            }
          }
        }
      });
    }
  };

  // Dosya adı oluştur
  const generateFileName = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const countStr = `${labels.length}-Stück`;
    return `Barcode-Etiketten_${dateStr}_${timeStr}_${countStr}`;
  };

  // Yazdırma için dosya adını ayarla
  const handlePrint = () => {
    const fileName = generateFileName();
    document.title = fileName;
    window.print();
    // Yazdırma sonrası title'ı geri al (isteğe bağlı)
    setTimeout(() => {
      document.title = 'Barcode-Etiketten drucken';
    }, 1000);
  };

  // PDF olarak indir
  const handleDownloadPDF = async () => {
    try {
      // Barkodların oluşturulmasını bekle
      if (!window.JsBarcode) {
        alert('Barcodes sind noch nicht bereit. Bitte warten Sie einige Sekunden.');
        return;
      }

      // html2pdf kütüphanesini dinamik olarak yükle
      if (!window.html2pdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => {
          setTimeout(() => downloadPDF(), 500); // Barkodların render olması için bekle
        };
        document.body.appendChild(script);
      } else {
        setTimeout(() => downloadPDF(), 500);
      }
    } catch (error) {
      console.error('PDF indirme hatası:', error);
      alert('PDF-Download fehlgeschlagen. Bitte verwenden Sie die Druckfunktion.');
    }
  };

  const downloadPDF = () => {
    const fileName = generateFileName();
    const element = document.querySelector('.print-container');
    const opt = {
      margin: [10, 10],
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(element).save();
  };

  const loadLabels = async () => {
    try {
      const idsParam = searchParams.get('ids');
      if (!idsParam) {
        console.error('No IDs provided');
        setLoading(false);
        return;
      }

      const ids = idsParam.split(',');
      const response = await barcodeLabelService.getBarcodeLabelsByIds(ids);
      const loadedLabels = response.data.labels || [];
      setLabels(loadedLabels);
      
      // Sayfa yüklendiğinde dosya adını ayarla
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const countStr = `${loadedLabels.length}-Stück`;
      const fileName = `Barcode-Etiketten_${dateStr}_${timeStr}_${countStr}`;
      document.title = fileName;
    } catch (error) {
      console.error('Etiket yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  // Dinamik CSS oluştur
  const dynamicStyles = `
        /* Print stilleri */
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }
        }

        /* Genel stiller */
        .print-container {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          padding: 10mm;
          background: white;
        }

        /* Etiket grid - 2 sütun x 5 satır = 10 etiket */
        .labels-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 5mm;
          width: 100%;
        }

        /* Tek etiket - Resme göre tasarım */
        .label-item {
          width: 100%;
          height: 50mm;
          border: 2px solid #059669;
          border-radius: 4px;
          padding: 5mm;
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-rows: auto 1fr;
          gap: 3mm;
          background: white;
          page-break-inside: avoid;
        }

        @media print {
          .label-item {
            border: 2px solid #059669;
          }
        }

        /* Ürün adı - Sol üst, tam genişlik */
        .label-header {
          grid-column: 1 / -1;
          font-size: ${labelSettings.labelHeaderFontSize || 16}pt;
          font-weight: bold;
          color: #000;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-wrap: break-word;
        }

        /* Sol alan - Barkod */
        .label-barcode-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2mm;
        }

        .label-sku {
          font-size: ${labelSettings.labelSkuFontSize || 11}pt;
          font-weight: bold;
          color: #000;
          margin-bottom: 1mm;
        }

        .barcode-canvas {
          max-width: 100%;
        }

        /* Sağ alan - Fiyat */
        .label-price-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-left: 5mm;
          border-left: 1px solid #e0e0e0;
        }

        .label-price {
          font-size: ${labelSettings.labelPriceFontSize || 46}pt;
          font-weight: 900;
          color: #000;
          line-height: 1;
          white-space: nowrap;
        }

        .label-price-currency {
          font-size: ${labelSettings.labelPriceCurrencyFontSize || 24}pt;
          margin-left: 2mm;
        }

        /* Toolbar (sadece ekranda görünür) */
        .print-toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 1000;
        }

        @media print {
          .print-toolbar {
            display: none;
          }

          .print-container {
            padding: 0;
          }
        }

        .print-button {
          padding: 10px 24px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .print-button:hover {
          background: #047857;
        }

        .pdf-button {
          padding: 10px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .pdf-button:hover {
          background: #1d4ed8;
        }

        .close-button {
          padding: 10px 24px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .close-button:hover {
          background: #4b5563;
        }

        .content-wrapper {
          margin-top: 80px;
        }

        @media print {
          .content-wrapper {
            margin-top: 0;
          }
        }
      `;

  return (
    <div className="print-container">
      <style>{dynamicStyles}</style>

      {/* Toolbar */}
      <div className="print-toolbar no-print">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Barcode-Etiketten drucken
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {labels.length} Etiketten bereit
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="print-button">
            🖨️ Drucken
          </button>
          <button onClick={handleDownloadPDF} className="pdf-button">
            📥 PDF herunterladen
          </button>
          <button onClick={() => window.close()} className="close-button">
            Schließen
          </button>
        </div>
      </div>

      {/* Etiketler */}
      <div className="content-wrapper">
        <div className="labels-grid">
          {labels.map((label, index) => (
            <div key={label.id} className="label-item">
              {/* Ürün Adı - Üst kısım, tam genişlik */}
              <div className="label-header">
               {label.name}
              </div>

              {/* Sol taraf - Barkod */}
              <div className="label-barcode-section">
                <canvas
                  ref={(el) => (barcodeRefs.current[index] = el)}
                  className="barcode-canvas"
                ></canvas>
              </div>

              {/* Sağ taraf - Fiyat */}
              <div className="label-price-section">
                <div className="label-price">
                  {parseFloat(label.price).toFixed(2)}
                  <span className="label-price-currency">€</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Boş etiketler (10'un katı olması için) */}
        {labels.length % 10 !== 0 && (
          <>
            {[...Array(10 - (labels.length % 10))].map((_, index) => (
              <div key={`empty-${index}`} className="label-item" style={{ border: 'none', visibility: 'hidden' }}>
                {/* Boş etiket */}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default BarcodeLabelsPrint;
