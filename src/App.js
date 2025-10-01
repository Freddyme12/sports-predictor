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
  const [injuryApiStatus, setInjuryApiStatus] = useState({ available: null, sources: {} });
  const [predictionTracking, setPredictionTracking] = useState([]);

  const BACKEND_URL = "https://sports-predictor-ruddy.vercel.app";
  const [showWarning, setShowWarning] = useState(true);
  const [userAcknowledged, setUserAcknowledged] = useState(false);

  const systemPrompt = "You are an advanced sports analyst providing rigorous statistical projections with CORRECTED formulas and ensemble modeling.\n\nCFB Defensive Success Rate - CORRECTED: LOWER defensive success rate = BETTER defense.\n\nSPORT DETECTION: CFB has SP+, success_rate. NFL has EPA, player_statistics.\n\nCFB Spread: SP+ diff × 0.18 × 0.45 + Off SR diff × 220 × 0.22 + (Away Def SR - Home Def SR) × 180 × 0.18 + Explosiveness × 25 × 0.10 + Havoc × 120 × 0.05 + Home 3.5\n\nNFL Spread: EPA diff × 320 × 0.40 + Success Rate × 250 × 0.25 + Explosive × 150 × 0.15 + 3rd Down × 100 × 0.10 + Red Zone × 80 × 0.10 + Home 2.5 + O-Line\n\nInjury: NFL QB 5.5pts, RB 1.2, WR 1.0. CFB QB 7.0pts, RB 2.0, WR 1.5.\n\nEnsemble: Model 50%, nfelo 25%, Market 25%. Consensus < 2pts = +1 confidence.\n\nFantasy (NFL): QB pass yds/TDs, rush yds. RB rush/rec. WR/TE targets/rec/yds. Full PPR. For fantasy/DFS only.\n\nEducational purposes only.";

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
      return null;
    }
  };

  const supplementGameDataFromBackend = async (games, sport) => {
    setBackendFetchStatus('fetching');
    
    const currentYear = new Date().getFullYear();
    const estimatedWeek = 5;
    
    try {
      const backendGames = await fetchBackendDataForTeam(null, sport, currentYear, estimatedWeek);
      
      if (!backendGames || backendGames.length === 0) {
        setBackendFetchStatus('unavailable');
        return games;
      }
      
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
          const mergedGameData = Object.assign({}, jsonGame.datasetGame);
          
          if (matchingBackendGame.team_data) {
            mergedGameData.team_data = {
              home: Object.assign({}, mergedGameData.team_data && mergedGameData.team_data.home || {}, matchingBackendGame.team_data.home),
              away: Object.assign({}, mergedGameData.team_data && mergedGameData.team_data.away || {}, matchingBackendGame.team_data.away)
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
      
      return supplementedGames;
    } catch (err) {
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
        "https://raw.githubusercontent.com/nfelo/nfelo/main/data/predictions_" + currentYear + "_week" + currentWeek + ".json"
      ];
      
      for (const source of sources) {
        try {
          const response = await fetch(source);
          if (response.ok) {
            const data = await response.json();
            if (data && (data.games || data.predictions)) {
              setNfeloData(data);
              setNfeloAvailable(true);
              return data;
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      setNfeloAvailable(false);
      return null;
    } catch (err) {
      setNfeloAvailable(false);
      return null;
    }
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

  const calculateFantasyProjections = (gameData, teamAbbr) => {
    if (!gameData || !gameData.player_statistics || !gameData.player_statistics[teamAbbr]) {
      return null;
    }

    const playerStats = gameData.player_statistics[teamAbbr];
    const teamStats = gameData.team_statistics ? gameData.team_statistics[teamAbbr] : null;
    
    const projections = {
      quarterbacks: [],
      runningBacks: [],
      receivers: []
    };

    const processedPlayers = new Set();

    if (playerStats.quarterbacks) {
      playerStats.quarterbacks.forEach(qb => {
        if (!qb.attempts || qb.attempts < 20) return;
        if (processedPlayers.has(qb.player_name)) return;
        processedPlayers.add(qb.player_name);
        
        const completionPct = qb.completions / qb.attempts;
        const yardsPerAttempt = qb.yards / qb.attempts;
        const tdRate = qb.touchdowns / qb.attempts;
        
        const projectedAttempts = qb.attempts / 4;
        const projectedPassYards = projectedAttempts * yardsPerAttempt;
        const projectedPassTDs = projectedAttempts * tdRate;
        const projectedRushYards = qb.carries ? (qb.rush_yards / qb.carries) * 3 : 0;
        
        const passingPoints = (projectedPassYards * 0.04) + (projectedPassTDs * 4);
        const rushingPoints = (projectedRushYards * 0.1) + (0.1 * 6);
        const totalPoints = passingPoints + rushingPoints;
        
        const confidence = qb.passer_rating_last3 > 85 ? 'High' : qb.passer_rating_last3 > 70 ? 'Medium' : 'Low';
        
        projections.quarterbacks.push({
          name: qb.player_name,
          projectedPoints: totalPoints.toFixed(1),
          passYards: projectedPassYards.toFixed(0),
          passTDs: projectedPassTDs.toFixed(1),
          rushYards: projectedRushYards.toFixed(0),
          confidence: confidence
        });
      });
    }

    if (playerStats.running_backs_top3) {
      playerStats.running_backs_top3.forEach(rb => {
        if (!rb.carries || rb.carries < 10) return;
        if (processedPlayers.has(rb.player_name)) return;
        processedPlayers.add(rb.player_name);
        
        const ypc = rb.rush_yards / rb.carries;
        const carriesPerGame = rb.carries / 4;
        const projectedRushYards = carriesPerGame * ypc;
        const projectedRushTDs = (rb.rush_tds / 4) || 0.3;
        
        const receptions = rb.receptions || 0;
        const recYards = rb.yards || 0;
        const projectedReceptions = receptions / 4;
        const projectedRecYards = recYards / 4;
        
        const rushingPoints = (projectedRushYards * 0.1) + (projectedRushTDs * 6);
        const receivingPoints = (projectedReceptions * 1) + (projectedRecYards * 0.1) + (0.2 * 6);
        const totalPoints = rushingPoints + receivingPoints;
        
        const confidence = carriesPerGame > 15 ? 'High' : carriesPerGame > 10 ? 'Medium' : 'Low';
        
        projections.runningBacks.push({
          name: rb.player_name,
          projectedPoints: totalPoints.toFixed(1),
          rushYards: projectedRushYards.toFixed(0),
          receptions: projectedReceptions.toFixed(1),
          recYards: projectedRecYards.toFixed(0),
          confidence: confidence
        });
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
        
        const projectedReceptions = targetsPerGame * receptionRate;
        const projectedYards = projectedReceptions * yardsPerReception;
        const projectedTDs = (receiver.touchdowns / 4) || 0.3;
        
        const totalPoints = (projectedReceptions * 1) + (projectedYards * 0.1) + (projectedTDs * 6);
        const confidence = receiver.target_share_pct > 20 ? 'High' : receiver.target_share_pct > 15 ? 'Medium' : 'Low';
        
        projections.receivers.push({
          name: receiver.player_name,
          projectedPoints: totalPoints.toFixed(1),
          receptions: projectedReceptions.toFixed(1),
          yards: projectedYards.toFixed(0),
          touchdowns: projectedTDs.toFixed(1),
          confidence: confidence
        });
      });
    }

    return projections;
  };

  const quantifyInjuryImpact = (espnData, isCFB) => {
    if (!espnData || !espnData.home || !espnData.away) {
      return { home: 0, away: 0, total: 0, differential: 0, confidenceReduction: 0 };
    }

    const cfbImpactScores = {
      'qb': 7.0, 'quarterback': 7.0,
      'rb': 2.0, 'running back': 2.0,
      'wr': 1.5, 'wide receiver': 1.5, 'receiver': 1.5,
      'te': 1.0, 'tight end': 1.0,
      'ol': 1.0, 'offensive line': 1.0
    };

    const nflImpactScores = {
      'qb': 5.5, 'quarterback': 5.5,
      'rb': 1.2, 'running back': 1.2,
      'wr': 1.0, 'wide receiver': 1.0, 'receiver': 1.0,
      'te': 0.6, 'tight end': 0.6,
      'ol': 0.5, 'offensive line': 0.5
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

        for (const pos in impactScores) {
          if (headline.includes(pos)) {
            impact = Math.max(impact, impactScores[pos]);
            positionCount[pos] = (positionCount[pos] || 0) + 1;
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

      return totalImpact;
    };

    const homeImpact = calculateInjuries(espnData.home.injuries || []);
    const awayImpact = calculateInjuries(espnData.away.injuries || []);

    return {
      home: homeImpact,
      away: awayImpact,
      total: homeImpact + awayImpact,
      differential: homeImpact - awayImpact,
      confidenceReduction: Math.min(Math.floor((homeImpact + awayImpact) / 3.5), 2)
    };
  };

  const validateDataRanges = (gameData, advancedFeatures) => {
    const warnings = [];
    
    if (advancedFeatures) {
      if (advancedFeatures.sport === 'NFL') {
        if (Math.abs(advancedFeatures.homeEPA) < 0.01 && Math.abs(advancedFeatures.awayEPA) < 0.01) {
          warnings.push("WARNING: EPA values unusually small (typical range: -0.15 to +0.15). Data may be incomplete or represent limited sample.");
        }
        if (Math.abs(advancedFeatures.homeEPA) > 0.5 || Math.abs(advancedFeatures.awayEPA) > 0.5) {
          warnings.push("WARNING: EPA values unusually high. Verify data accuracy.");
        }
      }
      
      if (advancedFeatures.sport === 'CFB') {
        if (Math.abs(advancedFeatures.spPlusDiff) > 50) {
          warnings.push("WARNING: SP+ differential extremely large. This suggests a major mismatch.");
        }
      }
    }
    
    return warnings;
  };

  const calculateAdvancedFeatures = (gameData) => {
    if (!gameData) return null;

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
        awayPPG: away.points_per_game || 0
      };
    }

    const teamStats = gameData.team_statistics;
    if (teamStats) {
      const homeTeam = gameData.teams && gameData.teams.home;
      const awayTeam = gameData.teams && gameData.teams.away;
      const home = teamStats[homeTeam];
      const away = teamStats[awayTeam];
      
      if (!home || !away) return null;

      return {
        sport: 'NFL',
        homeEPA: home.offense && home.offense.epa_per_play && home.offense.epa_per_play.overall || 0,
        awayEPA: away.offense && away.offense.epa_per_play && away.offense.epa_per_play.overall || 0,
        homeSuccessRate: home.offense && home.offense.success_rate && home.offense.success_rate.overall || 0,
        awaySuccessRate: away.offense && away.offense.success_rate && away.offense.success_rate.overall || 0
      };
    }

    return null;
  };

  const getTeamAbbreviation = (teamName, sport) => {
    if (!teamName || typeof teamName !== 'string') return 'unknown';
    
    const nflTeams = {
      'San Francisco 49ers': 'sf', 'Los Angeles Rams': 'lar'
    };

    if (sport === 'nfl') return nflTeams[teamName] || teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
    return teamName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
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
      const teamAbbr = getTeamAbbreviation(teamName, sport === 'americanfootball_ncaaf' ? 'cfb' : 'nfl');
      
      const proxyUrl = BACKEND_URL + "/api/espn-proxy?sport=" + encodeURIComponent(sportPath) + "&team=" + encodeURIComponent(teamAbbr);
      
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });

      if (!response.ok) {
        return { team: teamName, injuries: [], source: 'failed' };
      }

      const data = await response.json();
      
      if (!data.success) {
        return { team: teamName, injuries: [], source: data.source || 'failed' };
      }
      
      return { 
        team: teamName, 
        injuries: data.injuries || [],
        source: data.source || 'unknown'
      };
    } catch (error) {
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
          const url = "https://api.the-odds-api.com/v4/sports/" + selectedSport + "/odds?apiKey=" + apiKey + "&regions=us&markets=h2h,spreads,totals&oddsFormat=american";
          const response = await fetch(url);

          if (response.ok) {
            const oddsData = await response.json();
            if (oddsData && oddsData.length > 0) {
              gamesWithIds = oddsData.map((game, index) => ({
                ...game,
                id: game.id || (game.sport_key + "_" + index)
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
          homeTeam = game.home_team || 'Unknown Home';
          awayTeam = game.away_team || 'Unknown Away';
          gameTime = game.date || new Date().toISOString();
        } else {
          homeTeam = game.teams && game.teams.home || game.home_team || 'Unknown Home';
          awayTeam = game.teams && game.teams.away || game.away_team || 'Unknown Away';
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
            return Object.assign({}, oddsGame, {
              datasetGame: matchingDatasetGame.datasetGame
            });
          }
          return oddsGame;
        });
      } else {
        gamesWithIds = datasetGames;
      }

      gamesWithIds = await supplementGameDataFromBackend(gamesWithIds, selectedSport);
      
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
    } finally {
      setLoading(false);
    }
  };

  const analyzeGame = async (game) => {
    setAnalyses(prev => (Object.assign({}, prev, { [game.id]: { loading: true } })));

    try {
      const gameData = game.datasetGame;
      if (!gameData) throw new Error("No dataset found");

      const advancedFeatures = calculateAdvancedFeatures(gameData);
      const isCFB = advancedFeatures && advancedFeatures.sport === 'CFB';
      const nfeloPrediction = !isCFB ? findNfeloPrediction(game) : null;
      
      const espnData = espnDataCache[game.id];
      const injuryImpact = espnData ? quantifyInjuryImpact(espnData, isCFB) : null;
      
      const dataWarnings = validateDataRanges(gameData, advancedFeatures);
      
      let marketData = null;
      let hasMarketData = false;
      if (game.bookmakers && game.bookmakers.length > 0) {
        const book = game.bookmakers[0];
        marketData = {
          spread: book.markets.find(m => m.key === 'spreads'),
          total: book.markets.find(m => m.key === 'totals'),
          moneyline: book.markets.find(m => m.key === 'h2h')
        };
        hasMarketData = true;
      }
      
      let fantasyData = null;
      if (!isCFB && gameData.player_statistics) {
        const homeTeam = gameData.teams && gameData.teams.home;
        const awayTeam = gameData.teams && gameData.teams.away;
        
        if (homeTeam && awayTeam) {
          fantasyData = {
            home: calculateFantasyProjections(gameData, homeTeam),
            away: calculateFantasyProjections(gameData, awayTeam)
          };
        }
      }

      const dataSourceStatus = {
        dataset: true,
        marketOdds: hasMarketData,
        nfeloModel: !!nfeloPrediction,
        injuries: !!(espnData && (espnData.home.injuries.length > 0 || espnData.away.injuries.length > 0)),
        enhancedStats: !!game.hasBackendData
      };

      let prompt = "=== DATA SOURCE STATUS ===\n";
      prompt += "Dataset: AVAILABLE\n";
      prompt += "Market Odds: " + (hasMarketData ? "AVAILABLE" : "NOT AVAILABLE") + "\n";
      prompt += "nfelo Model: " + (nfeloPrediction ? "AVAILABLE" : "NOT AVAILABLE") + "\n";
      prompt += "Injury Data: " + (dataSourceStatus.injuries ? "AVAILABLE" : "NOT AVAILABLE") + "\n";
      prompt += "Enhanced Stats: " + (game.hasBackendData ? "AVAILABLE" : "NOT AVAILABLE") + "\n\n";

      if (dataWarnings.length > 0) {
        prompt += "=== DATA QUALITY WARNINGS ===\n";
        dataWarnings.forEach(warning => {
          prompt += warning + "\n";
        });
        prompt += "\n";
      }

      prompt += "=== ENSEMBLE MODELING STATUS ===\n";
      const availableComponents = [];
      if (true) availableComponents.push("Model (50%)");
      if (nfeloPrediction) availableComponents.push("nfelo (25%)");
      if (hasMarketData) availableComponents.push("Market (25%)");
      
      prompt += "Active Components: " + availableComponents.join(", ") + "\n";
      
      if (!nfeloPrediction && !hasMarketData) {
        prompt += "WARNING: Ensemble modeling degraded. Using MODEL ONLY (100% weight).\n";
        prompt += "Confidence should be reduced by 1 tier due to lack of validation sources.\n\n";
      } else if (!nfeloPrediction || !hasMarketData) {
        const missingSource = !nfeloPrediction ? "nfelo" : "Market";
        prompt += "NOTICE: " + missingSource + " unavailable. Redistributing weight to available sources.\n";
        if (nfeloPrediction && !hasMarketData) {
          prompt += "Adjusted weights: Model 67%, nfelo 33%\n\n";
        } else if (!nfeloPrediction && hasMarketData) {
          prompt += "Adjusted weights: Model 67%, Market 33%\n\n";
        }
      } else {
        prompt += "Full ensemble available.\n\n";
      }

      prompt += "=== GAME ANALYSIS ===\n";
      prompt += "Matchup: " + game.away_team + " @ " + game.home_team + "\n";
      prompt += "Sport: " + (isCFB ? 'COLLEGE FOOTBALL' : 'NFL') + "\n\n";
      
      prompt += "=== PRIMARY DATASET ===\n";
      prompt += JSON.stringify(gameData, null, 2) + "\n\n";
      
      if (advancedFeatures) {
        prompt += "=== CALCULATED FEATURES (from dataset) ===\n";
        prompt += JSON.stringify(advancedFeatures, null, 2) + "\n\n";
      }
      
      if (marketData) {
        prompt += "=== MARKET ODDS (for ensemble) ===\n";
        prompt += JSON.stringify(marketData, null, 2) + "\n\n";
      }
      
      if (nfeloPrediction) {
        prompt += "=== NFELO PREDICTION (for ensemble) ===\n";
        prompt += JSON.stringify(nfeloPrediction, null, 2) + "\n\n";
      }
      
      if (injuryImpact) {
        prompt += "=== INJURY IMPACT ANALYSIS ===\n";
        prompt += "Home Team Impact: " + injuryImpact.home.toFixed(1) + " points\n";
        prompt += "Away Team Impact: " + injuryImpact.away.toFixed(1) + " points\n";
        prompt += "Net Differential: " + injuryImpact.differential.toFixed(1) + " points (favoring " + (injuryImpact.differential > 0 ? "Away" : "Home") + ")\n";
        prompt += "Confidence Reduction: -" + injuryImpact.confidenceReduction + " tiers\n\n";
      }
      
      if (espnData && (espnData.home.injuries.length > 0 || espnData.away.injuries.length > 0)) {
        prompt += "=== DETAILED INJURY REPORTS ===\n";
        prompt += "Home (" + game.home_team + "): " + espnData.home.injuries.length + " injuries\n";
        if (espnData.home.injuries.length > 0) {
          espnData.home.injuries.forEach(inj => {
            prompt += "  - " + inj.headline + "\n";
          });
        }
        prompt += "\nAway (" + game.away_team + "): " + espnData.away.injuries.length + " injuries\n";
        if (espnData.away.injuries.length > 0) {
          espnData.away.injuries.forEach(inj => {
            prompt += "  - " + inj.headline + "\n";
          });
        }
        prompt += "\n";
      }
      
      prompt += "=== ANALYSIS INSTRUCTIONS ===\n";
      prompt += "1. Start with a clear API STATUS SUMMARY showing which data sources were used\n";
      prompt += "2. Calculate the model-based prediction using the appropriate formula\n";
      prompt += "3. If ensemble components available, blend predictions using the weights shown above\n";
      prompt += "4. Clearly state if ensemble modeling is degraded and adjust confidence accordingly\n";
      prompt += "5. Show all calculation steps transparently\n";
      prompt += "6. Provide comprehensive analysis with spread prediction, total prediction, confidence level, and key factors\n";
      prompt += "7. Note any data quality warnings in your analysis\n\n";
      
      prompt += "CRITICAL: Always attribute predictions to their source (Model/Market/nfelo) and explain ensemble weighting used.";

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
      const analysis = result.choices[0] && result.choices[0].message && result.choices[0].message.content || "Analysis unavailable";

      setAnalyses(prev => (Object.assign({}, prev, {
        [game.id]: { 
          loading: false, 
          text: analysis,
          fantasyData: fantasyData,
          nfeloPrediction: nfeloPrediction,
          dataSourceStatus: dataSourceStatus,
          dataWarnings: dataWarnings
        }
      })));
    } catch (err) {
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
        <h1 style={{ textAlign: "center", marginBottom: "10px" }}>Enhanced Sports Analytics System v2.1</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>
          Fixed Formulas • Ensemble Modeling • Fantasy Projections • API Validation
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
              ✓ Dataset Loaded - {parsedDataset && parsedDataset.games && parsedDataset.games.length || 0} games
            </span>
          )}
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

          {nfeloAvailable && selectedSport === "americanfootball_nfl" && (
            <div style={{ marginTop: "15px", padding: "12px", backgroundColor: "#d4edda", borderRadius: "6px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#155724" }}>
                ✓ nfelo NFL Model Active
              </div>
            </div>
          )}
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
                    disabled={analysis && analysis.loading} 
                    style={{ padding: "8px 16px", backgroundColor: analysis && analysis.loading ? "#ccc" : "#0066cc", color: "white", border: "none", borderRadius: "4px", fontWeight: "600", cursor: analysis && analysis.loading ? "not-allowed" : "pointer" }}
                  >
                    {analysis && analysis.loading ? "Analyzing..." : "Analyze"}
                  </button>
                </div>
              </div>

              <div style={{ padding: "15px" }}>
                {analysis && analysis.text && (
                  <>
                    {analysis.dataSourceStatus && (
                      <div style={{ marginBottom: "15px", padding: "12px", backgroundColor: "#f8f9fa", borderRadius: "6px", border: "1px solid #dee2e6" }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "#495057" }}>
                          API Data Sources Status:
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#d4edda", color: "#155724", borderRadius: "4px", fontWeight: "600" }}>
                            ✓ Dataset
                          </span>
                          {analysis.dataSourceStatus.marketOdds ? (
                            <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#cce5ff", color: "#004085", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ Market Odds
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#f8d7da", color: "#721c24", borderRadius: "4px", fontWeight: "600" }}>
                              ✗ Market Odds
                            </span>
                          )}
                          {analysis.dataSourceStatus.nfeloModel ? (
                            <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#fff3cd", color: "#856404", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ nfelo Model
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#f8d7da", color: "#721c24", borderRadius: "4px", fontWeight: "600" }}>
                              ✗ nfelo Model
                            </span>
                          )}
                          {analysis.dataSourceStatus.injuries && (
                            <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#f8d7da", color: "#721c24", borderRadius: "4px", fontWeight: "600" }}>
                              ⚠ Injuries Detected
                            </span>
                          )}
                          {analysis.dataSourceStatus.enhancedStats && (
                            <span style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#e2e3e5", color: "#383d41", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ Enhanced Stats
                            </span>
                          )}
                        </div>
                        {(!analysis.dataSourceStatus.marketOdds || !analysis.dataSourceStatus.nfeloModel) && (
                          <div style={{ marginTop: "8px", fontSize: "11px", color: "#856404", fontWeight: "600" }}>
                            ⚠ Ensemble modeling degraded - some validation sources unavailable
                          </div>
                        )}
                      </div>
                    )}
                    
                    {analysis.dataWarnings && analysis.dataWarnings.length > 0 && (
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
                    
                    <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "6px", fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "600px", overflowY: "auto", lineHeight: "1.6" }}>
                      {analysis.text}
                    </div>
                  </>
                )}

                {analysis && analysis.fantasyData && (analysis.fantasyData.home || analysis.fantasyData.away) && (
                  <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "2px solid #0066cc" }}>
                    <h3 style={{ margin: "0 0 15px 0", color: "#0066cc", fontSize: "18px" }}>
                      Fantasy Football Projections
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
                          
                          {team.data.quarterbacks && team.data.quarterbacks.length > 0 && (
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "5px" }}>Quarterbacks</div>
                              {team.data.quarterbacks.map((qb, idx) => (
                                <div key={idx} style={{ padding: "6px", backgroundColor: "white", borderRadius: "4px", marginBottom: "3px", fontSize: "11px" }}>
                                  <strong>{qb.name}</strong> - {qb.projectedPoints} pts ({qb.confidence})
                                  <div style={{ color: "#666" }}>Pass: {qb.passYards} yds, {qb.passTDs} TDs | Rush: {qb.rushYards} yds</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {team.data.runningBacks && team.data.runningBacks.length > 0 && (
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "5px" }}>Running Backs</div>
                              {team.data.runningBacks.map((rb, idx) => (
                                <div key={idx} style={{ padding: "6px", backgroundColor: "white", borderRadius: "4px", marginBottom: "3px", fontSize: "11px" }}>
                                  <strong>{rb.name}</strong> - {rb.projectedPoints} pts ({rb.confidence})
                                  <div style={{ color: "#666" }}>Rush: {rb.rushYards} yds | Rec: {rb.receptions} rec, {rb.recYards} yds</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {team.data.receivers && team.data.receivers.length > 0 && (
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "5px" }}>Receivers / Tight Ends</div>
                              {team.data.receivers.map((rec, idx) => (
                                <div key={idx} style={{ padding: "6px", backgroundColor: "white", borderRadius: "4px", marginBottom: "3px", fontSize: "11px" }}>
                                  <strong>{rec.name}</strong> - {rec.projectedPoints} pts ({rec.confidence})
                                  <div style={{ color: "#666" }}>{rec.receptions} rec, {rec.yards} yds, {rec.touchdowns} TDs</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#fff3cd", borderRadius: "4px", fontSize: "11px", color: "#856404" }}>
                      <strong>Note:</strong> For fantasy/DFS only. Full PPR scoring. Based on 4-game sample. Not for prop betting.
                    </div>
                  </div>
                )}

                {analysis && analysis.loading && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Generating analysis...</div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#dc3545", color: "white", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Educational & Fantasy Only</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            v2.1: API validation • Data quality warnings • Fixed fantasy projections • Ensemble fallback • Call 1-800-GAMBLER
          </p>
        </div>
      </div>
    </div>
  );
}