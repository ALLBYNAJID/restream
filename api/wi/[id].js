import http from 'http';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    res.status(400).send('Missing stream ID');
    return;
  }

  const remoteUrl = `http://watchindia.net:8880/live/40972/04523/${id}.ts`;

  http.get(remoteUrl, (streamRes) => {
    res.setHeader('Content-Type', 'video/MP2T');
    res.setHeader('Transfer-Encoding', 'chunked');
    streamRes.pipe(res);
  }).on('error', () => {
    res.status(502).send("❌ Failed to fetch stream.");
  });
}
