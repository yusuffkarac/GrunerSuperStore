import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import barcodeLabelService from '../../services/barcodeLabelService';
import Loading from '../../components/common/Loading';

function BarcodeLabelsPrint() {
  const [searchParams] = useSearchParams();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const barcodeRefs = useRef([]);

  useEffect(() => {
    loadLabels();
  }, []);

  useEffect(() => {
    if (labels.length > 0) {
      // JsBarcode kütüphanesini yükle ve barkodları oluştur
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
      script.onload = () => {
        generateBarcodes();
        // Barkodlar oluşturulduktan sonra yazdır
        setTimeout(() => {
          window.print();
        }, 500);
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [labels]);

  const generateBarcodes = () => {
    if (window.JsBarcode) {
      labels.forEach((label, index) => {
        const canvas = barcodeRefs.current[index];
        if (canvas && label.barcode) {
          try {
            // Barkod formatını otomatik algıla
            const barcodeValue = label.barcode.toString();
            let format = 'CODE128';
            
            // EAN13 için 13 haneli sayı kontrolü
            if (/^\d{13}$/.test(barcodeValue)) {
              format = 'EAN13';
            } 
            // EAN8 için 8 haneli sayı kontrolü
            else if (/^\d{8}$/.test(barcodeValue)) {
              format = 'EAN8';
            }

            window.JsBarcode(canvas, barcodeValue, {
              format: format,
              width: 2,
              height: 50,
              displayValue: true,
              fontSize: 12,
              margin: 0,
              marginTop: 5,
              marginBottom: 5
            });
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
      setLabels(response.data.labels || []);
    } catch (error) {
      console.error('Etiket yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="print-container">
      <style>{`
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
          font-size: 14pt;
          font-weight: bold;
          color: #000;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          font-size: 11pt;
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
          font-size: 36pt;
          font-weight: 900;
          color: #000;
          line-height: 1;
          white-space: nowrap;
        }

        .label-price-currency {
          font-size: 24pt;
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
      `}</style>

      {/* Toolbar */}
      <div className="print-toolbar no-print">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Barkod Etiketleri Yazdır
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {labels.length} adet etiket hazır
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="print-button">
            🖨️ Yazdır
          </button>
          <button onClick={() => window.close()} className="close-button">
            Kapat
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
                [{label.sku || label.barcode}] {label.name}
              </div>

              {/* Sol taraf - Barkod */}
              <div className="label-barcode-section">
                <div className="label-sku">{label.sku || label.barcode}</div>
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
