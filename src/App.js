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
      
      const fullUrl = endpoint + params;
      console.log('=== BACKEND FETCH ATTEMPT ===');
      console.log('Fetching from:', fullUrl);
      console.log('Current year:', currentYear);
      console.log('Current week:', currentWeek);
      
      const response = await fetch(fullUrl);
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend API error response:', errorText);
        throw new Error(`Backend API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
      const data = await response.json();
      console.log('Backend response data:', data);
      console.log('Data type:', typeof data);
      console.log('Data keys:', Object.keys(data || {}));
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
      if (!data.games || data.games.length === 0) {
        console.warn('Backend returned no games');
        setBackendDataAvailable(false);
        setError(`Backend returned no games for ${selectedSport} week ${currentWeek}. Data may not be available yet.`);
        return null;
      }
      
      console.log('Backend data loaded successfully:', data.games.length, 'games');
      console.log('Backend games structure:', data.games?.[0] ? Object.keys(data.games[0]) : 'No games');
      console.log('First game sample:', JSON.stringify(data.games?.[0], null, 2));
      setEnhancedData(data);
      setBackendDataAvailable(data.games && data.games.length > 0);
      return data;
    } catch (err) {
      console.error("=== BACKEND FETCH FAILED ===");
      console.error("Error details:", err);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      setBackendDataAvailable(false);
      setError(`Backend data unavailable: ${err.message}`);
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
        `https://www.nfeloapp.com/api/predictions?week=${currentWeek}&season=${currentYear}`,
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

      // Check if we have actual data (not all zeros)
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
    
    // FIXED: Add null check for team names
    if (!game.home_team || !game.away_team) return null;
    
    const normalizeTeamName = (name) => {
      // FIXED: Add null check in normalizeTeamName
      return (name || '').toLowerCase().replace(/[^a-z]/g, '');
    };
    
    const gameHome = normalizeTeamName(game.home_team);
    const gameAway = normalizeTeamName(game.away_team);
    
    // FIXED: Add check for empty strings
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
      return parsed;
    } catch (err) {
      setDatasetLoaded(false);
      return null;
    }
  };

  const fetchESPNData = async (teamName, sport) => {
    // CRITICAL FIX: Don't fetch if team name is invalid
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
      
      const response = await fetch(
        `${BACKEND_URL}/api/espn-proxy?sport=${sportPath}&team=${teamAbbr}`
      );

      if (!response.ok) {
        console.warn(`ESPN proxy returned ${response.status} for ${teamName}`);
        return { team: teamName, injuries: [], lastUpdated: new Date().toISOString() };
      }

      const data = await response.json();
      
      return { 
        team: teamName, 
        injuries: data.injuries || [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('ESPN fetch failed:', error);
      return { team: teamName, injuries: [], lastUpdated: new Date().toISOString() };
    }
  };

  const getTeamAbbreviation = (teamName, sport) => {
    // CRITICAL FIX: Handle undefined/null team names
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
      'Boston College Eagles': 'bc', 'Clemson Tigers': 'clem', 'Duke Blue Devils': 'duke',
      'Florida State Seminoles': 'fsu', 'Georgia Tech Yellow Jackets': 'gt',
      'Louisville Cardinals': 'lou', 'Miami Hurricanes': 'miami', 'NC State Wolfpack': 'ncst',
      'North Carolina Tar Heels': 'unc', 'Pittsburgh Panthers': 'pitt', 'Syracuse Orange': 'cuse',
      'Virginia Cavaliers': 'uva', 'Virginia Tech Hokies': 'vt', 'Wake Forest Demon Deacons': 'wake',
      'California Golden Bears': 'cal', 'Stanford Cardinal': 'stan', 'SMU Mustangs': 'smu',
      'Illinois Fighting Illini': 'ill', 'Indiana Hoosiers': 'ind', 'Iowa Hawkeyes': 'iowa',
      'Maryland Terrapins': 'md', 'Michigan Wolverines': 'mich', 'Michigan State Spartans': 'msu',
      'Minnesota Golden Gophers': 'minn', 'Nebraska Cornhuskers': 'neb', 'Northwestern Wildcats': 'nw',
      'Ohio State Buckeyes': 'osu', 'Penn State Nittany Lions': 'psu', 'Purdue Boilermakers': 'pur',
      'Rutgers Scarlet Knights': 'rut', 'Wisconsin Badgers': 'wisc', 'Oregon Ducks': 'ore',
      'UCLA Bruins': 'ucla', 'USC Trojans': 'usc', 'Washington Huskies': 'wash',
      'Baylor Bears': 'bay', 'BYU Cougars': 'byu', 'Cincinnati Bearcats': 'cin',
      'Houston Cougars': 'hou', 'Iowa State Cyclones': 'isu', 'Kansas Jayhawks': 'ku',
      'Kansas State Wildcats': 'ksu', 'Oklahoma State Cowboys': 'okst', 'TCU Horned Frogs': 'tcu',
      'Texas Tech Red Raiders': 'tt', 'UCF Knights': 'ucf', 'West Virginia Mountaineers': 'wvu',
      'Arizona Wildcats': 'ariz', 'Arizona State Sun Devils': 'asu', 'Colorado Buffaloes': 'col',
      'Utah Utes': 'utah',
      'Alabama Crimson Tide': 'bama', 'Arkansas Razorbacks': 'ark', 'Auburn Tigers': 'aub',
      'Florida Gators': 'fla', 'Georgia Bulldogs': 'uga', 'Kentucky Wildcats': 'uk',
      'LSU Tigers': 'lsu', 'Ole Miss Rebels': 'miss', 'Mississippi State Bulldogs': 'msst',
      'Missouri Tigers': 'mizz', 'South Carolina Gamecocks': 'sc', 'Tennessee Volunteers': 'tenn',
      'Texas A&M Aggies': 'tam', 'Vanderbilt Commodores': 'vandy', 'Oklahoma Sooners': 'okla',
      'Texas Longhorns': 'tex',
      'Notre Dame Fighting Irish': 'nd',
    };
    
    if (sport === 'nfl') return nflTeams[teamName] || teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
    if (sport === 'ncaaf' || sport === 'cfb') return cfbTeams[teamName] || teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
    
    return teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
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
        console.log('Backend data loaded with', backendData.games.length, 'games');
        
        if (gamesWithIds.length > 0) {
          gamesWithIds = gamesWithIds.map(oddsGame => {
            const matchingBackendGame = backendData.games.find(bg => {
              // FIXED: Add null checks for team names
              if (!bg.home_team || !bg.away_team || !oddsGame.home_team || !oddsGame.away_team) {
                return false;
              }
              
              // Normalize team names for better matching
              const normalizeTeam = (name) => name.toLowerCase().replace(/[^a-z]/g, '');
              const bgHome = normalizeTeam(bg.home_team);
              const bgAway = normalizeTeam(bg.away_team);
              const oddsHome = normalizeTeam(oddsGame.home_team);
              const oddsAway = normalizeTeam(oddsGame.away_team);
              
              // Try multiple matching strategies
              const exactMatch = (bgHome === oddsHome && bgAway === oddsAway);
              const containsMatch = (bgHome.includes(oddsHome) || oddsHome.includes(bgHome)) &&
                                   (bgAway.includes(oddsAway) || oddsAway.includes(bgAway));
              const partialMatch = (bgHome.substring(0, 4) === oddsHome.substring(0, 4)) &&
                                  (bgAway.substring(0, 4) === oddsAway.substring(0, 4));
              
              const isMatch = exactMatch || containsMatch || partialMatch;
              
              if (isMatch) {
                console.log('✓ Matched:', oddsGame.home_team, 'vs', oddsGame.away_team, 'with backend data');
              }
              
              return isMatch;
            });
            
            if (!matchingBackendGame) {
              console.log('✗ No backend match for:', oddsGame.home_team, 'vs', oddsGame.away_team);
            }
            
            return matchingBackendGame ? {
              ...oddsGame,
              backendEnhancedData: matchingBackendGame
            } : oddsGame;
          });
        } else {
          console.log('No odds data - creating games from backend data only');
          gamesWithIds = backendData.games.map((game, index) => {
            console.log('Processing backend game:', {
              game_id: game.game_id,
              home_team: game.home_team,
              away_team: game.away_team,
              date: game.date,
              allKeys: Object.keys(game),
              team_data_keys: game.team_data ? Object.keys(game.team_data) : null
            });
            
            // CRITICAL FIX: Extract team names from nested team_data structure
            let homeTeam = 'Unknown Home';
            let awayTeam = 'Unknown Away';
            let gameDate = game.date || game.commence_time || new Date().toISOString();
            
            // Try multiple possible locations for team names
            if (game.home_team && game.away_team) {
              homeTeam = game.home_team;
              awayTeam = game.away_team;
            } else if (game.home && game.away) {
              homeTeam = game.home;
              awayTeam = game.away;
            } else if (game.team_data) {
              // Team names are nested inside team_data
              if (game.team_data.home?.school || game.team_data.home?.team) {
                homeTeam = game.team_data.home.school || game.team_data.home.team || game.team_data.home.name;
              }
              if (game.team_data.away?.school || game.team_data.away?.team) {
                awayTeam = game.team_data.away.school || game.team_data.away.team || game.team_data.away.name;
              }
              
              // Log what we found in team_data
              console.log('Team data structure:', {
                home_keys: game.team_data.home ? Object.keys(game.team_data.home).slice(0, 10) : null,
                away_keys: game.team_data.away ? Object.keys(game.team_data.away).slice(0, 10) : null,
                extracted_home: homeTeam,
                extracted_away: awayTeam
              });
            } else if (game.teams) {
              homeTeam = game.teams.home || homeTeam;
              awayTeam = game.teams.away || awayTeam;
            }
            
            console.log('Final extracted teams:', { homeTeam, awayTeam });
            
            return {
              id: game.game_id || `backend_${index}`,
              sport_key: selectedSport,
              sport_title: selectedSport.replace(/_/g, ' ').toUpperCase(),
              commence_time: gameDate,
              home_team: homeTeam,
              away_team: awayTeam,
              bookmakers: [],
              backendEnhancedData: game
            };
          });
          console.log('Created games from backend:', gamesWithIds.map(g => `${g.away_team} @ ${g.home_team}`));
        }
      }

      if (useManualData && parsedDataset?.games) {
        const manualGames = parsedDataset.games.map((game, index) => {
          let homeTeam, awayTeam, gameTime;
          
          if (game.team_data) {
            homeTeam = game.home_team || 'Unknown';
            awayTeam = game.away_team || 'Unknown';
            gameTime = game.date || new Date().toISOString();
          } else {
            homeTeam = game.teams?.home || 'Unknown';
            awayTeam = game.teams?.away || 'Unknown';
            gameTime = game.kickoff_local || new Date().toISOString();
          }

          return {
            id: game.game_id || `dataset_${index}`,
            sport_key: selectedSport,
            sport_title: selectedSport.replace(/_/g, ' ').toUpperCase(),
            commence_time: gameTime,
            home_team: homeTeam,
            away_team: awayTeam,
            bookmakers: [],
            manualEnhancedData: game
          };
        });

        if (gamesWithIds.length > 0) {
          gamesWithIds = gamesWithIds.map(oddsGame => {
            const matchingManualGame = manualGames.find(mg => {
              // FIXED: Add null checks for manual game matching
              if (!mg.home_team || !mg.away_team || !oddsGame.home_team || !oddsGame.away_team) {
                return false;
              }
              
              return (mg.home_team.toLowerCase().includes(oddsGame.home_team.toLowerCase()) ||
                     oddsGame.home_team.toLowerCase().includes(mg.home_team.toLowerCase())) &&
                    (mg.away_team.toLowerCase().includes(oddsGame.away_team.toLowerCase()) ||
                     oddsGame.away_team.toLowerCase().includes(mg.away_team.toLowerCase()));
            });
            
            if (matchingManualGame) {
              return {
                ...oddsGame,
                manualEnhancedData: matchingManualGame.manualEnhancedData
              };
            }
            return oddsGame;
          });
        } else {
          gamesWithIds = [...gamesWithIds, ...manualGames];
        }
      }

      if (gamesWithIds.length === 0) {
        setError("No games found. Please enable at least one data source (Backend API, Manual Dataset, or Odds API).");
        return;
      }

      setGames(gamesWithIds);

      // IMPROVED: Only fetch ESPN data for games with valid team names
      console.log('=== ESPN FETCH PHASE ===');
      for (const game of gamesWithIds) {
        const hasValidTeams = game.home_team && 
                             game.away_team && 
                             typeof game.home_team === 'string' && 
                             typeof game.away_team === 'string' &&
                             game.home_team !== 'Unknown Home' &&
                             game.away_team !== 'Unknown Away';
        
        if (!hasValidTeams) {
          console.warn('Skipping ESPN fetch for game with invalid teams:', {
            id: game.id,
            home: game.home_team,
            away: game.away_team,
            allKeys: Object.keys(game)
          });
          continue;
        }
        
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
        }).catch(err => {
          console.log('ESPN API unavailable:', err);
        });
      }
    } catch (err) {
      setError(err.message || "Error fetching games");
    } finally {
      setLoading(false);
    }
  };

  const findMatchingDatasetGame = (oddsGame) => {
    const sources = [];
    
    if (oddsGame.backendEnhancedData) {
      sources.push(oddsGame.backendEnhancedData);
    }
    
    if (oddsGame.manualEnhancedData) {
      sources.push(oddsGame.manualEnhancedData);
    }
    
    console.log('findMatchingDatasetGame: Found', sources.length, 'sources for', oddsGame.home_team, 'vs', oddsGame.away_team);
    
    if (sources.length === 0) {
      console.log('findMatchingDatasetGame: No data sources available');
      return null;
    }
    
    if (sources.length === 1) {
      console.log('findMatchingDatasetGame: Using single source');
      return sources[0];
    }
    
    console.log('findMatchingDatasetGame: Merging', sources.length, 'sources');
    const merged = { ...sources[0] };
    
    for (let i = 1; i < sources.length; i++) {
      const source = sources[i];
      
      if (source.team_data) {
        merged.team_data = merged.team_data || {};
        merged.team_data.home = { ...merged.team_data.home, ...source.team_data.home };
        merged.team_data.away = { ...merged.team_data.away, ...source.team_data.away };
      }
      
      if (source.player_statistics) {
        merged.player_statistics = { ...merged.player_statistics, ...source.player_statistics };
      }
      
      if (source.epa_stats) {
        merged.epa_stats = { ...merged.epa_stats, ...source.epa_stats };
      }
      
      Object.keys(source).forEach(key => {
        if (merged[key] === undefined) {
          merged[key] = source[key];
        }
      });
    }
    
    console.log('findMatchingDatasetGame: Merged data structure:', Object.keys(merged));
    return merged;
  };

  const analyzeGame = async (game) => {
    setAnalyses(prev => ({ ...prev, [game.id]: { loading: true } }));

    try {
      const datasetGame = findMatchingDatasetGame(game);
      console.log('=== ANALYZE GAME DEBUG ===');
      console.log('Game:', game.home_team, 'vs', game.away_team);
      console.log('datasetGame found:', !!datasetGame);
      if (datasetGame) {
        console.log('datasetGame structure:', Object.keys(datasetGame));
        if (datasetGame.team_data) {
          console.log('CFB team_data exists:', {
            home: !!datasetGame.team_data.home,
            away: !!datasetGame.team_data.away
          });
        }
      }
      
      const espnData = espnDataCache[game.id];
      const advancedFeatures = datasetGame ? calculateAdvancedFeatures(datasetGame) : null;
      console.log('advancedFeatures:', advancedFeatures ? 'FOUND' : 'NULL');
      
      const isCFB = advancedFeatures?.sport === 'CFB';
      const injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : { home: 0, away: 0, total: 0 };
      const statPrediction = advancedFeatures ? calculateStatisticalPrediction(datasetGame, advancedFeatures, injuryImpact) : null;
      const marketAnalysis = statPrediction ? findMarketValue(game, statPrediction) : null;
      const nfeloPrediction = !isCFB ? findNfeloPrediction(game) : null;
      const ensemblePrediction = statPrediction && !isCFB ? 
        calculateEnsemblePrediction(statPrediction, nfeloPrediction, marketAnalysis?.marketSpread) : null;

      let prompt = `Provide comprehensive analysis for ${game.away_team} @ ${game.home_team}\n\n`;
      
      const dataSources = [];
      if (game.backendEnhancedData) dataSources.push('Backend API');
      if (game.manualEnhancedData) dataSources.push('Manual Dataset');
      if (dataSources.length > 0) {
        prompt += `**DATA SOURCES: ${dataSources.join(' + ')}**\n\n`;
      }
      
      // Add data availability warning if no advanced features found
      if (!advancedFeatures) {
        prompt += `**⚠️ DATA AVAILABILITY ISSUE:**\n`;
        prompt += `Unable to retrieve advanced statistical metrics for this matchup.\n`;
        prompt += `Possible causes:\n`;
        prompt += `- Backend API data not loaded for this game\n`;
        prompt += `- Manual dataset doesn't contain this matchup\n`;
        prompt += `- Team name mismatch between odds data and statistical data\n\n`;
        prompt += `**AVAILABLE DATA ONLY:**\n`;
        prompt += `Please analyze using:\n`;
        prompt += `- Market odds (if available)\n`;
        prompt += `- Injury reports (if loaded)\n`;
        prompt += `- General team information\n`;
        prompt += `- Historical context and trends\n\n`;
        prompt += `Note: Predictions will be less accurate without advanced metrics.\n\n`;
      }
      
      if (isCFB) {
        prompt += `**SPORT: COLLEGE FOOTBALL**\n\n`;
      } else if (advancedFeatures) {
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
        prompt += `Elo Differential: ${Math.abs((nfeloPrediction.home_elo || nfeloPrediction.home_rating) - (nfeloPrediction.away_elo || nfeloPrediction.away_rating)).toFixed(0)} points\n`;
        if (nfeloPrediction.predicted_spread !== undefined) {
          prompt += `nfelo Spread: ${game.home_team} ${nfeloPrediction.predicted_spread > 0 ? '-' : '+'}${Math.abs(nfeloPrediction.predicted_spread)}\n`;
        }
        if (nfeloPrediction.home_win_prob !== undefined) {
          prompt += `Win Probability: ${game.home_team} ${(nfeloPrediction.home_win_prob * 100).toFixed(1)}%, ${game.away_team} ${((1 - nfeloPrediction.home_win_prob) * 100).toFixed(1)}%\n`;
        }
        if (nfeloPrediction.expected_value !== undefined && nfeloPrediction.expected_value !== 0) {
          prompt += `Expected Value: ${nfeloPrediction.expected_value > 0 ? '+' : ''}${nfeloPrediction.expected_value.toFixed(1)}% (${nfeloPrediction.expected_value > 0 ? 'POSITIVE EV' : 'NEGATIVE EV'})\n`;
        }
        if (nfeloPrediction.qb_adjustment) {
          prompt += `QB Adjustment: ${nfeloPrediction.qb_adjustment.toFixed(1)} points\n`;
        }
        prompt += `\n`;
      }

      if (ensemblePrediction) {
        prompt += `**ENSEMBLE MODEL (Multi-Model Consensus):**\n`;
        prompt += `Weighted Ensemble Spread: ${game.home_team} ${ensemblePrediction.ensembleSpread > 0 ? '-' : '+'}${Math.abs(ensemblePrediction.ensembleSpread)}\n`;
        prompt += `Model Weights: Statistical ${(ensemblePrediction.weights.model * 100).toFixed(0)}%, nfelo ${(ensemblePrediction.weights.nfelo * 100).toFixed(0)}%, Market ${(ensemblePrediction.weights.market * 100).toFixed(0)}%\n`;
        prompt += `Consensus Confidence: ${ensemblePrediction.consensusConfidence}/5 stars ${ensemblePrediction.hasConsensus ? '(STRONG CONSENSUS ✓)' : ensemblePrediction.hasDisagreement ? '(MODELS DISAGREE ⚠)' : ''}\n`;
        if (ensemblePrediction.hasDisagreement) {
          prompt += `\n**MODEL DISAGREEMENT ANALYSIS NEEDED:**\n`;
          prompt += `Your Model: ${ensemblePrediction.baseSpread}\n`;
          prompt += `nfelo Model: ${ensemblePrediction.nfeloSpread}\n`;
          prompt += `Market: ${ensemblePrediction.marketSpread}\n`;
          prompt += `Investigate why models differ by 3+ points. Consider: recent form, QB situation, matchup-specific factors.\n`;
        }
        prompt += `\n`;
      }

      if (advancedFeatures) {
        if (isCFB) {
          prompt += `**CFB ADVANCED METRICS:**\n`;
          prompt += `SP+ Differential: ${advancedFeatures.spPlusDiff.toFixed(1)}\n`;
          if (datasetGame.team_data) {
            prompt += `Home SP+: Overall ${datasetGame.team_data.home.sp_overall?.toFixed(1)}, Off ${datasetGame.team_data.home.sp_offense?.toFixed(1)}, Def ${datasetGame.team_data.home.sp_defense?.toFixed(1)}\n`;
            prompt += `Away SP+: Overall ${datasetGame.team_data.away.sp_overall?.toFixed(1)}, Off ${datasetGame.team_data.away.sp_offense?.toFixed(1)}, Def ${datasetGame.team_data.away.sp_defense?.toFixed(1)}\n`;
          }
          prompt += `Success Rate Gap: Off ${(advancedFeatures.offSuccessRateDiff * 100).toFixed(1)}%, Def ${(advancedFeatures.defSuccessRateAdvantage * 100).toFixed(1)}%\n`;
          prompt += `Explosiveness Diff: ${advancedFeatures.explosivenessDiff.toFixed(2)}\n`;
          prompt += `Havoc Rate Diff: ${(advancedFeatures.havocRateDiff * 100).toFixed(1)}%\n`;
          if (advancedFeatures.homeRecruitingRank) {
            prompt += `Recruiting: ${game.home_team} #${advancedFeatures.homeRecruitingRank}, ${game.away_team} #${advancedFeatures.awayRecruitingRank}\n`;
          }
          prompt += `\n`;
        } else {
          prompt += `**NFL ADVANCED METRICS:**\n`;
          prompt += `Pace Factor: ${advancedFeatures.paceFactor?.toFixed(2)}\n`;
          prompt += `O-Line Advantage: Pass ${advancedFeatures.passBlockAdvantage.toFixed(1)}%, Run ${advancedFeatures.runBlockAdvantage.toFixed(1)}%\n`;
          prompt += `\n`;
        }
      }

      if (espnData && (espnData.home?.injuries?.length > 0 || espnData.away?.injuries?.length > 0)) {
        prompt += `**INJURY IMPACT ANALYSIS (Corrected 2025 Methodology):**\n`;
        prompt += `Total Impact: ${game.home_team} -${injuryImpact.home.toFixed(1)} pts, ${game.away_team} -${injuryImpact.away.toFixed(1)} pts\n`;
        prompt += `Net Differential: ${Math.abs(injuryImpact.differential).toFixed(1)} pts favoring ${injuryImpact.differential > 0 ? game.away_team : game.home_team}\n`;
        prompt += `Confidence Reduction: ${injuryImpact.confidenceReduction} stars\n\n`;
        
        prompt += `**DETAILED INJURY REPORTS:**\n`;
        prompt += `${game.home_team}:\n`;
        espnData.home?.injuries?.forEach((inj, i) => {
          prompt += `${i + 1}. ${inj.headline}\n`;
        });
        prompt += `\n${game.away_team}:\n`;
        espnData.away?.injuries?.forEach((inj, i) => {
          prompt += `${i + 1}. ${inj.headline}\n`;
        });
        prompt += `\n**NOTE: QB injuries = 3-6 pts (backup dependent), Elite skill = max 1.5 pts, Cluster injuries compound 30% per additional**\n\n`;
      }

      if (datasetGame) {
        prompt += `**COMPLETE DATASET:**\n${JSON.stringify(datasetGame, null, 2)}\n\n`;
      }

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
        prompt += `\n`;
      }

      prompt += `Use the ${isCFB ? 'CFB' : 'NFL'} methodologies from system prompt. Show calculations. Account for injuries using corrected 2025 values.`;

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
          Multi-source data integration with nfelo Elo & corrected 2025 injury methodology
        </p>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>Configuration</h2>
          
          {nfeloAvailable && selectedSport === "americanfootball_nfl" && (
            <div style={{ marginBottom: "15px", padding: "12px", backgroundColor: "#d4edda", borderRadius: "6px", border: "1px solid #c3e6cb" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#155724", marginBottom: "4px" }}>
                ✓ nfelo NFL Model Active
              </div>
              <div style={{ fontSize: "12px", color: "#155724" }}>
                Elo ratings, predictions, and expected value analysis enabled
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>Data Sources (Can use multiple simultaneously)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={useBackendData}
                  onChange={(e) => setUseBackendData(e.target.checked)}
                />
                <span style={{ fontSize: "14px" }}>Backend API (SP+, EPA, Recruiting Data)</span>
                {backendDataAvailable && <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>✓ Loaded</span>}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={useManualData}
                  onChange={(e) => setUseManualData(e.target.checked)}
                />
                <span style={{ fontSize: "14px" }}>Manual JSON Dataset</span>
                {datasetLoaded && <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>✓ Loaded</span>}
              </label>
            </div>
            <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#fff3cd", borderRadius: "4px", fontSize: "12px", color: "#856404" }}>
              When both sources are enabled, data will be merged for comprehensive analysis
            </div>
          </div>
          
          {useManualData && (
            <div style={{ marginBottom: "15px" }}>
              <textarea
                value={customDataset}
                onChange={(e) => setCustomDataset(e.target.value)}
                placeholder="Paste dataset JSON..."
                style={{ width: "100%", minHeight: "100px", padding: "10px", fontFamily: "monospace", fontSize: "12px", marginBottom: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
              />
              <button onClick={parseDataset} style={{ padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "4px", marginRight: "10px", cursor: "pointer" }}>
                Load Dataset
              </button>
              {datasetLoaded && <span style={{ color: "#10b981", fontSize: "14px", fontWeight: "600" }}>✓ Dataset Loaded</span>}
            </div>
          )}

          <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
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

          <button onClick={fetchGames} disabled={loading} style={{ marginTop: "15px", padding: "10px 20px", backgroundColor: loading ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Loading..." : "Fetch Games"}
          </button>
        </div>

        {error && <div style={{ backgroundColor: "#fee2e2", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#dc2626" }}>{error}</div>}

        {games.length === 0 && !loading && !error && (
          <div style={{ backgroundColor: "#fff3cd", padding: "20px", borderRadius: "8px", marginBottom: "20px", color: "#856404", textAlign: "center" }}>
            <h3 style={{ marginTop: 0 }}>No games found</h3>
            <p>Please check:</p>
            <ul style={{ textAlign: "left", maxWidth: "500px", margin: "10px auto" }}>
              <li>At least one data source is enabled</li>
              <li>The backend API is returning data (check console for logs)</li>
              <li>Your manual dataset is properly formatted</li>
              <li>The selected sport matches your data</li>
            </ul>
            <p style={{ marginTop: "15px", fontWeight: "600" }}>Open browser console (F12) to see detailed debug information</p>
          </div>
        )}

        {games.length > 0 && (
          <div style={{ backgroundColor: "#e8f4f8", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #b8daff" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#004085" }}>
              Debug Info: {games.length} game{games.length !== 1 ? 's' : ''} loaded
            </div>
            <div style={{ fontSize: "12px", color: "#004085" }}>
              Check browser console (F12) for detailed data structure and matching logs
            </div>
          </div>
        )}

        {games.map(game => {
          const analysis = analyses[game.id];
          const datasetGame = findMatchingDatasetGame(game);
          const advancedFeatures = datasetGame ? calculateAdvancedFeatures(datasetGame) : null;
          const espnData = espnDataCache[game.id];
          const isCFB = advancedFeatures?.sport === 'CFB';
          const injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : null;
          const nfeloPrediction = !isCFB ? findNfeloPrediction(game) : null;

          const dataSources = [];
          if (game.backendEnhancedData) dataSources.push('Backend');
          if (game.manualEnhancedData) dataSources.push('Manual');

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
                      {dataSources.length > 0 && (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: "#e0e7ff",
                          color: "#3730a3",
                          fontWeight: "600"
                        }}>
                          📊 {dataSources.join(' + ')}
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
                      {analysis?.ensemblePrediction?.hasDisagreement && (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: "#fff3cd",
                          color: "#856404",
                          fontWeight: "600"
                        }}>
                          ⚠ Models Disagree
                        </span>
                      )}
                    </div>
                    
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
                          {nfeloPrediction.home_win_prob !== undefined && (
                            <span>
                              Win Prob: {(nfeloPrediction.home_win_prob * 100).toFixed(0)}%/{((1-nfeloPrediction.home_win_prob) * 100).toFixed(0)}%
                            </span>
                          )}
                          {nfeloPrediction.expected_value !== undefined && nfeloPrediction.expected_value > 0 && (
                            <span style={{ color: "#10b981", fontWeight: "600" }}>
                              +EV: {nfeloPrediction.expected_value.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {analysis?.ensemblePrediction && (
                      <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#fff9e6", borderRadius: "4px", border: "1px solid #ffd700" }}>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "#856404" }}>
                          Ensemble: {game.home_team} {analysis.ensemblePrediction.ensembleSpread > 0 ? '-' : '+'}
                          {Math.abs(analysis.ensemblePrediction.ensembleSpread)} 
                          <span style={{ marginLeft: "8px", fontWeight: "normal" }}>
                            (Confidence: {analysis.ensemblePrediction.consensusConfidence}/5⭐)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => analyzeGame(game)} disabled={analysis?.loading} style={{ padding: "8px 16px", backgroundColor: analysis?.loading ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: analysis?.loading ? "not-allowed" : "pointer" }}>
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
                    <div style={{ marginBottom: "10px" }}>Generating multi-source analysis with corrected injury methodology...</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#dc3545", color: "white", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Educational & Fantasy Only</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Multi-source data integration (Backend API + Manual Datasets) with 2025 oddsmaker research + nfelo Elo model. Call 1-800-GAMBLER for help.
          </p>
        </div>
      </div>
    </div>
  );
}