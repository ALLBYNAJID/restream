import http from 'http';
import https from 'https';

export default function handler(req, res) {
  const { slug } = req.query;
  console.log('🧩 slug:', slug); // for debugging

  if (!slug || slug.length === 0) {
    return res.status(400).send("❌ Missing stream ID");
  }

  const filename = slug.join('/');
  const id = filename.replace(/\.(m3u8|ts)$/i, '');

  console.log('🧩 id:', id);

  const streamUrl = `http://watchindia.net:8880/live/40972/04523/${id}.ts`;
  const client = streamUrl.startsWith('https') ? https : http;

  client.get(streamUrl, { headers: {
    'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
    'Accept': '*/*',
    'Connection': 'keep-alive'
  }}, (streamRes) => {
    if ([301,302].includes(streamRes.statusCode)) {
      const loc = streamRes.headers.location;
      if (!loc) return res.status(502).send("❌ Redirect w/o Location");
      return handler({ /* fake req */ }, res); // recursion alternative
    }
    if (streamRes.statusCode !== 200) {
      return res.status(502).send(`❌ Upstream error: ${streamRes.statusCode}`);
    }
    res.writeHead(200, {
      'Content-Type': 'video/MP2T',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive',
    });
    streamRes.pipe(res);
  }).on('error', () => {
    res.status(500).send("❌ Stream fetch error");
  });
}
