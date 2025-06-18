import https from 'https';
import http from 'http';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send("❌ Missing stream ID");

  const upstreamUrl = `http://watchindia.net:8880/live/40972/04523/${id}.m3u8`;

  https
    .get(upstreamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'http://watchindia.net/'
      }
    }, (upRes) => {
      if (upRes.statusCode !== 200) {
        res.status(502).send(`❌ Upstream error: ${upRes.statusCode}`);
        return;
      }

      let data = '';
      upRes.on('data', chunk => (data += chunk));
      upRes.on('end', () => {
        const host = req.headers.host;
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const base = `${proto}://${host}/api/wi/${id}`;

        const rewritten = data.replace(/^(?!#)(.+\.ts.*)$/gm, seg =>
          `${base}/segment?ts=${encodeURIComponent(seg.trim())}`
        );

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.status(200).send(rewritten);
      });
    })
    .on('error', () => res.status(500).send("❌ Fetch playlist failed"));
}