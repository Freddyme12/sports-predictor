export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, date, season = '2025', gameId } = req.query;
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
    let oddsUrl = `https://v1.${sportConfig.api}.api-sports.io/odds?league=${sportConfig.league}&season=${season}`;
    
    if (date) {
      oddsUrl += `&date=${date}`;
    }
    
    if (gameId) {
      oddsUrl += `&game=${gameId}`;
    }
    
    console.log(`[API-Sports Odds] Fetching: ${oddsUrl}`);
    
    const oddsResponse = await fetch(oddsUrl, {
      headers: { 'x-apisports-key': apiKey },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!oddsResponse.ok) {
      throw new Error(`Odds API returned ${oddsResponse.status}`);
    }
    
    const oddsData = await oddsResponse.json();
    
    return res.status(200).json({
      odds: oddsData.response || [],
      success: true,
      source: 'api-sports',
      sport: sport,
      season: season,
      date: date,
      count: oddsData.response?.length || 0,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API-Sports Odds] Error:', error.message);
    
    return res.status(200).json({
      odds: [],
      success: false,
      error: error.message,
      source: 'api-sports-failed'
    });
  }
}