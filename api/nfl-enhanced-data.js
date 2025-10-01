export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { season, week } = req.query;
  
  try {
    // Use nflfastR's public schedule data
    const scheduleUrl = `https://github.com/nflverse/nflverse-data/releases/download/schedules/schedules.rds`;
    
    // Alternative: ESPN's NFL API (free, no key needed)
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}`;
    
    const response = await fetch(espnUrl);
    
    if (!response.ok) {
      throw new Error(`ESPN NFL API error: ${response.status}`);
    }
    
    const espnData = await response.json();
    
    // Transform ESPN data to your format
    const games = espnData.events?.map(event => {
      const competition = event.competitions?.[0];
      const homeTeam = competition?.competitors?.find(c => c.homeAway === 'home');
      const awayTeam = competition?.competitors?.find(c => c.homeAway === 'away');
      
      return {
        game_id: event.id,
        home_team: homeTeam?.team?.displayName || 'Unknown',
        away_team: awayTeam?.team?.displayName || 'Unknown',
        date: event.date,
        kickoff_local: event.date,
        teams: {
          home: homeTeam?.team?.displayName,
          away: awayTeam?.team?.displayName
        },
        // Limited NFL data - EPA would require nflfastR processing
        epa_stats: {
          home: {
            // These would need to be calculated from play-by-play data
            // For now, return structure frontend expects
          },
          away: {}
        },
        player_statistics: {},
        team_statistics: {}
      };
    }) || [];
    
    return res.status(200).json({ 
      games,
      success: true,
      source: 'espn-nfl-api',
      note: 'Limited data - full EPA/advanced stats require nflfastR processing or paid API'
    });
    
  } catch (error) {
    console.error('NFL API error:', error);
    return res.status(500).json({ 
      games: [],
      error: true, 
      message: error.message 
    });
  }
}