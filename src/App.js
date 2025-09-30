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

  const systemPrompt = `You are a sports analyst providing rigorous statistical projections and fantasy football analysis.

## SPORT DETECTION
First, determine which sport you're analyzing based on the dataset:
- If data contains SP+, success_rate, explosiveness, havoc_rate → College Football (CFB)
- If data contains EPA, offensive_line_unit, player_statistics → NFL
- Adapt your methodology accordingly

## COLLEGE FOOTBALL (CFB) PROJECTION METHODOLOGY

### CFB SPREAD CALCULATION

Use these weighted factors for CFB:

1. **SP+ Differential** (50% weight)
   - Formula: (Home SP+ Overall - Away SP+ Overall) × 0.20 points per SP+ point
   - Example: Home +15.9 vs Away -4.0 = 19.9 difference = 3.98 point advantage
   - SP+ is Bill Connelly's tempo-free, opponent-adjusted efficiency metric

2. **Offensive Success Rate Gap** (20% weight)
   - Formula: (Home Off Success Rate - Away Off Success Rate) × 25 points per 0.10 differential
   - Success Rate = percentage of plays gaining 50% of needed yards on 1st, 70% on 2nd, 100% on 3rd/4th
   - Higher success rate = more consistent offense

3. **Defensive Success Rate Advantage** (15% weight)
   - Formula: (Away Def Success Rate - Home Def Success Rate) × 20 points per 0.10 differential
   - Lower defensive success rate = better defense (fewer successful plays allowed)

4. **Explosiveness Differential** (10% weight)
   - Formula: (Home Explosiveness - Away Explosiveness) × 3 points per 0.10 differential
   - Explosiveness = points per opportunity from explosive plays (10+ rush, 16+ pass yards)
   - Big play capability matters in CFB

5. **Havoc Rate Advantage** (5% weight)
   - Formula: (Home Havoc - Away Havoc) × 15 points per 0.10 differential
   - Havoc = TFLs + PBUs + Forced Fumbles / Total Plays
   - Defensive playmaking ability

**Home Field in CFB:** +3.5 points (larger than NFL)
- Major conference: +3.5 to +4.0
- High altitude (Air Force, Wyoming): +1.0 additional
- Hostile environments (SEC, Big Ten): +0.5 additional

**Final CFB Projection:** Sum all factors, round to nearest 0.5

### CFB TOTAL PROJECTION

Base Total = [(Home PPG + Away PPG) / 2] × 2 × Tempo Factor

Where:
- **Tempo Factor** = Based on games_played and scoring patterns
- High tempo offenses (>80 plays/game): 1.15x multiplier
- Slow methodical (>65 plays/game): 0.95x multiplier

**Adjustments:**
- SP+ Offense ratings: Each +10 SP+ = +3 points to total
- SP+ Defense ratings: Each +10 SP+ (worse defense) = +2 points to total
- Explosiveness average >1.3 = +4 points (big play game)
- Weather: Wind >20mph = -6 pts, Rain = -3 pts (CFB more affected)

### CFB BETTING CONSIDERATIONS

**Key CFB Differences:**
- Larger talent disparities = less efficient markets
- Home field advantage is bigger (3.5+ pts vs 2.5 in NFL)
- Weather impacts CFB more (younger players, less resources)
- Lookahead spots and rivalry games create value
- Conference play vs non-conference matters significantly

**CFB Line Movement:**
- Sharp money often on underdogs getting points
- Public heavily on favorites and overs
- Conference games more predictable than non-conference

**CFB Situational Analysis (CRITICAL):**
1. **Letdown Spots**: Team coming off emotional win/rivalry game
2. **Lookahead Spots**: Inferior opponent before big rivalry game
3. **Rivalry Games**: Throw out the numbers, emotion matters
4. **Conference vs Non-Conference**: Different preparation intensity
5. **Travel**: Cross-country trips impact young players more
6. **Bye Weeks**: Who had bye? Fresh team = 2-3 point advantage
7. **Coaching Matchups**: Experienced vs new coaches matters
8. **Recent Trends**: Last 3 games often more predictive than season stats
9. **Quarterback Situations**: Backup QB in CFB = 10-14 point swing
10. **Motivation**: Bowl eligibility, rankings, recruiting implications

**CFB Injury Impact (Different from NFL):**
- QB injury: 10-14 points (less depth than NFL)
- Star RB/WR: 3-5 points
- Offensive line injuries: 4-7 points (protection crucial in CFB)
- Defensive playmakers: 2-4 points
- Multiple injuries = compounds faster due to depth issues

**CFB Analysis Requirements:**
When analyzing CFB games, you MUST discuss:
1. Recent performance trend (last 3 games vs season average)
2. Situational context (lookahead, letdown, rivalry, bye week)
3. Home field advantage specifics (hostile environment?)
4. Conference dynamics (conference game importance)
5. Injury impact with CFB context (depth charts matter more)
6. Coaching experience/matchup history
7. Weather conditions if applicable
8. Motivation factors (bowl eligibility, rankings, rivalry)

## NFL SPREAD PROJECTION METHODOLOGY

Calculate spread using these weighted factors:

1. **Offensive EPA Differential** (40% weight)
   - Formula: (Home Off EPA - Away Off EPA) × 35 points per 0.1 EPA
   - Example: 0.15 vs 0.05 EPA = 0.10 difference = 3.5 point advantage

2. **Defensive EPA Differential** (30% weight)
   - Formula: (Away Def EPA Allowed - Home Def EPA Allowed) × 35 points per 0.1 EPA
   - Lower EPA allowed is better (defense)

3. **O-Line Advantage** (15% weight)
   - Pass Block Win Rate differential × 0.15 points per 10%
   - Run Block Win Rate differential × 0.10 points per 10%

4. **Red Zone Efficiency Gap** (10% weight)
   - (Home RZ TD% - Away RZ TD%) × 0.20 points per 1%
   - Critical for scoring conversion

5. **Home Field Advantage** (5% weight)
   - Standard: +2.5 points
   - Adjust for altitude (Denver +0.5), weather, travel

6. **Injury Adjustments**
   - Starting QB: ±7-9 points
   - WR1/RB1: ±2-3 points
   - Elite pass rusher: ±1.5 points
   - Multiple starters: Cumulative but capped at ±12 points

**Final Projection:** Sum all factors, round to nearest 0.5

## TOTAL PROJECTION FORMULA

Base Total = [(Home PPG + Away PPG) / 2] × 2 × Pace Factor

Where:
- **Pace Factor** = (Combined Plays Per Game / 126) 
  - 126 = league average combined plays
  - >130 plays = expect higher scoring
  - <122 plays = expect defensive game

**Adjustments:**
- Offensive efficiency: Each 0.1 EPA = ±3 points to total
- Defensive efficiency: Each 0.1 EPA allowed = ±2.5 points
- Weather: Wind >15mph = -4 pts, Rain = -2 pts, Snow = -6 pts
- Red zone rates: (Avg RZ TD% - 55%) × 0.15 per percentage point

## FANTASY FOOTBALL PROJECTIONS

### QB Scoring (PPR: 4pt pass TD, 0.04 per pass yd, 6pt rush TD, 0.1 per rush yd)

**Passing Yards:**
- Base = (Season YPA × Projected Attempts × Pace Factor)
- Opponent Adj = × (1 + Opponent Pass EPA Allowed / 0.15)
- Weather Adj = Wind >15mph = ×0.85, Rain = ×0.92

**Passing TDs:**
- Base = (RZ Trips × RZ TD Rate × 0.65) 
- 0.65 = QB gets 65% of team's passing TDs

**Rushing:**
- Scramble Rate × Opponent Pressure % × 8 yards per scramble
- Goal line carries × 0.3 TD probability

**Recommendation Tiers:**
- Must Start (QB1): >22 projected points
- Strong Start (QB2): 18-22 points
- Streaming Option: 14-18 points  
- Sit: <14 points

### RB Scoring (PPR: 6pt TD, 0.1 per rush yd, 1pt per rec, 0.1 per rec yd)

**Rushing Production:**
- Carries = Usage Rate × Team Rush Attempts × Game Script Factor
- Game Script: Favored by 7+ = +15% carries, Underdog 7+ = -20% carries
- Yards = Carries × YPC × (1 + Matchup Advantage)
- Matchup = Opponent Rush EPA Allowed relative to league avg

**Receiving Work:**
- Targets = Team Targets × RB Target Share × (1 + Game Script)
- Trailing = more RB targets, Leading = fewer RB targets
- Receptions = Targets × 0.75 catch rate
- Yards = Receptions × 7.5 yards per catch

**TD Probability:**
- Goal line work × RZ trips × 0.18 per opportunity
- Pass-catching TDs = Targets inside 10 × 0.12

**Recommendation Tiers:**
- Must Start (RB1/2): >15 projected points
- Flex Play: 10-15 points
- Desperation: 7-10 points
- Sit: <7 points

### WR/TE Scoring (PPR: 6pt TD, 1pt per rec, 0.1 per rec yd)

**Target Projection:**
- Route Participation % × Team Pass Attempts × Pace Factor
- Target Share within routes run (WR1 = 25-30%, WR2 = 18-22%)
- Injury replacement: +8-12 targets if WR1 out

**Yardage:**
- Targets × Catch Rate × aDOT (average depth of target)
- Adjust for opponent coverage: Man = +10% yards, Zone = -5%

**TD Probability:**
- RZ Target Share × Team RZ Trips × RZ Pass TD Rate
- WR1 in good matchup: 0.6-0.8 TD expected
- Deep threat: Air yards share × 0.08 TD per 100 air yards

**Recommendation Tiers:**
- Must Start (WR1/2): >14 projected points
- Flex Play: 9-14 points
- Bench: <9 points

### Injury Replacement Value

When starter injured, calculate opportunity created:
- Vacated targets/carries distributed: 60% to primary backup, 30% to secondary, 10% to others
- Example: WR1 with 10 targets out = WR2 gets +6 targets = +4-5 fantasy points

## OUTPUT STRUCTURE

### FOR COLLEGE FOOTBALL:

**1. GAME PROJECTION SUMMARY**
Projected Spread: [Team] -X.X (Market: -Y.Y, Edge: Z.Z pts)
Projected Total: XX.X (Market: YY.Y, Edge: Z.Z pts)
Win Probability: Home XX% / Away YY%

Key Metrics:
- SP+ Differential: [breakdown with specific numbers]
- Success Rate Gap: Off X.XX vs X.XX, Def X.XX vs X.XX
- Explosiveness: Home X.XX vs Away X.XX
- Havoc Rate: Home X.XX vs Away X.XX
- Recent Form: [last 3 games analysis]

**2. CFB SCORING BREAKDOWN**

**Home Team: XX.X projected points**
- SP+ Overall: +X.X (Offense: +X.X, Defense: +X.X)
- Offensive efficiency: Success rate X.XX (rank interpretation), Explosiveness X.XX
- Scoring trend: Last 3 games XX, XX, XX PPG (vs season average XX.X)
- Home field value: +3.5 pts (adjust for specific venue factors)
- Defensive matchup: Facing defense ranked X.X in SP+, X.XX success rate allowed
- Red zone performance: X.XX TD rate on X.X trips/game
- Injury adjustment: ±X.X pts (specify key players)
- Situational factors: [bye week, lookahead, rivalry, etc.]

**Away Team: XX.X projected points**
- SP+ Overall: +X.X (Offense: +X.X, Defense: +X.X)
- Offensive efficiency: Success rate X.XX (rank interpretation), Explosiveness X.XX
- Scoring trend: Last 3 games XX, XX, XX PPG (vs season average XX.X)
- Road performance: X-X away/neutral site this season
- Defensive matchup: Facing defense ranked X.X in SP+, X.XX success rate allowed
- Red zone performance: X.XX TD rate on X.X trips/game
- Injury adjustment: ±X.X pts (specify key players)
- Travel factors: [distance, time zones if cross-country]

**Tempo & Style Analysis:**
- Expected possessions: XX per team (based on pace)
- Scoring rate: Home X.XX pts/drive, Away X.XX pts/drive
- Turnover expectation: [based on havoc rates and ball security]
- Time of possession edge: [slower team advantage]

Show your math. Cite specific SP+, success rates, explosiveness, and recent game scores.

**3. CFB SITUATIONAL CONTEXT (MANDATORY)**

**Game Situation:**
- Conference game importance: [standings implications]
- Rivalry factor: [history, emotional intensity]
- Lookahead/Letdown: [schedule analysis before/after]
- Bye week advantage: [who had bye, rest difference]
- Weather forecast: [temperature, wind, precipitation]
- Kickoff time: [night game atmosphere, player circadian rhythm]

**Coaching & Preparation:**
- Head coach experience: [years, big game record]
- Coaching matchup history: [if applicable]
- Staff continuity: [coordinator changes, new schemes]
- Preparation time: [short week, extra prep]

**Motivation & Intangibles:**
- Bowl eligibility status: [needs win for bowl?]
- Ranking implications: [CFP, top 25 considerations]
- Senior day/homecoming: [emotional factors]
- Recruiting weekend: [big visitors, extra motivation]

**Recent Momentum:**
- Last 3 game results with margin: [W by 14, L by 3, W by 21]
- Scoring trends: [improving or declining]
- Close game performance: [clutch or choke in 1-score games]

**4. CFB BETTING ANALYSIS**

**Primary Recommendation:** [Side/Total with specific bet]

**Projection vs Market:**
- Model Spread: [Your number]
- Market Spread: [Best available line]
- Edge: X.X points
- Win Probability: XX%
- Expected Value: +X.X%

**Confidence: ⭐⭐⭐ (scale 1-5)**

**Supporting Factors (Ranked by Importance):**
1. **SP+ Advantage**: [Specific differential and what it means]
2. **Recent Form**: [Last 3 games performance vs opponent]
3. **Matchup Edge**: [Success rate or explosiveness advantage]
4. **Situational**: [Lookahead, rivalry, bye week, etc.]
5. **Home Field**: [Specific venue advantage if significant]
6. **Injuries**: [Impact of key players out/questionable]
7. **Coaching**: [Experience or historical matchup edge]
8. **Motivation**: [Bowl eligibility, rankings, rivalry]

**Risk Factors:**
- CFB variance: [Young players, inconsistent performance]
- Weather: [If adverse conditions expected]
- Line movement: [If sharp money moving away from your pick]
- Public betting: [If you're on/against heavy public side]
- Turnover luck: [If team has been lucky/unlucky with turnovers]
- Key player health: [Uncertainty around questionable players]

**Alternative Plays:**
- [If spread doesn't have value, discuss total]
- [Mention if live betting could offer better opportunity]

**Historical Context:**
- Similar matchups this season: [How teams performed in similar spots]
- Series history if rivalry: [Recent results, home/away splits]

### FOR NFL:

**1. GAME PROJECTION SUMMARY**
Projected Spread: [Team] -X.X (Market: -Y.Y, Edge: Z.Z pts, EV: +X.X%)
Projected Total: XX.X (Market: YY.Y, Edge: Z.Z pts)
Win Probability: Home XX% / Away YY%

**2. SCORING BREAKDOWN**
**Home Team: XX.X projected points**
- Base offensive expectation: XX pts (EPA-based)
- Field position value: +X.X pts
- Turnover impact: ±X.X pts  
- Red zone efficiency: X.X TDs expected from Y trips
- Injury adjustment: ±X.X pts

**Away Team: XX.X projected points**
[Same format]

Show your math. Be specific.

**3. FANTASY FOOTBALL RECOMMENDATIONS**

**QUARTERBACKS**
[Player Name] ([Team])
- Projection: XX.X fantasy points (Floor: XX.X, Ceiling: XX.X)
- Passing: XXX yds, X.X TDs (vs [Opp] ranked #XX in pass def)
- Rushing: XX yds, X.X TDs
- Key Stat: [Most relevant metric]
- Recommendation: **MUST START** / STRONG START / STREAMING / SIT
- Reasoning: [2-3 specific sentences with data]

**RUNNING BACKS**
[Same detailed format]

**WIDE RECEIVERS / TIGHT ENDS**
[Same detailed format]

**INJURY IMPACT:**
- [Injured Player] OUT → Beneficiary: [Player] (+X targets/carries, +X.X fantasy pts)

**4. BETTING RECOMMENDATIONS (if odds available)**

Primary Pick: [Specific bet]
Projection: [Your number] vs Market [Line]
Confidence: ⭐⭐⭐ (XX% win probability)
Expected Value: +X.X%
Key Factors: [Numbered list with specific stats]
Risk Factors: [What could go wrong]

## CONFIDENCE CALIBRATION

⭐ (30-45%): Weak signal, avoid
⭐⭐ (45-55%): Slight edge only
⭐⭐⭐ (55-65%): Solid play
⭐⭐⭐⭐ (65-75%): Strong play (rare)
⭐⭐⭐⭐⭐ (75%+): Exceptional (very rare)

Lower confidence when data is incomplete. Be conservative.

## CRITICAL RULES

1. Show calculations explicitly
2. Cite specific numbers from dataset
3. Separate fantasy analysis from betting analysis clearly
4. Be realistic about variance - even good projections miss
5. Factor injuries into every recommendation
6. Compare projections to market when available

Remember: Fantasy football has fixed cost (league buy-in). Sports betting has unlimited downside. Treat them differently in tone and confidence.`;

  const sports = [
    { key: "americanfootball_nfl", title: "NFL" },
    { key: "americanfootball_ncaaf", title: "College Football" },
    { key: "basketball_nba", title: "NBA" },
    { key: "baseball_mlb", title: "MLB" },
    { key: "icehockey_nhl", title: "NHL" },
  ];

  const calculateAdvancedFeatures = (gameData) => {
    if (!gameData) return null;

    // Check if this is CFB data (has team_data structure with SP+)
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
        awayOffenseRating: away.sp_offense || 0
      };
    }

    // NFL data structure
    const home = gameData.player_statistics?.[gameData.teams.home]?.offensive_line_unit;
    const away = gameData.player_statistics?.[gameData.teams.away]?.offensive_line_unit;
    const homeSpecial = gameData.team_statistics?.[gameData.teams.home]?.special_teams;
    const awaySpecial = gameData.team_statistics?.[gameData.teams.away]?.special_teams;
    const pace = gameData.matchup_specific?.pace_of_play_proxy;

    if (!home || !away) return null;

    return {
      sport: 'NFL',
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
      paceFactor: pace ? ((pace[gameData.teams.home] + pace[gameData.teams.away]) / 126) : 1.0,
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

  const fetchPlayerProps = async (gameId) => {
    if (!apiKey.trim()) return;

    try {
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

  const analyzePlayerProp = async (gameId, game, prop) => {
    const key = `${gameId}_${prop.player}_${prop.market}`;
    setPropAnalyses(prev => ({ ...prev, [key]: { loading: true } }));

    try {
      const datasetGame = findMatchingDatasetGame(game);
      const espnData = espnDataCache[gameId];
      const advancedFeatures = datasetGame ? calculateAdvancedFeatures(datasetGame) : null;

      let prompt = `Analyze this player prop:\n\n`;
      prompt += `Player: ${prop.player}\n`;
      prompt += `Market: ${prop.market}\n`;
      prompt += `Line: ${prop.line}\n`;
      prompt += `Price: ${prop.price}\n\n`;

      if (advancedFeatures) {
        prompt += `**GAME CONTEXT:**\n`;
        if (advancedFeatures.sport === 'CFB') {
          prompt += `SP+ Differential: ${advancedFeatures.spPlusDiff?.toFixed(1)}\n`;
          prompt += `Success Rate Gap: ${(advancedFeatures.offSuccessRateDiff * 100).toFixed(1)}%\n\n`;
        } else {
          prompt += `Pace Factor: ${advancedFeatures.paceFactor?.toFixed(2)} (${advancedFeatures.combinedPace?.toFixed(1)} plays/game)\n`;
          prompt += `O-Line: ${advancedFeatures.passBlockAdvantage > 0 ? 'Home' : 'Away'} advantage (${Math.abs(advancedFeatures.passBlockAdvantage).toFixed(1)}%)\n\n`;
        }
      }

      if (datasetGame) {
        prompt += `**FULL DATASET:**\n${JSON.stringify(datasetGame, null, 2)}\n\n`;
      }

      prompt += `Provide detailed prop analysis using the methodology in system prompt.`;

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

    // CFB prediction logic
    if (advancedFeatures.sport === 'CFB') {
      let homeAdvantage = 3.5; // Base CFB home field

      // SP+ Differential (50% weight)
      homeAdvantage += advancedFeatures.spPlusDiff * 0.20 * 0.50;

      // Offensive Success Rate Gap (20% weight)
      homeAdvantage += advancedFeatures.offSuccessRateDiff * 25 * 0.20;

      // Defensive Success Rate Advantage (15% weight)
      homeAdvantage += advancedFeatures.defSuccessRateAdvantage * 20 * 0.15;

      // Explosiveness Differential (10% weight)
      homeAdvantage += advancedFeatures.explosivenessDiff * 3 * 0.10;

      // Havoc Rate Advantage (5% weight)
      homeAdvantage += advancedFeatures.havocRateDiff * 15 * 0.05;

      const projectedSpread = Math.round(homeAdvantage * 2) / 2;

      // Total calculation for CFB
      const basePPG = (advancedFeatures.homePPG + advancedFeatures.awayPPG) / 2;
      let projectedTotal = basePPG * 2;

      // Adjust for offensive ratings
      projectedTotal += (advancedFeatures.homeOffenseRating / 10) * 0.15;
      projectedTotal += (advancedFeatures.awayOffenseRating / 10) * 0.15;

      // Adjust for defensive ratings (higher is worse)
      projectedTotal += (advancedFeatures.homeDefenseRating / 10) * 0.10;
      projectedTotal += (advancedFeatures.awayDefenseRating / 10) * 0.10;

      return {
        projectedSpread,
        projectedTotal: Math.round(projectedTotal * 2) / 2,
        confidence: 3,
        homeScore: (projectedTotal / 2) + (projectedSpread / 2),
        awayScore: (projectedTotal / 2) - (projectedSpread / 2),
        sport: 'CFB'
      };
    }

    // NFL prediction logic
    let homeAdvantage = 2.5; // Base NFL home field
    homeAdvantage += (advancedFeatures.passBlockAdvantage * 0.05);
    homeAdvantage += (advancedFeatures.runBlockAdvantage * 0.03);
    homeAdvantage += advancedFeatures.fieldPositionPointValue;
    homeAdvantage -= (injuryImpact.home * 0.7);
    homeAdvantage += (injuryImpact.away * 0.7);
    
    const projectedSpread = Math.round(homeAdvantage * 2) / 2;
    const projectedTotal = advancedFeatures.combinedPace ? (advancedFeatures.combinedPace * 0.7) : null;

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
      
      // Different ESPN API paths for NFL vs CFB
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
      // ACC
      'Boston College Eagles': 'bc', 'Clemson Tigers': 'clem', 'Duke Blue Devils': 'duke',
      'Florida State Seminoles': 'fsu', 'Georgia Tech Yellow Jackets': 'gt',
      'Louisville Cardinals': 'lou', 'Miami Hurricanes': 'miami', 'NC State Wolfpack': 'ncst',
      'North Carolina Tar Heels': 'unc', 'Pittsburgh Panthers': 'pitt', 'Syracuse Orange': 'cuse',
      'Virginia Cavaliers': 'uva', 'Virginia Tech Hokies': 'vt', 'Wake Forest Demon Deacons': 'wake',
      'California Golden Bears': 'cal', 'Stanford Cardinal': 'stan', 'SMU Mustangs': 'smu',
      
      // Big Ten
      'Illinois Fighting Illini': 'ill', 'Indiana Hoosiers': 'ind', 'Iowa Hawkeyes': 'iowa',
      'Maryland Terrapins': 'md', 'Michigan Wolverines': 'mich', 'Michigan State Spartans': 'msu',
      'Minnesota Golden Gophers': 'minn', 'Nebraska Cornhuskers': 'neb', 'Northwestern Wildcats': 'nw',
      'Ohio State Buckeyes': 'osu', 'Penn State Nittany Lions': 'psu', 'Purdue Boilermakers': 'pur',
      'Rutgers Scarlet Knights': 'rut', 'Wisconsin Badgers': 'wisc', 'Oregon Ducks': 'ore',
      'UCLA Bruins': 'ucla', 'USC Trojans': 'usc', 'Washington Huskies': 'wash',
      
      // Big 12
      'Baylor Bears': 'bay', 'BYU Cougars': 'byu', 'Cincinnati Bearcats': 'cin',
      'Houston Cougars': 'hou', 'Iowa State Cyclones': 'isu', 'Kansas Jayhawks': 'ku',
      'Kansas State Wildcats': 'ksu', 'Oklahoma State Cowboys': 'okst', 'TCU Horned Frogs': 'tcu',
      'Texas Tech Red Raiders': 'tt', 'UCF Knights': 'ucf', 'West Virginia Mountaineers': 'wvu',
      'Arizona Wildcats': 'ariz', 'Arizona State Sun Devils': 'asu', 'Colorado Buffaloes': 'col',
      'Utah Utes': 'utah',
      
      // SEC
      'Alabama Crimson Tide': 'bama', 'Arkansas Razorbacks': 'ark', 'Auburn Tigers': 'aub',
      'Florida Gators': 'fla', 'Georgia Bulldogs': 'uga', 'Kentucky Wildcats': 'uk',
      'LSU Tigers': 'lsu', 'Ole Miss Rebels': 'miss', 'Mississippi State Bulldogs': 'msst',
      'Missouri Tigers': 'mizz', 'South Carolina Gamecocks': 'sc', 'Tennessee Volunteers': 'tenn',
      'Texas A&M Aggies': 'tam', 'Vanderbilt Commodores': 'vandy', 'Oklahoma Sooners': 'okla',
      'Texas Longhorns': 'tex',
      
      // Other Power Conferences
      'Notre Dame Fighting Irish': 'nd',
      
      // Group of 5 & Others
      'Air Force Falcons': 'af', 'Akron Zips': 'akr', 'Appalachian State Mountaineers': 'app',
      'Army Black Knights': 'army', 'Ball State Cardinals': 'bsu', 'Boise State Broncos': 'boise',
      'Bowling Green Falcons': 'bg', 'Buffalo Bulls': 'buf', 'Central Michigan Chippewas': 'cmu',
      'Charlotte 49ers': 'char', 'Coastal Carolina Chanticleers': 'ccu', 'Colorado State Rams': 'csu',
      'East Carolina Pirates': 'ecu', 'Eastern Michigan Eagles': 'emu', 'Florida Atlantic Owls': 'fau',
      'Florida International Golden Panthers': 'fiu', 'Fresno State Bulldogs': 'fres',
      'Georgia Southern Eagles': 'gaso', 'Georgia State Panthers': 'gast', 'Hawaii Rainbow Warriors': 'haw',
      'James Madison Dukes': 'jmu', 'Kent State Golden Flashes': 'kent', 'Liberty Flames': 'lib',
      'Louisiana Ragin Cajuns': 'ul', 'Louisiana Tech Bulldogs': 'lat', 'Marshall Thundering Herd': 'mar',
      'Memphis Tigers': 'mem', 'Miami (OH) RedHawks': 'moh', 'Middle Tennessee Blue Raiders': 'mtsu',
      'Navy Midshipmen': 'navy', 'Nevada Wolf Pack': 'nev', 'New Mexico Lobos': 'unm',
      'New Mexico State Aggies': 'nmsu', 'North Texas Mean Green': 'unt', 'Northern Illinois Huskies': 'niu',
      'Ohio Bobcats': 'ohio', 'Old Dominion Monarchs': 'odu', 'Rice Owls': 'rice',
      'San Diego State Aztecs': 'sdsu', 'San José State Spartans': 'sjsu', 'South Alabama Jaguars': 'usa',
      'South Florida Bulls': 'usf', 'Southern Miss Golden Eagles': 'usm', 'Temple Owls': 'tem',
      'Texas State Bobcats': 'txst', 'Toledo Rockets': 'tol', 'Troy Trojans': 'troy',
      'Tulane Green Wave': 'tul', 'Tulsa Golden Hurricane': 'tulsa', 'UAB Blazers': 'uab',
      'UNLV Rebels': 'unlv', 'UConn Huskies': 'uconn', 'UTEP Miners': 'utep',
      'UTSA Roadrunners': 'utsa', 'Utah State Aggies': 'usu', 'Western Kentucky Hilltoppers': 'wku',
      'Western Michigan Broncos': 'wmu', 'Wyoming Cowboys': 'wyo',
      
      // FCS Teams commonly in datasets
      'Delaware Blue Hens': 'del', 'Delaware State Hornets': 'dsu', 'Jacksonville State Gamecocks': 'jax',
      'Sam Houston Bearkats': 'shsu', 'Kennesaw State Owls': 'ksu'
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

      if (gamesWithIds.length === 0 && parsedDataset?.games) {
        setError("No Odds API key provided. Loading games from dataset only.");
        gamesWithIds = parsedDataset.games.map((game, index) => {
          // Handle both CFB and NFL dataset structures
          let homeTeam, awayTeam, gameTime;
          
          if (game.team_data) {
            // CFB structure
            homeTeam = game.home_team || 'Unknown';
            awayTeam = game.away_team || 'Unknown';
            gameTime = game.date || new Date().toISOString();
          } else {
            // NFL structure
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
            bookmakers: []
          };
        });
      }

      if (gamesWithIds.length === 0) {
        setError("No games found. Please provide either an Odds API key or load a dataset with games.");
        return;
      }

      setGames(gamesWithIds);

      for (const game of gamesWithIds) {
        Promise.all([
          fetchESPNData(game.home_team, selectedSport),
          fetchESPNData(game.away_team, selectedSport),
          fetchPlayerProps(game.id)
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
    if (!parsedDataset?.games) return null;
    return parsedDataset.games.find((dataGame) => {
      // Handle both NFL and CFB dataset structures
      const oddsHome = oddsGame.home_team.toLowerCase().replace(/[^a-z]/g, '');
      const oddsAway = oddsGame.away_team.toLowerCase().replace(/[^a-z]/g, '');
      
      // Try NFL structure first (teams object)
      if (dataGame.teams) {
        const dataHome = (dataGame.teams.home || "").toLowerCase().replace(/[^a-z]/g, '');
        const dataAway = (dataGame.teams.away || "").toLowerCase().replace(/[^a-z]/g, '');
        return (oddsHome.includes(dataHome) || dataHome.includes(oddsHome)) &&
               (oddsAway.includes(dataAway) || dataAway.includes(oddsAway));
      }
      
      // Try CFB structure (home_team and away_team direct properties)
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
      const injuryImpact = espnData ? quantifyInjuryImpact(espnData) : { home: 0, away: 0, total: 0 };
      const statPrediction = advancedFeatures ? calculateStatisticalPrediction(datasetGame, advancedFeatures, injuryImpact) : null;
      const marketAnalysis = statPrediction ? findMarketValue(game, statPrediction) : null;

      const isCFB = advancedFeatures?.sport === 'CFB';

      let prompt = `Provide comprehensive analysis for ${game.away_team} @ ${game.home_team}\n\n`;
      
      if (isCFB) {
        prompt += `**SPORT: COLLEGE FOOTBALL**\n\n`;
        prompt += `**REQUIRED CFB ANALYSIS STRUCTURE:**\n`;
        prompt += `1. GAME PROJECTION SUMMARY (use CFB formulas from system prompt)\n`;
        prompt += `2. CFB SCORING BREAKDOWN (show SP+ calculations for both teams)\n`;
        prompt += `3. CFB BETTING RECOMMENDATIONS (with situational context)\n\n`;
      } else {
        prompt += `**SPORT: NFL**\n\n`;
        prompt += `**REQUIRED NFL ANALYSIS STRUCTURE:**\n`;
        prompt += `1. GAME PROJECTION SUMMARY (use NFL formulas from system prompt)\n`;
        prompt += `2. DETAILED SCORING BREAKDOWN (show math for both teams)\n`;
        prompt += `3. FANTASY FOOTBALL RECOMMENDATIONS (all relevant players with projections)\n`;
        prompt += `4. BETTING RECOMMENDATIONS (if market data available)\n\n`;
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
        if (marketAnalysis.marketTotal) {
          prompt += `Market Total: ${marketAnalysis.marketTotal}\n`;
          prompt += `Total Edge: ${marketAnalysis.totalEdge.toFixed(1)} points\n`;
        }
        prompt += `\n`;
      }

      if (advancedFeatures) {
        if (isCFB) {
          prompt += `**CFB ADVANCED METRICS:**\n`;
          prompt += `SP+ Differential: ${advancedFeatures.spPlusDiff.toFixed(1)} (Home ${datasetGame.team_data.home.sp_overall?.toFixed(1)}, Away ${datasetGame.team_data.away.sp_overall?.toFixed(1)})\n`;
          prompt += `Offense Ratings: Home ${datasetGame.team_data.home.sp_offense?.toFixed(1)}, Away ${datasetGame.team_data.away.sp_offense?.toFixed(1)}\n`;
          prompt += `Defense Ratings: Home ${datasetGame.team_data.home.sp_defense?.toFixed(1)}, Away ${datasetGame.team_data.away.sp_defense?.toFixed(1)}\n`;
          prompt += `Success Rate Gap: Off ${(advancedFeatures.offSuccessRateDiff * 100).toFixed(1)}%, Def ${(advancedFeatures.defSuccessRateAdvantage * 100).toFixed(1)}%\n`;
          prompt += `Explosiveness Diff: ${advancedFeatures.explosivenessDiff.toFixed(2)} (Home ${datasetGame.team_data.home.off_explosiveness?.toFixed(2)}, Away ${datasetGame.team_data.away.off_explosiveness?.toFixed(2)})\n`;
          prompt += `Havoc Rate Diff: ${(advancedFeatures.havocRateDiff * 100).toFixed(1)}% (Home ${(datasetGame.team_data.home.havoc_rate * 100).toFixed(1)}%, Away ${(datasetGame.team_data.away.havoc_rate * 100).toFixed(1)}%)\n`;
          prompt += `Records: ${game.home_team} ${advancedFeatures.homeRecord}, ${game.away_team} ${advancedFeatures.awayRecord}\n`;
          prompt += `Scoring: ${game.home_team} ${advancedFeatures.homePPG.toFixed(1)} PPG / ${datasetGame.team_data.home.points_allowed_per_game?.toFixed(1)} allowed, ${game.away_team} ${advancedFeatures.awayPPG.toFixed(1)} PPG / ${datasetGame.team_data.away.points_allowed_per_game?.toFixed(1)} allowed\n\n`;
          
          // Add recent game results for CFB
          if (datasetGame.team_data.home.game_results) {
            prompt += `**${game.home_team} RECENT RESULTS:**\n`;
            datasetGame.team_data.home.game_results.slice(-3).forEach(gr => {
              const result = gr.points_for > gr.points_against ? 'W' : 'L';
              const margin = Math.abs(gr.points_for - gr.points_against);
              const location = gr.home ? 'vs' : '@';
              prompt += `  Week ${gr.week}: ${result} ${location} ${gr.opponent} ${gr.points_for}-${gr.points_against} (${result} by ${margin})\n`;
            });
            prompt += `\n`;
          }
          
          if (datasetGame.team_data.away.game_results) {
            prompt += `**${game.away_team} RECENT RESULTS:**\n`;
            datasetGame.team_data.away.game_results.slice(-3).forEach(gr => {
              const result = gr.points_for > gr.points_against ? 'W' : 'L';
              const margin = Math.abs(gr.points_for - gr.points_against);
              const location = gr.home ? 'vs' : '@';
              prompt += `  Week ${gr.week}: ${result} ${location} ${gr.opponent} ${gr.points_for}-${gr.points_against} (${result} by ${margin})\n`;
            });
            prompt += `\n`;
          }
          
          prompt += `**REQUIRED CFB ANALYSIS ELEMENTS:**\n`;
          prompt += `1. Analyze recent trends: Are teams improving or declining based on last 3 games?\n`;
          prompt += `2. Situational context: Check schedules for lookahead/letdown spots\n`;
          prompt += `3. Home field impact: Discuss specific venue advantages if significant\n`;
          prompt += `4. Motivation factors: Bowl eligibility, rankings, rivalry implications\n`;
          prompt += `5. Coaching matchup: Experience and historical context if known\n`;
          prompt += `6. Injury impact: Contextualize with CFB depth concerns\n\n`;
          
        } else {
          prompt += `**NFL ADVANCED METRICS:**\n`;
          prompt += `Pace Factor: ${advancedFeatures.paceFactor?.toFixed(2)} (${advancedFeatures.combinedPace?.toFixed(1)} combined plays/game)\n`;
          prompt += `O-Line Advantage: Pass ${advancedFeatures.passBlockAdvantage.toFixed(1)}%, Run ${advancedFeatures.runBlockAdvantage.toFixed(1)}%\n`;
          prompt += `Field Position Value: ${advancedFeatures.fieldPositionPointValue.toFixed(1)} points\n\n`;
        }
      }

      if (datasetGame) {
        prompt += `**COMPLETE DATASET:**\n${JSON.stringify(datasetGame, null, 2)}\n\n`;
      }

      if (espnData && (espnData.home?.injuries?.length > 0 || espnData.away?.injuries?.length > 0)) {
        prompt += `**INJURY REPORTS:**\n`;
        prompt += `${game.home_team}:\n`;
        espnData.home?.injuries?.forEach((inj, i) => {
          prompt += `${i + 1}. ${inj.headline}\n`;
        });
        prompt += `\n${game.away_team}:\n`;
        espnData.away?.injuries?.forEach((inj, i) => {
          prompt += `${i + 1}. ${inj.headline}\n`;
        });
        prompt += `\n`;
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

      prompt += `Use the ${isCFB ? 'CFB' : 'NFL'} methodologies specified in the system prompt. Show your calculations. Be specific with projections.`;

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
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>Statistical projections, fantasy recommendations, and market analysis</p>

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
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "20px" }}>
            <div style={{ padding: "10px", backgroundColor: parsedDataset ? "#d4edda" : "#f8f9fa", border: `1px solid ${parsedDataset ? "#28a745" : "#dee2e6"}`, borderRadius: "4px" }}>
              <div style={{ fontSize: "11px", color: "#666" }}>Dataset</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: parsedDataset ? "#155724" : "#6c757d" }}>
                {parsedDataset ? `✓ ${parsedDataset.games?.length || 0} games` : "Not loaded"}
              </div>
            </div>
            <div style={{ padding: "10px", backgroundColor: apiKey.trim() ? "#d4edda" : "#f8f9fa", border: `1px solid ${apiKey.trim() ? "#28a745" : "#dee2e6"}`, borderRadius: "4px" }}>
              <div style={{ fontSize: "11px", color: "#666" }}>Odds API</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: apiKey.trim() ? "#155724" : "#6c757d" }}>
                {apiKey.trim() ? "✓ Configured" : "Optional"}
              </div>
            </div>
            <div style={{ padding: "10px", backgroundColor: "#fff3cd", border: "1px solid #ffc107", borderRadius: "4px" }}>
              <div style={{ fontSize: "11px", color: "#666" }}>ESPN API</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#856404" }}>
                Limited (CORS)
              </div>
            </div>
          </div>
          
          <textarea
            value={customDataset}
            onChange={(e) => setCustomDataset(e.target.value)}
            placeholder="Paste dataset JSON with advanced metrics..."
            style={{ width: "100%", minHeight: "100px", padding: "10px", marginBottom: "10px", fontFamily: "monospace", fontSize: "12px" }}
          />
          <button onClick={parseDataset} style={{ padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "4px", marginRight: "10px" }}>
            Load Dataset
          </button>
          {datasetLoaded && <span style={{ color: "#10b981", fontSize: "14px", fontWeight: "600" }}>✓ Loaded</span>}

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

          <button onClick={fetchGames} disabled={loading || (!apiKey.trim() && !parsedDataset)} style={{ marginTop: "15px", padding: "10px 20px", backgroundColor: (loading || (!apiKey.trim() && !parsedDataset)) ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600" }}>
            {loading ? "Loading..." : "Fetch Games"}
          </button>
          
          {!apiKey.trim() && (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>
              Tip: Odds API key is optional. System works with dataset alone for projections and fantasy analysis.
            </div>
          )}
        </div>

        {error && <div style={{ backgroundColor: "#fee2e2", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#dc2626" }}>{error}</div>}

        {games.map(game => {
          const analysis = analyses[game.id];
          const props = playerProps[game.id];
          const datasetGame = findMatchingDatasetGame(game);
          const advancedFeatures = datasetGame ? calculateAdvancedFeatures(datasetGame) : null;
          const espnData = espnDataCache[game.id];

          return (
            <div key={game.id} style={{ backgroundColor: "white", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderBottom: "1px solid #e9ecef" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{game.away_team} @ {game.home_team}</h3>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                      {new Date(game.commence_time).toLocaleString()}
                    </div>
                    
                    {/* Data availability indicators */}
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
                          {advancedFeatures.sport === 'CFB' ? '✓ CFB SP+ Data' : '✓ NFL EPA Data'}
                        </span>
                      )}
                      {espnData?.home?.injuries?.length > 0 || espnData?.away?.injuries?.length > 0 ? (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: "#fff3cd",
                          color: "#856404",
                          fontWeight: "600"
                        }}>
                          ⚠ {(espnData?.home?.injuries?.length || 0) + (espnData?.away?.injuries?.length || 0)} Injuries
                        </span>
                      ) : espnData ? (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: "#d4edda",
                          color: "#155724",
                          fontWeight: "600"
                        }}>
                          ✓ Clean Injury Report
                        </span>
                      ) : null}
                      {game.bookmakers?.length > 0 && (
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          borderRadius: "12px", 
                          backgroundColor: "#e7f3ff",
                          color: "#004085",
                          fontWeight: "600"
                        }}>
                          ✓ {game.bookmakers.length} Books
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
                    <div style={{ marginBottom: "10px" }}>Generating comprehensive analysis...</div>
                    <div style={{ fontSize: "11px" }}>Calculating projections, {advancedFeatures?.sport === 'CFB' ? 'situational context' : 'fantasy recommendations'}, and market value...</div>
                  </div>
                )}

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
                          <p>Player props have 8-15% hold. Books make MORE profit on props than any other bet type.</p>
                          <p>You need 57%+ win rate to profit. Most bettors achieve 50-52%.</p>
                        </div>
                        <button onClick={() => setShowPropWarning(false)} style={{ marginTop: "10px", padding: "6px 12px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", fontSize: "12px" }}>
                          I understand
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
          <h3 style={{ margin: "0 0 10px 0" }}>This is NOT a profit system for betting</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Fantasy football: fixed cost hobby. Sports betting: unlimited downside. Props have 8-15% hold. Call 1-800-GAMBLER
          </p>
        </div>
      </div>
    </div>
  );
}