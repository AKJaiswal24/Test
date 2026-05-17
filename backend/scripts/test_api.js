const http = require("http");

// First bootstrap an admin to get a valid token
const adminData = JSON.stringify({ name: "Admin", email: "admin@test.com", password: "password123" });

const req = http.request({
  hostname: "localhost",
  port: 5000,
  path: "/api/auth/bootstrap-admin",
  method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": adminData.length }
}, (res) => {
  let body = "";
  res.on("data", (c) => body += c);
  res.on("end", () => {
    console.log("Bootstrap status:", res.statusCode, "Body:", body.substring(0, 500));
    if (res.statusCode === 200) {
      const parsed = JSON.parse(body);
      if (parsed.token) {
        // Now test the lender dashboard endpoint
        testDashboard(parsed.token);
      } else {
        console.log("No token in bootstrap response");
        process.exit(1);
      }
    } else if (res.statusCode === 403) {
      // Admin already exists, try login
      loginAdmin();
    } else {
      process.exit(1);
    }
  });
});

req.on("error", (e) => { console.error("Bootstrap error:", e.message); process.exit(1); });
req.write(adminData);
req.end();

function loginAdmin() {
  const loginData = JSON.stringify({ email: "admin@test.com", password: "password123" });
  const req2 = http.request({
    hostname: "localhost",
    port: 5000,
    path: "/api/auth/login",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": loginData.length }
  }, (res) => {
    let body = "";
    res.on("data", (c) => body += c);
    res.on("end", () => {
      console.log("Login status:", res.statusCode, "Body:", body.substring(0, 500));
      try {
        const parsed = JSON.parse(body);
        if (parsed.token) testDashboard(parsed.token);
        else { console.log("No token"); process.exit(1); }
      } catch(e) { console.log("Parse error:", body); process.exit(1); }
    });
  });
  req2.on("error", (e) => { console.error("Login error:", e.message); process.exit(1); });
  req2.write(loginData);
  req2.end();
}

function testDashboard(token) {
  const req3 = http.request({
    hostname: "localhost",
    port: 5000,
    path: "/api/lender/dashboard",
    method: "GET",
    headers: { "Authorization": "Bearer " + token }
  }, (res) => {
    let data = "";
    res.on("data", (c) => data += c);
    res.on("end", () => {
      console.log("Dashboard status:", res.statusCode);
      try {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
      } catch(e) {
        console.log("Raw:", data.substring(0, 2000));
      }
      process.exit(0);
    });
  });
  req3.on("error", (e) => { console.error("Dashboard error:", e.message); process.exit(1); });
  req3.end();
}