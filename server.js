import http from "node:http";
import handler from "./api/index.js";

const port = parseInt(process.env.PORT || "3000", 10);

const server = http.createServer(async (req, res) => {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.send = (body) => {
    if (body === undefined || body === null) return res.end();
    return res.end(body);
  };

  try {
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) res.setHeader("Content-Type", "application/json");
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message || "Server error" }));
  }
});

server.listen(port, () => {
  console.log(`MediSmart admin running at http://localhost:${port}/admin`);
});
