import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  let { slug } = req.query;

  // Normalize to array
  if (!slug) {
    return res.status(400).send("❌ Missing stream ID");
  }

  if (!Array.isArray(slug)) {
    slug = [slug];
  }

  const filename = slug.join('/');
  const id = filename.replace(/\.(m3u8|ts)$/i, '');

  const streamUrl = `http://watchindia.net:8880/live/40972/04523/${id}.ts`;
  const client = streamUrl.startsWith('https') ? https : http;

  client.get(streamUrl, {
    headers: {
      'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
      'Accept': '*/*',
    }
  }, (streamRes) => {
    if (streamRes.statusCode !== 200) {
      return res.status(502).send(`❌ Upstream error: ${streamRes.statusCode}`);
    }

    res.writeHead(200, {
      'Content-Type': 'video/MP2T',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive',
    });

    streamRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).send("❌ Stream fetch error: " + err.message);
  });
}