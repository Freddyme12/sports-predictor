export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { sport, team } = req.query;
  
  if (!sport || !team) {
    return res.status(400).json({ error: 'Missing sport or team parameter' });
  }
  
  try {
    // ESPN team endpoint - team must be abbreviation (e.g., "buf", "dal")
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/teams/${team}`;
    
    console.log('Fetching ESPN injuries from:', espnUrl);
    
    const response = await fetch(espnUrl);
    
    if (!response.ok) {
      // Common issue: team abbreviation not found
      if (response.status === 404) {
        console.warn(`ESPN team not found: ${team} for sport ${sport}`);
        return res.status(200).json({ 
          injuries: [],
          success: true,
          message: `Team ${team} not found in ESPN database`
        });
      }
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // DEBUG: Log structure
    console.log('ESPN response structure:', {
      hasTeam: !!data.team,
      hasInjuries: !!data.team?.injuries,
      injuryCount: data.team?.injuries?.length || 0
    });
    
    // ESPN injury data might be at different locations
    const injuries = data.team?.injuries || data.team?.record?.items?.[0]?.injuries || [];
    
    const filteredInjuries = injuries
      .filter(inj => {
        // Keep all injury statuses except season-ending
        const status = inj.status || inj.shortStatus || '';
        return status && !status.toLowerCase().includes('out for season');
      })
      .map(inj => {
        const athleteName = inj.athlete?.displayName || inj.athlete?.fullName || 'Player';
        const position = inj.athlete?.position?.abbreviation || inj.position || 'Unknown';
        const status = inj.status || inj.shortStatus || 'Unknown';
        const injuryType = inj.details?.type || inj.type || 'Injury';
        
        return {
          headline: `${athleteName} (${position}) - ${status}: ${injuryType}`,
          status: status,
          position: position,
          name: athleteName
        };
      });
    
    console.log(`Processed ${filteredInjuries.length} injuries for ${team}`);
    
    return res.status(200).json({ 
      injuries: filteredInjuries,
      success: true,
      team: team 
    });
    
  } catch (error) {
    console.error('ESPN proxy error:', error);
    // Return empty injuries rather than failing completely
    return res.status(200).json({ 
      injuries: [],
      success: false,
      message: error.message,
      team: team
    });
  }
}