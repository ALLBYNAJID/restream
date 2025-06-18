export default async function handler(req, res) {
  let slug = req.query.slug;
  if (typeof slug === 'string') slug = [slug];

  if (!slug || !slug[0]) {
    return res.status(400).send("❌ Missing stream ID");
  }

  const id = slug[0].replace('.m3u8', '');
  const redirectUrl = `http://watchindia.net:8880/live/40972/04523/${id}.m3u8`;

  res.writeHead(302, {
    Location: redirectUrl,
  });
  res.end();
}