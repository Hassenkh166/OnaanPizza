const http = require('http');

function testPUT() {
  const postData = JSON.stringify({
    contact_address: 'Nouvelle adresse test',
    contact_phone: '+216 12 345 678',
    contact_email: 'test@example.com',
    contact_hours: 'Test horaires'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/config',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('PUT response:', data);

      // Maintenant vérifier avec GET
      http.get('http://localhost:3000/api/config', (getRes) => {
        let getData = '';
        getRes.on('data', (chunk) => {
          getData += chunk;
        });
        getRes.on('end', () => {
          console.log('GET response after PUT:', getData);
        });
      }).on('error', (err) => {
        console.error('GET error:', err);
      });
    });
  });

  req.on('error', (e) => {
    console.error('PUT error:', e);
  });

  req.write(postData);
  req.end();
}

testPUT();