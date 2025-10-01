// Helper to fetch from API-Sports
async function fetchFromAPISports(sport, team, apiKey) {
  const sportMap = {
    'football/nfl': { api: 'american-football', league: '1' },
    'football/college-football': { api: 'american-football', league: '2' },
    'basketball/nba': { api: 'basketball', league: '12' },
    'baseball/mlb': { api: 'baseball', league: '1' },
    'hockey/nhl': { api: 'hockey', league: '57' }
  };
  
  const sportConfig = sportMap[sport];
  if (!sportConfig) return null;
  
  const url = `https://v1.${sportConfig.api}.api-sports.io/injuries?league=${sportConfig.league}&season=2024&team=${team}`;
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': `v1.${sportConfig.api}.api-sports.io`
    },
    signal: AbortSignal.timeout(5000)
  });
  
  if (!response.ok) throw new Error('API-Sports failed');
  
  const data = await response.json();
  const injuries = data.response || [];
  
  return injuries.map(injury => ({
    headline: `${injury.player?.name || 'Player'} (${injury.player?.position || 'Unknown'}) - ${injury.type || 'Injury'}: ${injury.reason || 'Unknown'}`,
    status: injury.type || 'Unknown',
    position: injury.player?.position || 'Unknown',
    name: injury.player?.name || 'Player',
    type: injury.reason || 'Unknown'
  }));
}

// Helper to fetch from ESPN
async function fetchFromESPN(sport, team) {
  const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/teams/${team}`;
  
  const response = await fetch(espnUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    },
    signal: AbortSignal.timeout(5000)
  });
  
  if (!response.ok) throw new Error('ESPN failed');
  
  const data = await response.json();
  const injuries = data.team?.injuries || [];
  
  return injuries
    .filter(inj => {
      const status = (inj.status || '').toLowerCase();
      return status && !status.includes('out for season');
    })
    .map(inj => ({
      headline: `${inj.athlete?.displayName || 'Player'} (${inj.athlete?.position?.abbreviation || 'Unknown'}) - ${inj.status || 'Unknown'}: ${inj.details?.type || inj.type || 'Injury'}`,
      status: inj.status || 'Unknown',
      position: inj.athlete?.position?.abbreviation || 'Unknown',
      name: inj.athlete?.displayName || 'Player',
      type: inj.details?.type || inj.type || 'Injury'
    }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, team } = req.query;
  const apiSportsKey = process.env.API_SPORTS_KEY;
  
  if (!sport || !team) {
    return res.status(400).json({ 
      error: 'Missing parameters',
      success: false 
    });
  }
  
  let injuries = [];
  let source = 'none';
  let error = null;
  
  // Try API-Sports first (if key is configured)
  if (apiSportsKey) {
    try {
      injuries = await fetchFromAPISports(sport, team, apiSportsKey);
      source = 'api-sports';
      console.log(`[Hybrid] API-Sports returned ${injuries.length} injuries`);
    } catch (err) {
      console.warn('[Hybrid] API-Sports failed:', err.message);
      error = err.message;
    }
  }
  
  // Fallback to ESPN if API-Sports failed or returned no data
  if (injuries.length === 0) {
    try {
      injuries = await fetchFromESPN(sport, team);
      source = 'espn';
      console.log(`[Hybrid] ESPN returned ${injuries.length} injuries`);
    } catch (err) {
      console.warn('[Hybrid] ESPN also failed:', err.message);
      if (!error) error = err.message;
    }
  }
  
  return res.status(200).json({
    injuries: injuries,
    success: injuries.length > 0 || source !== 'none',
    source: source,
    team: team,
    sport: sport,
    lastUpdated: new Date().toISOString(),
    count: injuries.length,
    fallbackUsed: source === 'espn' && apiSportsKey,
    error: injuries.length === 0 ? error : null
  });
}