import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  let { slug } = req.query;

  // Fix if slug is string instead of array
  if (typeof slug === 'string') {
    slug = [slug];
  }

  if (!slug || !Array.isArray(slug) || slug.length === 0) {
    return res.status(400).send("❌ Missing stream ID");
  }

  const isPlaylist = slug[slug.length - 1].endsWith('.m3u8');
  const streamId = slug[0];
  const filename = slug.slice(1).join('/');

  const base = `http://watchindia.net:8880/live/40972/04523`;

  if (isPlaylist) {
    // Proxy and rewrite .m3u8
    const playlistUrl = `${base}/${streamId}.m3u8`;

    http.get(playlistUrl, (upstreamRes) => {
      let data = '';
      upstreamRes.on('data', chunk => data += chunk);
      upstreamRes.on('end', () => {
        const host = req.headers.host;
        const proto = req.headers['x-forwarded-proto'] || 'https';

        const rewritten = data.replace(/(.*\.ts)/g, ts =>
          `${proto}://${host}/api/wi/${streamId}/${ts.trim()}`
        );

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(rewritten);
      });
    }).on('error', () => {
      res.status(500).send("❌ Failed to fetch .m3u8");
    });
  } else {
    // Proxy .ts segment
    const tsUrl = `${base}/${streamId}/${filename}`;
    const client = tsUrl.startsWith('https') ? https : http;

    client.get(tsUrl, {
      headers: {
        'User-Agent': 'VLC',
        'Accept': '*/*'
      }
    }, streamRes => {
      if (streamRes.statusCode !== 200) {
        return res.status(502).send(`❌ TS upstream error: ${streamRes.statusCode}`);
      }

      res.writeHead(200, {
        'Content-Type': 'video/MP2T',
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
      });

      streamRes.pipe(res);
    }).on('error', err => {
      res.status(500).send("❌ TS Fetch Error: " + err.message);
    });
  }
}