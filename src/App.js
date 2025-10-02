import React, { useState } from "react";

export default function App() {
  // ... (keep all existing state variables) ...
  const BACKEND_URL = "https://sports-predictor-ruddy.vercel.app";
  const MODEL_API_URL = "http://127.0.0.1:5001"; // Your Python Flask API

  // ... (keep all existing helper functions: resolveTeamName, matchTeams, etc.) ...

  // NEW: Extract 51 features for Python model
  const extractModelFeatures = (gameData) => {
    if (!gameData || !gameData.team_statistics) return null;

    const homeTeam = gameData.teams?.home;
    const awayTeam = gameData.teams?.away;
    const homeStats = gameData.team_statistics?.[homeTeam];
    const awayStats = gameData.team_statistics?.[awayTeam];

    if (!homeStats || !awayStats) return null;

    // Build all 51 features
    return {
      division_game: gameData.division_game || 0,
      home_field_advantage: 2.5,
      short_week: 0,
      weather_impact: 0,
      rest_days: 7,
      
      // Odds features
      spread_line: gameData.spread_line || 0,
      total_line: gameData.total_line || 0,
      home_win_prob_implied: gameData.home_win_prob_implied || 0.5,
      away_win_prob_implied: gameData.away_win_prob_implied || 0.5,
      
      // Home rolling features (17)
      home_epa_overall_rolling: homeStats.offense?.epa_per_play?.overall || 0,
      home_epa_pass_rolling: homeStats.offense?.epa_per_play?.pass || 0,
      home_epa_rush_rolling: homeStats.offense?.epa_per_play?.rush || 0,
      home_success_rate_rolling: homeStats.offense?.success_rate?.overall || 0,
      home_early_down_pass_sr_rolling: homeStats.offense?.early_down_pass_sr || 0,
      home_early_down_pass_epa_rolling: homeStats.offense?.early_down_pass_epa || 0,
      home_explosive_rate_rolling: homeStats.offense?.explosive_play_share?.overall || 0,
      home_yards_after_catch_rolling: homeStats.offense?.yards_after_catch || 5.0,
      home_third_down_rate_rolling: homeStats.offense?.third_down?.overall || 0,
      home_redzone_td_rate_rolling: homeStats.offense?.red_zone?.td_rate || 0,
      home_turnover_diff_rolling: homeStats.turnover_differential || 0,
      home_pressure_rate_rolling: homeStats.defense?.pressure_rate || 0,
      home_def_epa_allowed_rolling: homeStats.defense?.epa_per_play_allowed?.overall || 0,
      home_def_success_rate_allowed_rolling: homeStats.defense?.success_rate_allowed?.overall || 0,
      home_stuff_rate_rolling: homeStats.defense?.stuff_rate || 0,
      home_neutral_script_epa_rolling: homeStats.offense?.neutral_script_epa || 0,
      home_play_count_rolling: homeStats.play_count || 65,
      
      // Away rolling features (17)
      away_epa_overall_rolling: awayStats.offense?.epa_per_play?.overall || 0,
      away_epa_pass_rolling: awayStats.offense?.epa_per_play?.pass || 0,
      away_epa_rush_rolling: awayStats.offense?.epa_per_play?.rush || 0,
      away_success_rate_rolling: awayStats.offense?.success_rate?.overall || 0,
      away_early_down_pass_sr_rolling: awayStats.offense?.early_down_pass_sr || 0,
      away_early_down_pass_epa_rolling: awayStats.offense?.early_down_pass_epa || 0,
      away_explosive_rate_rolling: awayStats.offense?.explosive_play_share?.overall || 0,
      away_yards_after_catch_rolling: awayStats.offense?.yards_after_catch || 5.0,
      away_third_down_rate_rolling: awayStats.offense?.third_down?.overall || 0,
      away_redzone_td_rate_rolling: awayStats.offense?.red_zone?.td_rate || 0,
      away_turnover_diff_rolling: awayStats.turnover_differential || 0,
      away_pressure_rate_rolling: awayStats.defense?.pressure_rate || 0,
      away_def_epa_allowed_rolling: awayStats.defense?.epa_per_play_allowed?.overall || 0,
      away_def_success_rate_allowed_rolling: awayStats.defense?.success_rate_allowed?.overall || 0,
      away_stuff_rate_rolling: awayStats.defense?.stuff_rate || 0,
      away_neutral_script_epa_rolling: awayStats.offense?.neutral_script_epa || 0,
      away_play_count_rolling: awayStats.play_count || 65,
      
      // Differentials (13)
      epa_overall_differential: (homeStats.offense?.epa_per_play?.overall || 0) - (awayStats.offense?.epa_per_play?.overall || 0),
      epa_pass_differential: (homeStats.offense?.epa_per_play?.pass || 0) - (awayStats.offense?.epa_per_play?.pass || 0),
      epa_rush_differential: (homeStats.offense?.epa_per_play?.rush || 0) - (awayStats.offense?.epa_per_play?.rush || 0),
      success_rate_differential: (homeStats.offense?.success_rate?.overall || 0) - (awayStats.offense?.success_rate?.overall || 0),
      early_down_pass_sr_differential: (homeStats.offense?.early_down_pass_sr || 0) - (awayStats.offense?.early_down_pass_sr || 0),
      explosive_rate_differential: (homeStats.offense?.explosive_play_share?.overall || 0) - (awayStats.offense?.explosive_play_share?.overall || 0),
      third_down_rate_differential: (homeStats.offense?.third_down?.overall || 0) - (awayStats.offense?.third_down?.overall || 0),
      redzone_td_rate_differential: (homeStats.offense?.red_zone?.td_rate || 0) - (awayStats.offense?.red_zone?.td_rate || 0),
      turnover_diff_differential: (homeStats.turnover_differential || 0) - (awayStats.turnover_differential || 0),
      pressure_rate_differential: (homeStats.defense?.pressure_rate || 0) - (awayStats.defense?.pressure_rate || 0),
      def_epa_allowed_differential: (homeStats.defense?.epa_per_play_allowed?.overall || 0) - (awayStats.defense?.epa_per_play_allowed?.overall || 0),
      neutral_script_epa_differential: (homeStats.offense?.neutral_script_epa || 0) - (awayStats.offense?.neutral_script_epa || 0)
    };
  };

  // NEW: Fetch model predictions from Flask API
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
        addDebugLog('❌ Model prediction failed', response.status);
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

  // UPDATED: compileAllGameData to include model predictions
  const compileAllGameData = async (game, gameData, espnData, marketData, fantasyData) => {
    // ... (keep existing injury calculation code) ...
    
    // NEW: Fetch model predictions for NFL games
    let modelPredictions = null;
    const isCFB = gameData.team_data !== undefined;
    
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
      
      // NEW: Model predictions section
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
      injuries: { /* keep existing */ },
      market_odds: null,
      fantasy_projections: fantasyData,
      data_quality: {
        dataset_available: true,
        backend_enhanced: !!game.hasBackendData,
        model_predictions_available: !!modelPredictions,
        injury_data_available: /* keep existing */,
        market_odds_available: false
      }
    };
    
    // ... (keep rest of existing code) ...
    
    return compiled;
  };

  // UPDATED: System prompt to include model predictions
  const systemPrompt = `You are an elite sports analyst integrating ML model predictions with contextual analysis.

=== DATA SOURCES ===

1. **Python ML Models** (Trained on 2021-2024 NFL data)
   - Spread Model: Ridge Regression (R² = 0.156, moderate reliability)
   - Total Model: XGBoost (R² = -0.099, use with caution)
   - Win Probability: Calibrated Logistic (62.5% validation accuracy, HIGH reliability)

2. **Statistical Data**: EPA, success rates, efficiency metrics

3. **Contextual Data**: Injuries, weather, rest, motivation

=== YOUR ROLE ===

**Synthesize all sources** to provide superior predictions:

1. **Start with Model Baseline**
   - Model predictions are in model_predictions object
   - Spread: Use as statistical starting point (moderate confidence)
   - Win Probability: TRUST THIS (62.5% accuracy, well-calibrated)
   - Total: Use skeptically (negative R², often wrong)

2. **Apply Injury Adjustments**
   - injuries.net_differential_points shows calculated impact
   - Adjust model spread by this differential
   - Example: Model says -3, injuries +2 for away team = adjusted -1

3. **Consider Market (if available)**
   - If model differs from market by >3 pts, explain divergence
   - Market is often (but not always) more accurate
   - Ensemble: 67% market + 33% model when both available

4. **Contextual Factors**
   - Weather, rest, division games, playoff stakes
   - These can override model by 1-3 points

=== OUTPUT STRUCTURE ===

**1. Model Assessment**
- Present model predictions clearly
- Spread: [model value] (confidence: [level], R²: 0.156)
- Total: [model value] (LOW CONFIDENCE, R²: -0.099)  
- Win Prob: [home %] / [away %] (HIGH CONFIDENCE, 62.5% accuracy)

**2. Model vs Market** (if market available)
- Show divergence in points
- Explain why they differ
- Recommend which to trust more

**3. Injury-Adjusted Prediction**
- Start: Model spread
- Adjust: ± injury differential
- Final: Adjusted spread

**4. Statistical Deep Dive**
- EPA differentials supporting model
- Success rate edges
- Situational factors

**5. Risk Assessment**
- Model limitations
- Key uncertainties  
- Confidence level (1-5)

**6. Final Recommendation**
- Betting guidance (educational only)
- Unit sizing (1-5 based on edge)
- Alternative bets

**CRITICAL:**
- Show all math explicitly
- Be honest about model limitations
- Win probability model is most reliable
- Total model is least reliable
- Educational purposes only`;

  // UPDATED: analyzeGame to handle async compileAllGameData
  const analyzeGame = async (game) => {
    setAnalyses(prev => ({ ...prev, [game.id]: { loading: true } }));
    addDebugLog('🎯 Starting analysis', { game: `${game.away_team} @ ${game.home_team}` });

    try {
      const gameData = game.datasetGame;
      if (!gameData) throw new Error("No dataset found");

      const espnData = espnDataCache[game.id];
      
      // Get market data
      let marketData = null;
      if (game.bookmakers && game.bookmakers.length > 0) {
        const book = game.bookmakers[0];
        marketData = {
          source: 'the-odds-api',
          spread: book.markets.find(m => m.key === 'spreads'),
          total: book.markets.find(m => m.key === 'totals'),
          moneyline: book.markets.find(m => m.key === 'h2h')
        };
      }
      
      // Calculate fantasy
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

      // UPDATED: await compileAllGameData (now async)
      const compiledData = await compileAllGameData(game, gameData, espnData, marketData, fantasyData);
      const dataWarnings = validateDataRanges(compiledData);

      // Build prompt with model predictions
      let prompt = "=== NFL GAME ANALYSIS ===\n";
      prompt += `${game.away_team} @ ${game.home_team}\n\n`;
      
      if (compiledData.model_predictions?.available) {
        prompt += "=== PYTHON ML MODEL PREDICTIONS ===\n";
        prompt += `Trained on 2021-2024 data, validated on 2024 season\n\n`;
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
        prompt += "=== DATA WARNINGS ===\n";
        dataWarnings.forEach(w => prompt += "• " + w + "\n");
        prompt += "\n";
      }
      
      prompt += "Provide comprehensive analysis following your system prompt structure.\n";
      prompt += "Educational purposes only.\n";

      // Call Claude
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

      setAnalyses(prev => ({
        ...prev,
        [game.id]: { 
          loading: false, 
          text: analysis,
          compiledData: compiledData,
          fantasyData: fantasyData,
          dataWarnings: dataWarnings,
          modelPredictions: compiledData.model_predictions
        }
      }));

    } catch (err) {
      addDebugLog('❌ Analysis error', err.message);
      setAnalyses(prev => ({ ...prev, [game.id]: { loading: false, text: "Error: " + err.message } }));
    }
  };

  // ... (keep all other existing code: fetchGames, UI rendering, etc.) ...

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", padding: "20px", fontFamily: "system-ui" }}>
      {/* ... keep existing UI ... */}
      
      {games.map(game => {
        const analysis = analyses[game.id];
        
        return (
          <div key={game.id} style={{ /* ... existing styles ... */ }}>
            {/* ... existing game header ... */}
            
            {/* NEW: Display Model Predictions */}
            {analysis?.modelPredictions?.available && (
              <div style={{ padding: "15px", backgroundColor: "#e3f2fd", borderRadius: "6px", marginBottom: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#1976d2" }}>
                  🤖 Python ML Model Predictions (Trained 2021-2024)
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
                      ✓ 62.5% validation accuracy
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* ... rest of existing UI (analysis text, fantasy, etc.) ... */}
          </div>
        );
      })}
      
      {/* ... existing footer ... */}
    </div>
  );
}