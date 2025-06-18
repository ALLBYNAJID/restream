import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  let slug = req.query.slug;

  // 🔐 Fix Vercel passing slug as string (not array)
  if (!slug) return res.status(400).send("❌ Missing stream ID");
  if (typeof slug === 'string') slug = [slug];

  const streamId = slug[0];
  const lastPart = slug[slug.length - 1];
  const isM3U8 = lastPart.endsWith('.m3u8');
  const restPath = slug.slice(1).join('/');

  const base = `http://watchindia.net:8880/live/40972/04523`;

  if (isM3U8) {
    // Proxy M3U8 playlist
    const playlistUrl = `${base}/${streamId}.m3u8`;

    http.get(playlistUrl, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;

        const replaced = data.replace(/(.*\.ts)/g, ts =>
          `${proto}://${host}/api/wi/${streamId}/${ts.trim()}`
        );

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.status(200).send(replaced);
      });
    }).on('error', () => {
      res.status(502).send("❌ Failed to fetch playlist");
    });

  } else {
    // Proxy TS segment
    const tsUrl = `${base}/${streamId}/${restPath}`;
    const client = tsUrl.startsWith('https') ? https : http;

    client.get(tsUrl, {
      headers: {
        'User-Agent': 'VLC',
        'Accept': '*/*'
      }
    }, streamRes => {
      if (streamRes.statusCode !== 200) {
        return res.status(502).send(`❌ TS Error: ${streamRes.statusCode}`);
      }

      res.writeHead(200, {
        'Content-Type': 'video/MP2T',
        'Transfer-Encoding': 'chunked'
      });

      streamRes.pipe(res);
    }).on('error', err => {
      res.status(500).send("❌ Segment fetch error: " + err.message);
    });
  }
}