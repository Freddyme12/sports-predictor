export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, team, season = '2025', playerId } = req.query;
  const apiKey = process.env.API_SPORTS_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API_SPORTS_KEY not configured', success: false });
  }
  
  if (!sport || !team) {
    return res.status(400).json({ error: 'Missing sport or team parameter', success: false });
  }
  
  const sportMap = {
    'football/nfl': { api: 'american-football', league: '1' },
    'football/college-football': { api: 'american-football', league: '2' },
    'basketball/nba': { api: 'basketball', league: '12' },
    'baseball/mlb': { api: 'baseball', league: '1' },
    'hockey/nhl': { api: 'hockey', league: '57' }
  };
  
  const sportConfig = sportMap[sport];
  
  if (!sportConfig) {
    return res.status(400).json({ error: 'Unsupported sport', success: false });
  }
  
  try {
    // Step 1: Get team ID
    const teamSearchUrl = `https://v1.${sportConfig.api}.api-sports.io/teams?name=${encodeURIComponent(team)}&league=${sportConfig.league}`;
    
    const teamResponse = await fetch(teamSearchUrl, {
      headers: { 'x-apisports-key': apiKey },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!teamResponse.ok) {
      throw new Error(`Team lookup returned ${teamResponse.status}`);
    }
    
    const teamData = await teamResponse.json();
    
    if (!teamData.response || teamData.response.length === 0) {
      return res.status(200).json({
        players: [],
        success: true,
        message: 'Team not found'
      });
    }
    
    const teamId = teamData.response[0].id;
    
    // Step 2: Get player statistics
    let playersUrl = `https://v1.${sportConfig.api}.api-sports.io/players/statistics?league=${sportConfig.league}&season=${season}&team=${teamId}`;
    
    if (playerId) {
      playersUrl += `&id=${playerId}`;
    }
    
    console.log(`[API-Sports Players] Fetching: ${playersUrl}`);
    
    const playersResponse = await fetch(playersUrl, {
      headers: { 'x-apisports-key': apiKey },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!playersResponse.ok) {
      throw new Error(`Players API returned ${playersResponse.status}`);
    }
    
    const playersData = await playersResponse.json();
    
    return res.status(200).json({
      players: playersData.response || [],
      success: true,
      source: 'api-sports',
      team: team,
      teamId: teamId,
      sport: sport,
      season: season,
      count: playersData.response?.length || 0,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API-Sports Players] Error:', error.message);
    
    return res.status(200).json({
      players: [],
      success: false,
      error: error.message,
      source: 'api-sports-failed'
    });
  }
}