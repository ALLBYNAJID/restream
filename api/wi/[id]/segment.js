import { https } from 'follow-redirects';

export default function handler(req, res) {
  const { id, ts } = req.query;
  if (!id || !ts) return res.status(400).send("❌ Missing parameters");

  const targetUrl = `http://watchindia.net:8880/live/40972/04523/${decodeURIComponent(ts)}`;

  https.get(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'http://watchindia.net/'
    }
  }, (upRes) => {
    if (upRes.statusCode !== 200) {
      res.status(502).send("❌ Segment fetch error");
      return;
    }

    res.setHeader('Content-Type', 'video/mp2t');
    upRes.pipe(res);
  }).on('error', () => {
    res.status(500).send("❌ Segment proxy failed");
  });
}