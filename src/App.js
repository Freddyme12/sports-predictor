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
  
  const [dataSource, setDataSource] = useState("manual");
  const [backendDataAvailable, setBackendDataAvailable] = useState(false);
  const [enhancedData, setEnhancedData] = useState(null);
  
  const BACKEND_URL = "https://sports-predictor.vercel.app";

  const [showWarning, setShowWarning] = useState(true);
  const [userAcknowledged, setUserAcknowledged] = useState(false);

  const systemPrompt = `You are a sports analyst providing rigorous statistical projections and fantasy football analysis.

## SPORT DETECTION
First, determine which sport you're analyzing based on the dataset:
- If data contains SP+, success_rate, explosiveness, havoc_rate → College Football (CFB)
- If data contains EPA, offensive_line_unit, player_statistics → NFL
- Adapt your methodology accordingly

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
      
      const response = await fetch(endpoint + params);
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
      setEnhancedData(data);
      setBackendDataAvailable(data.games && data.games.length > 0);
      return data;
    } catch (err) {
      console.error("Enhanced data fetch failed:", err);
      setBackendDataAvailable(false);
      setError(`Backend data unavailable: ${err.message}. Using manual dataset or odds only.`);
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

  // CORRECTED: More accurate injury quantification based on 2025 oddsmaker research
  const quantifyInjuryImpact = (espnData, isCFB = false) => {
    if (!espnData?.home || !espnData?.away) return { home: 0, away: 0, total: 0 };

    // NFL Impact scores (conservative, reality-based)
    const nflImpactScores = {
      'qb': 5.0, 'quarterback': 5.0, // Average QB impact, adjusted by backup quality
      'rb': 1.0, 'running back': 1.0, // Max 1-1.5 for elite
      'wr': 1.0, 'wide receiver': 1.0, 'receiver': 1.0, // Max 1-1.5 for elite
      'te': 0.6, 'tight end': 0.6, // Max 0.8 for elite
      'ol': 0.5, 'offensive line': 0.5, 'guard': 0.5, 'tackle': 0.5, 'center': 0.5,
      'de': 0.4, 'defensive end': 0.4, 'edge': 0.4,
      'dt': 0.3, 'defensive tackle': 0.3,
      'lb': 0.4, 'linebacker': 0.4,
      'cb': 0.5, 'cornerback': 0.5,
      's': 0.4, 'safety': 0.4
    };

    // CFB scores (higher due to less depth)
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

        // Find position impact
        for (const [pos, value] of Object.entries(impactScores)) {
          if (headline.includes(pos)) {
            impact = Math.max(impact, value);
            positionCount[pos] = (positionCount[pos] || 0) + 1;
            break;
          }
        }

        totalImpact += (impact * severity);
      });

      // Cluster injury multiplier (multiple injuries at same position)
      Object.values(positionCount).forEach(count => {
        if (count >= 2) {
          totalImpact *= (1 + (count - 1) * 0.3); // 30% compound per additional injury
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
      confidenceReduction: Math.min(Math.floor((homeImpact + awayImpact) / 4), 2) // More conservative
    };
  };

  const calculateStatisticalPrediction = (gameData, advancedFeatures, injuryImpact) => {
    if (!advancedFeatures) return null;

    if (advancedFeatures.sport === 'CFB') {
      // CFB calculation with corrected weights
      let homeAdvantage = 3.5;
      homeAdvantage += advancedFeatures.spPlusDiff * 0.18 * 0.45;
      homeAdvantage += advancedFeatures.offSuccessRateDiff * 22 * 0.22;
      homeAdvantage += advancedFeatures.defSuccessRateAdvantage * 18 * 0.18;
      homeAdvantage += advancedFeatures.explosivenessDiff * 2.5 * 0.10;
      homeAdvantage += advancedFeatures.havocRateDiff * 12 * 0.05;
      
      // CFB injury impact (higher due to less depth)
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

    // NFL calculation with corrected weights and injury handling
    let homeAdvantage = 2.5;
    homeAdvantage += (advancedFeatures.passBlockAdvantage * 0.012);
    homeAdvantage += (advancedFeatures.runBlockAdvantage * 0.008);
    homeAdvantage += advancedFeatures.fieldPositionPointValue;
    
    // Apply injury differential (already calculated correctly)
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

  const parseDataset = () => {
    try {
      const parsed = JSON.parse(customDataset);
      setParsedDataset(parsed);
      setDatasetLoaded(true);
      setDataSource("manual");
      return parsed;
    } catch (err) {
      setDatasetLoaded(false);
      return null;
    }
  };

  const fetchESPNData = async (teamName, sport) => {
    try {
      const sportMap = { 
        'americanfootball_nfl': 'nfl',
        'americanfootball_ncaaf': 'ncaaf',
        'basketball_nba': 'nba' 
      };
      const espnSport = sportMap[sport] || 'nfl';
      const teamAbbr = getTeamAbbreviation(teamName, espnSport === 'ncaaf' ? 'cfb' : espnSport);
      
      const sportPath = espnSport === 'nfl' ? 'football/nfl' : 
                       espnSport === 'ncaaf' ? 'football/college-football' : 
                       espnSport;
      
      const injuryResponse = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/news?limit=50&team=${teamAbbr}`
      );

      const newsData = injuryResponse.ok ? await injuryResponse.json() : null;
      const injuries = newsData?.articles?.filter((article) => 
        article.headline.toLowerCase().includes('injury') || 
        article.headline.toLowerCase().includes('out') ||
        article.headline.toLowerCase().includes('questionable') ||
        article.headline.toLowerCase().includes('doubtful') ||
        article.headline.toLowerCase().includes('suspended')
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

      if (dataSource === "backend") {
        backendData = await fetchEnhancedData();
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
            const matchingBackendGame = backendData.games.find(bg => 
              (bg.home_team.toLowerCase().includes(oddsGame.home_team.toLowerCase()) ||
               oddsGame.home_team.toLowerCase().includes(bg.home_team.toLowerCase())) &&
              (bg.away_team.toLowerCase().includes(oddsGame.away_team.toLowerCase()) ||
               oddsGame.away_team.toLowerCase().includes(bg.away_team.toLowerCase()))
            );
            
            return matchingBackendGame ? {
              ...oddsGame,
              enhancedData: matchingBackendGame
            } : oddsGame;
          });
        } else {
          gamesWithIds = backendData.games.map((game, index) => ({
            id: game.game_id || `backend_${index}`,
            sport_key: selectedSport,
            sport_title: selectedSport.replace(/_/g, ' ').toUpperCase(),
            commence_time: game.date || new Date().toISOString(),
            home_team: game.home_team,
            away_team: game.away_team,
            bookmakers: [],
            enhancedData: game
          }));
        }
      }

      if (gamesWithIds.length === 0 && parsedDataset?.games) {
        setError("Using manual dataset only.");
        gamesWithIds = parsedDataset.games.map((game, index) => {
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
            manualData: game
          };
        });
      }

      if (gamesWithIds.length === 0) {
        setError("No games found. Please provide either an Odds API key, enable backend data, or load a dataset.");
        return;
      }

      setGames(gamesWithIds);

      for (const game of gamesWithIds) {
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
    if (oddsGame.enhancedData) {
      return oddsGame.enhancedData;
    }
    
    if (oddsGame.manualData) {
      return oddsGame.manualData;
    }
    
    if (!parsedDataset?.games) return null;
    
    return parsedDataset.games.find((dataGame) => {
      const oddsHome = oddsGame.home_team.toLowerCase().replace(/[^a-z]/g, '');
      const oddsAway = oddsGame.away_team.toLowerCase().replace(/[^a-z]/g, '');
      
      if (dataGame.teams) {
        const dataHome = (dataGame.teams.home || "").toLowerCase().replace(/[^a-z]/g, '');
        const dataAway = (dataGame.teams.away || "").toLowerCase().replace(/[^a-z]/g, '');
        return (oddsHome.includes(dataHome) || dataHome.includes(oddsHome)) &&
               (oddsAway.includes(dataAway) || dataAway.includes(oddsAway));
      }
      
      if (dataGame.home_team && dataGame.away_team) {
        const dataHome = dataGame.home_team.toLowerCase().replace(/[^a-z]/g, '');
        const dataAway = dataGame.away_team.toLowerCase().replace(/[^a-z]/g, '');
        return (oddsHome.includes(dataHome) || dataHome.includes(oddsHome)) &&
               (oddsAway.includes(dataAway) || dataAway.includes(oddsAway));
      }
      
      return false;
    });
  };

  const analyzeGame = async (game) => {
    setAnalyses(prev => ({ ...prev, [game.id]: { loading: true } }));

    try {
      const datasetGame = findMatchingDatasetGame(game);
      const espnData = espnDataCache[game.id];
      const advancedFeatures = datasetGame ? calculateAdvancedFeatures(datasetGame) : null;
      const isCFB = advancedFeatures?.sport === 'CFB';
      const injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : { home: 0, away: 0, total: 0 };
      const statPrediction = advancedFeatures ? calculateStatisticalPrediction(datasetGame, advancedFeatures, injuryImpact) : null;
      const marketAnalysis = statPrediction ? findMarketValue(game, statPrediction) : null;

      let prompt = `Provide comprehensive analysis for ${game.away_team} @ ${game.home_team}\n\n`;
      
      if (game.enhancedData) {
        prompt += `**DATA SOURCE: Backend Enhanced Data**\n\n`;
      } else if (game.manualData) {
        prompt += `**DATA SOURCE: Manual Dataset Upload**\n\n`;
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
        [game.id]: { loading: false, text: analysis, marketAnalysis, statPrediction }
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
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>Statistical projections with corrected 2025 injury methodology</p>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>Configuration</h2>
          
          <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>Data Source</div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="backend"
                  checked={dataSource === "backend"}
                  onChange={(e) => setDataSource(e.target.value)}
                />
                <span style={{ fontSize: "14px" }}>Backend API (CFB - SP+ + Recruiting)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="manual"
                  checked={dataSource === "manual"}
                  onChange={(e) => setDataSource(e.target.value)}
                />
                <span style={{ fontSize: "14px" }}>Manual JSON Upload</span>
              </label>
            </div>
          </div>
          
          {dataSource === "manual" && (
            <div style={{ marginBottom: "15px" }}>
              <textarea
                value={customDataset}
                onChange={(e) => setCustomDataset(e.target.value)}
                placeholder="Paste dataset JSON..."
                style={{ width: "100%", minHeight: "100px", padding: "10px", fontFamily: "monospace", fontSize: "12px", marginBottom: "10px" }}
              />
              <button onClick={parseDataset} style={{ padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "4px", marginRight: "10px" }}>
                Load Dataset
              </button>
              {datasetLoaded && <span style={{ color: "#10b981", fontSize: "14px", fontWeight: "600" }}>✓ Loaded</span>}
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

          <button onClick={fetchGames} disabled={loading} style={{ marginTop: "15px", padding: "10px 20px", backgroundColor: loading ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600" }}>
            {loading ? "Loading..." : "Fetch Games"}
          </button>
        </div>

        {error && <div style={{ backgroundColor: "#fee2e2", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#dc2626" }}>{error}</div>}

        {games.map(game => {
          const analysis = analyses[game.id];
          const datasetGame = findMatchingDatasetGame(game);
          const advancedFeatures = datasetGame ? calculateAdvancedFeatures(datasetGame) : null;
          const espnData = espnDataCache[game.id];
          const isCFB = advancedFeatures?.sport === 'CFB';
          const injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : null;

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
                    </div>
                  </div>
                  <button onClick={() => analyzeGame(game)} disabled={analysis?.loading} style={{ padding: "8px 16px", backgroundColor: analysis?.loading ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600" }}>
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
                    <div style={{ marginBottom: "10px" }}>Generating analysis with corrected injury methodology...</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#dc3545", color: "white", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Educational & Fantasy Only</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Updated with 2025 oddsmaker research. Call 1-800-GAMBLER for help.
          </p>
        </div>
      </div>
    </div>
  );
}