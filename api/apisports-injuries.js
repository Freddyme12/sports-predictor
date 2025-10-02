// api/apisports-injuries.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rapidapi-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { team, league } = req.query;
  
  // Accept API key from frontend header OR use environment variable as fallback
  const apiKey = req.headers['x-rapidapi-key'] || process.env.API_SPORTS_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
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
  
  // NFL Team Abbreviation to API-Sports ID mapping
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
    console.log(`[API-Sports] Unknown team abbreviation: ${team}`);
    return res.status(200).json({
      injuries: [],
      success: true,
      source: 'api-sports',
      team: team,
      message: 'Unknown team abbreviation'
    });
  }
  
  try {
    // API-Sports NFL injuries endpoint
    const url = `https://v1.american-football.api-sports.io/injuries?team=${teamId}`;
    
    console.log(`[API-Sports] Fetching injuries for ${team} (ID: ${teamId})`);
    
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.american-football.api-sports.io'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API-Sports] Error ${response.status}:`, errorText);
      throw new Error(`API-Sports returned ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`[API-Sports] Raw response:`, JSON.stringify(data).substring(0, 200));
    
    const injuries = data.response || [];
    
    // Format injuries to match expected structure
    const formattedInjuries = injuries.map(injury => ({
      headline: `${injury.player?.name || 'Player'} (${injury.player?.position || 'N/A'}) - ${injury.type || 'Injury'}`,
      player_name: injury.player?.name,
      position: injury.player?.position,
      status: injury.type || 'Unknown',
      description: injury.reason || injury.description,
      reason: injury.reason
    }));
    
    console.log(`[API-Sports] Returning ${formattedInjuries.length} injuries for ${team}`);
    
    return res.status(200).json({
      injuries: formattedInjuries,
      success: true,
      source: 'api-sports',
      team: team,
      teamId: teamId,
      count: formattedInjuries.length,
      timestamp: new Date().toISOString(),
      rateLimit: {
        remaining: response.headers.get('x-ratelimit-requests-remaining'),
        limit: response.headers.get('x-ratelimit-requests-limit')
      }
    });
    
  } catch (error) {
    console.error('[API-Sports] Error:', error.message);
    
    return res.status(200).json({
      injuries: [],
      success: false,
      error: error.message,
      source: 'api-sports-error',
      team: team
    });
  }
}