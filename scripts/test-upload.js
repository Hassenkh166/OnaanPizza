// scripts/test-upload.js
// Creates a tiny PNG (1x1) and POSTs it to /api/upload to reproduce and log the server response.
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function main(){
  const outPath = path.join(__dirname, '_test_upload.png');
  // 1x1 PNG base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9p0b9QAAAABJRU5ErkJggg==';
  const buf = Buffer.from(pngBase64, 'base64');
  fs.writeFileSync(outPath, buf);
  console.log('Wrote test image:', outPath, 'size', fs.statSync(outPath).size);

  const form = new FormData();
  form.append('image', fs.createReadStream(outPath));

  try{
    const res = await axios.post('http://localhost:3000/api/upload', form, { headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity, validateStatus: null });
    console.log('HTTP', res.status);
    console.log('Response data:', JSON.stringify(res.data, null, 2));
  }catch(e){
    console.error('--- Upload error ---');
    try{ console.error('Error toString:', e.toString()); } catch(_){}
    try{ console.error('Error stack:', e.stack); } catch(_){}
    if (e.response){
      try{ console.error('HTTP status:', e.response.status); } catch(_){}
      try{ console.error('Response headers:', JSON.stringify(e.response.headers)); } catch(_){}
      try{ console.error('Response data:', JSON.stringify(e.response.data, null, 2)); } catch(_){}
    } else {
      try{ console.error('Request error message:', e.message); } catch(_){}
    }
  } finally {
    try{ fs.unlinkSync(outPath); }catch(e){}
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
