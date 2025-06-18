import http from 'http';

export default function handler(req, res) {
  console.log('Request query:', req.query);

  let slug = req.query.slug;

  if (!slug) {
    console.error('❌ Missing stream ID - slug param is undefined or null');
    return res.status(400).send("❌ Missing stream ID");
  }

  if (typeof slug === 'string') {
    slug = [slug];
  }

  console.log('Parsed slug array:', slug);

  const filename = slug[0];
  if (!filename) {
    console.error('❌ Filename missing in slug array');
    return res.status(400).send("❌ Missing filename in slug");
  }

  if (!filename.endsWith('.m3u8')) {
    console.error('❌ Unsupported file extension:', filename);
    return res.status(400).send("❌ Only .m3u8 files are supported");
  }

  const streamId = filename.replace('.m3u8', '');

  console.log('Stream ID:', streamId);

  const sourceUrl = `http://watchindia.net:8880/live/40972/04523/${streamId}.m3u8`;
  console.log('Fetching from URL:', sourceUrl);

  http.get(sourceUrl, (upstreamRes) => {
    console.log('Upstream status code:', upstreamRes.statusCode);

    if (upstreamRes.statusCode !== 200) {
      console.error('❌ Upstream error with status:', upstreamRes.statusCode);
      return res.status(502).send(`❌ Upstream error: ${upstreamRes.statusCode}`);
    }

    let data = '';
    upstreamRes.on('data', chunk => data += chunk);
    upstreamRes.on('end', () => {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.status(200).send(data);
    });
  }).on('error', (err) => {
    console.error('❌ HTTP get error:', err);
    res.status(500).send("❌ Failed to fetch playlist");
  });
}