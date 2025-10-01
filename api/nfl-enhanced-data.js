export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { season, week } = req.query;
  
  try {
    // ESPN's NFL API for schedule/games
    // Note: ESPN API doesn't use season parameter the way you're using it
    // Format: ?dates=YYYYMMDD or ?week=X&seasontype=2
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}`;
    
    console.log('Fetching NFL data from:', espnUrl);
    
    const response = await fetch(espnUrl);
    
    if (!response.ok) {
      throw new Error(`ESPN NFL API error: ${response.status}`);
    }
    
    const espnData = await response.json();
    
    // DEBUG: Log first game structure
    if (espnData.events?.length > 0) {
      console.log('First NFL game structure:', JSON.stringify(espnData.events[0], null, 2));
    }
    
    // Transform ESPN data to your format
    const games = espnData.events?.map(event => {
      const competition = event.competitions?.[0];
      const homeTeam = competition?.competitors?.find(c => c.homeAway === 'home');
      const awayTeam = competition?.competitors?.find(c => c.homeAway === 'away');
      
      const homeTeamName = homeTeam?.team?.displayName || homeTeam?.team?.name || 'Unknown Home';
      const awayTeamName = awayTeam?.team?.displayName || awayTeam?.team?.name || 'Unknown Away';
      
      return {
        game_id: event.id,
        home_team: homeTeamName,  // CRITICAL: At root level
        away_team: awayTeamName,  // CRITICAL: At root level
        date: event.date,
        kickoff_local: event.date,
        teams: {
          home: homeTeamName,
          away: awayTeamName
        },
        // ESPN provides limited stats - these would need nflfastR or paid API
        epa_stats: {
          home: {
            offense_epa: 0,
            defense_epa: 0
          },
          away: {
            offense_epa: 0,
            defense_epa: 0
          }
        },
        player_statistics: {
          [homeTeamName]: {
            offensive_line_unit: {
              pass_block_win_rate: 0,
              run_block_win_rate: 0,
              sacks_allowed: 0,
              stuff_rate: 0
            }
          },
          [awayTeamName]: {
            offensive_line_unit: {
              pass_block_win_rate: 0,
              run_block_win_rate: 0,
              sacks_allowed: 0,
              stuff_rate: 0
            }
          }
        },
        team_statistics: {
          [homeTeamName]: {
            special_teams: {
              avg_starting_field_pos: 25
            }
          },
          [awayTeamName]: {
            special_teams: {
              avg_starting_field_pos: 25
            }
          }
        },
        matchup_specific: {
          pace_of_play_proxy: {
            [homeTeamName]: 63,
            [awayTeamName]: 63
          }
        }
      };
    }) || [];
    
    console.log(`Processed ${games.length} NFL games`);
    
    return res.status(200).json({ 
      games,
      success: true,
      source: 'espn-nfl-api',
      dataLimitations: 'ESPN provides basic game info only. EPA, O-line, and advanced stats require nflfastR/paid APIs.',
      gamesCount: games.length
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