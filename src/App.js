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
  const [backendDataCache, setBackendDataCache] = useState({});
  const [backendFetchStatus, setBackendFetchStatus] = useState('idle');
  const [apiSportsKey, setApiSportsKey] = useState("");
  const [debugLog, setDebugLog] = useState([]);
  const [manualInjuryScores, setManualInjuryScores] = useState({});

  const BACKEND_URL = "https://sports-predictor-ruddy.vercel.app";
  const MODEL_API_URL = "https://nfl-model-api-production.up.railway.app";
  const [showWarning, setShowWarning] = useState(true);
  const [userAcknowledged, setUserAcknowledged] = useState(false);

  const TEAM_RESOLVER = {
    nfl: {
      'SF': ['San Francisco 49ers', 'San Francisco', '49ers', 'SF', 'SFO'],
      'LAR': ['Los Angeles Rams', 'LA Rams', 'Rams', 'LAR', 'LA'],
      'KC': ['Kansas City Chiefs', 'Kansas City', 'Chiefs', 'KC'],
      'BUF': ['Buffalo Bills', 'Buffalo', 'Bills', 'BUF'],
      'PHI': ['Philadelphia Eagles', 'Philadelphia', 'Eagles', 'PHI'],
      'DAL': ['Dallas Cowboys', 'Dallas', 'Cowboys', 'DAL'],
      'MIA': ['Miami Dolphins', 'Miami', 'Dolphins', 'MIA'],
      'BAL': ['Baltimore Ravens', 'Baltimore', 'Ravens', 'BAL'],
      'CIN': ['Cincinnati Bengals', 'Cincinnati', 'Bengals', 'CIN'],
      'JAX': ['Jacksonville Jaguars', 'Jacksonville', 'Jaguars', 'JAX'],
      'LAC': ['Los Angeles Chargers', 'LA Chargers', 'Chargers', 'LAC'],
      'DET': ['Detroit Lions', 'Detroit', 'Lions', 'DET'],
      'CLE': ['Cleveland Browns', 'Cleveland', 'Browns', 'CLE'],
      'NYJ': ['New York Jets', 'NY Jets', 'Jets', 'NYJ'],
      'SEA': ['Seattle Seahawks', 'Seattle', 'Seahawks', 'SEA'],
      'MIN': ['Minnesota Vikings', 'Minnesota', 'Vikings', 'MIN'],
      'GB': ['Green Bay Packers', 'Green Bay', 'Packers', 'GB'],
      'TB': ['Tampa Bay Buccaneers', 'Tampa Bay', 'Buccaneers', 'TB'],
      'NO': ['New Orleans Saints', 'New Orleans', 'Saints', 'NO'],
      'PIT': ['Pittsburgh Steelers', 'Pittsburgh', 'Steelers', 'PIT'],
      'LV': ['Las Vegas Raiders', 'Las Vegas', 'Raiders', 'LV'],
      'TEN': ['Tennessee Titans', 'Tennessee', 'Titans', 'TEN'],
      'ATL': ['Atlanta Falcons', 'Atlanta', 'Falcons', 'ATL'],
      'HOU': ['Houston Texans', 'Houston', 'Texans', 'HOU'],
      'IND': ['Indianapolis Colts', 'Indianapolis', 'Colts', 'IND'],
      'DEN': ['Denver Broncos', 'Denver', 'Broncos', 'DEN'],
      'ARI': ['Arizona Cardinals', 'Arizona', 'Cardinals', 'ARI'],
      'WAS': ['Washington Commanders', 'Washington', 'Commanders', 'WAS'],
      'CHI': ['Chicago Bears', 'Chicago', 'Bears', 'CHI'],
      'NYG': ['New York Giants', 'NY Giants', 'Giants', 'NYG'],
      'NE': ['New England Patriots', 'New England', 'Patriots', 'NE'],
      'CAR': ['Carolina Panthers', 'Carolina', 'Panthers', 'CAR']
    },
    cfb: {}
  };

  const addDebugLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, data };
    console.log(`[${timestamp}] ${message}`, data || '');
    setDebugLog(prev => [...prev.slice(-49), logEntry]);
  };

  const resolveTeamName = (teamName, sport = 'nfl') => {
    if (!teamName || typeof teamName !== 'string') {
      addDebugLog('⚠️ Invalid team name', teamName);
      return { abbr: null, normalized: null, variants: [] };
    }

    const sportMap = TEAM_RESOLVER[sport] || TEAM_RESOLVER.nfl;
    const normalizedInput = teamName.toLowerCase().replace(/[^a-z]/g, '');

    for (const [abbr, variants] of Object.entries(sportMap)) {
      for (const variant of variants) {
        const normalizedVariant = variant.toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedInput === normalizedVariant) {
          addDebugLog(`✓ Exact match: "${teamName}" → ${abbr}`, { variants });
          return { abbr, normalized: normalizedVariant, variants };
        }
      }
    }

    for (const [abbr, variants] of Object.entries(sportMap)) {
      for (const variant of variants) {
        const normalizedVariant = variant.toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedInput.includes(normalizedVariant) || normalizedVariant.includes(normalizedInput)) {
          addDebugLog(`✓ Partial match: "${teamName}" → ${abbr}`, { variants });
          return { abbr, normalized: normalizedVariant, variants };
        }
      }
    }

    addDebugLog(`❌ No match found for: "${teamName}"`, { normalizedInput });
    return { abbr: null, normalized: normalizedInput, variants: [] };
  };

  const matchTeams = (team1, team2, sport = 'nfl') => {
    const resolved1 = resolveTeamName(team1, sport);
    const resolved2 = resolveTeamName(team2, sport);

    if (resolved1.abbr && resolved2.abbr) {
      const match = resolved1.abbr === resolved2.abbr;
      addDebugLog(`Team match: "${team1}" vs "${team2}" → ${match ? '✓ MATCH' : '✗ NO MATCH'}`, {
        team1: resolved1.abbr,
        team2: resolved2.abbr
      });
      return match;
    }

    const fallbackMatch = resolved1.normalized === resolved2.normalized;
    addDebugLog(`Fallback match: "${team1}" vs "${team2}" → ${fallbackMatch ? '✓ MATCH' : '✗ NO MATCH'}`, {
      team1: resolved1.normalized,
      team2: resolved2.normalized
    });
    return fallbackMatch;
  };

  const extractModelFeatures = (gameData) => {
    console.log('=== extractModelFeatures DEBUG START ===');
    console.log('gameData:', gameData);
    
    if (!gameData || !gameData.team_statistics) {
      console.error('extractModelFeatures: Missing gameData or team_statistics');
      return null;
    }

    const homeTeam = gameData.teams?.home;
    const awayTeam = gameData.teams?.away;
    const homeStats = gameData.team_statistics?.[homeTeam];
    const awayStats = gameData.team_statistics?.[awayTeam];

    if (!homeStats || !awayStats) {
      console.error('extractModelFeatures: Missing team statistics');
      return null;
    }

    // FIXED: Removed ALL _rolling suffixes to match new model (60 features)
    const features = {
      division_game: gameData.division_game || 0,
      home_field_advantage: 2.5,
      short_week: 0,
      weather_impact: 0,
      rest_days: 7,
      spread_line: gameData.spread_line || 0,
      total_line: gameData.total_line || 0,
      home_win_prob_implied: gameData.home_win_prob_implied || 0.5,
      away_win_prob_implied: gameData.away_win_prob_implied || 0.5,
      
      // Home features (NO _rolling suffix)
      home_epa_overall: homeStats.offense?.epa_per_play?.overall || 0,
      home_epa_pass: homeStats.offense?.epa_per_play?.pass || 0,
      home_epa_rush: homeStats.offense?.epa_per_play?.rush || 0,
      home_success_rate: homeStats.offense?.success_rate?.overall || 0,
      home_early_down_pass_sr: homeStats.offense?.success_rate?.early || 0,
      home_early_down_pass_epa: homeStats.offense?.epa_per_play?.pass || 0,
      home_explosive_rate: homeStats.offense?.explosive_play_share?.overall || 0,
      home_yards_after_catch: 5.0,
      home_third_down_rate: homeStats.offense?.third_down?.overall || 0,
      home_redzone_td_rate: homeStats.offense?.red_zone?.td_rate || 0,
      home_turnover_diff: 0,
      home_pressure_rate: homeStats.defense?.pressure_rate_generated || 0,
      home_def_epa_allowed: homeStats.defense?.epa_per_play_allowed?.overall || 0,
      home_def_success_rate_allowed: homeStats.defense?.success_rate_allowed?.overall || 0,
      home_stuff_rate: 0,
      home_neutral_script_epa: homeStats.offense?.epa_per_play?.overall || 0,
      home_play_count: homeStats.offense?.plays || 65,
      
      // Away features (NO _rolling suffix)
      away_epa_overall: awayStats.offense?.epa_per_play?.overall || 0,
      away_epa_pass: awayStats.offense?.epa_per_play?.pass || 0,
      away_epa_rush: awayStats.offense?.epa_per_play?.rush || 0,
      away_success_rate: awayStats.offense?.success_rate?.overall || 0,
      away_early_down_pass_sr: awayStats.offense?.success_rate?.early || 0,
      away_early_down_pass_epa: awayStats.offense?.epa_per_play?.pass || 0,
      away_explosive_rate: awayStats.offense?.explosive_play_share?.overall || 0,
      away_yards_after_catch: 5.0,
      away_third_down_rate: awayStats.offense?.third_down?.overall || 0,
      away_redzone_td_rate: awayStats.offense?.red_zone?.td_rate || 0,
      away_turnover_diff: 0,
      away_pressure_rate: awayStats.defense?.pressure_rate_generated || 0,
      away_def_epa_allowed: awayStats.defense?.epa_per_play_allowed?.overall || 0,
      away_def_success_rate_allowed: awayStats.defense?.success_rate_allowed?.overall || 0,
      away_stuff_rate: 0,
      away_neutral_script_epa: awayStats.offense?.epa_per_play?.overall || 0,
      away_play_count: awayStats.offense?.plays || 65,
      
      // Differentials
      epa_overall_differential: (homeStats.offense?.epa_per_play?.overall || 0) - (awayStats.offense?.epa_per_play?.overall || 0),
      epa_pass_differential: (homeStats.offense?.epa_per_play?.pass || 0) - (awayStats.offense?.epa_per_play?.pass || 0),
      epa_rush_differential: (homeStats.offense?.epa_per_play?.rush || 0) - (awayStats.offense?.epa_per_play?.rush || 0),
      success_rate_differential: (homeStats.offense?.success_rate?.overall || 0) - (awayStats.offense?.success_rate?.overall || 0),
      early_down_pass_sr_differential: (homeStats.offense?.success_rate?.early || 0) - (awayStats.offense?.success_rate?.early || 0),
      explosive_rate_differential: (homeStats.offense?.explosive_play_share?.overall || 0) - (awayStats.offense?.explosive_play_share?.overall || 0),
      third_down_rate_differential: (homeStats.offense?.third_down?.overall || 0) - (awayStats.offense?.third_down?.overall || 0),
      redzone_td_rate_differential: (homeStats.offense?.red_zone?.td_rate || 0) - (awayStats.offense?.red_zone?.td_rate || 0),
      turnover_diff_differential: 0,
      pressure_rate_differential: (homeStats.defense?.pressure_rate_generated || 0) - (awayStats.defense?.pressure_rate_generated || 0),
      def_epa_allowed_differential: (homeStats.defense?.epa_per_play_allowed?.overall || 0) - (awayStats.defense?.epa_per_play_allowed?.overall || 0),
      neutral_script_epa_differential: (homeStats.offense?.epa_per_play?.overall || 0) - (awayStats.offense?.epa_per_play?.overall || 0),
      early_down_pass_epa_differential: (homeStats.offense?.epa_per_play?.pass || 0) - (awayStats.offense?.epa_per_play?.pass || 0),
      yards_after_catch_differential: 0,
      play_count_differential: 0,
      def_success_rate_allowed_differential: (homeStats.defense?.success_rate_allowed?.overall || 0) - (awayStats.defense?.success_rate_allowed?.overall || 0),
      stuff_rate_differential: 0
    };

    console.log('Features extracted. Count:', Object.keys(features).length);
    console.log('=== extractModelFeatures DEBUG END ===');

    return features;
  };

  const fetchModelPredictions = async (features) => {
    try {
      addDebugLog('🔄 Fetching Python model predictions...');
      
      const response = await fetch(`${MODEL_API_URL}/api/nfl-model-predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_columns: Object.keys(features),
          feature_values: features
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        addDebugLog('❌ Model prediction failed', { status: response.status, error: errorText });
        return null;
      }

      const result = await response.json();
      
      if (result.success) {
        addDebugLog('✓ Model predictions received', {
          spread: result.predictions.spread.value,
          total: result.predictions.total.value,
          win_prob: result.predictions.win_probability.home
        });
        return result.predictions;
      }
      
      return null;
    } catch (error) {
      addDebugLog('❌ Model prediction error', error.message);
      return null;
    }
  };

  const systemPrompt = `You are an elite sports analyst integrating ML model predictions with contextual analysis.

=== DATA SOURCES ===

1. **Python ML Models** (Trained on 2015-2023 NFL data, validated on 2024)
   - Spread Model: Ridge Regression (R² = 0.237, GOOD reliability)
   - Total Model: XGBoost (R² = 0.001, LOW reliability)
   - Win Probability: Calibrated Logistic (71% validation accuracy, HIGH reliability)

2. **Statistical Data**: EPA, success rates, efficiency metrics
3. **Contextual Data**: Injuries, weather, rest, motivation

=== YOUR ROLE ===

Synthesize all sources to provide superior predictions:

1. **Start with Model Baseline**
   - Spread: TRUST THIS (R² = 0.237, solid predictor)
   - Win Probability: HIGHLY RELIABLE (71% accuracy, well-calibrated)
   - Total: Use skeptically (R² ~0, often wrong)

2. **Apply Injury Adjustments**
   - Adjust model spread by injury differential
   - Example: Model -3, injuries +2 away team = adjusted -1

3. **Consider Market (if available)**
   - If model differs by >3 pts, explain divergence
   - Ensemble: 67% market + 33% model when both available

4. **Contextual Factors**
   - Weather, rest, division games can override by 1-3 points

=== OUTPUT STRUCTURE ===

**1. Model Assessment**
- Spread: [value] (SOLID confidence, R²: 0.237)
- Total: [value] (LOW CONFIDENCE, R²: 0.001)
- Win Prob: [home%]/[away%] (HIGH CONFIDENCE, 71% accuracy)

**2. Model vs Market** (if available)
- Show divergence, explain why

**3. Injury-Adjusted Prediction**
- Start: Model spread
- Adjust: ± injury differential
- Final: Adjusted spread

**4. Statistical Deep Dive**
- EPA differentials, success rates, situational factors

**5. Risk Assessment**
- Model limitations, uncertainties, confidence (1-5)

**6. Final Recommendation**
- Betting guidance (educational only)
- Unit sizing (1-5 based on edge)

CRITICAL: Show all math, be honest about limitations, educational purposes only`;

  const sports = [
    { key: "americanfootball_nfl", title: "NFL" },
    { key: "americanfootball_ncaaf", title: "College Football" },
    { key: "basketball_nba", title: "NBA" },
    { key: "baseball_mlb", title: "MLB" },
    { key: "icehockey_nhl", title: "NHL" },
  ];

  const fetchBackendDataForTeam = async (teamName, sport, year, week) => {
    try {
      let endpoint;
      let params = "?year=" + year + "&week=" + week;
      
      if (sport === "americanfootball_nfl") {
        endpoint = BACKEND_URL + "/api/nfl-enhanced-data";
        params = "?season=" + year + "&week=" + week;
      } else if (sport === "americanfootball_ncaaf") {
        endpoint = BACKEND_URL + "/api/cfb-enhanced-data";
      } else {
        return null;
      }
      
      const response = await fetch(endpoint + params);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.error || !data.games) return null;
      
      return data.games;
    } catch (err) {
      addDebugLog('❌ Backend fetch error', err.message);
      return null;
    }
  };

  const supplementGameDataFromBackend = async (games, sport) => {
    setBackendFetchStatus('fetching');
    addDebugLog('🔄 Fetching backend data...', { sport, gameCount: games.length });
    
    const currentYear = new Date().getFullYear();
    const estimatedWeek = 5;
    
    try {
      const backendGames = await fetchBackendDataForTeam(null, sport, currentYear, estimatedWeek);
      
      if (!backendGames || backendGames.length === 0) {
        setBackendFetchStatus('unavailable');
        addDebugLog('⚠️ No backend data available');
        return games;
      }
      
      addDebugLog('✓ Backend data fetched', { count: backendGames.length });
      
      const supplementedGames = games.map(jsonGame => {
        const matchingBackendGame = backendGames.find(bgGame => {
          if (!bgGame.home_team || !bgGame.away_team) return false;
          
          const homeMatch = matchTeams(jsonGame.home_team, bgGame.home_team, 'nfl');
          const awayMatch = matchTeams(jsonGame.away_team, bgGame.away_team, 'nfl');
          
          return homeMatch && awayMatch;
        });
        
        if (matchingBackendGame) {
          addDebugLog('✓ Backend data merged', {
            game: `${jsonGame.away_team} @ ${jsonGame.home_team}`
          });
          
          const mergedGameData = Object.assign({}, jsonGame.datasetGame);
          
          if (matchingBackendGame.team_data) {
            mergedGameData.team_data = {
              home: Object.assign({}, mergedGameData.team_data?.home || {}, matchingBackendGame.team_data.home),
              away: Object.assign({}, mergedGameData.team_data?.away || {}, matchingBackendGame.team_data.away)
            };
          }
          
          if (matchingBackendGame.player_statistics) {
            mergedGameData.player_statistics = Object.assign({}, mergedGameData.player_statistics || {}, matchingBackendGame.player_statistics);
          }
          
          return Object.assign({}, jsonGame, {
            datasetGame: mergedGameData,
            hasBackendData: true
          });
        }
        
        return jsonGame;
      });
      
      const mergedCount = supplementedGames.filter(g => g.hasBackendData).length;
      setBackendFetchStatus(mergedCount > 0 ? 'success' : 'partial');
      addDebugLog(`✓ Backend merge complete`, { mergedCount, totalGames: games.length });
      
      return supplementedGames;
    } catch (err) {
      setBackendFetchStatus('error');
      addDebugLog('❌ Backend supplement error', err.message);
      return games;
    }
  };

  const fetchApiSportsOddsViaBackend = async (sport, gameDate) => {
    if (!apiSportsKey) return null;

    try {
      const sportMap = {
        'americanfootball_nfl': 'football/nfl',
        'americanfootball_ncaaf': 'football/college-football',
        'basketball_nba': 'basketball/nba',
        'baseball_mlb': 'baseball/mlb',
        'icehockey_nhl': 'hockey/nhl'
      };
      
      const sportPath = sportMap[sport] || 'football/nfl';
      addDebugLog('🔄 Fetching API-Sports odds...', { sport: sportPath });
      
      const response = await fetch(
        `${BACKEND_URL}/api/apisports-odds?sport=${encodeURIComponent(sportPath)}&date=${gameDate}`,
        {
          headers: {
            'x-api-key': apiSportsKey
          }
        }
      );

      if (!response.ok) {
        addDebugLog('❌ API-Sports odds failed', response.status);
        return null;
      }
      
      const data = await response.json();
      addDebugLog('✓ API-Sports odds fetched', { count: data.odds?.length || 0 });
      return data.odds || [];
    } catch (error) {
      addDebugLog('❌ API-Sports odds error', error.message);
      return null;
    }
  };

  const fetchApiSportsInjuries = async (teamName, sport) => {
    if (!apiSportsKey || !teamName) {
      addDebugLog('⚠️ No API-Sports key for injuries', { teamName });
      return { team: teamName, injuries: [], source: 'no-key' };
    }

    try {
      const resolved = resolveTeamName(teamName, 'nfl');
      const teamAbbr = resolved.abbr || teamName;
      
      addDebugLog('🔄 Fetching API-Sports injuries...', { team: teamAbbr, original: teamName });
      
      const response = await fetch(
        `${BACKEND_URL}/api/apisports-injuries?team=${encodeURIComponent(teamAbbr)}&league=nfl`,
        {
          headers: {
            'x-rapidapi-key': apiSportsKey
          },
          signal: AbortSignal.timeout(15000)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        addDebugLog('❌ API-Sports injury fetch failed', { 
          team: teamName, 
          status: response.status,
          error: errorText.substring(0, 100)
        });
        return { team: teamName, injuries: [], source: 'api-error' };
      }

      const data = await response.json();
      
      if (data.success && data.injuries && data.injuries.length > 0) {
        addDebugLog('✓ API-Sports injuries fetched', { 
          team: teamName, 
          count: data.injuries.length,
          teamId: data.teamId,
          firstInjury: data.injuries[0]?.headline
        });
        
        return {
          team: teamName,
          injuries: data.injuries.map(inj => ({
            headline: inj.headline || `${inj.player_name || 'Unknown'} - ${inj.status || 'Unknown'}`,
            player_name: inj.player_name,
            position: inj.position,
            status: inj.status,
            description: inj.description || inj.reason
          })),
          source: 'api-sports'
        };
      }

      addDebugLog('⚠️ No API-Sports injury data returned', { 
        team: teamName,
        success: data.success,
        count: data.count,
        error: data.error
      });
      return { team: teamName, injuries: [], source: data.success === false ? 'api-error' : 'no-data' };
    } catch (error) {
      addDebugLog('❌ API-Sports injury error', { 
        team: teamName, 
        error: error.message,
        stack: error.stack?.substring(0, 200)
      });
      return { team: teamName, injuries: [], source: 'error' };
    }
  };

  const calculateFantasyProjections = (gameData, teamAbbr, opponentAbbr = null) => {
    if (!gameData || !gameData.player_statistics || !gameData.player_statistics[teamAbbr]) {
      return null;
    }

    const playerStats = gameData.player_statistics[teamAbbr];
    const opponentStats = opponentAbbr ? gameData.team_statistics?.[opponentAbbr] : null;
    
    const projections = {
      quarterbacks: [],
      runningBacks: [],
      receivers: []
    };

    const processedPlayers = new Set();

    const getOpponentAdjustment = (statType, opponentStats) => {
      if (!opponentStats || !opponentStats.defense) return 1.0;
      
      const defense = opponentStats.defense;
      const adjustments = {};
      
      if (statType === 'passing' && defense.epa_per_play_allowed?.pass !== undefined) {
        const epaPass = defense.epa_per_play_allowed.pass;
        adjustments.epa_multiplier = Math.max(0.7, Math.min(1.3, 1 + (epaPass / 0.2)));
      }
      
      if (statType === 'rushing' && defense.epa_per_play_allowed?.rush !== undefined) {
        const epaRush = defense.epa_per_play_allowed.rush;
        adjustments.epa_multiplier = Math.max(0.7, Math.min(1.3, 1 + (epaRush / 0.15)));
      }
      
      if (defense.success_rate_allowed?.overall !== undefined) {
        const successRate = defense.success_rate_allowed.overall;
        adjustments.success_multiplier = Math.max(0.8, Math.min(1.2, successRate / 0.45));
      }
      
      if (statType === 'passing' && defense.pressure_rate_generated !== undefined) {
        const pressureRate = defense.pressure_rate_generated;
        adjustments.pressure_multiplier = Math.max(0.8, Math.min(1.0, 1 - ((pressureRate - 0.25) * 0.8)));
      }
      
      if (statType === 'passing' && defense.explosive_plays_allowed?.pass !== undefined) {
        const explosiveAllowed = defense.explosive_plays_allowed.pass;
        adjustments.explosive_multiplier = Math.max(0.9, Math.min(1.15, explosiveAllowed / 0.05));
      }
      
      if (statType === 'rushing' && defense.explosive_plays_allowed?.rush !== undefined) {
        const explosiveAllowed = defense.explosive_plays_allowed.rush;
        adjustments.explosive_multiplier = Math.max(0.9, Math.min(1.15, explosiveAllowed / 0.03));
      }
      
      let finalMultiplier = 1.0;
      let weightSum = 0;
      
      if (adjustments.epa_multiplier) {
        finalMultiplier += adjustments.epa_multiplier * 0.4;
        weightSum += 0.4;
      }
      if (adjustments.success_multiplier) {
        finalMultiplier += adjustments.success_multiplier * 0.3;
        weightSum += 0.3;
      }
      if (adjustments.pressure_multiplier) {
        finalMultiplier += adjustments.pressure_multiplier * 0.2;
        weightSum += 0.2;
      }
      if (adjustments.explosive_multiplier) {
        finalMultiplier += adjustments.explosive_multiplier * 0.1;
        weightSum += 0.1;
      }
      
      return weightSum > 0 ? (finalMultiplier - 1) / weightSum + 1 : 1.0;
    };

    if (playerStats.quarterbacks) {
      playerStats.quarterbacks.forEach(qb => {
        if (!qb.attempts || qb.attempts < 20) return;
        if (processedPlayers.has(qb.player_name)) return;
        processedPlayers.add(qb.player_name);
        
        const completionPct = qb.completions / qb.attempts;
        const yardsPerAttempt = qb.yards / qb.attempts;
        const tdRate = qb.touchdowns / qb.attempts;
        
        const baseAttempts = qb.attempts / 4;
        const basePassYards = baseAttempts * yardsPerAttempt;
        const basePassTDs = baseAttempts * tdRate;
        
        const passAdjustment = getOpponentAdjustment('passing', opponentStats);
        
        const projectedAttempts = baseAttempts * passAdjustment;
        const projectedPassYards = basePassYards * passAdjustment;
        const projectedPassTDs = basePassTDs * passAdjustment;
        
        const projectedRushYards = qb.carries ? (qb.rush_yards / qb.carries) * 3 : 0;
        
        const passingPoints = (projectedPassYards * 0.04) + (projectedPassTDs * 4);
        const rushingPoints = (projectedRushYards * 0.1) + (0.1 * 6);
        const totalPoints = passingPoints + rushingPoints;
        
        let baseConfidence = qb.passer_rating_last3 > 85 ? 'High' : qb.passer_rating_last3 > 70 ? 'Medium' : 'Low';
        const matchupFactor = passAdjustment;
        
        let confidence = baseConfidence;
        if (matchupFactor > 1.1) {
          confidence = baseConfidence === 'Low' ? 'Medium' : baseConfidence === 'Medium' ? 'High' : 'High';
        } else if (matchupFactor < 0.9) {
          confidence = baseConfidence === 'High' ? 'Medium' : baseConfidence === 'Medium' ? 'Low' : 'Low';
        }
        
        const projection = {
          name: qb.player_name,
          projectedPoints: totalPoints.toFixed(1),
          passYards: projectedPassYards.toFixed(0),
          passTDs: projectedPassTDs.toFixed(1),
          rushYards: projectedRushYards.toFixed(0),
          confidence: confidence
        };

        if (opponentStats) {
          projection.matchupAdjustment = matchupFactor.toFixed(2);
          projection.matchupNotes = matchupFactor > 1.1 ? 'Favorable matchup' : 
                                   matchupFactor < 0.9 ? 'Tough matchup' : 'Neutral matchup';
        }
        
        projections.quarterbacks.push(projection);
      });
    }

    if (playerStats.running_backs_top3) {
      playerStats.running_backs_top3.forEach(rb => {
        if (!rb.carries || rb.carries < 10) return;
        if (processedPlayers.has(rb.player_name)) return;
        processedPlayers.add(rb.player_name);
        
        const ypc = rb.rush_yards / rb.carries;
        const carriesPerGame = rb.carries / 4;
        
        const rushAdjustment = getOpponentAdjustment('rushing', opponentStats);
        const passAdjustment = getOpponentAdjustment('passing', opponentStats);
        
        const projectedRushYards = (carriesPerGame * ypc) * rushAdjustment;
        const projectedRushTDs = ((rb.rush_tds / 4) || 0.3) * rushAdjustment;
        
        const receptions = rb.receptions || 0;
        const recYards = rb.yards || 0;
        const projectedReceptions = (receptions / 4) * passAdjustment;
        const projectedRecYards = (recYards / 4) * passAdjustment;
        
        const rushingPoints = (projectedRushYards * 0.1) + (projectedRushTDs * 6);
        const receivingPoints = (projectedReceptions * 1) + (projectedRecYards * 0.1) + (0.2 * 6);
        const totalPoints = rushingPoints + receivingPoints;
        
        let baseConfidence = carriesPerGame > 15 ? 'High' : carriesPerGame > 10 ? 'Medium' : 'Low';
        const matchupFactor = rushAdjustment;
        
        let confidence = baseConfidence;
        if (matchupFactor > 1.1) {
          confidence = baseConfidence === 'Low' ? 'Medium' : baseConfidence === 'Medium' ? 'High' : 'High';
        } else if (matchupFactor < 0.9) {
          confidence = baseConfidence === 'High' ? 'Medium' : baseConfidence === 'Medium' ? 'Low' : 'Low';
        }
        
        const projection = {
          name: rb.player_name,
          projectedPoints: totalPoints.toFixed(1),
          rushYards: projectedRushYards.toFixed(0),
          receptions: projectedReceptions.toFixed(1),
          recYards: projectedRecYards.toFixed(0),
          confidence: confidence
        };

        if (opponentStats) {
          projection.matchupAdjustment = matchupFactor.toFixed(2);
          projection.matchupNotes = matchupFactor > 1.1 ? 'Favorable rush matchup' : 
                                   matchupFactor < 0.9 ? 'Tough rush defense' : 'Neutral matchup';
        }
        
        projections.runningBacks.push(projection);
      });
    }

    if (playerStats.receivers_tes_top5) {
      playerStats.receivers_tes_top5.forEach(receiver => {
        if (!receiver.targets || receiver.targets < 8) return;
        if (processedPlayers.has(receiver.player_name)) return;
        processedPlayers.add(receiver.player_name);
        
        const targetsPerGame = receiver.targets / 4;
        const receptionRate = receiver.receptions / receiver.targets;
        const yardsPerReception = receiver.yards / receiver.receptions;
        
        const passAdjustment = getOpponentAdjustment('passing', opponentStats);
        
        const projectedReceptions = (targetsPerGame * receptionRate) * passAdjustment;
        const projectedYards = projectedReceptions * yardsPerReception;
        const projectedTDs = ((receiver.touchdowns / 4) || 0.3) * passAdjustment;
        
        const totalPoints = (projectedReceptions * 1) + (projectedYards * 0.1) + (projectedTDs * 6);
        
        let baseConfidence = receiver.target_share_pct > 20 ? 'High' : receiver.target_share_pct > 15 ? 'Medium' : 'Low';
        const matchupFactor = passAdjustment;
        
        let confidence = baseConfidence;
        if (matchupFactor > 1.1) {
          confidence = baseConfidence === 'Low' ? 'Medium' : baseConfidence === 'Medium' ? 'High' : 'High';
        } else if (matchupFactor < 0.9) {
          confidence = baseConfidence === 'High' ? 'Medium' : baseConfidence === 'Medium' ? 'Low' : 'Low';
        }
        
        const projection = {
          name: receiver.player_name,
          projectedPoints: totalPoints.toFixed(1),
          receptions: projectedReceptions.toFixed(1),
          yards: projectedYards.toFixed(0),
          touchdowns: projectedTDs.toFixed(1),
          confidence: confidence
        };

        if (opponentStats) {
          projection.matchupAdjustment = matchupFactor.toFixed(2);
          projection.matchupNotes = matchupFactor > 1.1 ? 'Favorable pass matchup' : 
                                   matchupFactor < 0.9 ? 'Tough pass defense' : 'Neutral matchup';
        }
        
        projections.receivers.push(projection);
      });
    }

    return projections;
  };

  const quantifyInjuryImpact = (espnData, isCFB) => {
    if (!espnData || !espnData.home || !espnData.away) {
      return { home: 0, away: 0, total: 0, differential: 0, confidenceReduction: 0, details: [] };
    }

    const cfbImpactScores = {
      'qb': 7.0, 'quarterback': 7.0,
      'rb': 2.0, 'running back': 2.0,
      'wr': 1.5, 'wide receiver': 1.5, 'receiver': 1.5,
      'te': 1.0, 'tight end': 1.0,
      'ol': 1.0, 'offensive line': 1.0,
      'lt': 1.2, 'lg': 0.9, 'c': 1.0, 'rg': 0.9, 'rt': 1.2,
      'de': 0.8, 'dt': 0.7, 'lb': 0.7, 'cb': 0.8, 's': 0.7, 'safety': 0.7
    };

    const nflImpactScores = {
      'qb': 5.5, 'quarterback': 5.5,
      'rb': 1.2, 'running back': 1.2,
      'wr': 1.0, 'wide receiver': 1.0, 'receiver': 1.0,
      'te': 0.6, 'tight end': 0.6,
      'ol': 0.5, 'offensive line': 0.5,
      'lt': 0.7, 'lg': 0.4, 'c': 0.5, 'rg': 0.4, 'rt': 0.7,
      'de': 0.5, 'dt': 0.4, 'lb': 0.4, 'cb': 0.5, 's': 0.4, 'safety': 0.4
    };

    const impactScores = isCFB ? cfbImpactScores : nflImpactScores;

    const calculateInjuries = (injuries) => {
      const positionCount = {};
      let totalImpact = 0;
      const details = [];

      injuries.forEach(inj => {
        const headline = inj.headline.toLowerCase();
        let impact = 0;
        let severity = headline.includes('out') ? 1.0 : 
                      headline.includes('doubtful') ? 0.8 : 
                      headline.includes('questionable') ? 0.4 : 0.5;

        for (const pos in impactScores) {
          if (headline.includes(pos)) {
            impact = Math.max(impact, impactScores[pos]);
            positionCount[pos] = (positionCount[pos] || 0) + 1;
            details.push({ 
              headline: inj.headline, 
              impact: impact * severity, 
              position: pos,
              severity: severity
            });
            break;
          }
        }

        totalImpact += (impact * severity);
      });

      for (const pos in positionCount) {
        const count = positionCount[pos];
        if (count >= 2 && pos !== 'qb') {
          totalImpact *= (1 + (count - 1) * 0.3);
        }
      }

      if (injuries.length >= 4) {
        totalImpact += 1.0;
      }

      return { impact: totalImpact, details };
    };

    const homeResult = calculateInjuries(espnData.home.injuries || []);
    const awayResult = calculateInjuries(espnData.away.injuries || []);

    return {
      home: homeResult.impact,
      away: awayResult.impact,
      total: homeResult.impact + awayResult.impact,
      differential: homeResult.impact - awayResult.impact,
      confidenceReduction: Math.min(Math.floor((homeResult.impact + awayResult.impact) / 3.5), 2),
      details: {
        home: homeResult.details,
        away: awayResult.details
      }
    };
  };

  const validateDataRanges = (compiledData) => {
    const warnings = [];
    
    if (compiledData.sport === 'NFL') {
      const homeEPA = compiledData.team_statistics?.home?.epa;
      const awayEPA = compiledData.team_statistics?.away?.epa;
      
      if (homeEPA !== undefined && awayEPA !== undefined) {
        if (Math.abs(homeEPA) < 0.01 && Math.abs(awayEPA) < 0.01) {
          warnings.push("WARNING: EPA values unusually small (typical range: -0.15 to +0.15). Data may be incomplete or represent limited sample.");
        }
        if (Math.abs(homeEPA) > 0.5 || Math.abs(awayEPA) > 0.5) {
          warnings.push("WARNING: EPA values unusually high. Verify data accuracy.");
        }
      }
    }
    
    if (compiledData.sport === 'CFB') {
      const homeSP = compiledData.team_statistics?.home?.sp_plus;
      const awaySP = compiledData.team_statistics?.away?.sp_plus;
      
      if (homeSP !== undefined && awaySP !== undefined) {
        const spPlusDiff = Math.abs(homeSP - awaySP);
        if (spPlusDiff > 50) {
          warnings.push("WARNING: SP+ differential extremely large (" + spPlusDiff.toFixed(1) + "). This suggests a major mismatch.");
        }
      }
    }
    
    return warnings;
  };

  const compileAllGameData = async (game, gameData, espnData, marketData, fantasyData) => {
    const isCFB = gameData.team_data !== undefined;
    
    const manualScores = manualInjuryScores[game.id];
    let injuryImpact = null;
    
    if (manualScores && (manualScores.home !== undefined || manualScores.away !== undefined)) {
      const homeImpact = parseFloat(manualScores.home) || 0;
      const awayImpact = parseFloat(manualScores.away) || 0;
      
      injuryImpact = {
        home: homeImpact,
        away: awayImpact,
        total: homeImpact + awayImpact,
        differential: homeImpact - awayImpact,
        confidenceReduction: Math.min(Math.floor((homeImpact + awayImpact) / 4), 2),
        details: {
          manual: true,
          notes: manualScores.notes || "Manual injury scoring applied"
        }
      };
      
      addDebugLog('✓ Manual injury scores applied', {
        game: `${game.away_team} @ ${game.home_team}`,
        home: homeImpact,
        away: awayImpact,
        differential: homeImpact - awayImpact
      });
    } else {
      injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : null;
    }
    
    let modelPredictions = null;
    if (!isCFB && gameData.team_statistics) {
      const features = extractModelFeatures(gameData);
      if (features) {
        modelPredictions = await fetchModelPredictions(features);
      }
    }
    
    const compiled = {
      sport: isCFB ? 'CFB' : 'NFL',
      matchup: {
        home_team: game.home_team,
        away_team: game.away_team,
        date: new Date(game.commence_time).toLocaleString()
      },
      model_predictions: modelPredictions ? {
        available: true,
        spread: {
          value: modelPredictions.spread.value,
          confidence: modelPredictions.spread.confidence,
          model_r2: modelPredictions.spread.model_r2
        },
        total: {
          value: modelPredictions.total.value,
          confidence: modelPredictions.total.confidence,
          model_r2: modelPredictions.total.model_r2
        },
        win_probability: {
          home: modelPredictions.win_probability.home,
          away: modelPredictions.win_probability.away,
          confidence: modelPredictions.win_probability.confidence,
          validation_accuracy: modelPredictions.win_probability.validation_accuracy
        }
      } : {
        available: false,
        reason: 'Model predictions not available for this game type'
      },
      team_statistics: {},
      injuries: {
        available: !!(espnData && espnData.home && espnData.away && 
                     (espnData.home.injuries.length > 0 || espnData.away.injuries.length > 0)) || 
                   !!(manualScores && (manualScores.home !== undefined || manualScores.away !== undefined)),
        source: manualScores && (manualScores.home !== undefined || manualScores.away !== undefined) ? 'manual' : (espnData?.home?.source || 'none'),
        method: injuryImpact?.details?.manual ? 'manual' : 'automated',
        home_impact_points: injuryImpact?.home || 0,
        away_impact_points: injuryImpact?.away || 0,
        net_differential_points: injuryImpact?.differential || 0,
        confidence_reduction_tiers: injuryImpact?.confidenceReduction || 0,
        home_injury_count: espnData?.home?.injuries?.length || 0,
        away_injury_count: espnData?.away?.injuries?.length || 0,
        home_injuries: espnData?.home?.injuries || [],
        away_injuries: espnData?.away?.injuries || [],
        home_injury_details: injuryImpact?.details?.home || [],
        away_injury_details: injuryImpact?.details?.away || [],
        manual_notes: injuryImpact?.details?.manual ? (manualScores?.notes || "Manual scoring applied") : null
      },
      market_odds: null,
      fantasy_projections: fantasyData,
      data_quality: {
        dataset_available: true,
        backend_enhanced: !!game.hasBackendData,
        model_predictions_available: !!modelPredictions,
        injury_data_available: !!(espnData && espnData.home && espnData.away && 
                                   (espnData.home.injuries.length > 0 || espnData.away.injuries.length > 0)) || 
                               !!(manualScores && (manualScores.home !== undefined || manualScores.away !== undefined)),
        market_odds_available: false
      }
    };
    
    if (isCFB) {
      try {
        compiled.team_statistics = {
          home: {
            sp_plus: gameData.team_data?.home?.sp_overall || 0,
            off_success_rate: gameData.team_data?.home?.off_success_rate || 0,
            def_success_rate: gameData.team_data?.home?.def_success_rate || 0,
            explosiveness: gameData.team_data?.home?.off_explosiveness || 0,
            havoc_rate: gameData.team_data?.home?.havoc_rate || 0,
            ppg: gameData.team_data?.home?.points_per_game || 0
          },
          away: {
            sp_plus: gameData.team_data?.away?.sp_overall || 0,
            off_success_rate: gameData.team_data?.away?.off_success_rate || 0,
            def_success_rate: gameData.team_data?.away?.def_success_rate || 0,
            explosiveness: gameData.team_data?.away?.off_explosiveness || 0,
            havoc_rate: gameData.team_data?.away?.havoc_rate || 0,
            ppg: gameData.team_data?.away?.points_per_game || 0
          }
        };
      } catch (e) {
        addDebugLog('❌ CFB data extraction error', e.message);
      }
    } else {
      try {
        const homeTeam = gameData.teams?.home;
        const awayTeam = gameData.teams?.away;
        
        if (!homeTeam || !awayTeam) {
          addDebugLog('❌ Team abbreviations missing', { homeTeam, awayTeam });
          return compiled;
        }
        
        const homeStats = gameData.team_statistics?.[homeTeam];
        const awayStats = gameData.team_statistics?.[awayTeam];
        const homePlayerStats = gameData.player_statistics?.[homeTeam];
        const awayPlayerStats = gameData.player_statistics?.[awayTeam];
        
        if (!homeStats || !awayStats) {
          addDebugLog('❌ Team statistics not found', { 
            homeTeam, 
            awayTeam,
            availableTeams: Object.keys(gameData.team_statistics || {})
          });
          return compiled;
        }
        
        compiled.team_statistics = {
          home: {
            team_abbr: homeTeam,
            epa: homeStats.offense?.epa_per_play?.overall || 0,
            success_rate: homeStats.offense?.success_rate?.overall || 0,
            explosive_pct: homeStats.offense?.explosive_play_share?.overall || 0,
            pass_block_win_rate: homePlayerStats?.offensive_line_unit?.pass_block_win_rate || 0,
            third_down_rate: homeStats.offense?.third_down?.overall || 0,
            redzone_td_rate: homeStats.offense?.red_zone?.td_rate || 0
          },
          away: {
            team_abbr: awayTeam,
            epa: awayStats.offense?.epa_per_play?.overall || 0,
            success_rate: awayStats.offense?.success_rate?.overall || 0,
            explosive_pct: awayStats.offense?.explosive_play_share?.overall || 0,
            pass_block_win_rate: awayPlayerStats?.offensive_line_unit?.pass_block_win_rate || 0,
            third_down_rate: awayStats.offense?.third_down?.overall || 0,
            redzone_td_rate: awayStats.offense?.red_zone?.td_rate || 0
          }
        };
        
        addDebugLog('✓ NFL statistics compiled', { 
          home: homeTeam, 
          away: awayTeam,
          homeEPA: compiled.team_statistics.home.epa,
          awayEPA: compiled.team_statistics.away.epa,
          homeExplosive: compiled.team_statistics.home.explosive_pct,
          awayExplosive: compiled.team_statistics.away.explosive_pct
        });
      } catch (e) {
        addDebugLog('❌ NFL data extraction error', e.stack);
      }
    }
    
    if (marketData) {
      compiled.data_quality.market_odds_available = true;
      
      if (marketData.source === 'the-odds-api') {
        const spread = marketData.spread?.outcomes || [];
        const total = marketData.total?.outcomes || [];
        const moneyline = marketData.moneyline?.outcomes || [];
        
        const homeSpread = spread.find(o => o.name === game.home_team);
        
        compiled.market_odds = {
          source: 'the-odds-api',
          spread: homeSpread ? homeSpread.point : null,
          total: total.length > 0 ? total[0].point : null,
          home_moneyline: moneyline.find(o => o.name === game.home_team)?.price,
          away_moneyline: moneyline.find(o => o.name === game.away_team)?.price
        };
      } else if (marketData.source === 'api-sports' && marketData.odds && marketData.odds.length > 0) {
        compiled.market_odds = {
          source: 'api-sports',
          raw: marketData.odds[0]
        };
      }
    }
    
    return compiled;
  };

  const getTeamAbbreviation = (teamName, sport) => {
    if (!teamName || typeof teamName !== 'string') return 'unknown';
    
    const resolved = resolveTeamName(teamName, sport === 'americanfootball_ncaaf' ? 'cfb' : 'nfl');
    return resolved.abbr || teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
  };

  const fetchESPNData = async (teamName, sport) => {
    if (!teamName || typeof teamName !== 'string') {
      return { team: teamName || 'Unknown', injuries: [], source: 'none' };
    }
    
    try {
      const sportMap = { 
        'americanfootball_nfl': 'football/nfl',
        'americanfootball_ncaaf': 'football/college-football',
        'basketball_nba': 'basketball/nba',
        'baseball_mlb': 'baseball/mlb',
        'icehockey_nhl': 'hockey/nhl'
      };
      const sportPath = sportMap[sport] || 'football/nfl';
      const teamAbbr = getTeamAbbreviation(teamName, sport);
      
      addDebugLog('🔄 Fetching ESPN injuries...', { team: teamAbbr });
      
      const proxyUrl = BACKEND_URL + "/api/espn-proxy?sport=" + encodeURIComponent(sportPath) + "&team=" + encodeURIComponent(teamAbbr);
      
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });

      if (!response.ok) {
        addDebugLog('❌ ESPN fetch failed', { team: teamName, status: response.status });
        return { team: teamName, injuries: [], source: 'failed' };
      }

      const data = await response.json();
      
      if (!data.success || !data.injuries || data.injuries.length === 0) {
        addDebugLog('⚠️ No ESPN injury data', { team: teamName });
        return { team: teamName, injuries: [], source: data.source || 'no-data' };
      }
      
      addDebugLog('✓ ESPN injuries fetched', { team: teamName, count: data.injuries.length });
      
      return { 
        team: teamName, 
        injuries: data.injuries || [],
        source: data.source || 'espn'
      };
    } catch (error) {
      addDebugLog('❌ ESPN fetch error', { team: teamName, error: error.message });
      return { 
        team: teamName, 
        injuries: [], 
        source: 'error'
      };
    }
  };

  const parseDataset = () => {
    try {
      const parsed = JSON.parse(customDataset);
      setParsedDataset(parsed);
      setDatasetLoaded(true);
      setError("");
      addDebugLog('✓ Dataset parsed successfully', { gameCount: parsed.games?.length });
    } catch (err) {
      setDatasetLoaded(false);
      setError("Invalid JSON format.");
      addDebugLog('❌ Dataset parse error', err.message);
    }
  };

  const fetchGames = async () => {
    setLoading(true);
    setError("");
    setGames([]);
    setDebugLog([]);
    addDebugLog('🚀 Starting game fetch process...');

    try {
      if (!parsedDataset || !parsedDataset.games) {
        setError("Please load a JSON dataset first.");
        setLoading(false);
        return;
      }

      let gamesWithIds = [];
      let useApiSportsForOdds = false;

      if (apiKey.trim()) {
        try {
          addDebugLog('🔄 Fetching from The Odds API...');
          const url = "https://api.the-odds-api.com/v4/sports/" + selectedSport + "/odds?apiKey=" + apiKey + "&regions=us&markets=h2h,spreads,totals&oddsFormat=american";
          const response = await fetch(url);

          if (response.ok) {
            const oddsData = await response.json();
            if (oddsData && oddsData.length > 0) {
              gamesWithIds = oddsData.map((game, index) => ({
                ...game,
                id: game.id || (game.sport_key + "_" + index)
              }));
              addDebugLog('✓ The Odds API data fetched', { count: gamesWithIds.length });
            }
          }
        } catch (apiError) {
          addDebugLog('⚠️ The Odds API unavailable', apiError.message);
        }
      }

      if (gamesWithIds.length === 0 && apiSportsKey) {
        const today = new Date().toISOString().split('T')[0];
        const apiSportsOdds = await fetchApiSportsOddsViaBackend(selectedSport, today);
        
        if (apiSportsOdds && apiSportsOdds.length > 0) {
          useApiSportsForOdds = true;
          gamesWithIds = apiSportsOdds.map((odd, index) => ({
            id: odd.game?.id || ("apisports_" + index),
            sport_key: selectedSport,
            commence_time: odd.game?.date || new Date().toISOString(),
            home_team: odd.teams?.home?.name || 'Unknown',
            away_team: odd.teams?.away?.name || 'Unknown',
            bookmakers: [],
            apiSportsOdds: [odd]
          }));
          addDebugLog('✓ API-Sports odds loaded', { count: gamesWithIds.length });
        }
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
          id: game.game_id || ("dataset_" + index),
          sport_key: selectedSport,
          commence_time: gameTime,
          home_team: homeTeam,
          away_team: awayTeam,
          bookmakers: [],
          datasetGame: game
        };
      });

      addDebugLog('✓ Dataset games processed', { count: datasetGames.length });

      if (gamesWithIds.length > 0) {
        addDebugLog('🔄 Matching odds to dataset games...');
        let matchCount = 0;
        
        gamesWithIds = gamesWithIds.map(oddsGame => {
          const matchingDatasetGame = datasetGames.find(dg => {
            if (!dg.home_team || !dg.away_team || !oddsGame.home_team || !oddsGame.away_team) {
              return false;
            }
            
            const homeMatch = matchTeams(dg.home_team, oddsGame.home_team, 'nfl');
            const awayMatch = matchTeams(dg.away_team, oddsGame.away_team, 'nfl');
            
            return homeMatch && awayMatch;
          });
          
          if (matchingDatasetGame) {
            matchCount++;
            return Object.assign({}, oddsGame, {
              datasetGame: matchingDatasetGame.datasetGame,
              useApiSportsOdds: useApiSportsForOdds
            });
          }
          return Object.assign({}, oddsGame, { useApiSportsOdds: useApiSportsForOdds });
        });
        
        addDebugLog('✓ Odds matching complete', { matched: matchCount, total: gamesWithIds.length });
      } else {
        gamesWithIds = datasetGames;
        addDebugLog('⚠️ No odds data, using dataset games only');
      }

      gamesWithIds = await supplementGameDataFromBackend(gamesWithIds, selectedSport);
      
      setGames(gamesWithIds);
      addDebugLog('✓ Games loaded', { totalGames: gamesWithIds.length });

      for (const game of gamesWithIds) {
        const hasValidTeams = game.home_team && game.away_team && 
                             typeof game.home_team === 'string' && 
                             typeof game.away_team === 'string';
        
        if (!hasValidTeams) continue;
        
        Promise.all([
          apiSportsKey ? fetchApiSportsInjuries(game.home_team, selectedSport) : fetchESPNData(game.home_team, selectedSport),
          apiSportsKey ? fetchApiSportsInjuries(game.away_team, selectedSport) : fetchESPNData(game.away_team, selectedSport)
        ]).then(([homeData, awayData]) => {
          setEspnDataCache(prev => (Object.assign({}, prev, {
            [game.id]: { 
              home: homeData, 
              away: awayData
            }
          })));
          
          addDebugLog('✓ Injury data cached', {
            game: `${game.away_team} @ ${game.home_team}`,
            homeSource: homeData.source,
            awaySource: awayData.source,
            homeCount: homeData.injuries.length,
            awayCount: awayData.injuries.length
          });
        });
      }

    } catch (err) {
      setError(err.message || "Error loading games");
      addDebugLog('❌ Fatal error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeGame = async (game) => {
    setAnalyses(prev => (Object.assign({}, prev, { [game.id]: { loading: true } })));
    addDebugLog('🎯 Starting analysis', { game: `${game.away_team} @ ${game.home_team}` });

    try {
      const gameData = game.datasetGame;
      if (!gameData) throw new Error("No dataset found");

      const espnData = espnDataCache[game.id];
      
      addDebugLog('Injury data check', {
        available: !!espnData,
        homeInjuries: espnData?.home?.injuries?.length || 0,
        awayInjuries: espnData?.away?.injuries?.length || 0,
        homeSource: espnData?.home?.source,
        awaySource: espnData?.away?.source
      });
      
      let marketData = null;
      let hasMarketData = false;
      
      if (game.useApiSportsOdds && game.apiSportsOdds && game.apiSportsOdds.length > 0) {
        marketData = {
          source: 'api-sports',
          odds: game.apiSportsOdds
        };
        hasMarketData = true;
      } else if (game.bookmakers && game.bookmakers.length > 0) {
        const book = game.bookmakers[0];
        marketData = {
          source: 'the-odds-api',
          spread: book.markets.find(m => m.key === 'spreads'),
          total: book.markets.find(m => m.key === 'totals'),
          moneyline: book.markets.find(m => m.key === 'h2h')
        };
        hasMarketData = true;
      }
      
      const isCFB = gameData.team_data !== undefined;
      let fantasyData = null;
      
      if (!isCFB && gameData.player_statistics) {
        const homeTeam = gameData.teams?.home;
        const awayTeam = gameData.teams?.away;
        
        if (homeTeam && awayTeam) {
          fantasyData = {
            home: calculateFantasyProjections(gameData, homeTeam, awayTeam),
            away: calculateFantasyProjections(gameData, awayTeam, homeTeam)
          };
        }
      }

      const compiledData = await compileAllGameData(game, gameData, espnData, marketData, fantasyData);
      const dataWarnings = validateDataRanges(compiledData);
      
      addDebugLog('✓ Data compiled', { 
        hasMarket: compiledData.data_quality.market_odds_available,
        hasInjuries: compiledData.data_quality.injury_data_available,
        hasModelPredictions: compiledData.data_quality.model_predictions_available,
        injuryDifferential: compiledData.injuries.net_differential_points,
        warnings: dataWarnings.length
      });

      let prompt = "=== NFL GAME ANALYSIS ===\n";
      prompt += `${game.away_team} @ ${game.home_team}\n\n`;
      
      if (compiledData.model_predictions?.available) {
        prompt += "=== PYTHON ML MODEL PREDICTIONS ===\n";
        prompt += `Trained on 2015-2023 data, validated on 2024 season\n\n`;
        prompt += `**Spread:**\n`;
        prompt += `- Model: Home ${compiledData.model_predictions.spread.value > 0 ? 'favored by' : 'underdog by'} ${Math.abs(compiledData.model_predictions.spread.value).toFixed(1)} points\n`;
        prompt += `- Confidence: ${compiledData.model_predictions.spread.confidence} (R² = ${compiledData.model_predictions.spread.model_r2})\n\n`;
        
        prompt += `**Total:**\n`;
        prompt += `- Model: ${compiledData.model_predictions.total.value.toFixed(1)} points\n`;
        prompt += `- Confidence: ${compiledData.model_predictions.total.confidence} (R² = ${compiledData.model_predictions.total.model_r2}) ⚠️ LOW\n\n`;
        
        prompt += `**Win Probability:**\n`;
        prompt += `- Home: ${(compiledData.model_predictions.win_probability.home * 100).toFixed(1)}%\n`;
        prompt += `- Away: ${(compiledData.model_predictions.win_probability.away * 100).toFixed(1)}%\n`;
        prompt += `- Confidence: ${compiledData.model_predictions.win_probability.confidence} (${(compiledData.model_predictions.win_probability.validation_accuracy * 100).toFixed(1)}% validation accuracy) ✓ RELIABLE\n\n`;
      }
      
      prompt += "=== FULL COMPILED DATA ===\n";
      prompt += JSON.stringify(compiledData, null, 2) + "\n\n";
      
      if (dataWarnings.length > 0) {
        prompt += "=== DATA QUALITY ALERTS ===\n";
        dataWarnings.forEach(warning => {
          prompt += "• " + warning + "\n";
        });
        prompt += "\n";
      }
      
      prompt += "=== ANALYSIS REQUIREMENTS ===\n\n";
      prompt += "Provide a comprehensive analysis following the output structure in your system prompt.\n\n";
      prompt += "Key focus areas:\n";
      prompt += "1. Model predictions assessment - how much to trust them\n";
      prompt += "2. Statistical edges - identify who has advantages and why\n";
      prompt += "3. Injury impact - quantify using the pre-calculated point values\n";
      if (hasMarketData) {
        prompt += "4. Market comparison - explain model vs market differences\n";
      }
      prompt += "5. Risk factors - what could invalidate the prediction\n";
      prompt += "6. Confidence assessment - justify your confidence level\n\n";
      prompt += "Remember: Show all calculations explicitly. Educational purposes only.\n";

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

      if (!response.ok) {
        throw new Error("API returned " + response.status);
      }

      const result = await response.json();
      const analysis = result.choices[0]?.message?.content || "Analysis unavailable";

      addDebugLog('✓ Analysis complete');

      setAnalyses(prev => (Object.assign({}, prev, {
        [game.id]: { 
          loading: false, 
          text: analysis,
          compiledData: compiledData,
          fantasyData: fantasyData,
          dataWarnings: dataWarnings,
          modelPredictions: compiledData.model_predictions
        }
      })));
    } catch (err) {
      addDebugLog('❌ Analysis error', err.message);
      setAnalyses(prev => (Object.assign({}, prev, { [game.id]: { loading: false, text: "Error: " + err.message } })));
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
        <h1 style={{ textAlign: "center", marginBottom: "10px" }}>Enhanced Sports Analytics System v4.0</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>
          ML Model Integration + Deep Analysis + Manual Injury Input + Fantasy Projections
        </p>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>1. Load Your Dataset</h2>
          <textarea
            value={customDataset}
            onChange={(e) => setCustomDataset(e.target.value)}
            placeholder="Paste JSON dataset..."
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
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>2. API Configuration</h2>
          
          <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#e8f5e9", borderRadius: "6px", border: "2px solid #4caf50" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#2e7d32", marginBottom: "8px" }}>
              ⭐ RECOMMENDED: API-Sports (Injuries + Odds + Stats)
            </div>
            <div style={{ fontSize: "12px", color: "#495057", marginBottom: "10px" }}>
              Secure backend proxy for API-Sports integration
              <br />
              Provides: <strong>Injuries</strong>, <strong>Odds</strong>, <strong>Players</strong>, <strong>Stats</strong>
              <br />
              Sign up at: <a href="https://api-sports.io" target="_blank" rel="noopener noreferrer" style={{ color: "#2e7d32", fontWeight: "600" }}>api-sports.io</a>
            </div>
            <input
              type="password"
              value={apiSportsKey}
              onChange={(e) => setApiSportsKey(e.target.value)}
              placeholder="API-Sports Key (required for injuries)"
              style={{ width: "100%", padding: "8px", border: "2px solid #4caf50", borderRadius: "4px", marginBottom: "8px" }}
            />
            {apiSportsKey && (
              <div style={{ fontSize: "11px", color: "#155724", fontWeight: "600" }}>
                ✓ API-Sports enabled - injuries will be fetched automatically
              </div>
            )}
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "15px", marginTop: "15px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "#666" }}>
                The Odds API Key (optional - market odds)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="The Odds API Key"
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
              />
              <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                Get your key at: <a href="https://the-odds-api.com" target="_blank" rel="noopener noreferrer">the-odds-api.com</a>
              </div>
            </div>
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
          </div>

          <button 
            onClick={fetchGames} 
            disabled={loading || !datasetLoaded} 
            style={{ marginTop: "15px", padding: "10px 20px", backgroundColor: (loading || !datasetLoaded) ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: (loading || !datasetLoaded) ? "not-allowed" : "pointer" }}
          >
            {loading ? "Loading..." : "Load Games & Fetch Data"}
          </button>
        </div>

        {debugLog.length > 0 && (
          <div style={{ backgroundColor: "white", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Debug Log</h3>
              <button 
                onClick={() => setDebugLog([])}
                style={{ padding: "4px 8px", fontSize: "11px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                Clear
              </button>
            </div>
            <div style={{ maxHeight: "200px", overflowY: "auto", fontSize: "11px", fontFamily: "monospace", backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "4px" }}>
              {debugLog.map((log, idx) => (
                <div key={idx} style={{ marginBottom: "4px", color: log.message.startsWith('❌') ? '#dc3545' : log.message.startsWith('✓') ? '#28a745' : '#666' }}>
                  [{log.timestamp}] {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div style={{ backgroundColor: "#fee2e2", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#dc2626" }}>{error}</div>}

        {games.map(game => {
          const analysis = analyses[game.id];
          const manualScores = manualInjuryScores[game.id] || {};

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
                    {analysis?.loading ? "Analyzing..." : "Analyze with ML Model"}
                  </button>
                </div>
                
                <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "6px", border: "1px solid #ffc107" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px", color: "#856404" }}>
                    📋 Manual Injury Impact Scoring (Optional)
                  </div>
                  <div style={{ fontSize: "12px", color: "#856404", marginBottom: "12px" }}>
                    Input injury point values manually for precise control. Leave blank for automated calculation.
                    <br /><strong>Guidelines:</strong> QB (4-8 pts), Skill (1-3 pts), OL/Defense (0.5-2 pts)
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "10px", alignItems: "end" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", marginBottom: "4px", color: "#856404" }}>
                        {game.away_team} Injury Impact
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={manualScores.away || ''}
                        onChange={(e) => setManualInjuryScores(prev => ({
                          ...prev,
                          [game.id]: { ...prev[game.id], away: e.target.value }
                        }))}
                        placeholder="0.0"
                        style={{ width: "100%", padding: "6px", border: "1px solid #ffc107", borderRadius: "4px", fontSize: "12px" }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", marginBottom: "4px", color: "#856404" }}>
                        {game.home_team} Injury Impact
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={manualScores.home || ''}
                        onChange={(e) => setManualInjuryScores(prev => ({
                          ...prev,
                          [game.id]: { ...prev[game.id], home: e.target.value }
                        }))}
                        placeholder="0.0"
                        style={{ width: "100%", padding: "6px", border: "1px solid #ffc107", borderRadius: "4px", fontSize: "12px" }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", marginBottom: "4px", color: "#856404" }}>
                        Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={manualScores.notes || ''}
                        onChange={(e) => setManualInjuryScores(prev => ({
                          ...prev,
                          [game.id]: { ...prev[game.id], notes: e.target.value }
                        }))}
                        placeholder="e.g., Starting QB out, backup solid"
                        style={{ width: "100%", padding: "6px", border: "1px solid #ffc107", borderRadius: "4px", fontSize: "12px" }}
                      />
                    </div>
                  </div>
                  
                  {(manualScores.home || manualScores.away) && (
                    <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#d4edda", borderRadius: "4px", fontSize: "11px", color: "#155724" }}>
                      <strong>Manual scoring active:</strong> 
                      {manualScores.away && ` ${game.away_team}: ${manualScores.away} pts`}
                      {manualScores.home && ` ${game.home_team}: ${manualScores.home} pts`}
                      {(parseFloat(manualScores.home || 0) - parseFloat(manualScores.away || 0)) !== 0 && 
                        ` (Net: ${(parseFloat(manualScores.home || 0) - parseFloat(manualScores.away || 0)).toFixed(1)} pt edge)`
                      }
                    </div>
                  )}
                  
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setManualInjuryScores(prev => {
                        const newScores = { ...prev };
                        delete newScores[game.id];
                        return newScores;
                      })}
                      style={{ padding: "4px 8px", fontSize: "11px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}
                    >
                      Clear Manual Scores
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding: "15px" }}>
                {analysis?.modelPredictions?.available && (
                  <div style={{ padding: "15px", backgroundColor: "#e3f2fd", borderRadius: "6px", marginBottom: "15px", border: "2px solid #1976d2" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#1976d2" }}>
                      🤖 Python ML Model Predictions (Trained 2015-2023)
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
                      <div>
                        <strong>Spread</strong>
                        <p style={{ margin: "5px 0", fontSize: "18px", fontWeight: "600" }}>
                          {analysis.modelPredictions.spread.value > 0 ? '+' : ''}{analysis.modelPredictions.spread.value.toFixed(1)}
                        </p>
                        <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>
                          {analysis.modelPredictions.spread.confidence} confidence (R²: {analysis.modelPredictions.spread.model_r2})
                        </p>
                      </div>
                      <div>
                        <strong>Total</strong>
                        <p style={{ margin: "5px 0", fontSize: "18px", fontWeight: "600" }}>
                          {analysis.modelPredictions.total.value.toFixed(1)}
                        </p>
                        <p style={{ margin: 0, fontSize: "11px", color: "#dc3545" }}>
                          ⚠️ {analysis.modelPredictions.total.confidence} confidence
                        </p>
                      </div>
                      <div>
                        <strong>Win Probability</strong>
                        <p style={{ margin: "5px 0", fontSize: "14px" }}>
                          Home: <strong>{(analysis.modelPredictions.win_probability.home * 100).toFixed(1)}%</strong><br/>
                          Away: <strong>{(analysis.modelPredictions.win_probability.away * 100).toFixed(1)}%</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: "11px", color: "#28a745" }}>
                          ✓ 71% validation accuracy
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {analysis?.compiledData && (
                  <div style={{ marginBottom: "15px", padding: "12px", backgroundColor: "#f8f9fa", borderRadius: "6px", border: "1px solid #dee2e6" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "#495057" }}>
                      Data Compilation Status:
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#d4edda", color: "#155724", borderRadius: "4px", fontWeight: "600" }}>
                        ✓ Dataset Extracted
                      </span>
                      {analysis.compiledData.data_quality.model_predictions_available && (
                        <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#cfe2ff", color: "#084298", borderRadius: "4px", fontWeight: "600" }}>
                          ✓ ML Model Predictions
                        </span>
                      )}
                      {analysis.compiledData.data_quality.market_odds_available ? (
                        <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#cce5ff", color: "#004085", borderRadius: "4px", fontWeight: "600" }}>
                          ✓ Market Odds
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#fff3cd", color: "#856404", borderRadius: "4px", fontWeight: "600" }}>
                          ⚠ No Market Odds
                        </span>
                      )}
                      {analysis.compiledData.data_quality.injury_data_available ? (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "4px 8px", 
                          backgroundColor: analysis.compiledData.injuries.method === 'manual' ? "#e7f3ff" : "#d4edda", 
                          color: analysis.compiledData.injuries.method === 'manual' ? "#0056b3" : "#155724", 
                          borderRadius: "4px", 
                          fontWeight: "600" 
                        }}>
                          {analysis.compiledData.injuries.method === 'manual' ? '📋 Manual Injury Scores' : '✓ Auto Injury Data'} 
                          ({analysis.compiledData.injuries.source}) - 
                          {analysis.compiledData.injuries.method === 'manual' 
                            ? ` ${analysis.compiledData.injuries.net_differential_points.toFixed(1)} pt differential`
                            : ` ${analysis.compiledData.injuries.home_injury_count + analysis.compiledData.injuries.away_injury_count} total`
                          }
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#f8d7da", color: "#721c24", borderRadius: "4px", fontWeight: "600" }}>
                          ✗ No Injury Data
                        </span>
                      )}
                      {analysis.compiledData.data_quality.backend_enhanced && (
                        <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#e2e3e5", color: "#383d41", borderRadius: "4px", fontWeight: "600" }}>
                          ✓ Enhanced Stats
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {analysis?.dataWarnings?.length > 0 && (
                  <div style={{ marginBottom: "15px", padding: "12px", backgroundColor: "#fff3cd", borderRadius: "6px", border: "1px solid #ffc107" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#856404" }}>
                      Data Quality Warnings:
                    </div>
                    {analysis.dataWarnings.map((warning, idx) => (
                      <div key={idx} style={{ fontSize: "11px", color: "#856404", marginBottom: "4px" }}>
                        • {warning}
                      </div>
                    ))}
                  </div>
                )}
                
                {analysis?.text && (
                  <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "6px", fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "600px", overflowY: "auto", lineHeight: "1.6" }}>
                    {analysis.text}
                  </div>
                )}

                {analysis?.fantasyData && (analysis.fantasyData.home || analysis.fantasyData.away) && (
                  <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "2px solid #0066cc" }}>
                    <h3 style={{ margin: "0 0 15px 0", color: "#0066cc", fontSize: "18px" }}>
                      Fantasy Football Projections (Opponent Adjusted)
                    </h3>
                    
                    {[
                      { label: game.away_team, data: analysis.fantasyData.away },
                      { label: game.home_team, data: analysis.fantasyData.home }
                    ].map(team => {
                      if (!team.data) return null;
                      
                      return (
                        <div key={team.label} style={{ marginBottom: "20px" }}>
                          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "600" }}>
                            {team.label}
                          </h4>
                          
                          {team.data.quarterbacks?.length > 0 && (
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "5px" }}>Quarterbacks</div>
                              {team.data.quarterbacks.map((qb, idx) => (
                                <div key={idx} style={{ padding: "6px", backgroundColor: "white", borderRadius: "4px", marginBottom: "3px", fontSize: "11px" }}>
                                  <strong>{qb.name}</strong> - {qb.projectedPoints} pts ({qb.confidence})
                                  {qb.matchupAdjustment && (
                                    <span style={{ color: parseFloat(qb.matchupAdjustment) > 1.05 ? "#28a745" : parseFloat(qb.matchupAdjustment) < 0.95 ? "#dc3545" : "#6c757d", fontWeight: "600", marginLeft: "5px" }}>
                                      [{qb.matchupAdjustment}x]
                                    </span>
                                  )}
                                  <div style={{ color: "#666" }}>Pass: {qb.passYards} yds, {qb.passTDs} TDs | Rush: {qb.rushYards} yds</div>
                                  {qb.matchupNotes && (
                                    <div style={{ color: "#495057", fontSize: "10px", fontStyle: "italic" }}>{qb.matchupNotes}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {team.data.runningBacks?.length > 0 && (
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "5px" }}>Running Backs</div>
                              {team.data.runningBacks.map((rb, idx) => (
                                <div key={idx} style={{ padding: "6px", backgroundColor: "white", borderRadius: "4px", marginBottom: "3px", fontSize: "11px" }}>
                                  <strong>{rb.name}</strong> - {rb.projectedPoints} pts ({rb.confidence})
                                  {rb.matchupAdjustment && (
                                    <span style={{ color: parseFloat(rb.matchupAdjustment) > 1.05 ? "#28a745" : parseFloat(rb.matchupAdjustment) < 0.95 ? "#dc3545" : "#6c757d", fontWeight: "600", marginLeft: "5px" }}>
                                      [{rb.matchupAdjustment}x]
                                    </span>
                                  )}
                                  <div style={{ color: "#666" }}>Rush: {rb.rushYards} yds | Rec: {rb.receptions} rec, {rb.recYards} yds</div>
                                  {rb.matchupNotes && (
                                    <div style={{ color: "#495057", fontSize: "10px", fontStyle: "italic" }}>{rb.matchupNotes}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {team.data.receivers?.length > 0 && (
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "5px" }}>Receivers / Tight Ends</div>
                              {team.data.receivers.map((rec, idx) => (
                                <div key={idx} style={{ padding: "6px", backgroundColor: "white", borderRadius: "4px", marginBottom: "3px", fontSize: "11px" }}>
                                  <strong>{rec.name}</strong> - {rec.projectedPoints} pts ({rec.confidence})
                                  {rec.matchupAdjustment && (
                                    <span style={{ color: parseFloat(rec.matchupAdjustment) > 1.05 ? "#28a745" : parseFloat(rec.matchupAdjustment) < 0.95 ? "#dc3545" : "#6c757d", fontWeight: "600", marginLeft: "5px" }}>
                                      [{rec.matchupAdjustment}x]
                                    </span>
                                  )}
                                  <div style={{ color: "#666" }}>{rec.receptions} rec, {rec.yards} yds, {rec.touchdowns} TDs</div>
                                  {rec.matchupNotes && (
                                    <div style={{ color: "#495057", fontSize: "10px", fontStyle: "italic" }}>{rec.matchupNotes}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#fff3cd", borderRadius: "4px", fontSize: "11px", color: "#856404" }}>
                      <strong>Note:</strong> Fantasy projections adjusted for opponent defensive strength using EPA, success rate, and pressure data.
                    </div>
                  </div>
                )}

                {analysis?.loading && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                    <div style={{ marginBottom: "10px" }}>Step 1: Extracting statistics...</div>
                    <div style={{ marginBottom: "10px" }}>Step 2: Calling ML models...</div>
                    <div style={{ marginBottom: "10px" }}>Step 3: Fetching injury reports...</div>
                    <div style={{ marginBottom: "10px" }}>Step 4: Calculating adjustments...</div>
                    <div>Step 5: Generating deep analysis...</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#dc3545", color: "white", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Educational & Fantasy Only</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            v4.0: ML Models + AI Analysis + Fantasy + Manual Injury Input | Call 1-800-GAMBLER
          </p>
        </div>
      </div>
    </div>
  );
}