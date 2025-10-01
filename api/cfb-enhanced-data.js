// api/cfb-enhanced-data.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { year, week } = req.query;

  try {
    const baseUrl = 'https://api.collegefootballdata.com';
    
    // Fetch SP+ ratings
    const spPlusResponse = await fetch(`${baseUrl}/ratings/sp?year=${year}`);
    const spPlusData = await spPlusResponse.json();
    
    // Fetch recruiting data
    const recruitingResponse = await fetch(`${baseUrl}/recruiting/teams?year=${year}`);
    const recruitingData = await recruitingResponse.json();
    
    // Fetch games for the week
    const gamesParams = new URLSearchParams({
      year: year,
      seasonType: 'regular'
    });
    if (week) gamesParams.append('week', week);
    
    const gamesResponse = await fetch(`${baseUrl}/games?${gamesParams}`);
    const gamesData = await gamesResponse.json();
    
    // Combine data
    const enhancedGames = gamesData.map(game => {
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      
      const homeSP = spPlusData.find(t => t.team === homeTeam) || {};
      const awaySP = spPlusData.find(t => t.team === awayTeam) || {};
      
      const homeRecruiting = recruitingData.find(t => t.team === homeTeam) || {};
      const awayRecruiting = recruitingData.find(t => t.team === awayTeam) || {};
      
      return {
        game_id: game.id,
        home_team: homeTeam,
        away_team: awayTeam,
        date: game.start_date,
        team_data: {
          home: {
            sp_overall: homeSP.rating,
            sp_offense: homeSP.offense?.rating,
            sp_defense: homeSP.defense?.rating,
            recruiting_rank: homeRecruiting.rank,
            recruiting_points: homeRecruiting.points
          },
          away: {
            sp_overall: awaySP.rating,
            sp_offense: awaySP.offense?.rating,
            sp_defense: awaySP.defense?.rating,
            recruiting_rank: awayRecruiting.rank,
            recruiting_points: awayRecruiting.points
          }
        }
      };
    });
    
    return res.status(200).json({
      games: enhancedGames,
      source: 'cfbd-api'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}