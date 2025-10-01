export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, team } = req.query;
  
  if (!sport || !team) {
    return res.status(400).json({ 
      error: 'Missing required parameters: sport, team' 
    });
  }
  
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/news?limit=50&team=${team}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`ESPN returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter and return only injury-related articles
    const injuries = data?.articles?.filter((article) => 
      article.headline.toLowerCase().includes('injury') || 
      article.headline.toLowerCase().includes('out') ||
      article.headline.toLowerCase().includes('questionable') ||
      article.headline.toLowerCase().includes('doubtful') ||
      article.headline.toLowerCase().includes('suspended')
    ).slice(0, 5) || [];
    
    return res.status(200).json({ 
      team,
      injuries,
      success: true 
    });
    
  } catch (error) {
    console.error('ESPN proxy error:', error);
    return res.status(500).json({ 
      error: error.message,
      team,
      injuries: []
    });
  }
}