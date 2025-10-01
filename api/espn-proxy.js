export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, team } = req.query;
  const apiKey = process.env.API_SPORTS_KEY;
  
  if (!sport || !team) {
    return res.status(400).json({ 
      error: 'Missing sport or team parameter', 
      success: false 
    });
  }
  
  if (!apiKey) {
    return res.status(200).json({
      injuries: [],
      success: true,
      source: 'no-api-key',
      message: 'API_SPORTS_KEY not configured'
    });
  }
  
  try {
    const sportMap = {
      'football/nfl': { api: 'american-football', league: '1' },
      'football/college-football': { api: 'american-football', league: '2' },
      'basketball/nba': { api: 'basketball', league: '12' },
      'baseball/mlb': { api: 'baseball', league: '1' },
      'hockey/nhl': { api: 'hockey', league: '57' }
    };
    
    const sportConfig = sportMap[sport];
    
    if (!sportConfig) {
      return res.status(200).json({
        injuries: [],
        success: true,
        source: 'unsupported-sport'
      });
    }
    
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
        injuries: [],
        success: true,
        source: 'team-not-found'
      });
    }
    
    const teamId = teamData.response[0].id;
    
    const injuryUrl = `https://v1.${sportConfig.api}.api-sports.io/injuries?team=${teamId}&season=2024`;
    
    const injuryResponse = await fetch(injuryUrl, {
      headers: { 'x-apisports-key': apiKey },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!injuryResponse.ok) {
      throw new Error(`Injuries API returned ${injuryResponse.status}`);
    }
    
    const injuryData = await injuryResponse.json();
    
    const injuries = (injuryData.response || []).map(inj => ({
      headline: `${inj.player?.name || 'Unknown'} - ${inj.type || 'Unknown'} (${inj.reason || 'Unknown'})`
    }));
    
    return res.status(200).json({
      injuries: injuries,
      success: true,
      source: 'api-sports',
      team: team,
      teamId: teamId,
      count: injuries.length,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[ESPN Proxy] Error:', error.message);
    
    return res.status(200).json({
      injuries: [],
      success: false,
      error: error.message,
      source: 'api-sports-failed'
    });
  }
}