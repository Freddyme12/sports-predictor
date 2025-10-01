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
  const [nfeloData, setNfeloData] = useState(null);
  const [nfeloAvailable, setNfeloAvailable] = useState(false);
  const [backendFetchStatus, setBackendFetchStatus] = useState('idle');
  const [injuryApiStatus, setInjuryApiStatus] = useState({ available: null, sources: {} });
  const [predictionTracking, setPredictionTracking] = useState([]);

  const BACKEND_URL = "https://sports-predictor-ruddy.vercel.app";
  const [showWarning, setShowWarning] = useState(true);
  const [userAcknowledged, setUserAcknowledged] = useState(false);

  const systemPrompt = `You are an advanced sports analyst providing rigorous statistical projections with CORRECTED formulas and ensemble modeling.

## CRITICAL FIXES IMPLEMENTED

**CFB Defensive Success Rate - CORRECTED:**
- LOWER defensive success rate = BETTER defense
- Formula: (Away Def Success Rate - Home Def Success Rate) × 180
- If result is NEGATIVE, HOME has better defense (advantage to home)
- If result is POSITIVE, AWAY has better defense (advantage to away)

## SPORT DETECTION & METHODOLOGY

**CFB Indicators:** SP+, success_rate, explosiveness, havoc_rate
**NFL Indicators:** EPA, offensive_line_unit, player_statistics, PFF grades

## COLLEGE FOOTBALL (CFB) PROJECTION - CORRECTED

### CFB Spread Calculation

1. **SP+ Differential** (45% weight): (Home SP+ - Away SP+) × 0.18
2. **Offensive Success Rate Gap** (22% weight): (Home Off SR - Away Off SR) × 220
3. **Defensive Success Rate** (18% weight): (Away Def SR - Home Def SR) × 180
4. **Explosiveness** (10% weight): (Home Exp - Away Exp) × 25
5. **Havoc Rate** (5% weight): (Home Havoc - Away Havoc) × 120
6. **Home Field:** +3.5 points

### CFB Total Projection
Base = [(Home PPG + Away PPG) / 2] × 2 with adjustments for explosiveness and SP+ offense.

## NFL PROJECTION METHODOLOGY

### NFL Spread Calculation

1. **EPA Differential** (40% weight): EPA gap × 320
2. **Success Rate** (25% weight): Success rate gap × 250
3. **Explosive Plays** (15% weight): Explosive share gap × 150
4. **Third Down** (10% weight): 3rd down gap × 100
5. **Red Zone** (10% weight): RZ TD% gap × 80
6. **Home Field:** +2.5 points
7. **O-Line:** Pass block WR diff × 12 + Run block WR diff × 8

### NFL Total Projection
Base from pace and EPA with adjustments.

## INJURY MODELING

**NFL QB:** 5.5 points, RB: 1.2, WR: 1.0, TE: 0.6
**CFB QB:** 7.0 points, RB: 2.0, WR: 1.5
Cluster multipliers apply.

## ENSEMBLE MODELING

Weight as: Model 50%, nfelo 25%, Market 25%
Consensus within 2pts = +1 confidence
Disagreement >4pts = -1 confidence

## FANTASY PROJECTIONS (NFL Only)

When player data available, provide:
- QB: Pass yards, pass TDs, rush yards (4pt pass TD)
- RB: Rush yards, rush TDs, receptions, rec yards (Full PPR)
- WR/TE: Targets, receptions, yards, TDs (Full PPR)

Format: Player Name - XX.X pts (Confidence)
Note: For fantasy/DFS only, not prop betting.

Educational purposes only.`;

  const sports = [
    { key: "americanfootball_nfl", title: "NFL" },
    { key: "americanfootball_ncaaf", title: "College Football" },
    { key: "basketball_nba", title: "NBA" },
    { key: "baseball_mlb", title: "MLB" },
    { key: "icehockey_nhl", title: "NHL" },
  ];

  const parseDataset = () => {
    try {
      const parsed = JSON.parse(customDataset);
      setParsedDataset(parsed);
      setDatasetLoaded(true);
      setError("");
    } catch (err) {
      setDatasetLoaded(false);
      setError("Invalid JSON format.");
    }
  };

  const fetchGames = async () => {
    setLoading(true);
    setError("");
    setGames([]);

    try {
      if (!parsedDataset?.games) {
        setError("Please load a JSON dataset first.");
        setLoading(false);
        return;
      }

      const datasetGames = parsedDataset.games.map((game, index) => {
        let homeTeam, awayTeam, gameTime;
        
        if (game.team_data) {
          homeTeam = game.home_team || 'Unknown Home';
          awayTeam = game.away_team || 'Unknown Away';
          gameTime = game.date || new Date().toISOString();
        } else {
          homeTeam = game.teams?.home || game.home_team || 'Unknown Home';
          awayTeam = game.teams?.away || game.away_team || 'Unknown Away';
          gameTime = game.kickoff_local || game.date || new Date().toISOString();
        }

        return {
          id: game.game_id || `dataset_${index}`,
          sport_key: selectedSport,
          commence_time: gameTime,
          home_team: homeTeam,
          away_team: awayTeam,
          bookmakers: [],
          datasetGame: game
        };
      });

      setGames(datasetGames);
    } catch (err) {
      setError(err.message || "Error loading games");
    } finally {
      setLoading(false);
    }
  };

  const analyzeGame = async (game) => {
    setAnalyses(prev => ({ ...prev, [game.id]: { loading: true } }));

    try {
      const gameData = game.datasetGame;
      if (!gameData) throw new Error("No dataset found");

      let prompt = `Analyze: ${game.away_team} @ ${game.home_team}\n\n`;
      prompt += `**DATASET:**\n${JSON.stringify(gameData, null, 2)}\n\n`;
      prompt += `Provide comprehensive analysis with projections.`;

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
        [game.id]: { loading: false, text: analysis }
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
            <p style={{ marginBottom: "15px", fontWeight: "600" }}>This tool will not make you money betting:</p>
            <ul style={{ marginBottom: "15px", paddingLeft: "20px" }}>
              <li>Best-case accuracy: 54-56% on spreads</li>
              <li>Need 52.4% just to break even at -110</li>
              <li>Educational and fantasy purposes only</li>
            </ul>
            <div style={{ backgroundColor: "#ff6b6b", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
              <p style={{ margin: 0, fontWeight: "600" }}>Call 1-800-GAMBLER if you have a problem</p>
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
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", marginBottom: "10px" }}>Enhanced Sports Analytics System v2.0</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>
          Fixed Formulas • Ensemble Modeling • Advanced Metrics
        </p>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>1. Load Your Dataset</h2>
          <textarea
            value={customDataset}
            onChange={(e) => setCustomDataset(e.target.value)}
            placeholder='Paste JSON dataset...'
            style={{ width: "100%", minHeight: "150px", padding: "10px", fontFamily: "monospace", fontSize: "12px", marginBottom: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
          />
          <button 
            onClick={parseDataset} 
            style={{ padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "4px", marginRight: "10px", cursor: "pointer", fontWeight: "600" }}
          >
            Load Dataset
          </button>
          {datasetLoaded && (
            <span style={{ color: "#10b981", fontSize: "14px", fontWeight: "600" }}>
              ✓ Dataset Loaded - {parsedDataset?.games?.length || 0} games
            </span>
          )}
        </div>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>2. Configure & Analyze</h2>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "#666" }}>Sport</label>
            <select 
              value={selectedSport} 
              onChange={(e) => setSelectedSport(e.target.value)} 
              style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
            >
              {sports.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
            </select>
          </div>

          <button 
            onClick={fetchGames} 
            disabled={loading || !datasetLoaded} 
            style={{ marginTop: "15px", padding: "10px 20px", backgroundColor: (loading || !datasetLoaded) ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: (loading || !datasetLoaded) ? "not-allowed" : "pointer" }}
          >
            {loading ? "Loading..." : "Initialize Games"}
          </button>
        </div>

        {error && <div style={{ backgroundColor: "#fee2e2", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#dc2626" }}>{error}</div>}

        {games.map(game => {
          const analysis = analyses[game.id];

          return (
            <div key={game.id} style={{ backgroundColor: "white", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderBottom: "1px solid #e9ecef" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{game.away_team} @ {game.home_team}</h3>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                      {new Date(game.commence_time).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => analyzeGame(game)} 
                    disabled={analysis?.loading} 
                    style={{ padding: "8px 16px", backgroundColor: analysis?.loading ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: analysis?.loading ? "not-allowed" : "pointer" }}
                  >
                    {analysis?.loading ? "Analyzing..." : "Analyze"}
                  </button>
                </div>
              </div>

              <div style={{ padding: "15px" }}>
                {analysis?.text && (
                  <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "6px", fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "600px", overflowY: "auto", lineHeight: "1.6" }}>
                    {analysis.text}
                  </div>
                )}
                {analysis?.loading && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Generating analysis...</div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#dc3545", color: "white", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Educational & Fantasy Only</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            v2.0: Fixed CFB defensive bug • EPA integration • Call 1-800-GAMBLER
          </p>
        </div>
      </div>
    </div>
  );
}