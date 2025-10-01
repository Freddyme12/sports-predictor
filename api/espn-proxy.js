export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, team } = req.query;
  
  if (!sport || !team) {
    return res.status(400).json({ error: 'Missing sport or team parameter' });
  }
  
  try {
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/teams/${team}`;
    const response = await fetch(espnUrl);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const injuries = data.team?.injuries || [];
    const filteredInjuries = injuries
      .filter(inj => inj.status && inj.status !== 'Out for Season')
      .map(inj => ({
        headline: `${inj.athlete?.displayName || 'Player'} (${inj.athlete?.position?.abbreviation || 'Unknown'}) - ${inj.status || 'Unknown'}: ${inj.details?.type || 'Injury'}`,
        status: inj.status
      }));
    
    return res.status(200).json({ 
      injuries: filteredInjuries,
      success: true 
    });
    
  } catch (error) {
    console.error('ESPN proxy error:', error);
    return res.status(200).json({ 
      injuries: [],
      success: false,
      message: error.message 
    });
  }
}