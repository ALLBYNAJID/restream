import http from 'http';

export default async function handler(req, res) {
  let slug = req.query.slug;

  // Check slug exists and is array
  if (!slug) {
    return res.status(400).send("❌ Missing stream ID");
  }
  if (typeof slug === "string") {
    slug = [slug];
  }

  const filename = slug[0];
  if (!filename.endsWith('.m3u8')) {
    return res.status(400).send("❌ Only .m3u8 files are supported");
  }

  const streamId = filename.replace('.m3u8', '');

  const sourceUrl = `http://watchindia.net:8880/live/40972/04523/${streamId}.m3u8`;

  http.get(sourceUrl, (upstreamRes) => {
    if (upstreamRes.statusCode !== 200) {
      return res.status(502).send(`❌ Upstream error: ${upstreamRes.statusCode}`);
    }

    let data = '';
    upstreamRes.on('data', chunk => data += chunk);
    upstreamRes.on('end', () => {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.status(200).send(data);
    });
  }).on('error', () => {
    res.status(500).send("❌ Failed to fetch playlist");
  });
}