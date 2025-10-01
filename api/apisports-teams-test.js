export default async function handler(req, res) {
  const apiKey = process.env.API_SPORTS_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'No API key configured' });
  }
  
  try {
    // Get all NFL teams - requires BOTH league and season
    const teamsResponse = await fetch('https://v1.american-football.api-sports.io/teams?league=1&season=2024', {
      headers: { 'x-apisports-key': apiKey }
    });
    
    if (!teamsResponse.ok) {
      throw new Error(`API returned ${teamsResponse.status}`);
    }
    
    const teamsData = await teamsResponse.json();
    
    // Extract id and name from response
    const teams = (teamsData.response || []).map(t => ({
      id: t.id,
      name: t.name
    }));
    
    return res.status(200).json({
      success: true,
      count: teams.length,
      teams: teams
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}