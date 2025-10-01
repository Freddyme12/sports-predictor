import React, { useState } from "react";

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [selectedSport, setSelectedSport] = useState("americanfootball_nfl");
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const [analyses, setAnalyses] = useState({});
  const [customDataset, setCustomDataset] = useState("");
  const [parsedDataset, setParsedDataset] = useState(null);
  const [datasetLoaded, setDatasetLoaded] = useState(false);
  const [espnDataCache, setEspnDataCache] = useState({});
  
  const [useBackendData, setUseBackendData] = useState(true);
  const [useManualData, setUseManualData] = useState(false);
  const [backendDataAvailable, setBackendDataAvailable] = useState(false);
  const [enhancedData, setEnhancedData] = useState(null);
  const [nfeloData, setNfeloData] = useState(null);
  const [nfeloAvailable, setNfeloAvailable] = useState(false);
  
  // CHANGE THIS TO YOUR DEPLOYED BACKEND URL
  const BACKEND_URL = "https://your-backend.vercel.app";

  const [showWarning, setShowWarning] = useState(true);
  const [userAcknowledged, setUserAcknowledged] = useState(false);

  const systemPrompt = `You are a sports analyst providing rigorous statistical projections and fantasy football analysis. Use the provided CFB/NFL methodologies, show calculations, and account for injuries using corrected 2025 values. Educational purposes only.`;

  const sports = [
    { key: "americanfootball_nfl", title: "NFL" },
    { key: "americanfootball_ncaaf", title: "College Football" },
  ];

  const fetchEnhancedData = async () => {
    if (!useBackendData) return null;
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentWeek = currentMonth >= 8 ? Math.ceil((new Date() - new Date(currentYear, 8, 1)) / (7 * 24 * 60 * 60 * 1000)) : 1;
    
    try {
      let endpoint;
      let params;
      
      if (selectedSport === "americanfootball_nfl") {
        endpoint = `${BACKEND_URL}/api/nfl-enhanced-data`;
        params = `?season=${currentYear}&week=${currentWeek}`;
      } else if (selectedSport === "americanfootball_ncaaf") {
        endpoint = `${BACKEND_URL}/api/cfb-enhanced-data`;
        params = `?year=${currentYear}&week=${currentWeek}`;
      } else {
        throw new Error("Enhanced data only available for NFL/CFB");
      }
      
      console.log('Fetching backend data from:', endpoint + params);
      const response = await fetch(endpoint + params);
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
      console.log('Backend data loaded successfully:', data);
      setEnhancedData(data);
      setBackendDataAvailable(data.games && data.games.length > 0);
      return data;
    } catch (err) {
      console.error("Enhanced data fetch failed:", err);
      setBackendDataAvailable(false);
      setError(`Backend data unavailable: ${err.message}. Using other sources.`);
      return null;
    }
  };

  const fetchNfeloData = async () => {
    if (selectedSport !== "americanfootball_nfl") {
      setNfeloAvailable(false);
      return null;
    }
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentWeek = currentMonth >= 8 ? Math.ceil((new Date() - new Date(currentYear, 8, 1)) / (7 * 24 * 60 * 60 * 1000)) : 1;
    
    try {
      const sources = [
        `https://raw.githubusercontent.com/nfelo/nfelo/main/data/predictions_${currentYear}_week${currentWeek}.json`,
        `${BACKEND_URL}/api/nfelo-proxy?week=${currentWeek}&season=${currentYear}`
      ];
      
      for (const source of sources) {
        try {
          const response = await fetch(source);
          if (response.ok) {
            const data = await response.json();
            if (data && (data.games || data.predictions)) {
              setNfeloData(data);
              setNfeloAvailable(true);
              console.log('nfelo data loaded successfully');
              return data;
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      console.log('nfelo data not available from any source');
      setNfeloAvailable(false);
      return null;
    } catch (err) {
      console.error("nfelo data fetch failed:", err);
      setNfeloAvailable(false);
      return null;
    }
  };

  const calculateAdvancedFeatures = (gameData) => {
    if (!gameData) return null;

    if (gameData.team_data) {
      const home = gameData.team_data.home;
      const away = gameData.team_data.away;

      if (!home || !away) return null;

      return {
        sport: 'CFB',
        spPlusDiff: (home.sp_overall || 0) - (away.sp_overall || 0),
        offSuccessRateDiff: (home.off_success_rate || 0) - (away.off_success_rate || 0),
        homePPG: home.points_per_game || 0,
        awayPPG: away.points_per_game || 0,
      };
    }

    return { sport: 'NFL' };
  };

  const quantifyInjuryImpact = (espnData, isCFB = false) => {
    if (!espnData?.home || !espnData?.away) return { home: 0, away: 0, total: 0 };

    const impactScores = isCFB ? { 'qb': 7.0, 'quarterback': 7.0 } : { 'qb': 5.0, 'quarterback': 5.0 };

    const calculateInjuries = (injuries) => {
      let totalImpact = 0;
      injuries.forEach(inj => {
        const headline = (inj.headline || '').toLowerCase();
        let impact = 0;
        let severity = headline.includes('out') ? 1.0 : headline.includes('doubtful') ? 0.8 : 0.4;
        for (const [pos, value] of Object.entries(impactScores)) {
          if (headline.includes(pos)) {
            impact = Math.max(impact, value);
            break;
          }
        }
        totalImpact += (impact * severity);
      });
      return totalImpact;
    };

    const homeImpact = calculateInjuries(espnData.home?.injuries || []);
    const awayImpact = calculateInjuries(espnData.away?.injuries || []);

    return {
      home: homeImpact,
      away: awayImpact,
      total: homeImpact + awayImpact,
      differential: homeImpact - awayImpact,
    };
  };

  const parseDataset = () => {
    try {
      const parsed = JSON.parse(customDataset);
      setParsedDataset(parsed);
      setDatasetLoaded(true);
      return parsed;
    } catch (err) {
      setDatasetLoaded(false);
      return null;
    }
  };

  const fetchESPNData = async (teamName, sport) => {
    if (!teamName) return { team: teamName, injuries: [] };
    
    try {
      const sportMap = { 
        'americanfootball_nfl': 'football/nfl',
        'americanfootball_ncaaf': 'football/college-football',
      };
      const sportPath = sportMap[sport] || 'football/nfl';
      
      const response = await fetch(
        `${BACKEND_URL}/api/espn-proxy?sport=${sportPath}&team=${teamName}`
      );

      if (!response.ok) {
        return { team: teamName, injuries: [] };
      }

      const data = await response.json();
      return { team: teamName, injuries: data.injuries || [] };
    } catch (error) {
      return { team: teamName, injuries: [] };
    }
  };

  const fetchGames = async () => {
    setLoading(true);
    setError("");
    setGames([]);

    try {
      let gamesWithIds = [];
      let backendData = null;

      if (useBackendData) {
        backendData = await fetchEnhancedData();
      }
      
      if (selectedSport === "americanfootball_nfl") {
        await fetchNfeloData();
      }

      if (apiKey.trim()) {
        try {
          const url = `https://api.the-odds-api.com/v4/sports/${selectedSport}/odds?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
          const response = await fetch(url);

          if (!response.ok) throw new Error(response.status === 401 ? "Invalid API key." : `Error: ${response.status}`);

          const data = await response.json();
          if (data && data.length > 0) {
            gamesWithIds = data.map((game, index) => ({
              ...game,
              id: game.id || `${game.sport_key}_${index}`
            }));
          }
        } catch (apiError) {
          console.error("Odds API error:", apiError);
          setError(`Odds API unavailable. (${apiError.message})`);
        }
      }

      if (backendData && backendData.games) {
        if (gamesWithIds.length > 0) {
          gamesWithIds = gamesWithIds.map(oddsGame => {
            const matchingBackendGame = backendData.games.find(bg => {
              if (!bg.home_team || !bg.away_team || !oddsGame.home_team || !oddsGame.away_team) return false;
              const homeMatch = bg.home_team.toLowerCase().includes(oddsGame.home_team.toLowerCase()) ||
                               oddsGame.home_team.toLowerCase().includes(bg.home_team.toLowerCase());
              const awayMatch = bg.away_team.toLowerCase().includes(oddsGame.away_team.toLowerCase()) ||
                               oddsGame.away_team.toLowerCase().includes(bg.away_team.toLowerCase());
              return homeMatch && awayMatch;
            });
            
            return matchingBackendGame ? {
              ...oddsGame,
              backendEnhancedData: matchingBackendGame
            } : oddsGame;
          });
        } else {
          gamesWithIds = backendData.games.map((game, index) => ({
            id: game.game_id || `backend_${index}`,
            sport_key: selectedSport,
            sport_title: selectedSport.replace(/_/g, ' ').toUpperCase(),
            commence_time: game.date || new Date().toISOString(),
            home_team: game.home_team || 'Unknown',
            away_team: game.away_team || 'Unknown',
            bookmakers: [],
            backendEnhancedData: game
          }));
        }
      }

      if (gamesWithIds.length === 0) {
        setError("No games found. Please enable Backend API or add Odds API key.");
        return;
      }

      setGames(gamesWithIds);

      for (const game of gamesWithIds) {
        if (game.home_team && game.away_team) {
          Promise.all([
            fetchESPNData(game.home_team, selectedSport),
            fetchESPNData(game.away_team, selectedSport)
          ]).then(([homeData, awayData]) => {
            setEspnDataCache(prev => ({
              ...prev,
              [game.id]: { home: homeData, away: awayData }
            }));
          });
        }
      }
    } catch (err) {
      setError(err.message || "Error fetching games");
    } finally {
      setLoading(false);
    }
  };

  const findNfeloPrediction = (game) => {
    if (!nfeloData || !nfeloAvailable || !game.home_team || !game.away_team) return null;
    
    const normalizeTeamName = (name) => {
      return (name || '').toLowerCase().replace(/[^a-z]/g, '');
    };
    
    const gameHome = normalizeTeamName(game.home_team);
    const gameAway = normalizeTeamName(game.away_team);
    
    if (!gameHome || !gameAway) return null;
    
    const predictions = nfeloData.games || nfeloData.predictions || [];
    
    return predictions.find(pred => {
      const predHome = normalizeTeamName(pred.home_team || pred.home || '');
      const predAway = normalizeTeamName(pred.away_team || pred.away || '');
      
      return (gameHome.includes(predHome) || predHome.includes(gameHome)) &&
             (gameAway.includes(predAway) || predAway.includes(gameAway));
    });
  };

  if (showWarning && !userAcknowledged) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ maxWidth: "600px", backgroundColor: "#2d2d2d", borderRadius: "12px", padding: "30px", border: "3px solid #ff6b6b" }}>
          <h1 style={{ color: "#ff6b6b", fontSize: "24px", marginBottom: "20px", textAlign: "center" }}>
            CRITICAL WARNING
          </h1>
          <div style={{ color: "#ffffff", fontSize: "15px", lineHeight: "1.8", marginBottom: "25px" }}>
            <p style={{ marginBottom: "15px", fontWeight: "600" }}>This tool will not make you money betting:</p>
            <ul style={{ marginBottom: "15px", paddingLeft: "20px" }}>
              <li>Best-case accuracy: 54-56% on spreads</li>
              <li>Need 52.4% just to break even at -110</li>
              <li>You WILL lose money most sessions</li>
              <li>Educational and fantasy football purposes only</li>
            </ul>
            <div style={{ backgroundColor: "#ff6b6b", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
              <p style={{ margin: 0, fontWeight: "600" }}>
                Call 1-800-GAMBLER if you have a problem
              </p>
            </div>
          </div>
          <button
            onClick={() => { setUserAcknowledged(true); setShowWarning(false); }}
            style={{ width: "100%", padding: "15px", backgroundColor: "#4a4a4a", color: "white", border: "2px solid #666", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
          >
            I Understand - Continue for Education/Fantasy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", padding: "20px", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", marginBottom: "10px" }}>Sports Analytics System</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>
          Multi-source data integration - Educational Use Only
        </p>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>Configuration</h2>
          
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <input
                type="checkbox"
                checked={useBackendData}
                onChange={(e) => setUseBackendData(e.target.checked)}
              />
              <span>Backend API (SP+, EPA Data)</span>
              {backendDataAvailable && <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>✓ Loaded</span>}
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="The Odds API Key (optional)"
              style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
            />
            <select value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}>
              {sports.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
            </select>
          </div>

          <button onClick={fetchGames} disabled={loading} style={{ padding: "10px 20px", backgroundColor: loading ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Loading..." : "Fetch Games"}
          </button>
        </div>

        {error && <div style={{ backgroundColor: "#fee2e2", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#dc2626" }}>{error}</div>}

        {games.map(game => {
          const espnData = espnDataCache[game.id];
          const advancedFeatures = game.backendEnhancedData ? calculateAdvancedFeatures(game.backendEnhancedData) : null;
          const isCFB = advancedFeatures?.sport === 'CFB';
          const injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : null;
          const nfeloPrediction = !isCFB ? findNfeloPrediction(game) : null;

          return (
            <div key={game.id} style={{ backgroundColor: "white", borderRadius: "8px", marginBottom: "20px", padding: "15px" }}>
              <h3 style={{ margin: "0 0 10px 0" }}>{game.away_team} @ {game.home_team}</h3>
              <div style={{ fontSize: "13px", color: "#666" }}>
                {new Date(game.commence_time).toLocaleString()}
              </div>
              
              {nfeloPrediction && (
                <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "4px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#004085" }}>
                    nfelo Prediction: {game.home_team} {nfeloPrediction.predicted_spread > 0 ? '-' : '+'}
                    {Math.abs(nfeloPrediction.predicted_spread || 0)}
                  </div>
                </div>
              )}
              
              {injuryImpact && injuryImpact.total > 0 && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#856404" }}>
                  Injury Impact: {injuryImpact.total.toFixed(1)} points total
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#dc3545", color: "white", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Educational & Fantasy Only</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Call 1-800-GAMBLER for help.
          </p>
        </div>
      </div>
    </div>
  );
}