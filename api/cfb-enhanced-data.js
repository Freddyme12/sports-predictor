export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { year, week } = req.query;
  
  const CFB_API_KEY = process.env.CFB_API_KEY;
  
  if (!CFB_API_KEY) {
    return res.status(200).json({ 
      games: [], 
      error: true,
      message: 'CFB_API_KEY not set. Get free key at collegefootballdata.com' 
    });
  }
  
  try {
    const gamesResponse = await fetch(
      `https://api.collegefootballdata.com/games?year=${year}&week=${week}&seasonType=regular`,
      { headers: { 'Authorization': `Bearer ${CFB_API_KEY}` }}
    );
    
    if (!gamesResponse.ok) {
      throw new Error(`CFB API error: ${gamesResponse.status}`);
    }
    
    const gamesData = await gamesResponse.json();
    
    // DEBUG: Log first game to see structure
    if (gamesData.length > 0) {
      console.log('First CFB game structure:', JSON.stringify(gamesData[0], null, 2));
    }
    
    const ratingsResponse = await fetch(
      `https://api.collegefootballdata.com/ratings/sp?year=${year}`,
      { headers: { 'Authorization': `Bearer ${CFB_API_KEY}` }}
    );
    
    const ratings = ratingsResponse.ok ? await ratingsResponse.json() : [];
    
    const enhancedGames = gamesData.map(game => {
      // FIXED: Try multiple possible field names for teams
      const homeTeam = game.home_team || game.homeTeam || game.home || 'Unknown Home';
      const awayTeam = game.away_team || game.awayTeam || game.away || 'Unknown Away';
      
      const homeRating = ratings.find(r => r.team === homeTeam);
      const awayRating = ratings.find(r => r.team === awayTeam);
      
      return {
        game_id: game.id,
        home_team: homeTeam,  // FIXED: Use extracted team name
        away_team: awayTeam,  // FIXED: Use extracted team name
        date: game.start_date,
        team_data: {
          home: {
            school: homeTeam,  // ADDED: Include team name in team_data too
            sp_overall: homeRating?.rating || 0,
            sp_offense: homeRating?.offense?.rating || 0,
            sp_defense: homeRating?.defense?.rating || 0,
            off_success_rate: homeRating?.offense?.success || 0,
            def_success_rate: homeRating?.defense?.success || 0,
            off_explosiveness: homeRating?.offense?.explosiveness || 0,
            havoc_rate: homeRating?.defense?.havoc?.total || 0,
            points_per_game: game.home_points || 0,
            record: `${game.home_pregame_elo ? 'TBD' : '0-0'}`,
          },
          away: {
            school: awayTeam,  // ADDED: Include team name in team_data too
            sp_overall: awayRating?.rating || 0,
            sp_offense: awayRating?.offense?.rating || 0,
            sp_defense: awayRating?.defense?.rating || 0,
            off_success_rate: awayRating?.offense?.success || 0,
            def_success_rate: awayRating?.defense?.success || 0,
            off_explosiveness: awayRating?.offense?.explosiveness || 0,
            havoc_rate: awayRating?.defense?.havoc?.total || 0,
            points_per_game: game.away_points || 0,
            record: `${game.away_pregame_elo ? 'TBD' : '0-0'}`,
          }
        }
      };
    });
    
    return res.status(200).json({ games: enhancedGames, success: true });
    
  } catch (error) {
    console.error('CFB API error:', error);
    return res.status(500).json({ 
      games: [],
      error: true, 
      message: error.message 
    });
  }
}