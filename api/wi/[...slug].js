import http from 'http';
import https from 'https';
import { parse } from 'url';

export default async function handler(req, res) {
  let { slug } = req.query;

  if (!slug || !Array.isArray(slug)) {
    return res.status(400).send("❌ Missing stream ID");
  }

  const isPlaylist = slug[slug.length - 1].endsWith('.m3u8');
  const streamId = slug[0];
  const filename = slug.slice(1).join('/');

  // Source base URL
  const base = `http://watchindia.net:8880/live/40972/04523`;

  if (isPlaylist) {
    // Proxy M3U8 playlist and rewrite .ts URLs
    const playlistUrl = `${base}/${streamId}.m3u8`;

    http.get(playlistUrl, (upstreamRes) => {
      let data = '';
      upstreamRes.on('data', chunk => data += chunk);
      upstreamRes.on('end', () => {
        // Rewrite .ts URLs to proxy through Vercel
        const host = req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const newData = data.replace(/(.*\.ts)/g, segment =>
          `${protocol}://${host}/api/wi/${streamId}/${segment.trim()}`
        );

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(newData);
      });
    }).on('error', () => {
      res.status(500).send("❌ Failed to fetch playlist");
    });
  } else {
    // Proxy individual .ts segments
    const tsUrl = `${base}/${streamId}/${filename}`;

    const client = tsUrl.startsWith('https') ? https : http;

    client.get(tsUrl, {
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*'
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
      res.status(500).send("❌ TS Fetch Error: " + err.message);
    });
  }
}