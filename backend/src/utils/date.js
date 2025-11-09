/**
 * Date/Time utility functions for Germany timezone (Europe/Berlin)
 * Handles CET/CEST automatically
 * 
 * Note: process.env.TZ is set to 'Europe/Berlin' in server.js
 * This ensures all Date operations use Germany timezone
 */

/**
 * Almanya saatine göre şu anki saati ve dakikayı döndürür
 * @returns {{hour: number, minute: number}} Saat ve dakika
 */
export function getGermanyTimeParts() {
  const now = new Date();
  const germanyTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  
  return {
    hour: parseInt(germanyTime.find(part => part.type === 'hour').value),
    minute: parseInt(germanyTime.find(part => part.type === 'minute').value),
  };
}

/**
 * Almanya saatine göre şu anki zamanı dakika cinsinden döndürür
 * @returns {number} Dakika cinsinden zaman (0-1439)
 */
export function getGermanyTimeInMinutes() {
  const { hour, minute } = getGermanyTimeParts();
  return hour * 60 + minute;
}

/**
 * Almanya saatine göre şu anki Date objesini döndürür (tarih karşılaştırmaları için)
 * process.env.TZ ayarlandığı için new Date() zaten Almanya saatine göre çalışır
 * @returns {Date} Almanya saatine göre Date objesi
 */
export function getGermanyDate() {
  // process.env.TZ = 'Europe/Berlin' ayarlandığı için
  // new Date() otomatik olarak Almanya saatine göre çalışır
  return new Date();
}

