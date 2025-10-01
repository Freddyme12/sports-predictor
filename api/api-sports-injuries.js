export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, team } = req.query;
  const apiKey = process.env.API_SPORTS_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API_SPORTS_KEY not configured',
      success: false 
    });
  }
  
  if (!sport || !team) {
    return res.status(400).json({ 
      error: 'Missing sport or team parameter',
      success: false 
    });
  }
  
  // Map sports to API-Sports endpoints
  const sportMap = {
    'football/nfl': { api: 'american-football', league: '1' }, // NFL
    'football/college-football': { api: 'american-football', league: '2' }, // NCAAF
    'basketball/nba': { api: 'basketball', league: '12' }, // NBA
    'baseball/mlb': { api: 'baseball', league: '1' }, // MLB
    'hockey/nhl': { api: 'hockey', league: '57' } // NHL
  };
  
  const sportConfig = sportMap[sport];
  
  if (!sportConfig) {
    return res.status(400).json({
      error: 'Unsupported sport',
      success: false
    });
  }
  
  try {
    const url = `https://v1.${sportConfig.api}.api-sports.io/injuries?league=${sportConfig.league}&season=2024&team=${team}`;
    
    console.log(`[API-Sports] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': `v1.${sportConfig.api}.api-sports.io`
      },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      throw new Error(`API-Sports returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // API-Sports returns data in different formats per sport
    const injuries = data.response || [];
    
    // Format to match your existing structure
    const formattedInjuries = injuries.map(injury => ({
      headline: `${injury.player?.name || 'Player'} (${injury.player?.position || 'Unknown'}) - ${injury.type || 'Injury'}: ${injury.reason || 'Unknown'}`,
      status: injury.type || 'Unknown',
      position: injury.player?.position || 'Unknown',
      name: injury.player?.name || 'Player',
      type: injury.reason || 'Unknown',
      details: injury.description || null
    }));
    
    console.log(`[API-Sports] Returning ${formattedInjuries.length} injuries`);
    
    return res.status(200).json({
      injuries: formattedInjuries,
      success: true,
      source: 'api-sports',
      team: team,
      sport: sport,
      lastUpdated: new Date().toISOString(),
      count: formattedInjuries.length,
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
      source: 'api-sports-failed',
      team: team,
      sport: sport
    });
  }
}