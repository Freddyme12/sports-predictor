export default async function handler(req, res) {
  const apiKey = process.env.API_SPORTS_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'No API key configured' });
  }
  
  try {
    // Get all NFL teams
    const teamsResponse = await fetch('https://v1.american-football.api-sports.io/teams?league=1', {
      headers: { 'x-apisports-key': apiKey }
    });
    const teamsData = await teamsResponse.json();
    
    // Extract just the id and name
    const teams = (teamsData.response || []).map(t => ({
      id: t.id,
      name: t.name
    }));
    
    return res.status(200).json({
      count: teams.length,
      teams: teams
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}