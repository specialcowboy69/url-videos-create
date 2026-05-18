const http = require("node:http");
const next = require("next");

const dev = process.env.NODE_ENV === "development";
const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "10000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.keepAliveTimeout = 120_000;
  server.headersTimeout = 120_000;

  server.listen(port, hostname, () => {
    console.log(`Ready on http://${hostname}:${port}`);
  });
});
