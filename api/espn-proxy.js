// Vercel serverless function for proxying ESPN injury data
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { sport, team } = req.query;
  
  // Validate required parameters
  if (!sport || !team) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      success: false,
      injuries: []
    });
  }
  
  // Validate sport path format
  const validSportPaths = [
    'football/nfl',
    'football/college-football',
    'basketball/nba',
    'basketball/mens-college-basketball',
    'basketball/wnba',
    'baseball/mlb',
    'hockey/nhl'
  ];
  
  if (!validSportPaths.includes(sport)) {
    return res.status(400).json({
      error: 'Invalid sport path',
      success: false,
      injuries: []
    });
  }
  
  try {
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/teams/${team}`;
    
    console.log('[ESPN Proxy] Fetching:', espnUrl);
    
    const response = await fetch(espnUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; SportsAnalytics/1.0)'
      },
      // Add timeout
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[ESPN Proxy] Team not found: ${team} in ${sport}`);
        return res.status(200).json({ 
          injuries: [],
          success: true,
          message: `Team abbreviation '${team}' not found in ESPN database`,
          team: team
        });
      }
      
      throw new Error(`ESPN API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Multiple possible locations for injury data
    const injuries = data.team?.injuries || 
                    data.team?.record?.items?.[0]?.injuries || 
                    data.injuries ||
                    [];
    
    console.log(`[ESPN Proxy] Found ${injuries.length} raw injuries for ${team}`);
    
    // Filter and format injuries
    const filteredInjuries = injuries
      .filter(inj => {
        const status = (inj.status || inj.shortStatus || '').toLowerCase();
        // Exclude season-ending injuries and healthy players
        return status && 
               !status.includes('out for season') && 
               !status.includes('healthy') &&
               status !== 'active';
      })
      .map(inj => {
        const athleteName = inj.athlete?.displayName || 
                           inj.athlete?.fullName || 
                           inj.longComment || 
                           'Player';
        const position = inj.athlete?.position?.abbreviation || 
                        inj.position || 
                        'Unknown';
        const status = inj.status || inj.shortStatus || 'Unknown';
        const injuryType = inj.details?.type || 
                          inj.type || 
                          inj.shortComment || 
                          'Injury';
        
        return {
          headline: `${athleteName} (${position}) - ${status}: ${injuryType}`,
          status: status,
          position: position,
          name: athleteName,
          type: injuryType,
          // Include additional metadata
          details: inj.details?.detail || inj.longComment || null
        };
      });
    
    console.log(`[ESPN Proxy] Returning ${filteredInjuries.length} filtered injuries`);
    
    return res.status(200).json({ 
      injuries: filteredInjuries,
      success: true,
      team: team,
      sport: sport,
      lastUpdated: new Date().toISOString(),
      count: filteredInjuries.length
    });
    
  } catch (error) {
    console.error('[ESPN Proxy] Error:', error.message);
    
    // Return empty injuries with error info rather than failing completely
    return res.status(200).json({ 
      injuries: [],
      success: false,
      error: error.message,
      team: team,
      sport: sport,
      lastUpdated: new Date().toISOString()
    });
  }
}

// Optional: Add edge runtime for faster responses
export const config = {
  runtime: 'edge', // or 'nodejs' if you need Node.js features
};