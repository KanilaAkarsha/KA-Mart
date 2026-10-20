// Tests your ANTHROPIC_API_KEY without uploading a bill: npm run check-ai
require('dotenv').config(); const { extractBill, getProvider } = require('../services/billScanner');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
console.log('Provider:', getProvider() || 'none configured');
extractBill(png, 'image/png').then(() => console.log('OK: the key works and the service replied.'), (e) => { console.log('FAILED:', e.message); process.exit(1); });
