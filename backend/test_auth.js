const http = require('http');

const loginData = JSON.stringify({ email: 'admin@test.com', password: 'password123' });

const loginReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Login status:', res.statusCode);
    try {
      const parsed = JSON.parse(body);
      if (parsed.token) {
        console.log('Login successful, token received');
        // Test the lender dashboard endpoint
        const options = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/lender/dashboard',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + parsed.token,
            'Content-Type': 'application/json'
          }
        };

        const dashboardReq = http.request(options, (dashboardRes) => {
          let data = '';
          dashboardRes.on('data', chunk => data += chunk);
          dashboardRes.on('end', () => {
            console.log('Dashboard status:', dashboardRes.statusCode);
            try {
              console.log('Response:', JSON.stringify(data));
            } catch(e) {
              console.log('Raw response:', data.substring(0, 500));
            }
          });
        });

        dashboardReq.on('error', (e) => {
          console.error('Dashboard error:', e.message);
        });

        dashboardReq.end();
      } else {
        console.log('Login failed:', body);
      }
    } catch(e) {
      console.log('Login parse error:', e.message);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e.message);
});

loginReq.write(loginData);
loginReq.end();