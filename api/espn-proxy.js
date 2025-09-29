// api/espn-proxy.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { sport, team, type } = req.query;
  
  try {
    let url;
    if (type === 'news') {
      url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/news?limit=50&team=${team}`;
    } else {
      url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/teams/${team}/roster`;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}