export default async function handler(req, res) {
  const apiKey = process.env.API_SPORTS_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'No API key configured' });
  }
  
  try {
    // Test 1: Check available seasons
    const seasonsResponse = await fetch('https://v1.american-football.api-sports.io/seasons', {
      headers: { 'x-apisports-key': apiKey }
    });
    const seasons = await seasonsResponse.json();
    
    // Test 2: Get NFL teams for 2024 season
    const teamsResponse = await fetch('https://v1.american-football.api-sports.io/teams?league=1&season=2024', {
      headers: { 'x-apisports-key': apiKey }
    });
    const teams = await teamsResponse.json();
    
    // Test 3: Try searching for 49ers
    const searchResponse = await fetch('https://v1.american-football.api-sports.io/teams?search=49ers&league=1', {
      headers: { 'x-apisports-key': apiKey }
    });
    const search = await searchResponse.json();
    
    return res.status(200).json({
      apiKeyPresent: true,
      availableSeasons: seasons.response || [],
      teamsCount: teams.response?.length || 0,
      searchResults: search.response || [],
      message: 'Check if 2024 is in available seasons'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}