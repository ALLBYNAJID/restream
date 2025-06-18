import http from 'http';
import https from 'https';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Referer': 'http://watchindia.net/',
};

function fetchM3U8(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, { headers }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`❌ Upstream error: ${res.statusCode}`));
      }

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).send("❌ Missing stream ID");

  const originUrl = `http://watchindia.net:8880/live/40972/04523/${id}.m3u8`;

  try {
    const m3u8 = await fetchM3U8(originUrl);

    // Rewrite all .ts to proxy path
    const proxied = m3u8.replace(/^(?!#)(.*\.ts\?token=.*)$/gm, (line) => {
      const encoded = encodeURIComponent(line);
      return `/api/wi/${id}/segment.ts?ts=${encoded}`;
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(proxied);
  } catch (err) {
    res.status(502).send(err.message);
  }
}
