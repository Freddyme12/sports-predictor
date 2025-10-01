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
  const [nfeloData, setNfeloData] = useState(null);
  const [nfeloAvailable, setNfeloAvailable] = useState(false);
  const [backendDataCache, setBackendDataCache] = useState({});
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

**Sign Convention Check:**
Before finalizing any spread, verify all components have correct signs:
- Positive components favor HOME team
- Negative components favor AWAY team
- Home field advantage is ALWAYS positive (favors home)

## SPORT DETECTION & METHODOLOGY

**CFB Indicators:** SP+, success_rate, explosiveness, havoc_rate
**NFL Indicators:** EPA, offensive_line_unit, player_statistics, PFF grades

## COLLEGE FOOTBALL (CFB) PROJECTION - CORRECTED

### CFB Spread Calculation (VERIFIED FORMULAS)

1. **SP+ Differential** (45% weight)
   - (Home SP+ Overall - Away SP+ Overall) × 0.18
   - Positive = Home advantage, Negative = Away advantage

2. **Offensive Success Rate Gap** (22% weight)
   - (Home Off Success Rate - Away Off Success Rate) × 220
   - Higher offensive success rate = better offense

3. **Defensive Success Rate Advantage** (18% weight) - CORRECTED
   - (Away Def Success Rate - Home Def Success Rate) × 180
   - LOWER def success rate is BETTER defense
   - Negative result = Home has better defense (home advantage)
   - Positive result = Away has better defense (away advantage)

4. **Explosiveness Differential** (10% weight)
   - (Home Explosiveness - Away Explosiveness) × 25
   - Points per 0.10 differential

5. **Havoc Rate Advantage** (5% weight)
   - (Home Havoc - Away Havoc) × 120
   - Points per 0.10 differential

6. **Home Field Advantage:** +3.5 points standard

**Verification Steps:**
1. Calculate each component with sign
2. Sum all components
3. Verify final spread makes intuitive sense
4. If Home SP+ is better but spread favors away, re-check calculations

### CFB Third Down & Situational Analysis
- Analyze third down conversion rates from game_results
- Red zone efficiency (if available in scoring data)
- Tempo adjustments based on offensive pace

### CFB Total Projection
Base = [(Home PPG + Away PPG) / 2] × 2
**Adjustments:**
- Explosiveness avg >1.3: +4 points
- SP+ Offense boost: Each +10 SP+ = +2.5 points
- Defensive strength: Strong defenses (SP+ Def <25) = -3 points
- Recent scoring trends from game_results

## NFL PROJECTION METHODOLOGY - ENHANCED

### NFL Spread Calculation with EPA

1. **EPA Differential** (40% weight)
   - Overall EPA gap × 320 points per 0.1 EPA
   - Pass EPA: (Home Pass EPA - Away Pass EPA) × 280
   - Rush EPA: (Home Rush EPA - Away Rush EPA) × 160

2. **Success Rate Differential** (25% weight)
   - (Home Success Rate - Away Success Rate) × 250
   - Early down success (if available) weighted 1.2x

3. **Explosive Play Factor** (15% weight)
   - (Home Explosive Share - Away Explosive Share) × 150
   - Pass explosiveness weighted 1.3x vs rush

4. **Third Down Efficiency** (10% weight)
   - (Home 3rd Down - Away 3rd Down) × 100
   - Critical conversion situations

5. **Red Zone Efficiency** (10% weight)
   - (Home RZ TD% - Away RZ TD%) × 80
   - Finishing drives matters

6. **Home Field:** +2.5 points standard

### NFL O-Line Integration
- Pass block win rate differential × 12
- Run block win rate differential × 8
- Pressure rate differential impact on QB performance

### NFL Total Projection
Base = Team EPA indicators + pace
**Pace Factor:**
- Combined plays >130 = 1.08x
- Average 122-130 = 1.00x  
- Slow <122 = 0.93x
**Adjustments:**
- Each 0.1 EPA = ±2.8 points
- Red zone TD rates impact scoring ceiling
- Third down efficiency affects drive sustainability

## ADVANCED INJURY MODELING

### QB Injuries - Context-Dependent
**Elite to Average Backup:**
- QB with passer rating >95 to backup <85: -6 points
- QB with passer rating 85-95 to backup <75: -5 points
- Average QB (75-85) to poor backup (<65): -4 points

