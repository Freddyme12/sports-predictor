import React, { useState, useEffect } from "react";

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
  const [playerProps, setPlayerProps] = useState({});
  const [propAnalyses, setPropAnalyses] = useState({});
  
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [modelPerformance, setModelPerformance] = useState({
    totalPredictions: 0,
    correct: 0,
    spreadAccuracy: 0,
    totalAccuracy: 0,
    propAccuracy: 0
  });

  const [showWarning, setShowWarning] = useState(true);
  const [userAcknowledged, setUserAcknowledged] = useState(false);
  const [showPropWarning, setShowPropWarning] = useState(false);

  const systemPrompt = `You are a sports analyst. Provide realistic, data-driven analysis.

CONFIDENCE CALIBRATION:
⭐ (20-40%): Coin flip with slight lean
⭐⭐ (40-55%): Weak edge, high uncertainty  
⭐⭐⭐ (55-65%): Moderate edge
⭐⭐⭐⭐ (65-75%): Strong edge (rare)
⭐⭐⭐⭐⭐ (75%+): Exceptional edge (very rare)

NEVER claim certainty. Variance is massive in sports.

GAME ANALYSIS FRAMEWORK:
1. O-line differentials (pass/run block rates, sacks, stuffs)
2. Field position value (avg starting position)
3. Pace metrics for totals
4. Injury impact (QB: -8pts, WR1: -3pts, etc.)
5. Market comparison - calculate EV
6. Red zone efficiency differential
7. Turnover margins
8. Third down conversion rates

PLAYER PROP ANALYSIS (CRITICAL):
For each prop, analyze:
1. **Usage Rate**: Target share, snap %, touches per game
2. **Pace Impact**: Fast pace = more opportunities
3. **Matchup**: Opponent's defense vs position (rank, EPA allowed)
4. **Recent Form**: Last 3 games weighted heavily
5. **Game Script**: Expected score margin affects volume
6. **Weather**: Wind/rain kills passing props
7. **Injury Context**: Teammate injuries create opportunity
8. **Line Value**: Compare to season average + recent trend

PROP PROJECTION FORMULA:
Season Avg × 0.30 + Last 5 Games Avg × 0.40 + Matchup Adjustment × 0.30

MARKET EDGE CALCULATION:
- Project the prop number
- Compare to market line
- Calculate win probability
- Expected Value = (WinProb × 0.91) - (LoseProb × 1.0)
- Only recommend if EV > 5% (props have wider hold)

OUTPUT FORMAT:
Primary Pick: [Specific prop] Over/Under [Line] at [Book]
Projection: [Your number] vs Market [Line]
Edge: [X]% advantage
Confidence: ⭐⭐⭐
Expected Value: +X.X%
Key Factors: [List with numbers]
Risk Factors: [What could go wrong]

REALITY CHECK: Props are the toughest bet type. Books have 8-15% hold. Most bettors lose more on props than any other bet type.`;

  const sports = [
    { key: "americanfootball_nfl", title: "NFL" },
    { key: "basketball_nba", title: "NBA" },
    { key: "baseball_mlb", title: "MLB" },
    { key: "icehockey_nhl", title: "NHL" },
  ];

  // Player position mappings for prop analysis
  const nflPositionImpact = {
    QB: { passing_yards: 1.0, passing_tds: 1.0, rushing_yards: 0.3 },
    RB: { rushing_yards: 1.0, rushing_tds: 0.8, receptions: 0.6, receiving_yards: 0.5 },
    WR: { receptions: 1.0, receiving_yards: 1.0, receiving_tds: 0.7 },
    TE: { receptions: 0.8, receiving_yards: 0.7, receiving_tds: 0.5 }
  };

  const calculateAdvancedFeatures = (gameData) => {
    if (!gameData) return null;

    const home = gameData.player_statistics?.[gameData.teams.home]?.offensive_line_unit;
    const away = gameData.player_statistics?.[gameData.teams.away]?.offensive_line_unit;
    const homeSpecial = gameData.team_statistics?.[gameData.teams.home]?.special_teams;
    const awaySpecial = gameData.team_statistics?.[gameData.teams.away]?.special_teams;
    const pace = gameData.matchup_specific?.pace_of_play_proxy;

    if (!home || !away) return null;

    return {
      passBlockAdvantage: home.pass_block_win_rate - away.pass_block_win_rate,
      runBlockAdvantage: home.run_block_win_rate - away.run_block_win_rate,
      pressureIndex: (away.sacks_allowed / (away.pass_block_win_rate || 1)) - 
                     (home.sacks_allowed / (home.pass_block_win_rate || 1)),
      homeOLineScore: (home.pass_block_win_rate * 0.4) + (home.run_block_win_rate * 0.3) - 
                      (home.sacks_allowed * 2) - (home.stuff_rate * 0.5),
      awayOLineScore: (away.pass_block_win_rate * 0.4) + (away.run_block_win_rate * 0.3) - 
                      (away.sacks_allowed * 2) - (away.stuff_rate * 0.5),
      fieldPositionAdvantage: (homeSpecial?.avg_starting_field_pos || 0) - 
                              (awaySpecial?.avg_starting_field_pos || 0),
      fieldPositionPointValue: ((homeSpecial?.avg_starting_field_pos || 0) - 
                                (awaySpecial?.avg_starting_field_pos || 0)) / 3,
      combinedPace: pace ? ((pace[gameData.teams.home] + pace[gameData.teams.away]) / 2) : null,
      paceTotal: pace ? (pace[gameData.teams.home] + pace[gameData.teams.away]) : null,
      paceTotalIndicator: pace ? ((pace[gameData.teams.home] + pace[gameData.teams.away]) > 126 ? "OVER" : "UNDER") : null,
    };
  };

  const quantifyInjuryImpact = (espnData) => {
    if (!espnData?.home || !espnData?.away) return { home: 0, away: 0, total: 0 };

    const impactScores = {
      'qb': 8.5, 'quarterback': 8.5,
      'rb': 2.5, 'running back': 2.5,
      'wr': 3.0, 'wide receiver': 3.0, 'receiver': 3.0,
      'te': 2.0, 'tight end': 2.0,
    };

    const calculateInjuries = (injuries) => {
      return injuries.reduce((total, inj) => {
        const headline = inj.headline.toLowerCase();
        let impact = 0;
        let severity = headline.includes('out') ? 1.0 : 
                      headline.includes('doubtful') ? 0.8 : 
                      headline.includes('questionable') ? 0.4 : 0.5;

        for (const [pos, value] of Object.entries(impactScores)) {
          if (headline.includes(pos)) impact = Math.max(impact, value);
        }
        return total + (impact * severity);
      }, 0);
    };

    const homeImpact = calculateInjuries(espnData.home?.injuries || []);
    const awayImpact = calculateInjuries(espnData.away?.injuries || []);

    return {
      home: homeImpact,
      away: awayImpact,
      total: homeImpact + awayImpact,
      differential: homeImpact - awayImpact,
      confidenceReduction: Math.min(Math.floor((homeImpact + awayImpact) / 3), 2)
    };
  };

  // NEW: Fetch player props from The Odds API
  const fetchPlayerProps = async (gameId) => {
    if (!apiKey.trim()) return;

    try {
      // The Odds API supports player props for major markets
      const propsUrl = `https://api.the-odds-api.com/v4/sports/${selectedSport}/events/${gameId}/odds?apiKey=${apiKey}&regions=us&markets=player_pass_tds,player_pass_yds,player_rush_yds,player_receptions,player_reception_yds&oddsFormat=american`;
      
      const response = await fetch(propsUrl);
      if (response.ok) {
        const data = await response.json();
        setPlayerProps(prev => ({ ...prev, [gameId]: data }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching player props:', error);
    }
    return null;
  };

  // NEW: Analyze player prop value
  const analyzePlayerProp = async (gameId, game, prop) => {
    const key = `${gameId}_${prop.player}_${prop.market}`;
    setPropAnalyses(prev => ({ ...prev, [key]: { loading: true } }));

    try {
      const datasetGame = findMatchingDatasetGame(game);
      const espnData = espnDataCache[gameId];
      const advancedFeatures = datasetGame ? calculateAdvancedFeatures(datasetGame) : null;

      // Fetch player stats from ESPN
      let playerStats = null;
      try {
        const sportMap = { 'americanfootball_nfl': 'nfl', 'basketball_nba': 'nba' };
        const espnSport = sportMap[selectedSport] || 'nfl';
        const playerName = prop.player.replace(/\s+/g, '-').toLowerCase();
        
        // This is a simplified example - real implementation needs player ID lookup
        const statsResponse = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/${espnSport === 'nfl' ? 'football/nfl' : espnSport}/players/${playerName}/statistics`
        );
        
        if (statsResponse.ok) {
          playerStats = await statsResponse.json();
        }
      } catch (e) {
        console.log('Could not fetch player stats:', e);
      }

      let prompt = `Analyze this player prop for ${prop.player}:\n\n`;
      prompt += `Market: ${prop.market}\n`;
      prompt += `Line: ${prop.line}\n`;
      prompt += `Price: ${prop.price}\n`;
      prompt += `Bookmaker: ${prop.bookmaker}\n\n`;

      if (advancedFeatures) {
        prompt += `**GAME CONTEXT:**\n`;
        prompt += `Pace: ${advancedFeatures.combinedPace?.toFixed(1)} plays/game (${advancedFeatures.combinedPace > 63 ? 'FAST - more opportunities' : 'SLOW - fewer opportunities'})\n`;
        prompt += `O-Line Protection: ${advancedFeatures.passBlockAdvantage > 0 ? 'Home advantage' : 'Away advantage'} (${Math.abs(advancedFeatures.passBlockAdvantage).toFixed(1)}%)\n`;
        prompt += `Field Position: ${advancedFeatures.fieldPositionPointValue.toFixed(1)} point advantage\n\n`;
      }

      if (playerStats) {
        prompt += `**PLAYER STATS:**\n`;
        prompt += `Season Average: [Extract from playerStats]\n`;
        prompt += `Last 5 Games: [Extract from playerStats]\n`;
        prompt += `Usage Rate: [Calculate from stats]\n\n`;
      }

      if (espnData) {
        prompt += `**INJURY CONTEXT:**\n`;
        const playerTeam = game.home_team === prop.team ? 'home' : 'away';
        const teamInjuries = espnData[playerTeam]?.injuries || [];
        
        prompt += `Team injuries that could increase ${prop.player}'s opportunity:\n`;
        teamInjuries.forEach((inj, i) => {
          prompt += `${i + 1}. ${inj.headline}\n`;
        });
      }

      prompt += `\n**ANALYSIS REQUIRED:**\n`;
      prompt += `1. Project ${prop.player}'s expected ${prop.market} in this game\n`;
      prompt += `2. Compare to market line of ${prop.line}\n`;
      prompt += `3. Calculate edge percentage\n`;
      prompt += `4. Assess confidence level (1-5 stars)\n`;
      prompt += `5. Calculate expected value\n`;
      prompt += `6. List key factors supporting your projection\n`;
      prompt += `7. List risk factors that could invalidate the play\n\n`;
      prompt += `Remember: Props have 8-15% hold. You need 57%+ win rate to profit. Be conservative.`;

      const response = await fetch("https://oi-server.onrender.com/chat/completions", {
        method: "POST",
        headers: {
          customerId: "cus_T8KQITv93Z8sBZ",
          "Content-Type": "application/json",
          Authorization: "Bearer xxx",
        },
        body: JSON.stringify({
          model: "openrouter/claude-sonnet-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
        }),
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.status}`);

      const result = await response.json();
      const analysis = result.choices[0]?.message?.content || "Analysis unavailable";

      setPropAnalyses(prev => ({
        ...prev,
        [key]: { loading: false, text: analysis, prop }
      }));
    } catch (err) {
      setPropAnalyses(prev => ({
        ...prev,
        [key]: { loading: false, text: `Error: ${err.message}`, prop }
      }));
    }
  };

  const calculateStatisticalPrediction = (gameData, advancedFeatures, injuryImpact) => {
    if (!advancedFeatures) return null;

    let homeAdvantage = 2.5;
    homeAdvantage += (advancedFeatures.passBlockAdvantage * 0.05);
    homeAdvantage += (advancedFeatures.runBlockAdvantage * 0.03);
    homeAdvantage += advancedFeatures.fieldPositionPointValue;
    homeAdvantage -= (injuryImpact.home * 0.7);
    homeAdvantage += (injuryImpact.away * 0.7);
    
    const projectedSpread = Math.round(homeAdvantage * 2) / 2;

    return {
      projectedSpread,
      projectedTotal: advancedFeatures.combinedPace ? (advancedFeatures.combinedPace * 0.35) : null,
      confidence: Math.max(1, 3 - injuryImpact.confidenceReduction)
    };
  };

  const findMarketValue = (game, statProjection) => {
    if (!game.bookmakers || !statProjection) return null;

    let bestHomeSpread = null;
    game.bookmakers.forEach(book => {
      const spreadMarket = book.markets?.find(m => m.key === 'spreads');
      if (spreadMarket) {
        spreadMarket.outcomes.forEach(outcome => {
          if (outcome.name === game.home_team && (!bestHomeSpread || outcome.point < bestHomeSpread.point)) {
            bestHomeSpread = { point: outcome.point, price: outcome.price, book: book.title };
          }
        });
      }
    });

    if (!bestHomeSpread) return null;

    const marketSpread = bestHomeSpread.point;
    const projectedSpread = statProjection.projectedSpread;
    const differential = projectedSpread - marketSpread;
    const winProb = 0.5 + (differential * 0.03);
    const expectedValue = ((winProb * 0.91) - ((1 - winProb) * 1)) * 100;

    return {
      marketSpread,
      projectedSpread,
      differential: Math.abs(differential),
      recommendation: differential > 0 ? 'HOME' : 'AWAY',
      expectedValue,
      hasValue: expectedValue > 3,
      bestLine: bestHomeSpread,
      confidence: statProjection.confidence
    };
  };

  const parseDataset = () => {
    try {
      const parsed = JSON.parse(customDataset);
      setParsedDataset(parsed);
      return parsed;
    } catch (err) {
      return null;
    }
  };

  const fetchESPNData = async (teamName, sport) => {
    try {
      const sportMap = { 'americanfootball_nfl': 'nfl', 'basketball_nba': 'nba' };
      const espnSport = sportMap[sport] || 'nfl';
      const teamAbbr = getTeamAbbreviation(teamName, espnSport);
      
      const injuryResponse = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${espnSport === 'nfl' ? 'football/nfl' : espnSport}/news?limit=50&team=${teamAbbr}`
      );

      const newsData = injuryResponse.ok ? await injuryResponse.json() : null;
      const injuries = newsData?.articles?.filter((article) => 
        article.headline.toLowerCase().includes('injury') || 
        article.headline.toLowerCase().includes('out') ||
        article.headline.toLowerCase().includes('questionable')
      ).slice(0, 5) || [];

      return { team: teamName, injuries, lastUpdated: new Date().toISOString() };
    } catch (error) {
      return null;
    }
  };

  const getTeamAbbreviation = (teamName, sport) => {
    const nflTeams = {
      'Arizona Cardinals': 'ari', 'Atlanta Falcons': 'atl', 'Baltimore Ravens': 'bal',
      'Buffalo Bills': 'buf', 'Carolina Panthers': 'car', 'Chicago Bears': 'chi',
      'Cincinnati Bengals': 'cin', 'Cleveland Browns': 'cle', 'Dallas Cowboys': 'dal',
      'Denver Broncos': 'den', 'Detroit Lions': 'det', 'Green Bay Packers': 'gb',
      'Houston Texans': 'hou', 'Indianapolis Colts': 'ind', 'Jacksonville Jaguars': 'jax',
      'Kansas City Chiefs': 'kc', 'Las Vegas Raiders': 'lv', 'Los Angeles Chargers': 'lac',
      'Los Angeles Rams': 'lar', 'Miami Dolphins': 'mia', 'Minnesota Vikings': 'min',
      'New England Patriots': 'ne', 'New Orleans Saints': 'no', 'New York Giants': 'nyg',
      'New York Jets': 'nyj', 'Philadelphia Eagles': 'phi', 'Pittsburgh Steelers': 'pit',
      'San Francisco 49ers': 'sf', 'Seattle Seahawks': 'sea', 'Tampa Bay Buccaneers': 'tb',
      'Tennessee Titans': 'ten', 'Washington Commanders': 'wsh'
    };
    return nflTeams[teamName] || teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
  };

  const fetchGames = async () => {
    setLoading(true);
    setError("");
    setGames([]);

    try {
      let gamesWithIds = [];

      // Try Odds API if key provided
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
          setError(`Odds API unavailable. Using dataset games only. (${apiError.message})`);
        }
      }

      // Fallback to dataset games if no API key or API failed
      if (gamesWithIds.length === 0 && parsedDataset?.games) {
        setError("No Odds API key provided. Loading games from dataset only.");
        gamesWithIds = parsedDataset.games.map((game, index) => ({
          id: game.game_id || `dataset_${index}`,
          sport_key: selectedSport,
          sport_title: selectedSport.replace(/_/g, ' ').toUpperCase(),
          commence_time: game.kickoff_local || new Date().toISOString(),
          home_team: game.teams?.home || 'Unknown',
          away_team: game.teams?.away || 'Unknown',
          bookmakers: [] // No odds data from dataset
        }));
      }

      if (gamesWithIds.length === 0) {
        setError("No games found. Please provide either an Odds API key or load a dataset with games.");
        return;
      }

      setGames(gamesWithIds);

      // Fetch ESPN data and player props for each game
      for (const game of gamesWithIds) {
        Promise.all([
          fetchESPNData(game.home_team, selectedSport),
          fetchESPNData(game.away_team, selectedSport),
          fetchPlayerProps(game.id)
        ]).then(([homeData, awayData]) => {
          setEspnDataCache(prev => ({
            ...prev,
            [game.id]: { home: homeData, away: awayData, fetchedAt: new Date().toISOString() }
          }));
        });
      }
    } catch (err) {
      setError(err.message || "Error fetching games");
    } finally {
      setLoading(false);
    }
  };

  const findMatchingDatasetGame = (oddsGame) => {
    if (!parsedDataset?.games) return null;
    return parsedDataset.games.find((dataGame) => {
      const oddsHome = oddsGame.home_team.toLowerCase().replace(/[^a-z]/g, '');
      const dataHome = (dataGame.teams?.home || "").toLowerCase();
      return oddsHome.includes(dataHome) || dataHome.includes(oddsHome);
    });
  };

  const analyzeGame = async (game) => {
    setAnalyses(prev => ({ ...prev, [game.id]: { loading: true } }));

    try {
      const datasetGame = findMatchingDatasetGame(game);
      const espnData = espnDataCache[game.id];
      const advancedFeatures = datasetGame ? calculateAdvancedFeatures(datasetGame) : null;
      const injuryImpact = espnData ? quantifyInjuryImpact(espnData) : { home: 0, away: 0, total: 0 };
      const statPrediction = advancedFeatures ? calculateStatisticalPrediction(datasetGame, advancedFeatures, injuryImpact) : null;
      const marketAnalysis = statPrediction ? findMarketValue(game, statPrediction) : null;

      let prompt = `Analyze ${game.away_team} @ ${game.home_team}\n\n`;
      
      if (marketAnalysis) {
        prompt += `**STATISTICAL MODEL:**\n`;
        prompt += `Projected: ${game.home_team} ${statPrediction.projectedSpread > 0 ? '-' : '+'}${Math.abs(statPrediction.projectedSpread)}\n`;
        prompt += `Market: ${game.home_team} ${marketAnalysis.marketSpread}\n`;
        prompt += `Edge: ${marketAnalysis.differential.toFixed(1)} pts\n`;
        prompt += `EV: ${marketAnalysis.expectedValue.toFixed(1)}%\n\n`;
      }

      if (datasetGame) {
        prompt += `**DATASET:**\n${JSON.stringify(datasetGame, null, 2)}\n\n`;
      }

      const response = await fetch("https://oi-server.onrender.com/chat/completions", {
        method: "POST",
        headers: {
          customerId: "cus_T8KQITv93Z8sBZ",
          "Content-Type": "application/json",
          Authorization: "Bearer xxx",
        },
        body: JSON.stringify({
          model: "openrouter/claude-sonnet-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
        }),
      });

      const result = await response.json();
      const analysis = result.choices[0]?.message?.content || "Analysis unavailable";

      setAnalyses(prev => ({
        ...prev,
        [game.id]: { loading: false, text: analysis, marketAnalysis }
      }));
    } catch (err) {
      setAnalyses(prev => ({ ...prev, [game.id]: { loading: false, text: `Error: ${err.message}` } }));
    }
  };

  if (showWarning && !userAcknowledged) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ maxWidth: "600px", backgroundColor: "#2d2d2d", borderRadius: "12px", padding: "30px", border: "3px solid #ff6b6b" }}>
          <h1 style={{ color: "#ff6b6b", fontSize: "24px", marginBottom: "20px", textAlign: "center" }}>
            CRITICAL WARNING
          </h1>
          <div style={{ color: "#ffffff", fontSize: "15px", lineHeight: "1.8", marginBottom: "25px" }}>
            <p style={{ marginBottom: "15px", fontWeight: "600" }}>This tool will not make you money:</p>
            <ul style={{ marginBottom: "15px", paddingLeft: "20px" }}>
              <li>Best-case accuracy: 54-56% on spreads</li>
              <li>Need 52.4% just to break even at -110</li>
              <li>You WILL lose money most sessions</li>
              <li>Educational purposes only</li>
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
            I Understand - Continue for Education
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", padding: "20px", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", marginBottom: "10px" }}>Sports Prediction System</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>Multi-model analysis with player props</p>

        {modelPerformance.totalPredictions > 0 && (
          <div style={{ backgroundColor: "#fff3cd", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
            <h3 style={{ marginTop: 0 }}>Performance</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#856404" }}>Total Predictions</div>
                <div style={{ fontSize: "24px", fontWeight: "bold" }}>{modelPerformance.totalPredictions}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#856404" }}>Accuracy</div>
                <div style={{ fontSize: "24px", fontWeight: "bold" }}>{modelPerformance.accuracy}%</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#856404" }}>vs Break-Even</div>
                <div style={{ fontSize: "24px", fontWeight: "bold" }}>{(modelPerformance.accuracy - 52.4).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>Configuration</h2>
          <textarea
            value={customDataset}
            onChange={(e) => setCustomDataset(e.target.value)}
            placeholder="Paste dataset JSON..."
            style={{ width: "100%", minHeight: "100px", padding: "10px", marginBottom: "10px", fontFamily: "monospace", fontSize: "12px" }}
          />
          <button onClick={parseDataset} style={{ padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "4px", marginRight: "10px" }}>
            Load Dataset
          </button>

          <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="The Odds API Key"
              style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
            />
            <select value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}>
              {sports.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
            </select>
          </div>

          <button onClick={fetchGames} disabled={loading || (!apiKey.trim() && !parsedDataset)} style={{ marginTop: "15px", padding: "10px 20px", backgroundColor: (loading || (!apiKey.trim() && !parsedDataset)) ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600" }}>
            {loading ? "Loading..." : "Fetch Games"}
          </button>
          
          {!apiKey.trim() && (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>
              💡 Tip: Odds API key is optional. You can load games from your dataset alone, or provide an API key for live betting lines.
            </div>
          )}
        </div>

        {error && <div style={{ backgroundColor: "#fee2e2", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#dc2626" }}>{error}</div>}

        {games.map(game => {
          const analysis = analyses[game.id];
          const props = playerProps[game.id];

          return (
            <div key={game.id} style={{ backgroundColor: "white", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderBottom: "1px solid #e9ecef" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>{game.away_team} @ {game.home_team}</h3>
                  <button onClick={() => analyzeGame(game)} disabled={analysis?.loading} style={{ padding: "8px 16px", backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: "4px" }}>
                    {analysis?.loading ? "Analyzing..." : "Analyze"}
                  </button>
                </div>
              </div>

              <div style={{ padding: "15px" }}>
                {analysis?.marketAnalysis && (
                  <div style={{ backgroundColor: analysis.marketAnalysis.hasValue ? "#d4edda" : "#f8f9fa", border: "2px solid #dee2e6", borderRadius: "6px", padding: "15px", marginBottom: "15px" }}>
                    <h4 style={{ fontSize: "14px", marginTop: 0 }}>Model Projection</h4>
                    <div style={{ fontSize: "12px" }}>
                      <div>Projected: {game.home_team} {analysis.marketAnalysis.projectedSpread > 0 ? '-' : '+'}{Math.abs(analysis.marketAnalysis.projectedSpread)}</div>
                      <div>Market: {game.home_team} {analysis.marketAnalysis.marketSpread}</div>
                      <div>Edge: {analysis.marketAnalysis.differential.toFixed(1)} points</div>
                      <div>EV: {analysis.marketAnalysis.expectedValue.toFixed(1)}%</div>
                    </div>
                  </div>
                )}

                {analysis?.text && (
                  <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "6px", fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "400px", overflowY: "auto" }}>
                    {analysis.text}
                  </div>
                )}

                {/* Player Props Section */}
                {props && (
                  <div style={{ marginTop: "20px", borderTop: "2px solid #ff6b6b", paddingTop: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                      <h4 style={{ margin: 0, color: "#dc3545" }}>Player Props (HIGH RISK)</h4>
                      {!showPropWarning && (
                        <button onClick={() => setShowPropWarning(true)} style={{ padding: "6px 12px", backgroundColor: "#ffc107", color: "#000", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
                          Show Props
                        </button>
                      )}
                    </div>

                    {showPropWarning && (
                      <div style={{ backgroundColor: "#fff3cd", border: "2px solid #ffc107", borderRadius: "6px", padding: "15px", marginBottom: "15px" }}>
                        <h5 style={{ marginTop: 0, color: "#856404" }}>Props Warning</h5>
                        <div style={{ fontSize: "12px", color: "#856404", lineHeight: "1.6" }}>
                          <p>Player props have 8-15% hold (vs 4-5% on game lines). Books make MORE profit on props than any other bet type.</p>
                          <p>You need 57%+ win rate to profit. Most bettors achieve 50-52%. Props are designed to extract maximum money.</p>
                          <p><strong>Proceed with extreme caution.</strong></p>
                        </div>
                        <button onClick={() => setShowPropWarning(false)} style={{ marginTop: "10px", padding: "6px 12px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", fontSize: "12px" }}>
                          I understand the risks
                        </button>
                      </div>
                    )}

                    {!showPropWarning && props.bookmakers && (
                      <div style={{ fontSize: "12px" }}>
                        {props.bookmakers.slice(0, 2).map(book => (
                          <div key={book.key} style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                            <div style={{ fontWeight: "600", marginBottom: "8px" }}>{book.title}</div>
                            {book.markets?.map(market => (
                              <div key={market.key} style={{ marginBottom: "10px" }}>
                                <div style={{ fontSize: "11px", color: "#666", marginBottom: "5px" }}>{market.key.replace(/_/g, ' ')}</div>
                                {market.outcomes?.slice(0, 3).map(outcome => {
                                  const propData = {
                                    player: outcome.description || outcome.name,
                                    market: market.key,
                                    line: outcome.point,
                                    price: outcome.price,
                                    bookmaker: book.title,
                                    team: outcome.name
                                  };
                                  const propKey = `${game.id}_${propData.player}_${propData.market}`;
                                  const propAnalysis = propAnalyses[propKey];

                                  return (
                                    <div key={outcome.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px", backgroundColor: "white", borderRadius: "3px", marginBottom: "4px" }}>
                                      <span>{propData.player}: {propData.line} {outcome.price > 0 ? '+' : ''}{outcome.price}</span>
                                      <button
                                        onClick={() => analyzePlayerProp(game.id, game, propData)}
                                        disabled={propAnalysis?.loading}
                                        style={{ padding: "4px 8px", fontSize: "10px", backgroundColor: propAnalysis?.loading ? "#ccc" : "#dc3545", color: "white", border: "none", borderRadius: "3px" }}
                                      >
                                        {propAnalysis?.loading ? "..." : "Analyze"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        ))}

                        {/* Display prop analyses */}
                        {Object.entries(propAnalyses).filter(([key]) => key.startsWith(game.id)).map(([key, analysis]) => (
                          analysis.text && (
                            <div key={key} style={{ marginTop: "10px", backgroundColor: "#fff3cd", border: "1px solid #ffc107", borderRadius: "6px", padding: "10px" }}>
                              <h5 style={{ fontSize: "12px", marginTop: 0, color: "#856404" }}>
                                {analysis.prop?.player} - {analysis.prop?.market}
                              </h5>
                              <div style={{ fontSize: "11px", whiteSpace: "pre-wrap", color: "#856404" }}>
                                {analysis.text}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#dc3545", color: "white", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>This is NOT a profit system</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Props have 8-15% hold. You need 57%+ win rate. Most achieve 50-52%. Call 1-800-GAMBLER
          </p>
        </div>
      </div>
    </div>
  );
}