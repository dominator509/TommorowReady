const baseUrl = process.env.PRODUCTION_BASE_URL;
if (!baseUrl) throw new Error('PRODUCTION_BASE_URL_REQUIRED');
const response = await fetch(`${baseUrl}/health/ready`);
if (!response.ok) throw new Error(`PRODUCTION_SMOKE_${response.status}`);
console.log('production smoke: ok');
