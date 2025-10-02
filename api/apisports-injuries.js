export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rapidapi-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { team } = req.query;
  
  // Get API key from header OR environment variable
  const apiKey = req.headers['x-rapidapi-key'] || process.env.API_SPORTS_KEY;
  
  console.log('[DEBUG] API Key present:', !!apiKey); // Don't log the actual key
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API_SPORTS_KEY not configured',
      success: false 
    });
  }
  
  if (!team) {
    return res.status(400).json({ 
      error: 'Missing team parameter',
      success: false 
    });
  }
  
  const NFL_TEAM_IDS = {
    'ARI': 11, 'ATL': 8, 'BAL': 5, 'BUF': 20,
    'CAR': 19, 'CHI': 16, 'CIN': 10, 'CLE': 9,
    'DAL': 29, 'DEN': 28, 'DET': 7, 'GB': 15,
    'HOU': 26, 'IND': 21, 'JAX': 2, 'KC': 17,
    'LV': 1, 'LAC': 30, 'LAR': 31, 'MIA': 25,
    'MIN': 32, 'NE': 3, 'NO': 27, 'NYG': 4,
    'NYJ': 13, 'PHI': 12, 'PIT': 22, 'SF': 14,
    'SEA': 23, 'TB': 24, 'TEN': 6, 'WAS': 18
  };
  
  const teamId = NFL_TEAM_IDS[team.toUpperCase()];
  
  if (!teamId) {
    return res.status(200).json({
      injuries: [],
      success: true,
      team: team,
      message: 'Unknown team'
    });
  }
  
  try {
    const url = `https://v1.american-football.api-sports.io/injuries?team=${teamId}`;
    
    console.log(`[API-Sports] Fetching: ${url}`);
    console.log(`[API-Sports] Team ID: ${teamId}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'v1.american-football.api-sports.io',
        'x-rapidapi-key': apiKey  // Make sure this is being passed!
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API-Sports] HTTP Error ${response.status}:`, errorText);
      throw new Error(`API-Sports returned ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`[API-Sports] Response:`, JSON.stringify(data).substring(0, 200));
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('[API-Sports] API Errors:', data.errors);
      return res.status(200).json({
        injuries: [],
        success: false,
        error: 'API-Sports returned errors',
        details: data.errors,
        team: team
      });
    }
    
    const injuries = (data.response || []).map(injury => ({
      headline: `${injury.player?.name || 'Unknown'} (${injury.player?.position || 'N/A'}) - ${injury.status || 'Unknown'}`,
      player_name: injury.player?.name,
      position: injury.player?.position,
      status: injury.status,
      description: injury.description
    }));
    
    console.log(`[API-Sports] Returning ${injuries.length} injuries`);
    
    return res.status(200).json({
      injuries: injuries,
      success: true,
      source: 'api-sports',
      team: team,
      teamId: teamId,
      count: injuries.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API-Sports] Error:', error.message);
    
    return res.status(200).json({
      injuries: [],
      success: false,
      error: error.message,
      team: team
    });
  }
}