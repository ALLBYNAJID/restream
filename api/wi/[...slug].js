import http from 'http';
import https from 'https';

function fetchWithRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        const newUrl = new URL(res.headers.location, url).href;
        resolve(fetchWithRedirects(newUrl, maxRedirects - 1));
      } else if (res.statusCode === 200) {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ body, finalUrl: url }));
      } else {
        reject(new Error(`Upstream error: ${res.statusCode}`));
      }
    });

    request.on('error', reject);
  });
}

export default async function handler(req, res) {
  let slug = req.query.slug;
  if (typeof slug === 'string') slug = [slug];

  if (!slug || !slug[0]) {
    return res.status(400).send("❌ Missing stm ID");
  }

  const id = slug[0].replace('.m3u8', '');
  const originalUrl = `http://watchindia.net:8880/live/40972/04523/${id}.m3u8`;

  try {
    const { body, finalUrl } = await fetchWithRedirects(originalUrl);

    const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);

    // Rewrite TS segments to full URL
    const fixed = body.replace(/^(?!#)(.+\.ts.*)$/gm, (line) => {
      return baseUrl + line;
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.status(200).send(fixed);
  } catch (err) {
    res.status(502).send(`❌ ${err.message}`);
  }
}