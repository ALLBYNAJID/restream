import http from 'http';

export default function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send("❌ Missing stream ID");

  const url = `http://watchindia.net:8880/live/40972/04523/${id}.m3u8`;

  http.get(url, (response) => {
    if (response.statusCode !== 200) {
      res.status(502).send("❌ Error: " + response.statusCode);
      return;
    }

    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.end(data);
    });
  }).on('error', (e) => {
    res.status(500).send("❌ Fetch failed");
  });
}