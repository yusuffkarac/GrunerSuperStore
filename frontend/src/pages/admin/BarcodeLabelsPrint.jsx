import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import barcodeLabelService from '../../services/barcodeLabelService';
import Loading from '../../components/common/Loading';

function BarcodeLabelsPrint() {
  const [searchParams] = useSearchParams();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLabels();
  }, []);

  // Barkod görsellerini oluştur
  useEffect(() => {
    if (labels.length > 0) {
      labels.forEach((label) => {
        const svgId = `barcode-${label.id}`;
        const svg = document.getElementById(svgId);
        if (svg) {
          try {
            JsBarcode(svg, label.barcode, {
              format: 'EAN13',
              width: 2,
              height: 50,
              displayValue: false,
              margin: 0,
            });
          } catch (error) {
            // EAN13 formatı desteklenmiyorsa CODE128 dene
            try {
              JsBarcode(svg, label.barcode, {
                format: 'CODE128',
                width: 2,
                height: 50,
                displayValue: false,
                margin: 0,
              });
            } catch (e) {
              console.error('Barkod oluşturma hatası:', e);
            }
          }
        }
      });
    }
  }, [labels]);

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

      // Veriler yüklenince otomatik yazdır
      setTimeout(() => {
        window.print();
      }, 500);
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
          max-width: 210mm; /* A4 width */
          margin: 0 auto;
          padding: 10mm;
          background: white;
        }

        /* Etiket grid - 2 sütun x 4 satır = 8 etiket */
        .labels-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8mm;
          width: 100%;
        }

        /* Tek etiket */
        .label-item {
          width: 100%;
          height: 65mm;
          border: 2px solid #22c55e;
          border-radius: 4px;
          padding: 8mm;
          display: flex;
          flex-direction: column;
          background: white;
          page-break-inside: avoid;
        }

        @media print {
          .label-item {
            border: 2px solid #22c55e;
          }
        }

        /* Üst kısım - Ürün başlığı */
        .label-title {
          font-size: 16pt;
          font-weight: bold;
          color: #1a202c;
          margin-bottom: 8mm;
          line-height: 1.3;
        }

        .label-product-id {
          font-weight: 900;
        }

        /* Alt kısım - Barkod ve Fiyat */
        .label-content {
          flex: 1;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: flex-end;
          gap: 4mm;
        }

        /* Barkod alanı - sol taraf */
        .label-barcode-section {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2mm;
          flex: 0 1 auto;
          min-width: 0;
        }

        .label-barcode-id {
          font-size: 14pt;
          font-weight: 700;
          color: #1a202c;
        }

        .label-barcode-image {
          width: 100%;
          max-width: 50mm;
          height: auto;
        }

        .label-barcode-image svg {
          width: 100%;
          height: auto;
        }

        .label-barcode-number {
          font-family: 'Courier New', monospace;
          font-size: 12pt;
          font-weight: bold;
          color: #1a202c;
          letter-spacing: 2px;
        }

        /* Fiyat alanı - sağ alt köşe */
        .label-price-section {
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .label-price {
          font-size: 36pt;
          font-weight: 900;
          color: #1a202c;
          line-height: 1;
          white-space: nowrap;
        }

        .label-price-currency {
          font-size: 28pt;
          font-weight: 700;
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
          {labels.map((label) => {
            // ID'yi kısa formata çevir (UUID'nin ilk 8 karakteri veya tam ID)
            const shortId = label.id.substring(0, 8).toUpperCase();
            const productId = `P${shortId}`;
            const priceFormatted = parseFloat(label.price).toFixed(2).replace('.', ',');
            
            return (
              <div key={label.id} className="label-item">
                {/* Üst kısım - Başlık */}
                <div className="label-title">
                  <span className="label-product-id">[{productId}]</span> {label.name}
                </div>

                {/* Alt kısım - Barkod ve Fiyat */}
                <div className="label-content">
                  {/* Sol taraf - Barkod */}
                  <div className="label-barcode-section">
                    <div className="label-barcode-id">{productId}</div>
                    <div className="label-barcode-image">
                      <svg id={`barcode-${label.id}`}></svg>
                    </div>
                    <div className="label-barcode-number">{label.barcode}</div>
                  </div>

                  {/* Sağ alt köşe - Fiyat */}
                  <div className="label-price-section">
                    <div className="label-price">
                      {priceFormatted} <span className="label-price-currency">€</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Boş etiketler (8'in katı olması için) */}
        {labels.length % 8 !== 0 && (
          <>
            {[...Array(8 - (labels.length % 8))].map((_, index) => (
              <div key={`empty-${index}`} className="label-item" style={{ border: 'none' }}>
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
