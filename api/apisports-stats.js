// NFL Team ID Mapping
const NFL_TEAM_IDS = {
  'Arizona Cardinals': 11, 'Atlanta Falcons': 8, 'Baltimore Ravens': 5, 'Buffalo Bills': 20,
  'Carolina Panthers': 19, 'Chicago Bears': 16, 'Cincinnati Bengals': 10, 'Cleveland Browns': 9,
  'Dallas Cowboys': 29, 'Denver Broncos': 28, 'Detroit Lions': 7, 'Green Bay Packers': 15,
  'Houston Texans': 26, 'Indianapolis Colts': 21, 'Jacksonville Jaguars': 2, 'Kansas City Chiefs': 17,
  'Las Vegas Raiders': 1, 'Los Angeles Chargers': 30, 'Los Angeles Rams': 31, 'Miami Dolphins': 25,
  'Minnesota Vikings': 32, 'New England Patriots': 3, 'New Orleans Saints': 27, 'New York Giants': 4,
  'New York Jets': 13, 'Philadelphia Eagles': 12, 'Pittsburgh Steelers': 22, 'San Francisco 49ers': 14,
  'Seattle Seahawks': 23, 'Tampa Bay Buccaneers': 24, 'Tennessee Titans': 6, 'Washington Commanders': 18,
  'Cardinals': 11, 'Falcons': 8, 'Ravens': 5, 'Bills': 20, 'Panthers': 19, 'Bears': 16,
  'Bengals': 10, 'Browns': 9, 'Cowboys': 29, 'Broncos': 28, 'Lions': 7, 'Packers': 15,
  'Texans': 26, 'Colts': 21, 'Jaguars': 2, 'Chiefs': 17, 'Raiders': 1, 'Chargers': 30,
  'Rams': 31, 'Dolphins': 25, 'Vikings': 32, 'Patriots': 3, 'Saints': 27, 'Giants': 4,
  'Jets': 13, 'Eagles': 12, 'Steelers': 22, '49ers': 14, 'Seahawks': 23, 'Buccaneers': 24,
  'Bucs': 24, 'Titans': 6, 'Commanders': 18
};

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
    // Try direct lookup first (NFL only)
    let teamId = sport === 'football/nfl' ? NFL_TEAM_IDS[team] : null;
    
    // Fallback to API search if not found
    if (!teamId) {
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
      
      teamId = teamData.response[0].id;
    }
    
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