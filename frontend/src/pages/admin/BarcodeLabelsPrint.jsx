import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import barcodeLabelService from '../../services/barcodeLabelService';
import Loading from '../../components/common/Loading';

function BarcodeLabelsPrint() {
  const [searchParams] = useSearchParams();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLabels();
  }, []);

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
          border: 2px dashed #cbd5e0;
          border-radius: 8px;
          padding: 8mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: white;
          page-break-inside: avoid;
        }

        @media print {
          .label-item {
            border: 1px solid #e2e8f0;
          }
        }

        /* Ürün adı */
        .label-name {
          font-size: 16pt;
          font-weight: bold;
          color: #1a202c;
          line-height: 1.3;
          margin-bottom: 4mm;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        /* Fiyat */
        .label-price {
          font-size: 28pt;
          font-weight: 900;
          color: #059669;
          margin: 2mm 0;
        }

        .label-price-currency {
          font-size: 20pt;
          font-weight: 700;
        }

        /* Birim */
        .label-unit {
          font-size: 12pt;
          color: #6b7280;
          margin-top: 1mm;
        }

        /* Barkod */
        .label-barcode {
          margin-top: auto;
          padding-top: 4mm;
          border-top: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .label-barcode-number {
          font-family: 'Courier New', monospace;
          font-size: 14pt;
          font-weight: bold;
          color: #1a202c;
          letter-spacing: 2px;
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
          {labels.map((label) => (
            <div key={label.id} className="label-item">
              {/* Ürün Adı */}
              <div className="label-name">{label.name}</div>

              {/* Fiyat ve Birim */}
              <div>
                <div className="label-price">
                  <span className="label-price-currency">€</span>
                  {parseFloat(label.price).toFixed(2)}
                </div>
                {label.unit && (
                  <div className="label-unit">/{label.unit}</div>
                )}
              </div>

              {/* Barkod */}
              <div className="label-barcode">
                <div className="label-barcode-number">{label.barcode}</div>
              </div>
            </div>
          ))}
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
