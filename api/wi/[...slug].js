import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  let slug = req.query.slug;

  // ✅ Fix: force slug to array if it's a string
  if (!slug) return res.status(400).send("❌ Missing stream ID");
  if (typeof slug === 'string') slug = [slug];

  const last = slug[slug.length - 1];

  const isPlaylist = last.endsWith('.m3u8');
  const streamId = slug[0];
  const filePath = slug.slice(1).join('/');

  const base = `http://watchindia.net:8880/live/40972/04523`;

  if (isPlaylist) {
    const playlistUrl = `${base}/${streamId}.m3u8`;

    http.get(playlistUrl, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        const host = req.headers.host;
        const proto = req.headers['x-forwarded-proto'] || 'https';

        const modified = data.replace(/(.*\.ts)/g, segment =>
          `${proto}://${host}/api/wi/${streamId}/${segment.trim()}`
        );

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.status(200).send(modified);
      });
    }).on('error', () => {
      res.status(500).send("❌ Failed to fetch playlist");
    });

  } else {
    const segmentUrl = `${base}/${streamId}/${filePath}`;
    const client = segmentUrl.startsWith('https') ? https : http;

    client.get(segmentUrl, {
      headers: {
        'User-Agent': 'VLC',
        'Accept': '*/*'
      }
    }, stream => {
      if (stream.statusCode !== 200) {
        return res.status(502).send(`❌ Segment error: ${stream.statusCode}`);
      }

      res.writeHead(200, {
        'Content-Type': 'video/MP2T',
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive'
      });

      stream.pipe(res);
    }).on('error', err => {
      res.status(500).send("❌ Segment fetch failed");
    });
  }
}