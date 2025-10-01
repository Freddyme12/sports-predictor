const fetchApiSportsData = async (team, sport) => {
  const baseUrl = BACKEND_URL;
  
  try {
    const [injuries, stats, players] = await Promise.all([
      fetch(`${baseUrl}/api/espn-proxy?sport=${sport}&team=${encodeURIComponent(team)}`).then(r => r.json()),
      fetch(`${baseUrl}/api/apisports-stats?sport=${sport}&team=${encodeURIComponent(team)}`).then(r => r.json()),
      fetch(`${baseUrl}/api/apisports-players?sport=${sport}&team=${encodeURIComponent(team)}`).then(r => r.json())
    ]);
    
    return {
      injuries: injuries.injuries || [],
      statistics: stats.statistics,
      players: players.players || [],
      source: 'api-sports'
    };
  } catch (error) {
    console.error('API-Sports fetch error:', error);
    return null;
  }
};