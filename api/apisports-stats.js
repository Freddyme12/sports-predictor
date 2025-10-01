export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, team, season = '2024' } = req.query;
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
    const teamSearchUrl = `https://v1.${sportConfig.api}.api-sports.io/teams?search=${encodeURIComponent(team)}&league=${sportConfig.league}`;
    
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
        statistics: null,
        success: true,
        message: 'Team not found'
      });
    }
    
    const teamId = teamData.response[0].id;
    
    const statsUrl = `https://v1.${sportConfig.api}.api-sports.io/teams/statistics?league=${sportConfig.league}&season=${season}&team=${teamId}`;
    
    console.log(`[API-Sports Stats] Fetching: ${statsUrl}`);
    
    const statsResponse = await fetch(statsUrl, {
      headers: { 'x-apisports-key': apiKey },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!statsResponse.ok) {
      throw new Error(`Statistics API returned ${statsResponse.status}`);
    }
    
    const statsData = await statsResponse.json();
    
    return res.status(200).json({
      statistics: statsData.response,
      success: true,
      source: 'api-sports',
      team: team,
      teamId: teamId,
      sport: sport,
      season: season,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API-Sports Stats] Error:', error.message);
    
    return res.status(200).json({
      statistics: null,
      success: false,
      error: error.message,
      source: 'api-sports-failed'
    });
  }
}