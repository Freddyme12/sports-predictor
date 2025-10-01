export default async function handler(req, res) {
  const apiKey = process.env.API_SPORTS_KEY;
  
  try {
    // Get all NFL teams
    const response = await fetch('https://v1.american-football.api-sports.io/teams?league=1', {
      headers: { 'x-apisports-key': apiKey }
    });
    
    const data = await response.json();
    
    return res.status(200).json({
      teams: data.response,
      count: data.response?.length || 0
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}