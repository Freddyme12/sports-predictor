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
    if (!gameData || !gameData.team_statistics) {
      console.error('extractModelFeatures: Missing gameData or team_statistics');
      return null;
    }

    const homeTeam = gameData.teams?.home;
    const awayTeam = gameData.teams?.away;
    
    console.log('extractModelFeatures - Teams:', { homeTeam, awayTeam });
    
    const homeStats = gameData.team_statistics?.[homeTeam];
    const awayStats = gameData.team_statistics?.[awayTeam];
    
    console.log('extractModelFeatures - Stats exist:', { 
      homeStats: !!homeStats, 
      awayStats: !!awayStats,
      homeKeys: homeStats ? Object.keys(homeStats) : [],
      awayKeys: awayStats ? Object.keys(awayStats) : []
    });

    if (!homeStats || !awayStats) {
      console.error('extractModelFeatures: Missing team statistics', { homeTeam, awayTeam });
      return null;
    }

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
      home_epa_overall_rolling: homeStats.offense?.epa_per_play?.overall || 0,
      home_epa_pass_rolling: homeStats.offense?.epa_per_play?.pass || 0,
      home_epa_rush_rolling: homeStats.offense?.epa_per_play?.rush || 0,
      home_success_rate_rolling: homeStats.offense?.success_rate?.overall || 0,
      home_early_down_pass_sr_rolling: homeStats.offense?.success_rate?.early || 0,
      home_early_down_pass_epa_rolling: homeStats.offense?.epa_per_play?.pass || 0,
      home_explosive_rate_rolling: homeStats.offense?.explosive_play_share?.overall || 0,
      home_yards_after_catch_rolling: 5.0,
      home_third_down_rate_rolling: homeStats.offense?.third_down?.overall || 0,
      home_redzone_td_rate_rolling: homeStats.offense?.red_zone?.td_rate || 0,
      home_turnover_diff_rolling: 0,
      home_pressure_rate_rolling: homeStats.defense?.pressure_rate_generated || 0,
      home_def_epa_allowed_rolling: homeStats.defense?.epa_per_play_allowed?.overall || 0,
      home_def_success_rate_allowed_rolling: homeStats.defense?.success_rate_allowed?.overall || 0,
      home_stuff_rate_rolling: 0,
      home_neutral_script_epa_rolling: homeStats.offense?.epa_per_play?.overall || 0,
      home_play_count_rolling: homeStats.offense?.plays || 65,
      away_epa_overall_rolling: awayStats.offense?.epa_per_play?.overall || 0,
      away_epa_pass_rolling: awayStats.offense?.epa_per_play?.pass || 0,
      away_epa_rush_rolling: awayStats.offense?.epa_per_play?.rush || 0,
      away_success_rate_rolling: awayStats.offense?.success_rate?.overall || 0,
      away_early_down_pass_sr_rolling: awayStats.offense?.success_rate?.early || 0,
      away_early_down_pass_epa_rolling: awayStats.offense?.epa_per_play?.pass || 0,
      away_explosive_rate_rolling: awayStats.offense?.explosive_play_share?.overall || 0,
      away_yards_after_catch_rolling: 5.0,
      away_third_down_rate_rolling: awayStats.offense?.third_down?.overall || 0,
      away_redzone_td_rate_rolling: awayStats.offense?.red_zone?.td_rate || 0,
      away_turnover_diff_rolling: 0,
      away_pressure_rate_rolling: awayStats.defense?.pressure_rate_generated || 0,
      away_def_epa_allowed_rolling: awayStats.defense?.epa_per_play_allowed?.overall || 0,
      away_def_success_rate_allowed_rolling: awayStats.defense?.success_rate_allowed?.overall || 0,
      away_stuff_rate_rolling: 0,
      away_neutral_script_epa_rolling: awayStats.offense?.epa_per_play?.overall || 0,
      away_play_count_rolling: awayStats.offense?.plays || 65,
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
      neutral_script_epa_differential: (homeStats.offense?.epa_per_play?.overall || 0) - (awayStats.offense?.epa_per_play?.overall || 0)
    };

    console.log('extractModelFeatures - Completed. Feature count:', Object.keys(features).length);
    console.log('extractModelFeatures - Sample features:', {
      home_epa_overall_rolling: features.home_epa_overall_rolling,
      away_epa_overall_rolling: features.away_epa_overall_rolling,
      epa_overall_differential: features.epa_overall_differential
    });

    return features;
  };

  const fetchModelPredictions = async (features) => {
    try {
      addDebugLog('🔄 Fetching Python model predictions...');
      console.log('Sending features to model API:', features);
      
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
        console.error('Model API error response:', errorText);
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
      
      console.error('Model API returned unsuccessful result:', result);
      return null;
    } catch (error) {
      console.error('Model prediction error:', error);
      addDebugLog('❌ Model prediction error', error.message);
      return null;
    }
  };

  const systemPrompt = `You are an elite sports analyst integrating ML model predictions with contextual analysis.

=== DATA SOURCES ===

1. **Python ML Models** (Trained on 2021-2024 NFL data)
   - Spread Model: Ridge Regression (R² = 0.156, moderate reliability)
   - Total Model: XGBoost (R² = -0.099, use with caution)
   - Win Probability: Calibrated Logistic (62.5% validation accuracy, HIGH reliability)

2. **Statistical Data**: EPA, success rates, efficiency metrics
3. **Contextual Data**: Injuries, weather, rest, motivation

=== YOUR ROLE ===

Synthesize all sources to provide superior predictions:

1. **Start with Model Baseline**
   - Spread: Use as statistical starting point (moderate confidence)
   - Win Probability: TRUST THIS (62.5% accuracy, well-calibrated)
   - Total: Use skeptically (negative R², often wrong)

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
- Spread: [value] (confidence, R²: 0.156)
- Total: [value] (LOW CONFIDENCE, R²: -0.099)
- Win Prob: [home%]/[away%] (HIGH CONFIDENCE, 62.5% accuracy)

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

  // [Keep ALL your existing helper functions - fetchBackendDataForTeam, supplementGameDataFromBackend, etc.]
  // I'm including the key ones below, add the rest from your working code

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
          count: data.injuries.length
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

      addDebugLog('⚠️ No API-Sports injury data returned', { team: teamName });
      return { team: teamName, injuries: [], source: 'no-data' };
    } catch (error) {
      addDebugLog('❌ API-Sports injury error', { team: teamName, error: error.message });
      return { team: teamName, injuries: [], source: 'error' };
    }
  };

  const quantifyInjuryImpact = (espnData, isCFB) => {
    if (!espnData || !espnData.home || !espnData.away) {
      return { home: 0, away: 0, total: 0, differential: 0, confidenceReduction: 0, details: [] };
    }

    const nflImpactScores = {
      'qb': 5.5, 'quarterback': 5.5,
      'rb': 1.2, 'running back': 1.2,
      'wr': 1.0, 'wide receiver': 1.0, 'receiver': 1.0,
      'te': 0.6, 'tight end': 0.6,
      'ol': 0.5, 'offensive line': 0.5,
      'lt': 0.7, 'lg': 0.4, 'c': 0.5, 'rg': 0.4, 'rt': 0.7,
      'de': 0.5, 'dt': 0.4, 'lb': 0.4, 'cb': 0.5, 's': 0.4, 'safety': 0.4
    };

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

        for (const pos in nflImpactScores) {
          if (headline.includes(pos)) {
            impact = Math.max(impact, nflImpactScores[pos]);
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
    
    // Handle NFL vs CFB stats structure
    if (!isCFB) {
      const homeTeam = gameData.teams?.home;
      const awayTeam = gameData.teams?.away;
      const homeStats = gameData.team_statistics?.[homeTeam];
      const awayStats = gameData.team_statistics?.[awayTeam];
      
      if (homeStats && awayStats) {
        compiled.team_statistics = {
          home: {
            team_abbr: homeTeam,
            epa: homeStats.offense?.epa_per_play?.overall || 0,
            success_rate: homeStats.offense?.success_rate?.overall || 0,
            explosive_pct: homeStats.offense?.explosive_play_share?.overall || 0,
            third_down_rate: homeStats.offense?.third_down?.overall || 0,
            redzone_td_rate: homeStats.offense?.red_zone?.td_rate || 0
          },
          away: {
            team_abbr: awayTeam,
            epa: awayStats.offense?.epa_per_play?.overall || 0,
            success_rate: awayStats.offense?.success_rate?.overall || 0,
            explosive_pct: awayStats.offense?.explosive_play_share?.overall || 0,
            third_down_rate: awayStats.offense?.third_down?.overall || 0,
            redzone_td_rate: awayStats.offense?.red_zone?.td_rate || 0
          }
        };
      }
    }
    
    if (marketData) {
      compiled.data_quality.market_odds_available = true;
      if (marketData.source === 'the-odds-api') {
        const spread = marketData.spread?.outcomes || [];
        const homeSpread = spread.find(o => o.name === game.home_team);
        compiled.market_odds = {
          source: 'the-odds-api',
          spread: homeSpread ? homeSpread.point : null
        };
      }
    }
    
    return compiled;
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

      setGames(datasetGames);
      addDebugLog('✓ Games loaded', { totalGames: datasetGames.length });

      for (const game of datasetGames) {
        const hasValidTeams = game.home_team && game.away_team && 
                             typeof game.home_team === 'string' && 
                             typeof game.away_team === 'string';
        
        if (!hasValidTeams) continue;
        
        Promise.all([
          apiSportsKey ? fetchApiSportsInjuries(game.home_team, selectedSport) : Promise.resolve({ team: game.home_team, injuries: [], source: 'none' }),
          apiSportsKey ? fetchApiSportsInjuries(game.away_team, selectedSport) : Promise.resolve({ team: game.away_team, injuries: [], source: 'none' })
        ]).then(([homeData, awayData]) => {
          setEspnDataCache(prev => (Object.assign({}, prev, {
            [game.id]: { 
              home: homeData, 
              away: awayData
            }
          })));
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

      // DEBUG: Feature extraction
      console.log('=== DEBUG FEATURE EXTRACTION ===');
      console.log('Game data teams:', gameData.teams);
      console.log('Team statistics keys:', Object.keys(gameData.team_statistics || {}));
      console.log('Home team stats:', gameData.team_statistics?.[gameData.teams?.home]);
      
      const testFeatures = extractModelFeatures(gameData);
      console.log('Extracted features:', testFeatures);
      console.log('Feature count:', testFeatures ? Object.keys(testFeatures).length : 0);
      console.log('First 5 features:', testFeatures ? Object.fromEntries(Object.entries(testFeatures).slice(0, 5)) : null);
      console.log('=== END DEBUG ===');

      const espnData = espnDataCache[game.id];
      
      let marketData = null;
      if (game.bookmakers && game.bookmakers.length > 0) {
        const book = game.bookmakers[0];
        marketData = {
          source: 'the-odds-api',
          spread: book.markets.find(m => m.key === 'spreads'),
          total: book.markets.find(m => m.key === 'totals')
        };
      }
      
      const isCFB = gameData.team_data !== undefined;
      let fantasyData = null;

      const compiledData = await compileAllGameData(game, gameData, espnData, marketData, fantasyData);
      
      addDebugLog('✓ Data compiled', { 
        hasModelPredictions: compiledData.data_quality.model_predictions_available
      });

      let prompt = "=== NFL GAME ANALYSIS ===\n";
      prompt += `${game.away_team} @ ${game.home_team}\n\n`;
      
      if (compiledData.model_predictions?.available) {
        prompt += "=== PYTHON ML MODEL PREDICTIONS ===\n";
        prompt += `Spread: Home ${compiledData.model_predictions.spread.value > 0 ? 'favored by' : 'underdog by'} ${Math.abs(compiledData.model_predictions.spread.value).toFixed(1)} points\n`;
        prompt += `Win Probability: Home ${(compiledData.model_predictions.win_probability.home * 100).toFixed(1)}% / Away ${(compiledData.model_predictions.win_probability.away * 100).toFixed(1)}%\n\n`;
      }
      
      prompt += "=== FULL COMPILED DATA ===\n";
      prompt += JSON.stringify(compiledData, null, 2) + "\n\n";
      prompt += "Provide comprehensive analysis. Educational purposes only.\n";

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
      const analysis = result.choices[0]?.message?.content;

      setAnalyses(prev => (Object.assign({}, prev, {
        [game.id]: { 
          loading: false, 
          text: analysis,
          compiledData: compiledData,
          modelPredictions: compiledData.model_predictions
        }
      })));

    } catch (err) {
      console.error('Analysis error:', err);
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
          ML Model Integration + Deep Analysis
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
              API-Sports (Injuries)
            </div>
            <input
              type="password"
              value={apiSportsKey}
              onChange={(e) => setApiSportsKey(e.target.value)}
              placeholder="API-Sports Key"
              style={{ width: "100%", padding: "8px", border: "2px solid #4caf50", borderRadius: "4px", marginBottom: "8px" }}
            />
          </div>

          <button 
            onClick={fetchGames} 
            disabled={loading || !datasetLoaded} 
            style={{ marginTop: "15px", padding: "10px 20px", backgroundColor: (loading || !datasetLoaded) ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: (loading || !datasetLoaded) ? "not-allowed" : "pointer" }}
          >
            {loading ? "Loading..." : "Load Games"}
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

          return (
            <div key={game.id} style={{ backgroundColor: "white", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderBottom: "1px solid #e9ecef" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{game.away_team} @ {game.home_team}</h3>
                  </div>
                  <button 
                    onClick={() => analyzeGame(game)} 
                    disabled={analysis?.loading} 
                    style={{ padding: "8px 16px", backgroundColor: analysis?.loading ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: analysis?.loading ? "not-allowed" : "pointer" }}
                  >
                    {analysis?.loading ? "Analyzing..." : "Analyze with ML Model"}
                  </button>
                </div>
              </div>

              <div style={{ padding: "15px" }}>
                {analysis?.modelPredictions?.available && (
                  <div style={{ padding: "15px", backgroundColor: "#e3f2fd", borderRadius: "6px", marginBottom: "15px", border: "2px solid #1976d2" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#1976d2" }}>
                      ML Model Predictions
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                      <div>
                        <strong>Spread</strong>
                        <p style={{ margin: "5px 0", fontSize: "18px", fontWeight: "600" }}>
                          {analysis.modelPredictions.spread.value > 0 ? '+' : ''}{analysis.modelPredictions.spread.value.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <strong>Win Probability</strong>
                        <p style={{ margin: "5px 0", fontSize: "14px" }}>
                          Home: <strong>{(analysis.modelPredictions.win_probability.home * 100).toFixed(1)}%</strong><br/>
                          Away: <strong>{(analysis.modelPredictions.win_probability.away * 100).toFixed(1)}%</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {analysis?.text && (
                  <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "6px", fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "600px", overflowY: "auto", lineHeight: "1.6" }}>
                    {analysis.text}
                  </div>
                )}

                {analysis?.loading && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                    Analyzing game with ML model...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}