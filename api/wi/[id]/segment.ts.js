import http from 'http';
import https from 'https';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Referer': 'http://watchindia.net/',
};

function streamTS(url, res) {
  const client = url.startsWith('https') ? https : http;

  const req = client.get(url, { headers }, (response) => {
    if (response.statusCode !== 200) {
      res.statusCode = 502;
      return res.end(`❌ Failed to fetch TS segment. Code: ${response.statusCode}`);
    }

    res.writeHead(200, {
      'Content-Type': 'video/mp2t',
      'Cache-Control': 'no-store',
    });

    response.pipe(res);
  });

  req.on('error', (err) => {
    res.statusCode = 502;
    res.end("❌ Error fetching TS segment");
  });
}

export default async function handler(req, res) {
  const { id } = req.query;
  const { ts } = req.query;

  if (!id || !ts) return res.status(400).send("❌ Missing parameters");

  const tsUrl = `http://watchindia.net:8880/live/40972/04523/${decodeURIComponent(ts)}`;

  streamTS(tsUrl, res);
}
