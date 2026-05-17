const http = require("http");

// Test the lender dashboard endpoint (should return 401 without auth)
const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/lender/dashboard",
  method: "GET",
  headers: {
    "Content-Type": "application/json"
  }
};

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", JSON.stringify(res.headers, null, 2));
    let body = "";
    try {
      // Parse JSON if possible
      const parsed = JSON.parse(data);
      console.log("Body (JSON):", JSON.stringify(parsed, null, 2));
    } catch(e) {
      // Show as text if not JSON
      console.log("Body (text):", data);
    }
    process.exit(0);
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
  process.exit(1);
});

req.end();