export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, date, season = '2024', team } = req.query;
  const apiKey = process.env.API_SPORTS_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API_SPORTS_KEY not configured', success: false });
  }
  
  if (!sport) {
    return res.status(400).json({ error: 'Missing sport parameter', success: false });
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
    let gamesUrl = `https://v1.${sportConfig.api}.api-sports.io/games?league=${sportConfig.league}&season=${season}`;
    
    if (date) {
      gamesUrl += `&date=${date}`;
    }
    
    if (team) {
      const teamSearchUrl = `https://v1.${sportConfig.api}.api-sports.io/teams?search=${encodeURIComponent(team)}&league=${sportConfig.league}`;
      const teamResponse = await fetch(teamSearchUrl, {
        headers: { 'x-apisports-key': apiKey },
        signal: AbortSignal.timeout(8000)
      });
      
      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        if (teamData.response && teamData.response.length > 0) {
          const teamId = teamData.response[0].id;
          gamesUrl += `&team=${teamId}`;
        }
      }
    }
    
    console.log(`[API-Sports Games] Fetching: ${gamesUrl}`);
    
    const gamesResponse = await fetch(gamesUrl, {
      headers: { 'x-apisports-key': apiKey },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!gamesResponse.ok) {
      throw new Error(`Games API returned ${gamesResponse.status}`);
    }
    
    const gamesData = await gamesResponse.json();
    
    return res.status(200).json({
      games: gamesData.response || [],
      success: true,
      source: 'api-sports',
      sport: sport,
      season: season,
      date: date,
      count: gamesData.response?.length || 0,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API-Sports Games] Error:', error.message);
    
    return res.status(200).json({
      games: [],
      success: false,
      error: error.message,
      source: 'api-sports-failed'
    });
  }
}