**Non-QB Position Values (Realistic):**
- Elite RB (>1000 yds pace): -1.2 points
- Star WR/TE (>100 tgt pace): -1.0 points
- Multiple WRs (2+ starters): -2.0 points compound
- O-Line starter: -0.5 points each

**Cluster Multiplier:**
- 2 injuries same position: ×1.3
- 3+ injuries same position: ×1.6
- Bulk injuries (4+ any position): +1.0 flat penalty

### CFB Injury Impact (Higher due to less depth)
- Elite QB: -7 points
- Average QB: -5 points
- Star RB: -2 points
- Elite WR/OL: -1.5 points

## ENSEMBLE MODELING

When multiple projections available, weight as:
- **Your Statistical Model:** 50%
- **nfelo (NFL only):** 25%
- **Market Line:** 25%

**Consensus Bonus:**
- All models within 2 points: +1 confidence star
- Models disagree by 4+ points: -1 confidence star
- Your model vs market edge >3 pts: Flag as high variance

## CONFIDENCE SCORING (CALIBRATED)

Base confidence from model strength, then adjust:

**Starting Point:**
- Strong data + model consensus: 4 stars
- Decent data + some agreement: 3 stars  
- Limited data or disagreement: 2 stars
- Weak data or high variance: 1 star

**Adjustments:**
- Model consensus (within 2 pts): +1 star
- Major injury (QB/multiple starters): -1 star
- High variance (>4 pt model disagreement): -1 star
- Market moving against your model: -1 star

**Target Win Rates:**
- 1-2 stars: 52-54% (marginal edge)
- 3 stars: 55-58% (solid play)
- 4 stars: 60-65% (strong play)
- 5 stars: 67%+ (exceptional, rare)

## OUTPUT STRUCTURE

### GAME PROJECTION
**Spread:** [Team] -X.X (Statistical Model)
**Ensemble Spread:** [Team] -X.X (if multiple models)
**Total:** XX.X points
**Win Probability:** XX% / YY%
**Confidence:** ⭐⭐⭐ (X/5)

### KEY METRICS COMPARISON TABLE
Present home vs away for all major metrics

### CALCULATION BREAKDOWN
Show each formula component:
1. SP+/EPA component: [calculation] = +/-X.X points
2. Success rate component: [calculation] = +/-X.X points
3. [Continue for all factors]
4. **VERIFY SIGNS:** Check each component makes intuitive sense
5. Sum with home field = Final Spread

### SITUATIONAL FACTORS
- Recent form (last 3 games with scores)
- Third down efficiency gap
- Red zone performance
- Pace of play impact
- Key player availability

### INJURY IMPACT ANALYSIS
If injuries present:
- Quantified impact per player
- Cluster/bulk penalties
- Net differential
- Confidence adjustment

### BETTING RECOMMENDATIONS
**Primary Pick:** [Side/Total] ⭐⭐⭐⭐
- Model edge: X.X points vs market
- Ensemble agreement: [consensus/split]
- Expected value: [if calculable]

**Risk Factors:**
- List specific concerns
- Model disagreements
- Volatility indicators

**Performance Tracking:**
- Track your predictions vs outcomes
- Calculate actual win rate by confidence level
- Monitor CLV (closing line value)

## CRITICAL RULES

1. **Always verify defensive calculations:** Lower def success rate = better defense
2. **Check signs before finalizing:** Each component should make logical sense
3. **Show all calculations explicitly**
4. **Use ensemble weighting when multiple models available**
5. **Calibrate confidence based on data quality and model agreement**
6. **Be realistic:** 54-56% accuracy is excellent, not 70%+
7. **Account for regression:** Recent outlier performances may not repeat
8. **Third down and red zone efficiency are predictive**
9. **Most non-QB injuries have minimal line impact**
10. **Market line contains information - respect it**

## RESPONSE FORMAT

Use clear headers, bullet points for readability. Bold key numbers. Create comparison tables for metrics. Show calculation work. Be concise but comprehensive.

