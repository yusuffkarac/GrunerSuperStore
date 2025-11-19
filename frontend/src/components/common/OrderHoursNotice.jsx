import { FiClock } from 'react-icons/fi';

const applyTokens = (text = '', replacements = {}) =>
  text.replace(/\{\{\s*(startTime|endTime)\s*\}\}/g, (_, token) => replacements[token] ?? '');

function OrderHoursNotice({ orderHoursInfo, noticeSettings, className = '' }) {
  if (!orderHoursInfo || orderHoursInfo.isWithinOrderHours) {
    return null;
  }

  const { startTime, endTime, isDeliveryOpen } = orderHoursInfo;
  const tokenValues = { startTime: startTime || '', endTime: endTime || '' };

  const defaultTitle = isDeliveryOpen
    ? 'Wir befinden uns gerade außerhalb unserer Bestellzeiten'
    : 'Die Bestellannahme ist vorübergehend geschlossen';
  const defaultDescription =
    startTime && endTime
      ? `Unsere Bestellzeiten sind von ${startTime} bis ${endTime}.`
      : 'Unsere Bestellzeiten werden in Kürze veröffentlicht.';
  const defaultFooter =
    'Sie können trotzdem vorbestellen; Ihre Bestellung wird innerhalb der angegebenen Zeiten bearbeitet.';

  const resolvedTitle = noticeSettings?.title
    ? applyTokens(noticeSettings.title, tokenValues)
    : defaultTitle;
  const resolvedDescription = noticeSettings?.description
    ? applyTokens(noticeSettings.description, tokenValues)
    : defaultDescription;
  const resolvedFooter = noticeSettings?.footer
    ? applyTokens(noticeSettings.footer, tokenValues)
    : defaultFooter;

  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-amber-500">
          <FiClock className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">{resolvedTitle}</p>
          <p className="text-amber-800">{resolvedDescription}</p>
          <p className="text-amber-700">{resolvedFooter}</p>
        </div>
      </div>
    </div>
  );
}

export default OrderHoursNotice;

