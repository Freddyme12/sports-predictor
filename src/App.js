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
  const [backendDataCache, setBackendDataCache] = useState({});
  const [backendFetchStatus, setBackendFetchStatus] = useState('idle');

  const BACKEND_URL = "https://sports-predictor-ruddy.vercel.app";

  const [showWarning, setShowWarning] = useState(true);
  const [userAcknowledged, setUserAcknowledged] = useState(false);

  const systemPrompt = `You are a sports analyst providing rigorous statistical projections and fantasy football analysis.

## SPORT DETECTION
First, determine which sport you're analyzing based on the dataset:
- If data contains SP+, success_rate, explosiveness, havoc_rate → College Football (CFB)
- If data contains EPA, offensive_line_unit, player_statistics → NFL
- Adapt your methodology accordingly

## NFELO INTEGRATION (NFL ONLY)

When nfelo predictions are available, incorporate them into your analysis:

**nfelo Model Overview:**
- Elo-based rating system specifically tuned for NFL
- Accounts for QB adjustments, rest days, weather, home field
- Provides win probabilities and expected value vs market lines
- Open-source model validated against historical performance

**How to Use nfelo Data:**
1. **Power Ratings Context**: nfelo Elo scores indicate true team strength (1500 = average)
2. **Momentum Capture**: Recent form reflected in Elo changes
3. **Market Comparison**: Compare nfelo spread vs your model vs market
4. **Expected Value**: nfelo flags +EV opportunities when model disagrees with market
5. **Ensemble Weighting**: Weight predictions as: Your Model (45%), nfelo (30%), Market (25%)

**When nfelo Differs Significantly:**
- If nfelo spread differs by 3+ points from your model, investigate why
- Common reasons: QB injury impact, recent performance trends, scheduling factors
- Use nfelo's QB-specific adjustments to validate your injury calculations

**Confidence Calibration with nfelo:**
- Model consensus (all agree): Increase confidence by 1 star
- Model disagreement (3+ point spread): Reduce confidence by 1 star
- nfelo shows +EV: Mention as supporting factor

## COLLEGE FOOTBALL (CFB) PROJECTION METHODOLOGY

### CFB SPREAD CALCULATION

Use these weighted factors for CFB (based on Bill Connelly's Five Factors research):

1. **SP+ Differential** (45% weight)
   - Formula: (Home SP+ Overall - Away SP+ Overall) × 0.18 points per SP+ point
   - SP+ is tempo-free, opponent-adjusted efficiency metric

2. **Offensive Success Rate Gap** (22% weight)
   - Formula: (Home Off Success Rate - Away Off Success Rate) × 22 points per 0.10 differential
   - Success Rate = 50% on 1st down, 70% on 2nd, 100% on 3rd/4th

3. **Defensive Success Rate Advantage** (18% weight)
   - Formula: (Away Def Success Rate - Home Def Success Rate) × 18 points per 0.10 differential

4. **Explosiveness Differential** (10% weight)
   - Formula: (Home Explosiveness - Away Explosiveness) × 2.5 points per 0.10 differential
   - Winning explosiveness battle = 86% win rate

5. **Havoc Rate Advantage** (5% weight)
   - Formula: (Home Havoc - Away Havoc) × 12 points per 0.10 differential

**Home Field in CFB:** +3.5 points standard
- Major conference hostile environments: +4.0
- High altitude (Air Force, Wyoming): +1.0 additional

**Final CFB Projection:** Sum all factors, round to nearest 0.5

### CFB INJURY IMPACT (Different from NFL)

CFB injuries impact more due to less depth:

**Quarterback Injuries:**
- Elite to average backup: -6 to -8 points
- Average to poor backup: -4 to -6 points
- Good to competent backup: -2 to -4 points

**Non-QB Position Values (Max Impact):**
- Star RB: 1.5-2 points
- Elite WR/OL: 1-1.5 points  
- Key defensive player: 0.8-1.2 points

**Cluster Injuries:** Multiple injuries at same position compound significantly in CFB

### CFB TOTAL PROJECTION

Base Total = [(Home PPG + Away PPG) / 2] × 2 × Tempo Factor

**Tempo Factor:**
- High tempo (>75 plays/game): 1.12x
- Average tempo (65-75 plays): 1.00x
- Slow methodical (<65 plays): 0.92x

**Adjustments:**
- SP+ Offense: Each +10 SP+ = +2.5 points to total
- Explosiveness avg >1.3 = +4 points
- Weather: Wind >20mph = -6 pts, Rain = -3 pts

## NFL SPREAD PROJECTION METHODOLOGY

Calculate spread using these weighted factors:

1. **Offensive EPA Differential** (38% weight)
   - Formula: (Home Off EPA - Away Off EPA) × 32 points per 0.1 EPA
   - EPA is play-by-play expected points added

2. **Defensive EPA Differential** (28% weight)
   - Formula: (Away Def EPA - Home Def EPA) × 30 points per 0.1 EPA

3. **O-Line Advantage** (16% weight)
   - Pass Block Win Rate differential × 0.12 points per 10%
   - Run Block Win Rate differential × 0.08 points per 10%

4. **Red Zone Efficiency Gap** (10% weight)
   - (Home RZ TD% - Away RZ TD%) × 0.18 points per 1%

5. **Home Field Advantage** (8% weight)
   - Standard: +2.5 points
   - Denver altitude: +3.0
   - Hostile environments: +2.8

### NFL INJURY ADJUSTMENTS (Corrected Based on 2025 Oddsmaker Data)

**Quarterback Impact (Depends on Backup Quality):**
- Elite QB to average backup (e.g., Allen to Trubisky): 5.5-6 points
- Top QB to competent backup (e.g., Mahomes to Wentz): 4.5-5.5 points
- Average QB to poor backup: 3-4 points
- Good QB to good backup (Montana to Young example): 0.5-1 point

**Non-QB Position Values (Maximum Impact):**
- Elite RB/WR (Jefferson, Chase, Barkley): 1-1.5 points MAX
- Star TE: 0.5-0.8 points
- Multiple WRs out: Compound to 2-2.5 points
- OL starter: 0.3-0.7 points each

**Cluster Injuries:** Multiple at same position = multiply base × 1.3-1.8
**Bulk Injuries:** Multiple positions same side of ball = add 0.5-1.5 pts

**CRITICAL:** Most non-QB injuries do NOT significantly move lines

### NFL TOTAL PROJECTION

Base Total = [(Home PPG + Away PPG) / 2] × 2 × Pace Factor

**Pace Factor:**
- Combined plays >130 = 1.08x
- Average 122-130 = 1.00x
- Slow <122 = 0.93x

**Adjustments:**
- Each 0.1 EPA = ±2.8 points
- Weather: Wind >15mph = -4 pts, Snow = -6 pts
- Red zone rates: (Avg - 55%) × 0.12 per %

## FANTASY FOOTBALL PROJECTIONS

### QB Scoring (4pt pass TD, 0.04 per pass yd, 6pt rush TD, 0.1 per rush yd)

**Passing:**
- Base = YPA × Attempts × Pace
- Opponent Adj = × (1 + Opp Pass EPA / 0.15)
- Weather: Wind >15mph = ×0.85

**Rushing:**
- Scrambles × Pressure % × 8 yds
- Goal line carries × 0.28 TD probability

**Tiers:**
- Must Start (QB1): >22 pts
- Strong Start (QB2): 18-22 pts
- Streaming: 14-18 pts

### RB Scoring (6pt TD, 0.1 rush yd, 1pt rec, 0.1 rec yd)

**Rushing:**
- Carries = Usage Rate × Team Rushes × Game Script
- Game Script: Favored 7+ = +15% carries
- Yards = Carries × YPC × Matchup Factor

**Receiving:**
- Targets = Team Targets × RB Share
- Trailing in game = more targets

**TD Probability:**
- Goal line work × RZ trips × 0.16

**Tiers:**
- Must Start: >15 pts
- Flex: 10-15 pts
- Desperation: 7-10 pts

### WR/TE Scoring (6pt TD, 1pt rec, 0.1 rec yd)

**Targets:**
- Route % × Team Passes × Pace
- WR1 = 25-30% target share
- Injury replacement: +8-12 targets

**TD Probability:**
- RZ Target Share × Team RZ Trips × Pass TD Rate
- WR1 good matchup: 0.6-0.8 TD expected

**Tiers:**
- Must Start (WR1/2): >14 pts
- Flex: 9-14 pts
- Bench: <9 pts

## OUTPUT STRUCTURE

### FOR CFB:

**1. GAME PROJECTION**
Projected Spread: [Team] -X.X
Projected Total: XX.X
Win Probability: XX%/YY%

**Key Metrics:**
- SP+ Differential: [numbers]
- Success Rates: Off/Def
- Explosiveness/Havoc
- Recruiting rankings
- Recent form (last 3 games)

**2. INJURY-ADJUSTED PROJECTIONS**
Quantified injury impact for each team
Net differential and confidence adjustment

**3. SCORING BREAKDOWN**
Show calculations for both teams with specific numbers

**4. SITUATIONAL ANALYSIS**
- Conference dynamics
- Rivalry factors
- Bye weeks, lookahead spots
- Coaching matchups
- Motivation factors

**5. BETTING RECOMMENDATIONS**
Primary Pick with confidence (1-5 stars)
Key supporting factors
Risk factors

### FOR NFL:

**1. GAME PROJECTION**
Same as CFB

**2. INJURY-ADJUSTED PROJECTIONS**
QB impact based on backup quality
Position-specific impacts
Cluster/bulk injury analysis

**3. SCORING BREAKDOWN**
EPA-based calculations
O-Line advantages
Red zone efficiency

**4. FANTASY RECOMMENDATIONS**
Detailed QB/RB/WR/TE projections

**5. BETTING RECOMMENDATIONS**
Market comparison
Value identification

## CONFIDENCE CALIBRATION

⭐ (30-45%): Weak signal
⭐⭐ (45-55%): Slight edge
⭐⭐⭐ (55-65%): Solid play
⭐⭐⭐⭐ (65-75%): Strong play
⭐⭐⭐⭐⭐ (75%+): Exceptional

## CRITICAL RULES

1. Show all calculations explicitly
2. Cite specific dataset numbers
3. Account for backup quality in QB injuries
4. Most non-QB injuries don't significantly move lines
5. Be realistic about variance
6. Need 52.4% accuracy to break even at -110

Educational purposes only. Sports betting is -EV for most bettors.`;

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
      let params = `?year=${year}&week=${week}`;
      
      if (sport === "americanfootball_nfl") {
        endpoint = `${BACKEND_URL}/api/nfl-enhanced-data`;
        params = `?season=${year}&week=${week}`;
      } else if (sport === "americanfootball_ncaaf") {
        endpoint = `${BACKEND_URL}/api/cfb-enhanced-data`;
      } else {
        return null;
      }
      
      const response = await fetch(endpoint + params);
      if (!response.ok) {
        console.warn(`Backend API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      if (data.error || !data.games) {
        return null;
      }
      
      return data.games;
    } catch (err) {
      console.error('Backend fetch error:', err);
      return null;
    }
  };

  const supplementGameDataFromBackend = async (games, sport) => {
    setBackendFetchStatus('fetching');
    console.log('=== SUPPLEMENTING DATA FROM BACKEND ===');
    
    const currentYear = new Date().getFullYear();
    const estimatedWeek = 5;
    
    try {
      const backendGames = await fetchBackendDataForTeam(null, sport, currentYear, estimatedWeek);
      
      if (!backendGames || backendGames.length === 0) {
        console.log('No backend data available');
        setBackendFetchStatus('unavailable');
        return games;
      }
      
      console.log(`Backend returned ${backendGames.length} games for matching`);
      
      const supplementedGames = games.map(jsonGame => {
        const matchingBackendGame = backendGames.find(bgGame => {
          if (!bgGame.home_team || !bgGame.away_team) return false;
          
          const normalizeTeam = (name) => (name || '').toLowerCase().replace(/[^a-z]/g, '');
          const jsonHome = normalizeTeam(jsonGame.home_team);
          const jsonAway = normalizeTeam(jsonGame.away_team);
          const bgHome = normalizeTeam(bgGame.home_team);
          const bgAway = normalizeTeam(bgGame.away_team);
          
          return (jsonHome.includes(bgHome) || bgHome.includes(jsonHome)) &&
                 (jsonAway.includes(bgAway) || bgAway.includes(jsonAway));
        });
        
        if (matchingBackendGame) {
          console.log(`✓ Backend data found for: ${jsonGame.away_team} @ ${jsonGame.home_team}`);
          
          const mergedGameData = { ...jsonGame.datasetGame };
          
          if (matchingBackendGame.team_data) {
            mergedGameData.team_data = {
              home: { ...(mergedGameData.team_data?.home || {}), ...matchingBackendGame.team_data.home },
              away: { ...(mergedGameData.team_data?.away || {}), ...matchingBackendGame.team_data.away }
            };
          }
          
          if (matchingBackendGame.epa_stats) {
            mergedGameData.epa_stats = { ...(mergedGameData.epa_stats || {}), ...matchingBackendGame.epa_stats };
          }
          if (matchingBackendGame.player_statistics) {
            mergedGameData.player_statistics = { ...(mergedGameData.player_statistics || {}), ...matchingBackendGame.player_statistics };
          }
          if (matchingBackendGame.team_statistics) {
            mergedGameData.team_statistics = { ...(mergedGameData.team_statistics || {}), ...matchingBackendGame.team_statistics };
          }
          
          setBackendDataCache(prev => ({
            ...prev,
            [jsonGame.id]: { merged: true, source: 'backend' }
          }));
          
          return {
            ...jsonGame,
            datasetGame: mergedGameData,
            hasBackendData: true
          };
        }
        
        return jsonGame;
      });
      
      const mergedCount = supplementedGames.filter(g => g.hasBackendData).length;
      console.log(`Successfully merged backend data for ${mergedCount}/${games.length} games`);
      setBackendFetchStatus(mergedCount > 0 ? 'success' : 'partial');
      
      return supplementedGames;
    } catch (err) {
      console.error('Backend supplementing failed:', err);
      setBackendFetchStatus('error');
      return games;
    }
  };

  const fetchNfeloData = async () => {
    if (selectedSport !== "americanfootball_nfl") {
      setNfeloAvailable(false);
      return null;
    }
    
    try {
      const currentYear = new Date().getFullYear();
      const currentWeek = 5;
      
      const sources = [
        `https://raw.githubusercontent.com/nfelo/nfelo/main/data/predictions_${currentYear}_week${currentWeek}.json`,
        `https://www.nfeloapp.com/api/predictions?week=${currentWeek}&season=${currentYear}`
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
    if (!gameData) {
      console.log('calculateAdvancedFeatures: No gameData provided');
      return null;
    }

    if (gameData.team_data) {
      const home = gameData.team_data.home;
      const away = gameData.team_data.away;

      if (!home || !away) {
        console.log('calculateAdvancedFeatures: Missing home or away team data');
        return null;
      }

      const hasValidData = home.sp_overall || home.off_success_rate || home.points_per_game ||
                          away.sp_overall || away.off_success_rate || away.points_per_game;
      
      if (!hasValidData) {
        console.log('calculateAdvancedFeatures: All CFB metrics are zero - data not available');
        return null;
      }

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
        homeRecruitingRank: home.recruiting_rank,
        homeRecruitingPoints: home.recruiting_points,
        awayRecruitingRank: away.recruiting_rank,
        awayRecruitingPoints: away.recruiting_points
      };
    }

    const home = gameData.player_statistics?.[gameData.teams?.home]?.offensive_line_unit || 
                 gameData.epa_stats?.home;
    const away = gameData.player_statistics?.[gameData.teams?.away]?.offensive_line_unit ||
                 gameData.epa_stats?.away;
    const homeSpecial = gameData.team_statistics?.[gameData.teams?.home]?.special_teams;
    const awaySpecial = gameData.team_statistics?.[gameData.teams?.away]?.special_teams;
    const pace = gameData.matchup_specific?.pace_of_play_proxy;

    if (!home || !away) return null;

    return {
      sport: 'NFL',
      passBlockAdvantage: (home.pass_block_win_rate || 0) - (away.pass_block_win_rate || 0),
      runBlockAdvantage: (home.run_block_win_rate || 0) - (away.run_block_win_rate || 0),
      pressureIndex: ((away.sacks_allowed || 0) / (away.pass_block_win_rate || 1)) - 
                     ((home.sacks_allowed || 0) / (home.pass_block_win_rate || 1)),
      homeOLineScore: ((home.pass_block_win_rate || 0) * 0.4) + ((home.run_block_win_rate || 0) * 0.3) - 
                      ((home.sacks_allowed || 0) * 2) - ((home.stuff_rate || 0) * 0.5),
      awayOLineScore: ((away.pass_block_win_rate || 0) * 0.4) + ((away.run_block_win_rate || 0) * 0.3) - 
                      ((away.sacks_allowed || 0) * 2) - ((away.stuff_rate || 0) * 0.5),
      fieldPositionAdvantage: (homeSpecial?.avg_starting_field_pos || 0) - 
                              (awaySpecial?.avg_starting_field_pos || 0),
      fieldPositionPointValue: ((homeSpecial?.avg_starting_field_pos || 0) - 
                                (awaySpecial?.avg_starting_field_pos || 0)) / 3,
      combinedPace: pace ? ((pace[gameData.teams?.home] + pace[gameData.teams?.away]) / 2) : null,
      paceTotal: pace ? (pace[gameData.teams?.home] + pace[gameData.teams?.away]) : null,
      paceTotalIndicator: pace ? ((pace[gameData.teams?.home] + pace[gameData.teams?.away]) > 126 ? "OVER" : "UNDER") : null,
      paceFactor: pace ? ((pace[gameData.teams?.home] + pace[gameData.teams?.away]) / 126) : 1.0,
      offenseEPA: gameData.epa_stats?.offense_epa,
      defenseEPA: gameData.epa_stats?.defense_epa,
      successRate: gameData.success_rates
    };
  };

  const quantifyInjuryImpact = (espnData, isCFB = false) => {
    if (!espnData?.home || !espnData?.away) return { home: 0, away: 0, total: 0 };

    const nflImpactScores = {
      'qb': 5.0, 'quarterback': 5.0,
      'rb': 1.0, 'running back': 1.0,
      'wr': 1.0, 'wide receiver': 1.0, 'receiver': 1.0,
      'te': 0.6, 'tight end': 0.6,
      'ol': 0.5, 'offensive line': 0.5, 'guard': 0.5, 'tackle': 0.5, 'center': 0.5,
      'de': 0.4, 'defensive end': 0.4, 'edge': 0.4,
      'dt': 0.3, 'defensive tackle': 0.3,
      'lb': 0.4, 'linebacker': 0.4,
      'cb': 0.5, 'cornerback': 0.5,
      's': 0.4, 'safety': 0.4
    };

    const cfbImpactScores = {
      'qb': 7.0, 'quarterback': 7.0,
      'rb': 1.5, 'running back': 1.5,
      'wr': 1.2, 'wide receiver': 1.2, 'receiver': 1.2,
      'te': 0.8, 'tight end': 0.8,
      'ol': 0.7, 'offensive line': 0.7, 'guard': 0.7, 'tackle': 0.7, 'center': 0.7,
      'de': 0.6, 'defensive end': 0.6, 'edge': 0.6,
      'dt': 0.5, 'defensive tackle': 0.5,
      'lb': 0.6, 'linebacker': 0.6,
      'cb': 0.7, 'cornerback': 0.7,
      's': 0.5, 'safety': 0.5
    };

    const impactScores = isCFB ? cfbImpactScores : nflImpactScores;

    const calculateInjuries = (injuries) => {
      const positionCount = {};
      let totalImpact = 0;

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
            break;
          }
        }

        totalImpact += (impact * severity);
      });

      Object.values(positionCount).forEach(count => {
        if (count >= 2) {
          totalImpact *= (1 + (count - 1) * 0.3);
        }
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
      confidenceReduction: Math.min(Math.floor((homeImpact + awayImpact) / 4), 2)
    };
  };

  const calculateStatisticalPrediction = (gameData, advancedFeatures, injuryImpact) => {
    if (!advancedFeatures) return null;

    if (advancedFeatures.sport === 'CFB') {
      let homeAdvantage = 3.5;
      homeAdvantage += advancedFeatures.spPlusDiff * 0.18 * 0.45;
      homeAdvantage += advancedFeatures.offSuccessRateDiff * 22 * 0.22;
      homeAdvantage += advancedFeatures.defSuccessRateAdvantage * 18 * 0.18;
      homeAdvantage += advancedFeatures.explosivenessDiff * 2.5 * 0.10;
      homeAdvantage += advancedFeatures.havocRateDiff * 12 * 0.05;
      
      homeAdvantage -= injuryImpact.home;
      homeAdvantage += injuryImpact.away;

      const projectedSpread = Math.round(homeAdvantage * 2) / 2;
      const basePPG = (advancedFeatures.homePPG + advancedFeatures.awayPPG) / 2;
      let projectedTotal = basePPG * 2;
      projectedTotal += (advancedFeatures.homeOffenseRating / 10) * 0.125;
      projectedTotal += (advancedFeatures.awayOffenseRating / 10) * 0.125;

      return {
        projectedSpread,
        projectedTotal: Math.round(projectedTotal * 2) / 2,
        confidence: Math.max(1, 3 - injuryImpact.confidenceReduction),
        homeScore: (projectedTotal / 2) + (projectedSpread / 2),
        awayScore: (projectedTotal / 2) - (projectedSpread / 2),
        sport: 'CFB'
      };
    }

    let homeAdvantage = 2.5;
    homeAdvantage += (advancedFeatures.passBlockAdvantage * 0.012);
    homeAdvantage += (advancedFeatures.runBlockAdvantage * 0.008);
    homeAdvantage += advancedFeatures.fieldPositionPointValue;
    
    homeAdvantage -= injuryImpact.home;
    homeAdvantage += injuryImpact.away;
    
    const projectedSpread = Math.round(homeAdvantage * 2) / 2;
    const projectedTotal = advancedFeatures.combinedPace ? (advancedFeatures.combinedPace * 0.68) : null;

    return {
      projectedSpread,
      projectedTotal,
      confidence: Math.max(1, 3 - injuryImpact.confidenceReduction),
      homeScore: projectedTotal ? ((projectedTotal / 2) + (projectedSpread / 2)) : null,
      awayScore: projectedTotal ? ((projectedTotal / 2) - (projectedSpread / 2)) : null,
      sport: 'NFL'
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
          if (outcome.name === game.home_team && (!bestHomeSpread || outcome.point < bestHomeSpread.point)) {
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
    const winProb = 0.5 + (spreadDiff * 0.03);
    const expectedValue = ((winProb * 0.91) - ((1 - winProb) * 1)) * 100;

    const totalEdge = bestTotal && statProjection.projectedTotal ? 
      (statProjection.projectedTotal - bestTotal.point) : 0;

    return {
      marketSpread,
      projectedSpread,
      spreadDifferential: Math.abs(spreadDiff),
      spreadRecommendation: spreadDiff > 0 ? 'HOME' : 'AWAY',
      expectedValue,
      hasValue: Math.abs(expectedValue) > 3,
      bestLine: bestHomeSpread,
      confidence: statProjection.confidence,
      marketTotal: bestTotal?.point,
      projectedTotal: statProjection.projectedTotal,
      totalEdge: Math.abs(totalEdge),
      totalRecommendation: totalEdge > 0 ? 'OVER' : 'UNDER'
    };
  };

  const findNfeloPrediction = (game) => {
    if (!nfeloData || !nfeloAvailable) return null;
    
    if (!game.home_team || !game.away_team) return null;
    
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

  const calculateEnsemblePrediction = (statProjection, nfeloPrediction, marketSpread) => {
    if (!statProjection) return null;
    
    let ensembleSpread = statProjection.projectedSpread;
    let weights = { model: 0.60, nfelo: 0.15, market: 0.25 };
    
    if (nfeloPrediction && nfeloPrediction.predicted_spread !== undefined) {
      ensembleSpread = (
        (statProjection.projectedSpread * 0.45) +
        (nfeloPrediction.predicted_spread * 0.30) +
        (marketSpread * 0.25)
      );
      weights = { model: 0.45, nfelo: 0.30, market: 0.25 };
    } else if (marketSpread !== undefined) {
      ensembleSpread = (
        (statProjection.projectedSpread * 0.65) +
        (marketSpread * 0.35)
      );
      weights = { model: 0.65, nfelo: 0, market: 0.35 };
    }
    
    let consensusBonus = 0;
    if (nfeloPrediction && marketSpread !== undefined) {
      const spreads = [
        statProjection.projectedSpread,
        nfeloPrediction.predicted_spread,
        marketSpread
      ].filter(s => s !== undefined);
      
      const maxDiff = Math.max(...spreads) - Math.min(...spreads);
      
      if (maxDiff < 2) {
        consensusBonus = 1;
      } else if (maxDiff > 4) {
        consensusBonus = -1;
      }
    }
    
    return {
      ensembleSpread: Math.round(ensembleSpread * 2) / 2,
      baseSpread: statProjection.projectedSpread,
      nfeloSpread: nfeloPrediction?.predicted_spread,
      marketSpread,
      weights,
      consensusConfidence: Math.max(1, Math.min(5, (statProjection.confidence || 3) + consensusBonus)),
      hasConsensus: consensusBonus > 0,
      hasDisagreement: consensusBonus < 0
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
      console.warn('Skipping ESPN fetch for invalid team name:', teamName);
      return { team: teamName || 'Unknown', injuries: [], lastUpdated: new Date().toISOString() };
    }
    
    try {
      const sportMap = { 
        'americanfootball_nfl': 'football/nfl',
        'americanfootball_ncaaf': 'football/college-football',
        'basketball_nba': 'basketball/nba' 
      };
      const sportPath = sportMap[sport] || 'football/nfl';
      const teamAbbr = getTeamAbbreviation(teamName, sport === 'americanfootball_ncaaf' ? 'cfb' : sport.replace('americanfootball_', ''));
      
      const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams/${teamAbbr}`;
      const response = await fetch(espnUrl);

      if (!response.ok) {
        console.warn(`ESPN API returned ${response.status} for ${teamName}`);
        return { team: teamName, injuries: [], lastUpdated: new Date().toISOString() };
      }

      const data = await response.json();
      const injuries = data.team?.injuries || [];
      
      const filteredInjuries = injuries
        .filter(inj => {
          const status = inj.status || inj.shortStatus || '';
          return status && !status.toLowerCase().includes('out for season');
        })
        .map(inj => {
          const athleteName = inj.athlete?.displayName || inj.athlete?.fullName || 'Player';
          const position = inj.athlete?.position?.abbreviation || inj.position || 'Unknown';
          const status = inj.status || inj.shortStatus || 'Unknown';
          const injuryType = inj.details?.type || inj.type || 'Injury';
          
          return {
            headline: `${athleteName} (${position}) - ${status}: ${injuryType}`,
            status: status,
            position: position,
            name: athleteName
          };
        });
      
      return { 
        team: teamName, 
        injuries: filteredInjuries,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('ESPN fetch failed:', error);
      return { team: teamName, injuries: [], lastUpdated: new Date().toISOString() };
    }
  };

  const getTeamAbbreviation = (teamName, sport) => {
    if (!teamName || typeof teamName !== 'string') {
      console.warn('getTeamAbbreviation called with invalid teamName:', teamName);
      return 'unknown';
    }
    
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

    const cfbTeams = {
      'Boston College': 'bc', 'Clemson': 'clem', 'Duke': 'duke',
      'Florida State': 'fsu', 'Georgia Tech': 'gt',
      'Louisville': 'lou', 'Miami': 'miami', 'NC State': 'ncst',
      'North Carolina': 'unc', 'Pittsburgh': 'pitt', 'Syracuse': 'cuse',
      'Virginia': 'uva', 'Virginia Tech': 'vt', 'Wake Forest': 'wake',
      'California': 'cal', 'Stanford': 'stan', 'SMU': 'smu',
      'Illinois': 'ill', 'Indiana': 'ind', 'Iowa': 'iowa',
      'Maryland': 'md', 'Michigan': 'mich', 'Michigan State': 'msu',
      'Minnesota': 'minn', 'Nebraska': 'neb', 'Northwestern': 'nw',
      'Ohio State': 'osu', 'Penn State': 'psu', 'Purdue': 'pur',
      'Rutgers': 'rut', 'Wisconsin': 'wisc', 'Oregon': 'ore',
      'UCLA': 'ucla', 'USC': 'usc', 'Washington': 'wash',
      'Baylor': 'bay', 'BYU': 'byu', 'Cincinnati': 'cin',
      'Houston': 'hou', 'Iowa State': 'isu', 'Kansas': 'ku',
      'Kansas State': 'ksu', 'Oklahoma State': 'okst', 'TCU': 'tcu',
      'Texas Tech': 'tt', 'UCF': 'ucf', 'West Virginia': 'wvu',
      'Arizona': 'ariz', 'Arizona State': 'asu', 'Colorado': 'col',
      'Utah': 'utah',
      'Alabama': 'bama', 'Arkansas': 'ark', 'Auburn': 'aub',
      'Florida': 'fla', 'Georgia': 'uga', 'Kentucky': 'uk',
      'LSU': 'lsu', 'Ole Miss': 'miss', 'Mississippi State': 'msst',
      'Missouri': 'mizz', 'South Carolina': 'sc', 'Tennessee': 'tenn',
      'Texas A&M': 'tam', 'Vanderbilt': 'vandy', 'Oklahoma': 'okla',
      'Texas': 'tex',
      'Notre Dame': 'nd',
    };
    
    if (sport === 'nfl') return nflTeams[teamName] || teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
    if (sport === 'ncaaf' || sport === 'cfb') return cfbTeams[teamName] || teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
    
    return teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
  };

  const fetchGames = async () => {
    setLoading(true);
    setError("");
    setGames([]);
    setBackendFetchStatus('idle');

    try {
      if (!parsedDataset || !parsedDataset.games) {
        setError("Please load a JSON dataset first.");
        setLoading(false);
        return;
      }

      if (selectedSport === "americanfootball_nfl") {
        await fetchNfeloData();
      }

      let gamesWithIds = [];

      if (apiKey.trim()) {
        try {
          const url = `https://api.the-odds-api.com/v4/sports/${selectedSport}/odds?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
          const response = await fetch(url);

          if (response.ok) {
            const oddsData = await response.json();
            if (oddsData && oddsData.length > 0) {
              gamesWithIds = oddsData.map((game, index) => ({
                ...game,
                id: game.id || `${game.sport_key}_${index}`
              }));
            }
          }
        } catch (apiError) {
          console.warn("Odds API unavailable:", apiError);
        }
      }

      const datasetGames = parsedDataset.games.map((game, index) => {
        let homeTeam, awayTeam, gameTime;
        
        if (game.team_data) {
          homeTeam = game.home_team || game.team_data.home?.school || 'Unknown Home';
          awayTeam = game.away_team || game.team_data.away?.school || 'Unknown Away';
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

      if (gamesWithIds.length > 0) {
        gamesWithIds = gamesWithIds.map(oddsGame => {
          const matchingDatasetGame = datasetGames.find(dg => {
            if (!dg.home_team || !dg.away_team || !oddsGame.home_team || !oddsGame.away_team) {
              return false;
            }
            
            const normalizeTeam = (name) => name.toLowerCase().replace(/[^a-z]/g, '');
            const dgHome = normalizeTeam(dg.home_team);
            const dgAway = normalizeTeam(dg.away_team);
            const oddsHome = normalizeTeam(oddsGame.home_team);
            const oddsAway = normalizeTeam(oddsGame.away_team);
            
            return (dgHome.includes(oddsHome) || oddsHome.includes(dgHome)) &&
                   (dgAway.includes(oddsAway) || oddsAway.includes(dgAway));
          });
          
          if (matchingDatasetGame) {
            return {
              ...oddsGame,
              datasetGame: matchingDatasetGame.datasetGame
            };
          }
          return oddsGame;
        });
      } else {
        gamesWithIds = datasetGames;
      }

      if (gamesWithIds.length === 0) {
        setError("No games found in dataset.");
        return;
      }

      console.log(`Loaded ${gamesWithIds.length} games from dataset`);
      
      console.log('Attempting to supplement games with backend data...');
      gamesWithIds = await supplementGameDataFromBackend(gamesWithIds, selectedSport);
      
      setGames(gamesWithIds);

      console.log('=== FETCHING ESPN INJURY DATA ===');
      for (const game of gamesWithIds) {
        const hasValidTeams = game.home_team && 
                             game.away_team && 
                             typeof game.home_team === 'string' && 
                             typeof game.away_team === 'string' &&
                             game.home_team !== 'Unknown Home' &&
                             game.away_team !== 'Unknown Away';
        
        if (!hasValidTeams) {
          console.warn('Skipping ESPN fetch for game with invalid teams:', game.home_team, game.away_team);
          continue;
        }
        
        console.log('Fetching injuries for:', game.away_team, '@', game.home_team);
        
        Promise.all([
          fetchESPNData(game.home_team, selectedSport),
          fetchESPNData(game.away_team, selectedSport)
        ]).then(([homeData, awayData]) => {
          setEspnDataCache(prev => ({
            ...prev,
            [game.id]: { 
              home: homeData, 
              away: awayData, 
              fetchedAt: new Date().toISOString(),
              status: (homeData?.injuries?.length > 0 || awayData?.injuries?.length > 0) ? 'success' : 'limited'
            }
          }));
          
          console.log(`Injuries loaded for ${game.home_team}: ${homeData.injuries.length}, ${game.away_team}: ${awayData.injuries.length}`);
        }).catch(err => {
          console.log('ESPN fetch error for game:', err);
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
      
      if (!gameData) {
        throw new Error("No dataset found for this game");
      }

      const advancedFeatures = calculateAdvancedFeatures(gameData);
      const isCFB = advancedFeatures?.sport === 'CFB';
      const espnData = espnDataCache[game.id];
      const injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : { home: 0, away: 0, total: 0 };
      const statPrediction = advancedFeatures ? calculateStatisticalPrediction(gameData, advancedFeatures, injuryImpact) : null;
      const marketAnalysis = statPrediction ? findMarketValue(game, statPrediction) : null;
      const nfeloPrediction = !isCFB ? findNfeloPrediction(game) : null;
      const ensemblePrediction = statPrediction && !isCFB ? 
        calculateEnsemblePrediction(statPrediction, nfeloPrediction, marketAnalysis?.marketSpread) : null;

      let prompt = `Provide comprehensive analysis for ${game.away_team} @ ${game.home_team}\n\n`;
      
      if (game.hasBackendData) {
        prompt += `**DATA ENHANCED: Backend APIs supplemented the JSON dataset with additional metrics**\n\n`;
      }
      
      if (isCFB) {
        prompt += `**SPORT: COLLEGE FOOTBALL**\n\n`;
      } else {
        prompt += `**SPORT: NFL**\n\n`;
      }

      if (statPrediction && marketAnalysis) {
        prompt += `**MODEL PROJECTIONS:**\n`;
        prompt += `Projected Spread: ${game.home_team} ${statPrediction.projectedSpread > 0 ? '-' : '+'}${Math.abs(statPrediction.projectedSpread)}\n`;
        prompt += `Projected Total: ${statPrediction.projectedTotal?.toFixed(1) || 'N/A'}\n`;
        prompt += `Projected Scores: ${game.home_team} ${statPrediction.homeScore?.toFixed(1)}, ${game.away_team} ${statPrediction.awayScore?.toFixed(1)}\n`;
        if (marketAnalysis.marketSpread) {
          prompt += `Market Spread: ${game.home_team} ${marketAnalysis.marketSpread}\n`;
          prompt += `Spread Edge: ${marketAnalysis.spreadDifferential.toFixed(1)} points\n`;
        }
        prompt += `\n`;
      }
      
      if (nfeloPrediction) {
        prompt += `**NFELO PREDICTIONS (NFL Elo Model):**\n`;
        prompt += `Elo Ratings: ${game.home_team} ${nfeloPrediction.home_elo || nfeloPrediction.home_rating}, ${game.away_team} ${nfeloPrediction.away_elo || nfeloPrediction.away_rating}\n`;
        if (nfeloPrediction.predicted_spread !== undefined) {
          prompt += `nfelo Spread: ${game.home_team} ${nfeloPrediction.predicted_spread > 0 ? '-' : '+'}${Math.abs(nfeloPrediction.predicted_spread)}\n`;
        }
        if (nfeloPrediction.home_win_prob !== undefined) {
          prompt += `Win Probability: ${game.home_team} ${(nfeloPrediction.home_win_prob * 100).toFixed(1)}%, ${game.away_team} ${((1 - nfeloPrediction.home_win_prob) * 100).toFixed(1)}%\n`;
        }
        prompt += `\n`;
      }

      if (ensemblePrediction) {
        prompt += `**ENSEMBLE MODEL:**\n`;
        prompt += `Weighted Ensemble Spread: ${game.home_team} ${ensemblePrediction.ensembleSpread > 0 ? '-' : '+'}${Math.abs(ensemblePrediction.ensembleSpread)}\n`;
        prompt += `Consensus Confidence: ${ensemblePrediction.consensusConfidence}/5 stars\n\n`;
      }

      if (espnData && (espnData.home?.injuries?.length > 0 || espnData.away?.injuries?.length > 0)) {
        prompt += `**INJURY IMPACT ANALYSIS:**\n`;
        prompt += `Total Impact: ${game.home_team} -${injuryImpact.home.toFixed(1)} pts, ${game.away_team} -${injuryImpact.away.toFixed(1)} pts\n`;
        prompt += `Net Differential: ${Math.abs(injuryImpact.differential).toFixed(1)} pts favoring ${injuryImpact.differential > 0 ? game.away_team : game.home_team}\n\n`;
        
        prompt += `${game.home_team} Injuries:\n`;
        espnData.home?.injuries?.forEach((inj, i) => {
          prompt += `${i + 1}. ${inj.headline}\n`;
        });
        prompt += `\n${game.away_team} Injuries:\n`;
        espnData.away?.injuries?.forEach((inj, i) => {
          prompt += `${i + 1}. ${inj.headline}\n`;
        });
        prompt += `\n`;
      }

      prompt += `**COMPLETE DATASET:**\n${JSON.stringify(gameData, null, 2)}\n\n`;

      if (game.bookmakers?.length > 0) {
        prompt += `**MARKET ODDS:**\n`;
        game.bookmakers.slice(0, 2).forEach(book => {
          prompt += `${book.title}:\n`;
          book.markets?.forEach(market => {
            prompt += `  ${market.key}: `;
            market.outcomes?.forEach(outcome => {
              prompt += `${outcome.name} ${outcome.point || ''} ${outcome.price} | `;
            });
            prompt += `\n`;
          });
        });
      }

      prompt += `\nUse the ${isCFB ? 'CFB' : 'NFL'} methodologies from system prompt. Show calculations.`;

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
          nfeloPrediction,
          ensemblePrediction
        }
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
        <h1 style={{ textAlign: "center", marginBottom: "10px" }}>Sports Analytics & Fantasy System</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>
          JSON Dataset with Backend API Supplementation + ESPN Injuries + nfelo Integration
        </p>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>1. Load Your Dataset</h2>
          
          <textarea
            value={customDataset}
            onChange={(e) => setCustomDataset(e.target.value)}
            placeholder='Paste your JSON dataset here (must have a "games" array with team names)...'
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
              ✓ Dataset Loaded - {parsedDataset?.games?.length || 0} games found
            </span>
          )}

          {backendFetchStatus === 'fetching' && (
            <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#e8f4f8", borderRadius: "4px", fontSize: "12px", color: "#004085" }}>
              Fetching supplemental data from backend APIs...
            </div>
          )}
          
          {backendFetchStatus === 'success' && (
            <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#d4edda", borderRadius: "4px", fontSize: "12px", color: "#155724" }}>
              ✓ Backend data successfully merged with JSON dataset
            </div>
          )}
          
          {backendFetchStatus === 'partial' && (
            <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#fff3cd", borderRadius: "4px", fontSize: "12px", color: "#856404" }}>
              Partial backend data available - some games supplemented
            </div>
          )}
          
          {backendFetchStatus === 'unavailable' && (
            <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8d7da", borderRadius: "4px", fontSize: "12px", color: "#721c24" }}>
              Backend APIs unavailable - using JSON data only
            </div>
          )}

          <div style={{ marginTop: "15px", padding: "12px", backgroundColor: "#e8f4f8", borderRadius: "6px", fontSize: "12px", color: "#004085" }}>
            <strong>How it works:</strong> Load your JSON dataset with games and team names. 
            The system will automatically try to supplement missing data from backend APIs (CFB SP+, NFL EPA, etc.). 
            Even if backend APIs are unavailable, analysis will proceed using your JSON data.
          </div>
        </div>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>2. Optional: Market Odds</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "#666" }}>
                The Odds API Key (optional - for live betting lines)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key"
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
              />
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "#666" }}>
                Sport
              </label>
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

          {nfeloAvailable && selectedSport === "americanfootball_nfl" && (
            <div style={{ marginTop: "15px", padding: "12px", backgroundColor: "#d4edda", borderRadius: "6px", border: "1px solid #c3e6cb" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#155724" }}>
                ✓ nfelo NFL Model Active - Elo ratings and predictions enabled
              </div>
            </div>
          )}
        </div>

        {error && <div style={{ backgroundColor: "#fee2e2", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#dc2626" }}>{error}</div>}

        {games.length > 0 && (
          <div style={{ backgroundColor: "#e8f4f8", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #b8daff" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#004085" }}>
              {games.length} game{games.length !== 1 ? 's' : ''} ready for analysis
            </div>
          </div>
        )}

        {games.map(game => {
          const analysis = analyses[game.id];
          const advancedFeatures = game.datasetGame ? calculateAdvancedFeatures(game.datasetGame) : null;
          const isCFB = advancedFeatures?.sport === 'CFB';
          const espnData = espnDataCache[game.id];
          const injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : null;
          const nfeloPrediction = !isCFB ? findNfeloPrediction(game) : null;

          return (
            <div key={game.id} style={{ backgroundColor: "white", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderBottom: "1px solid #e9ecef" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{game.away_team} @ {game.home_team}</h3>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                      {new Date(game.commence_time).toLocaleString()}
                    </div>
                    
                    <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {game.hasBackendData && (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: "#e0e7ff",
                          color: "#3730a3",
                          fontWeight: "600"
                        }}>
                          Backend Enhanced
                        </span>
                      )}
                      {advancedFeatures && (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: advancedFeatures.sport === 'CFB' ? "#d1ecf1" : "#d4edda",
                          color: advancedFeatures.sport === 'CFB' ? "#0c5460" : "#155724",
                          fontWeight: "600"
                        }}>
                          {advancedFeatures.sport === 'CFB' ? '✓ CFB SP+' : '✓ NFL EPA'}
                        </span>
                      )}
                      {nfeloPrediction && (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: "#e8f4f8",
                          color: "#0066cc",
                          fontWeight: "600"
                        }}>
                          ⭐ nfelo Model
                        </span>
                      )}
                      {injuryImpact && injuryImpact.total > 0 && (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: injuryImpact.total > 4 ? "#f8d7da" : "#fff3cd",
                          color: injuryImpact.total > 4 ? "#721c24" : "#856404",
                          fontWeight: "600"
                        }}>
                          {injuryImpact.total > 4 ? '⚠⚠' : '⚠'} {injuryImpact.total.toFixed(1)}pts impact
                          {injuryImpact.differential !== 0 && ` | ${Math.abs(injuryImpact.differential).toFixed(1)}pt edge`}
                        </span>
                      )}
                      {espnData && espnData.status === 'success' && (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: "#d4edda",
                          color: "#155724",
                          fontWeight: "600"
                        }}>
                          ✓ Injuries Loaded
                        </span>
                      )}
                      {analysis?.ensemblePrediction?.hasConsensus && (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: "#d4edda",
                          color: "#155724",
                          fontWeight: "600"
                        }}>
                          ✓ Model Consensus
                        </span>
                      )}
                    </div>
                    
                    {espnData && (espnData.home?.injuries?.length > 0 || espnData.away?.injuries?.length > 0) && (
                      <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#fff3cd", borderRadius: "4px", border: "1px solid #ffeaa7" }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#856404" }}>
                          Injury Report
                        </div>
                        {espnData.home?.injuries?.length > 0 && (
                          <div style={{ fontSize: "11px", color: "#856404", marginBottom: "4px" }}>
                            <strong>{game.home_team}:</strong> {espnData.home.injuries.length} injured
                          </div>
                        )}
                        {espnData.away?.injuries?.length > 0 && (
                          <div style={{ fontSize: "11px", color: "#856404" }}>
                            <strong>{game.away_team}:</strong> {espnData.away.injuries.length} injured
                          </div>
                        )}
                      </div>
                    )}
                    
                    {nfeloPrediction && (
                      <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "4px", border: "1px solid #b8daff" }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#004085" }}>
                          nfelo Elo Ratings & Prediction
                        </div>
                        <div style={{ fontSize: "11px", color: "#004085", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          <span>
                            {game.home_team}: {nfeloPrediction.home_elo || nfeloPrediction.home_rating}
                          </span>
                          <span>
                            {game.away_team}: {nfeloPrediction.away_elo || nfeloPrediction.away_rating}
                          </span>
                          {nfeloPrediction.predicted_spread !== undefined && (
                            <span style={{ fontWeight: "600" }}>
                              Spread: {game.home_team} {nfeloPrediction.predicted_spread > 0 ? '-' : '+'}
                              {Math.abs(nfeloPrediction.predicted_spread)}
                            </span>
                          )}
                        </div>
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
                  <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                    <div>Generating analysis...</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#dc3545", color: "white", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Educational & Fantasy Only</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            JSON dataset with backend supplementation, ESPN injuries, and nfelo Elo. Call 1-800-GAMBLER for help.
          </p>
        </div>
      </div>
    </div>
  );
}