**Remember:** Need 52.4% to break even at -110. Educational purposes only. Most bettors lose long-term.`;

  const sports = [
    { key: "americanfootball_nfl", title: "NFL" },
    { key: "americanfootball_ncaaf", title: "College Football" },
    { key: "basketball_nba", title: "NBA" },
    { key: "baseball_mlb", title: "MLB" },
    { key: "icehockey_nhl", title: "NHL" },
  ];

  const calculateAdvancedFeatures = (gameData) => {
    if (!gameData) return null;

    // CFB Detection
    if (gameData.team_data) {
      const home = gameData.team_data.home;
      const away = gameData.team_data.away;
      if (!home || !away) return null;

      const hasValidData = home.sp_overall !== undefined || home.off_success_rate !== undefined;
      if (!hasValidData) return null;

      return {
        sport: 'CFB',
        spPlusDiff: (home.sp_overall || 0) - (away.sp_overall || 0),
        offSuccessRateDiff: (home.off_success_rate || 0) - (away.off_success_rate || 0),
        defSuccessRateAdvantage: (away.def_success_rate || 0) - (home.def_success_rate || 0),
        explosivenessDiff: (home.off_explosiveness || 0) - (away.off_explosiveness || 0),
        havocRateDiff: (home.havoc_rate || 0) - (away.havoc_rate || 0),
        homePPG: home.points_per_game || 0,
        awayPPG: away.points_per_game || 0,
        homeRecord: home.record || '0-0',
        awayRecord: away.record || '0-0',
        homeDefenseRating: home.sp_defense || 0,
        awayDefenseRating: away.sp_defense || 0,
        homeOffenseRating: home.sp_offense || 0,
        awayOffenseRating: away.sp_offense || 0,
        homeGamesPlayed: home.games_played || 0,
        awayGamesPlayed: away.games_played || 0,
        homeRecentResults: home.game_results || [],
        awayRecentResults: away.game_results || []
      };
    }

    // NFL Detection
    const teamStats = gameData.team_statistics;
    if (teamStats) {
      const homeTeam = gameData.teams?.home;
      const awayTeam = gameData.teams?.away;
      const home = teamStats[homeTeam];
      const away = teamStats[awayTeam];
      
      if (!home || !away) return null;

      return {
        sport: 'NFL',
        homeEPA: home.offense?.epa_per_play?.overall || 0,
        awayEPA: away.offense?.epa_per_play?.overall || 0,
        homePassEPA: home.offense?.epa_per_play?.pass || 0,
        awayPassEPA: away.offense?.epa_per_play?.pass || 0,
        homeRushEPA: home.offense?.epa_per_play?.rush || 0,
        awayRushEPA: away.offense?.epa_per_play?.rush || 0,
        homeSuccessRate: home.offense?.success_rate?.overall || 0,
        awaySuccessRate: away.offense?.success_rate?.overall || 0,
        homeExplosiveShare: home.offense?.explosive_play_share?.overall || 0,
        awayExplosiveShare: away.offense?.explosive_play_share?.overall || 0,
        homeThirdDown: home.offense?.third_down?.overall || 0,
        awayThirdDown: away.offense?.third_down?.overall || 0,
        homeRedZoneTD: home.offense?.red_zone?.td_rate || 0,
        awayRedZoneTD: away.offense?.red_zone?.td_rate || 0,
        homeDefEPA: home.defense?.epa_per_play_allowed?.overall || 0,
        awayDefEPA: away.defense?.epa_per_play_allowed?.overall || 0,
        homePressureAllowed: home.offense?.pressure_rate_allowed || 0,
        awayPressureAllowed: away.offense?.pressure_rate_allowed || 0,
        homePace: gameData.matchup_specific?.pace_of_play_proxy?.[homeTeam] || 0,
        awayPace: gameData.matchup_specific?.pace_of_play_proxy?.[awayTeam] || 0,
        homePassBlockWR: gameData.player_statistics?.[homeTeam]?.offensive_line_unit?.pass_block_win_rate || 0,
        awayPassBlockWR: gameData.player_statistics?.[awayTeam]?.offensive_line_unit?.pass_block_win_rate || 0,
        homeRunBlockWR: gameData.player_statistics?.[homeTeam]?.offensive_line_unit?.run_block_win_rate || 0,
        awayRunBlockWR: gameData.player_statistics?.[awayTeam]?.offensive_line_unit?.run_block_win_rate || 0,
        homePFFOverall: gameData.player_statistics?.[homeTeam]?.pff_grades?.overall || 0,
        awayPFFOverall: gameData.player_statistics?.[awayTeam]?.pff_grades?.overall || 0
      };
    }

    return null;
  };

  const calculateStatisticalPrediction = (gameData, advancedFeatures, injuryImpact) => {
    if (!advancedFeatures) return null;

    if (advancedFeatures.sport === 'CFB') {
      let homeAdvantage = 3.5;
      
      const spComponent = advancedFeatures.spPlusDiff * 0.18 * 0.45;
      const offSRComponent = advancedFeatures.offSuccessRateDiff * 220 * 0.22;
      const defSRComponent = advancedFeatures.defSuccessRateAdvantage * 180 * 0.18;
      const explosiveComponent = advancedFeatures.explosivenessDiff * 25 * 0.10;
      const havocComponent = advancedFeatures.havocRateDiff * 120 * 0.05;
      
      homeAdvantage += spComponent + offSRComponent + defSRComponent + explosiveComponent + havocComponent;
      homeAdvantage -= injuryImpact.home;
      homeAdvantage += injuryImpact.away;

      const projectedSpread = Math.round(homeAdvantage * 2) / 2;
      const basePPG = (advancedFeatures.homePPG + advancedFeatures.awayPPG) / 2;
      let projectedTotal = basePPG * 2;
      
      const avgExplosiveness = (advancedFeatures.explosivenessDiff + 
        (advancedFeatures.homeRecentResults?.[0]?.points_for || 0) / 35) / 2;
      if (avgExplosiveness > 1.3) projectedTotal += 4;
      
      projectedTotal += ((advancedFeatures.homeOffenseRating + advancedFeatures.awayOffenseRating) / 20) * 2.5;

      const baseConfidence = 3;
      let confidence = baseConfidence - injuryImpact.confidenceReduction;
      
      if (advancedFeatures.homeGamesPlayed < 3 || advancedFeatures.awayGamesPlayed < 3) {
        confidence = Math.max(1, confidence - 1);
      }

      return {
        projectedSpread,
        projectedTotal: Math.round(projectedTotal * 2) / 2,
        confidence: Math.max(1, Math.min(5, confidence)),
        homeScore: (projectedTotal / 2) + (projectedSpread / 2),
        awayScore: (projectedTotal / 2) - (projectedSpread / 2),
        sport: 'CFB',
        components: {
          spPlus: spComponent,
          offensiveSuccess: offSRComponent,
          defensiveSuccess: defSRComponent,
          explosiveness: explosiveComponent,
          havoc: havocComponent,
          homeField: 3.5,
          injuries: injuryImpact.differential
        }
      };
    }

    // NFL Calculation
    let homeAdvantage = 2.5;
    
    const epaComponent = (advancedFeatures.homeEPA - advancedFeatures.awayEPA) * 320 * 0.40;
    const successRateComponent = (advancedFeatures.homeSuccessRate - advancedFeatures.awaySuccessRate) * 250 * 0.25;
    const explosiveComponent = (advancedFeatures.homeExplosiveShare - advancedFeatures.awayExplosiveShare) * 150 * 0.15;
    const thirdDownComponent = (advancedFeatures.homeThirdDown - advancedFeatures.awayThirdDown) * 100 * 0.10;
    const redZoneComponent = (advancedFeatures.homeRedZoneTD - advancedFeatures.awayRedZoneTD) * 80 * 0.10;
    
    const oLineComponent = (
      (advancedFeatures.homePassBlockWR - advancedFeatures.awayPassBlockWR) * 0.12 +
      (advancedFeatures.homeRunBlockWR - advancedFeatures.awayRunBlockWR) * 0.08
    );
    
    homeAdvantage += epaComponent + successRateComponent + explosiveComponent + 
                     thirdDownComponent + redZoneComponent + oLineComponent;
    homeAdvantage -= injuryImpact.home;
    homeAdvantage += injuryImpact.away;

    const projectedSpread = Math.round(homeAdvantage * 2) / 2;
    
    const combinedPace = (advancedFeatures.homePace + advancedFeatures.awayPace);
    const paceFactor = combinedPace > 130 ? 1.08 : combinedPace < 122 ? 0.93 : 1.00;
    let projectedTotal = (combinedPace * 0.68 * paceFactor);
    
    projectedTotal += ((advancedFeatures.homeEPA + advancedFeatures.awayEPA) / 2) * 28;

    let confidence = 3;
    confidence -= injuryImpact.confidenceReduction;

    return {
      projectedSpread,
      projectedTotal: Math.round(projectedTotal * 2) / 2,
      confidence: Math.max(1, Math.min(5, confidence)),
      homeScore: projectedTotal ? ((projectedTotal / 2) + (projectedSpread / 2)) : null,
      awayScore: projectedTotal ? ((projectedTotal / 2) - (projectedSpread / 2)) : null,
      sport: 'NFL',
      components: {
        epa: epaComponent,
        successRate: successRateComponent,
        explosiveness: explosiveComponent,
        thirdDown: thirdDownComponent,
        redZone: redZoneComponent,
        oLine: oLineComponent,
        homeField: 2.5,
        injuries: injuryImpact.differential
      }
    };
  };

  const calculateEnsemblePrediction = (statProjection, nfeloPrediction, marketSpread) => {
    if (!statProjection) return null;
    
    let ensembleSpread = statProjection.projectedSpread;
    let weights = { model: 0.50, nfelo: 0.25, market: 0.25 };
    const models = [statProjection.projectedSpread];
    
    if (nfeloPrediction?.predicted_spread !== undefined) {
      models.push(nfeloPrediction.predicted_spread);
      ensembleSpread = (
        (statProjection.projectedSpread * 0.50) +
        (nfeloPrediction.predicted_spread * 0.25) +
        ((marketSpread || 0) * 0.25)
      );
    } else if (marketSpread !== undefined) {
      models.push(marketSpread);
      ensembleSpread = (
        (statProjection.projectedSpread * 0.65) +
        (marketSpread * 0.35)
      );
      weights = { model: 0.65, nfelo: 0, market: 0.35 };
    }
    
    let consensusBonus = 0;
    if (models.length >= 2) {
      const maxDiff = Math.max(...models) - Math.min(...models);
      if (maxDiff < 2) consensusBonus = 1;
      else if (maxDiff > 4) consensusBonus = -1;
    }
    
    return {
      ensembleSpread: Math.round(ensembleSpread * 2) / 2,
      baseSpread: statProjection.projectedSpread,
      nfeloSpread: nfeloPrediction?.predicted_spread,
      marketSpread,
      weights,
      consensusConfidence: Math.max(1, Math.min(5, (statProjection.confidence || 3) + consensusBonus)),
      hasConsensus: consensusBonus > 0,
      hasDisagreement: consensusBonus < 0,
      modelEdge: marketSpread ? Math.abs(statProjection.projectedSpread - marketSpread) : null
    };
  };

  const quantifyInjuryImpact = (espnData, isCFB = false, playerStats = null) => {
    if (!espnData?.home || !espnData?.away) return { home: 0, away: 0, total: 0, differential: 0, confidenceReduction: 0 };

    const cfbImpactScores = {
      'qb': 7.0, 'quarterback': 7.0,
      'rb': 2.0, 'running back': 2.0,
      'wr': 1.5, 'wide receiver': 1.5, 'receiver': 1.5,
      'te': 1.0, 'tight end': 1.0,
      'ol': 1.0, 'offensive line': 1.0, 'guard': 1.0, 'tackle': 1.0
    };

    const nflImpactScores = {
      'qb': 5.5, 'quarterback': 5.5,
      'rb': 1.2, 'running back': 1.2,
      'wr': 1.0, 'wide receiver': 1.0, 'receiver': 1.0,
      'te': 0.6, 'tight end': 0.6,
      'ol': 0.5, 'offensive line': 0.5, 'guard': 0.5, 'tackle': 0.5
    };

    const impactScores = isCFB ? cfbImpactScores : nflImpactScores;

    const calculateInjuries = (injuries) => {
      const positionCount = {};
      let totalImpact = 0;
      let qbInjured = false;

      injuries.forEach(inj => {
        const headline = inj.headline.toLowerCase();
        let impact = 0;
        let severity = headline.includes('out') ? 1.0 : 
                      headline.includes('doubtful') ? 0.8 : 
                      headline.includes('questionable') ? 0.4 : 0.5;

        for (const [pos, value] of Object.entries(impactScores)) {
          if (headline.includes(pos)) {
            impact = Math.max(impact, value);
            positionCount[pos] = (positionCount[pos] || 0) + 1;
            if (pos === 'qb' || pos === 'quarterback') qbInjured = true;
            break;
          }
        }

        totalImpact += (impact * severity);
      });

      Object.entries(positionCount).forEach(([pos, count]) => {
        if (count >= 2 && pos !== 'qb') {
          totalImpact *= (1 + (count - 1) * 0.3);
        }
      });

      if (injuries.length >= 4 && !qbInjured) {
        totalImpact += 1.0;
      }

      return totalImpact;
    };

    const homeImpact = calculateInjuries(espnData.home?.injuries || []);
    const awayImpact = calculateInjuries(espnData.away?.injuries || []);

    return {
      home: homeImpact,
      away: awayImpact,
      total: homeImpact + awayImpact,
      differential: homeImpact - awayImpact,
      confidenceReduction: Math.min(Math.floor((homeImpact + awayImpact) / 3.5), 2)
    };
  };

  const findMarketValue = (game, statProjection) => {
    if (!game.bookmakers || !statProjection) return null;

    let bestHomeSpread = null;
    let bestTotal = null;

    game.bookmakers.forEach(book => {
      const spreadMarket = book.markets?.find(m => m.key === 'spreads');
      const totalsMarket = book.markets?.find(m => m.key === 'totals');
      
      if (spreadMarket) {
        spreadMarket.outcomes.forEach(outcome => {
          if (outcome.name === game.home_team && (!bestHomeSpread || Math.abs(outcome.point) < Math.abs(bestHomeSpread.point))) {
            bestHomeSpread = { point: outcome.point, price: outcome.price, book: book.title };
          }
        });
      }

      if (totalsMarket && totalsMarket.outcomes?.[0]) {
        const totalLine = totalsMarket.outcomes[0].point;
        if (!bestTotal) bestTotal = { point: totalLine, book: book.title };
      }
    });

    if (!bestHomeSpread) return null;

    const marketSpread = bestHomeSpread.point;
    const projectedSpread = statProjection.projectedSpread;
    const spreadDiff = projectedSpread - marketSpread;

    return {
      marketSpread,
      projectedSpread,
      spreadDifferential: Math.abs(spreadDiff),
      spreadRecommendation: spreadDiff > 0 ? 'HOME' : 'AWAY',
      bestLine: bestHomeSpread,
      confidence: statProjection.confidence,
      marketTotal: bestTotal?.point,
      projectedTotal: statProjection.projectedTotal,
      totalEdge: bestTotal ? Math.abs(statProjection.projectedTotal - bestTotal.point) : 0,
      totalRecommendation: bestTotal && statProjection.projectedTotal > bestTotal.point ? 'OVER' : 'UNDER'
    };
  };

  const parseDataset = () => {
    try {
      const parsed = JSON.parse(customDataset);
      setParsedDataset(parsed);
      setDatasetLoaded(true);
      setError("");
      return parsed;
    } catch (err) {
      setDatasetLoaded(false);
      setError("Invalid JSON format. Please check your dataset.");
      return null;
    }
  };

  const fetchESPNData = async (teamName, sport) => {
    if (!teamName || typeof teamName !== 'string' || teamName === 'Unknown Home' || teamName === 'Unknown Away') {
      return { team: teamName || 'Unknown', injuries: [], lastUpdated: new Date().toISOString(), source: 'none' };
    }
    
    try {
      const sportMap = { 
        'americanfootball_nfl': 'football/nfl',
        'americanfootball_ncaaf': 'football/college-football'
      };
      const sportPath = sportMap[sport] || 'football/nfl';
      const teamAbbr = getTeamAbbreviation(teamName, sport === 'americanfootball_ncaaf' ? 'cfb' : 'nfl');
      
      const proxyUrl = `${BACKEND_URL}/api/espn-proxy?sport=${encodeURIComponent(sportPath)}&team=${encodeURIComponent(teamAbbr)}`;
      
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });

      if (!response.ok) {
        return { team: teamName, injuries: [], lastUpdated: new Date().toISOString(), source: 'failed' };
      }

      const data = await response.json();
      
      if (!data.success) {
        return { team: teamName, injuries: [], lastUpdated: new Date().toISOString(), source: data.source || 'failed' };
      }
      
      return { 
        team: teamName, 
        injuries: data.injuries || [],
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        source: data.source || 'unknown',
        fallbackUsed: data.fallbackUsed || false
      };
    } catch (error) {
      return { 
        team: teamName, 
        injuries: [], 
        lastUpdated: new Date().toISOString(),
        source: 'error'
      };
    }
  };

  const getTeamAbbreviation = (teamName, sport) => {
    if (!teamName || typeof teamName !== 'string') return 'unknown';
    
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

    if (sport === 'nfl') return nflTeams[teamName] || teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
    return teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
  };

  const fetchGames = async () => {
    setLoading(true);
    setError("");
    setGames([]);

    try {
      if (!parsedDataset || !parsedDataset.games) {
        setError("Please load a JSON dataset first.");
        setLoading(false);
        return;
      }

      let gamesWithIds = parsedDataset.games.map((game, index) => {
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
          sport_title: selectedSport.replace(/_/g, ' ').toUpperCase(),
          commence_time: gameTime,
          home_team: homeTeam,
          away_team: awayTeam,
          bookmakers: [],
          datasetGame: game
        };
      });

      setGames(gamesWithIds);

      for (const game of gamesWithIds) {
        const hasValidTeams = game.home_team && game.away_team && 
                             typeof game.home_team === 'string' && 
                             typeof game.away_team === 'string';
        
        if (!hasValidTeams) continue;
        
        Promise.all([
          fetchESPNData(game.home_team, selectedSport),
          fetchESPNData(game.away_team, selectedSport)
        ]).then(([homeData, awayData]) => {
          setEspnDataCache(prev => ({
            ...prev,
            [game.id]: { home: homeData, away: awayData, fetchedAt: new Date().toISOString() }
          }));
        });
      }

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
      if (!gameData) throw new Error("No dataset found for this game");

      const advancedFeatures = calculateAdvancedFeatures(gameData);
      const isCFB = advancedFeatures?.sport === 'CFB';
      const espnData = espnDataCache[game.id];
      const injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : { home: 0, away: 0, total: 0, differential: 0, confidenceReduction: 0 };
      const statPrediction = advancedFeatures ? calculateStatisticalPrediction(gameData, advancedFeatures, injuryImpact) : null;
      const marketAnalysis = statPrediction ? findMarketValue(game, statPrediction) : null;
      const ensemblePrediction = statPrediction ? 
        calculateEnsemblePrediction(statPrediction, null, marketAnalysis?.marketSpread) : null;

      let prompt = `Analyze: ${game.away_team} @ ${game.home_team}\n\n`;
      prompt += `**SPORT: ${isCFB ? 'COLLEGE FOOTBALL' : 'NFL'}**\n\n`;

      if (statPrediction && marketAnalysis) {
        prompt += `**STATISTICAL MODEL PROJECTION:**\n`;
        prompt += `Spread: ${game.home_team} ${statPrediction.projectedSpread > 0 ? '-' : '+'}${Math.abs(statPrediction.projectedSpread)}\n`;
        prompt += `Total: ${statPrediction.projectedTotal?.toFixed(1)}\n`;
        prompt += `Confidence: ${statPrediction.confidence}/5 stars\n\n`;
        
        if (statPrediction.components) {
          prompt += `**CALCULATION COMPONENTS:**\n`;
          Object.entries(statPrediction.components).forEach(([key, value]) => {
            prompt += `${key}: ${value >= 0 ? '+' : ''}${value.toFixed(2)} pts\n`;
          });
          prompt += `\n`;
        }

        if (marketAnalysis.marketSpread) {
          prompt += `Market: ${game.home_team} ${marketAnalysis.marketSpread}\n`;
          prompt += `Model Edge: ${(statPrediction.projectedSpread - marketAnalysis.marketSpread).toFixed(1)} points\n\n`;
        }
      }

      if (ensemblePrediction) {
        prompt += `**ENSEMBLE PROJECTION:**\n`;
        prompt += `Weighted Spread: ${game.home_team} ${ensemblePrediction.ensembleSpread > 0 ? '-' : '+'}${Math.abs(ensemblePrediction.ensembleSpread)}\n`;
        prompt += `Confidence: ${ensemblePrediction.consensusConfidence}/5 (${ensemblePrediction.hasConsensus ? 'Consensus' : ensemblePrediction.hasDisagreement ? 'Disagreement' : 'Mixed'})\n\n`;
      }

      if (injuryImpact.total > 0) {
        prompt += `**INJURY IMPACT:**\n`;
        prompt += `${game.home_team}: -${injuryImpact.home.toFixed(1)} pts (${espnData?.home?.injuries?.length || 0} injuries)\n`;
        prompt += `${game.away_team}: -${injuryImpact.away.toFixed(1)} pts (${espnData?.away?.injuries?.length || 0} injuries)\n`;
        prompt += `Net Edge: ${Math.abs(injuryImpact.differential).toFixed(1)} pts favoring ${injuryImpact.differential > 0 ? game.away_team : game.home_team}\n\n`;
      }

      prompt += `**COMPLETE DATASET:**\n${JSON.stringify(gameData, null, 2)}\n\n`;
      prompt += `Use ${isCFB ? 'CFB' : 'NFL'} methodology. Show all calculations. Verify defensive success rate signs are correct.`;

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
        [game.id]: { 
          loading: false, 
          text: analysis, 
          marketAnalysis, 
          statPrediction,
          ensemblePrediction
        }
      }));

      if (statPrediction && marketAnalysis?.marketSpread) {
        setPredictionTracking(prev => [...prev, {
          gameId: game.id,
          teams: `${game.away_team} @ ${game.home_team}`,
          modelSpread: statPrediction.projectedSpread,
          marketSpread: marketAnalysis.marketSpread,
          confidence: statPrediction.confidence,
          timestamp: new Date().toISOString()
        }]);
      }

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
              <li>You WILL lose money most sessions</li>
              <li>Educational and fantasy football purposes only</li>
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
          Fixed Formulas • Ensemble Modeling • Advanced Metrics • Performance Tracking
        </p>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>1. Load Your Dataset</h2>
          <textarea
            value={customDataset}
            onChange={(e) => setCustomDataset(e.target.value)}
            placeholder='Paste CFB or NFL JSON dataset...'
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px" }}>
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
            {loading ? "Loading..." : "Initialize Games"}
          </button>
        </div>

        {error && <div style={{ backgroundColor: "#fee2e2", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#dc2626" }}>{error}</div>}

        {games.map(game => {
          const analysis = analyses[game.id];
          const advancedFeatures = game.datasetGame ? calculateAdvancedFeatures(game.datasetGame) : null;
          const isCFB = advancedFeatures?.sport === 'CFB';

          return (
            <div key={game.id} style={{ backgroundColor: "white", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderBottom: "1px solid #e9ecef" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{game.away_team} @ {game.home_team}</h3>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                      {new Date(game.commence_time).toLocaleString()}
                    </div>
                    
                    {advancedFeatures && (
                      <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", backgroundColor: isCFB ? "#d1ecf1" : "#d4edda", color: isCFB ? "#0c5460" : "#155724", fontWeight: "600" }}>
                          {isCFB ? 'CFB SP+ Model' : 'NFL EPA Model'}
                        </span>
                        {analysis?.ensemblePrediction?.hasConsensus && (
                          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", backgroundColor: "#d4edda", color: "#155724", fontWeight: "600" }}>
                            Model Consensus
                          </span>
                        )}
                        {analysis?.ensemblePrediction?.hasDisagreement && (
                          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", backgroundColor: "#fff3cd", color: "#856404", fontWeight: "600" }}>
                            High Variance
                          </span>
                        )}
                        {analysis?.ensemblePrediction?.modelEdge > 3 && (
                          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", backgroundColor: "#cfe2ff", color: "#084298", fontWeight: "600" }}>
                            {analysis.ensemblePrediction.modelEdge.toFixed(1)}pt Edge
                          </span>
                        )}
                      </div>
                    )}
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
                  <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Generating enhanced analysis...</div>
                )}
              </div>
            </div>
          );
        })}

        {predictionTracking.length > 0 && (
          <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "white", borderRadius: "8px" }}>
            <h3 style={{ marginTop: 0 }}>Prediction Tracking ({predictionTracking.length} picks)</h3>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
              Track these predictions vs actual outcomes to calibrate your model
            </div>
            {predictionTracking.slice(-5).map((pred, idx) => (
              <div key={idx} style={{ padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px", marginBottom: "8px", fontSize: "12px" }}>
                <strong>{pred.teams}</strong> | Model: {pred.modelSpread.toFixed(1)} | Market: {pred.marketSpread.toFixed(1)} | Conf: {pred.confidence}⭐
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#dc3545", color: "white", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Educational & Fantasy Only</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            v2.0: Fixed CFB defensive bug • EPA integration • Ensemble modeling • Need 52.4% to break even • Call 1-800-GAMBLER
          </p>
        </div>
      </div>
    </div>
  );
}