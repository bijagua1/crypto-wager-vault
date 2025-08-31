import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { SportsNav } from "@/components/layout/SportsNav";
import { Footer } from "@/components/layout/Footer";
import { GameCard } from "@/components/betting/GameCard";
import { BetSlip } from "@/components/betting/BetSlip";
import { MobileBetSlip } from "@/components/ui/mobile-bet-slip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, TrendingUp, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MyBets } from "@/components/betting/MyBets";

// Sample game data
const sampleGames = [
  {
    id: "1",
    league: "NBA",
    homeTeam: { name: "Los Angeles Lakers", logo: "", record: "42-30" },
    awayTeam: { name: "Golden State Warriors", logo: "", record: "39-33" },
    commenceTime: "2024-03-15T20:00:00",
    isLive: false,
    homeOdds: {
      moneyline: -150,
      spread: { point: -5.5, odds: -110 },
      total: { point: 220.5, over: -110, under: -110 }
    },
    awayOdds: {
      moneyline: 130,
      spread: { point: 5.5, odds: -110 },
      total: { point: 220.5, over: -110, under: -110 }
    },
    popularBet: "Lakers -5.5"
  },
  {
    id: "2", 
    league: "Premier League",
    homeTeam: { name: "Manchester City", logo: "", record: "W-W-L-W-W" },
    awayTeam: { name: "Liverpool", logo: "", record: "W-D-W-W-L" },
    commenceTime: "2024-03-15T15:30:00",
    isLive: true,
    homeScore: 1,
    awayScore: 2,
    homeOdds: {
      moneyline: 165,
      spread: { point: -0.5, odds: -105 },
      total: { point: 2.5, over: 120, under: -140 }
    },
    awayOdds: {
      moneyline: -185,
      spread: { point: 0.5, odds: -115 },
      total: { point: 2.5, over: 120, under: -140 }
    },
    popularBet: "Over 2.5 Goals"
  },
  {
    id: "3",
    league: "NFL",
    homeTeam: { name: "Buffalo Bills", logo: "", record: "11-6" },
    awayTeam: { name: "Miami Dolphins", logo: "", record: "9-8" },
    commenceTime: "2024-03-17T13:00:00",
    isLive: false,
    homeOdds: {
      moneyline: -200,
      spread: { point: -6.5, odds: -110 },
      total: { point: 45.5, over: -105, under: -115 }
    },
    awayOdds: {
      moneyline: 170,
      spread: { point: 6.5, odds: -110 },
      total: { point: 45.5, over: -105, under: -115 }
    }
  },
  {
    id: "4",
    league: "MLB",
    homeTeam: { name: "New York Yankees", logo: "", record: "12-8" },
    awayTeam: { name: "Boston Red Sox", logo: "", record: "10-10" },
    commenceTime: "2024-03-15T19:05:00",
    isLive: false,
    homeOdds: {
      moneyline: -135,
      spread: { point: -1.5, odds: 150 },
      total: { point: 8.5, over: -110, under: -110 }
    },
    awayOdds: {
      moneyline: 115,
      spread: { point: 1.5, odds: -170 },
      total: { point: 8.5, over: -110, under: -110 }
    },
    popularBet: "Yankees ML"
  }
];

interface BetSelection {
  gameId: string;
  game: string;
  betType: string;
  selection: string;
  odds: number;
  isSelected: boolean;
}

export const MainSportsbook = () => {
  const [betSelections, setBetSelections] = useState<BetSelection[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [games, setGames] = useState<typeof sampleGames>([]);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedLeague, setSelectedLeague] = useState<string>();
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const fetchOdds = async () => {
      setLoading(true);
      try {
        // Map selected sport/league to the edge function sport key
        const map: Record<string, Record<string, string>> = {
          soccer: {
            "Premier League": "soccer_epl",
            "La Liga": "soccer_spain_la_liga",
            "Champions League": "soccer_uefa_champs_league",
            "MLS": "soccer_usa_mls",
            default: "soccer_epl",
          },
          basketball: { default: "basketball_nba" },
          football: { default: "americanfootball_nfl" },
          baseball: { default: "baseball_mlb" },
          tennis: { default: "tennis_atp_singles" },
        };
        const sportMap = map[selectedSport] || undefined;
        const apiSport = sportMap
          ? (selectedLeague && sportMap[selectedLeague]) || sportMap.default
          : "soccer_epl"; // fetch real data even when 'all' is selected

        const { data, error } = await supabase.functions.invoke("odds-lines", {
          body: { sport: apiSport, regions: "us,uk,eu", markets: "h2h,spreads,totals" },
        });
        if (!error && data?.games) {
          setGames(data.games);
        } else {
          console.error("odds-lines error", error || data);
          setGames([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOdds();
  }, [selectedSport, selectedLeague]);

  // Sync tab, sport, and league with URL params
  useEffect(() => {
    const tabParam = (searchParams.get("tab") || "all").toLowerCase();
    if (tabParam !== activeTab) setActiveTab(tabParam);

    const sportParam = (searchParams.get("sport") || "all").toLowerCase();
    const leagueParam = searchParams.get("league") || undefined;

    // Derive sport from league if sport not set
    if ((sportParam === "all" || !sportParam) && leagueParam) {
      const leagueToSport: Record<string, string> = {
        "Premier League": "soccer",
        "La Liga": "soccer",
        "Champions League": "soccer",
        "MLS": "soccer",
        NBA: "basketball",
        NCAA: "basketball",
        EuroLeague: "basketball",
        NFL: "football",
        "NCAA Football": "football",
        MLB: "baseball",
        "College Baseball": "baseball",
        ATP: "tennis",
        WTA: "tennis",
        "Grand Slams": "tennis",
      };
      const derived = leagueToSport[leagueParam];
      if (derived && derived !== selectedSport) setSelectedSport(derived);
    } else if (sportParam !== selectedSport) {
      setSelectedSport(sportParam);
    }

    if (leagueParam !== selectedLeague) setSelectedLeague(leagueParam);
  }, [searchParams]);

  const sourceGames = games;

  // Filter games based on selected sport and league
  const filteredGames = sourceGames.filter(game => {
    if (selectedSport === "all") return true;
    
    // Map sport IDs to league names in our sample data
    const sportLeagueMap: Record<string, string[]> = {
      soccer: ["Premier League", "La Liga", "Champions League", "MLS"],
      basketball: ["NBA", "NCAA", "EuroLeague"],
      football: ["NFL", "NCAA Football"],
      baseball: ["MLB", "College Baseball"],
      tennis: ["ATP", "WTA", "Grand Slams"]
    };
    
    const sportLeagues = sportLeagueMap[selectedSport];
    if (!sportLeagues) return false;
    
    // If no specific league selected, show all games from this sport
    if (!selectedLeague) {
      return sportLeagues.includes(game.league);
    }
    
    // Show only games from selected league
    return game.league === selectedLeague;
  });

  const handleSportSelect = (sport: string) => {
    setSelectedSport(sport);
    setSelectedLeague(undefined); // Reset league when sport changes
    const params = new URLSearchParams(searchParams);
    if (sport === "all") {
      params.delete("sport");
    } else {
      params.set("sport", sport);
    }
    params.delete("league");
    setSearchParams(params);
  };

  const handleLeagueSelect = (league: string) => {
    const params = new URLSearchParams(searchParams);
    if (selectedLeague === league) {
      setSelectedLeague(undefined);
      params.delete("league");
    } else {
      setSelectedLeague(league);
      params.set("league", league);
    }
    setSearchParams(params);
  };

  const handleBetSelect = (bet: any) => {
    setBetSelections(prev => {
      const existingIndex = prev.findIndex(
        sel => sel.gameId === bet.gameId && 
               sel.betType === bet.betType && 
               sel.selection === bet.selection
      );

      if (existingIndex >= 0) {
        // Update existing selection
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], isSelected: bet.isSelected };
        return updated;
      } else {
        // Add new selection
        return [...prev, bet];
      }
    });
  };

  const handleRemoveSelection = (gameId: string, betType: string, selection: string) => {
    setBetSelections(prev => 
      prev.filter(sel => 
        !(sel.gameId === gameId && sel.betType === betType && sel.selection === selection)
      )
    );
  };

  const handleClearAll = () => {
    setBetSelections([]);
  };

const selectedKeys = new Set(
  betSelections
    .filter((s) => s.isSelected)
    .map((s) => `${s.gameId}-${s.betType}-${s.selection}`)
);

const liveGames = [...filteredGames.filter((game) => game.isLive)].sort(
  (a, b) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
);
const upcomingGames = [...filteredGames.filter((game) => !game.isLive)].sort(
  (a, b) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 pt-2">
        <Button variant="ghost" size="sm" onClick={() => setShowSidebar((v) => !v)}>
          {showSidebar ? "Hide Sports" : "Show Sports"}
        </Button>
      </div>
      <div className="flex">
        {/* Left Sidebar - Sports Navigation */}
        {showSidebar && (
          <SportsNav 
            className="hidden lg:block w-64 max-h-[calc(100vh-4rem)] overflow-auto"
            selectedSport={selectedSport}
            selectedLeague={selectedLeague}
            onSportSelect={handleSportSelect}
            onLeagueSelect={handleLeagueSelect}
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {/* Hero Section */}
          <div className="mb-8 p-6 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl border border-primary/20">
            <div className="max-w-4xl">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                Welcome to <span className="text-primary">CryptoBets</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Bet Smart. Win Crypto. Join 1000+ bettors wagering with Bitcoin & USDC.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-crypto-green" />
                  <span>1000+ Active Bettors</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-crypto-blue" />
                  <span>₿ $2M+ Wagered This Month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-crypto-gold" />
                  <span>Instant Crypto Payouts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Filters */}
          <div className="mb-6">
            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); const params = new URLSearchParams(searchParams); if (value === "all") { params.delete("tab"); } else { params.set("tab", value); } setSearchParams(params); }}>
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  All Games
                </TabsTrigger>
                <TabsTrigger value="live" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Live
                  <Badge variant="secondary" className="bg-live text-white">
                    {liveGames.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="today" className="flex items-center gap-2">
                  My Bets
                </TabsTrigger>
                <TabsTrigger value="popular" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Popular
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                {liveGames.length === 0 && upcomingGames.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-4">
                      No games available for the selected filters.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSport("all");
                        setSelectedLeague(undefined);
                        const params = new URLSearchParams(searchParams);
                        params.delete("sport");
                        params.delete("league");
                        setSearchParams(params);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {liveGames.length > 0 && (
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Zap className="h-5 w-5 text-live" />
                          Live Games
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                          {liveGames.map(game => (
                            <GameCard 
                              key={game.id} 
                              game={game} 
                              onBetSelect={handleBetSelect}
                              selectedKeys={selectedKeys}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Upcoming Games
                      </h2>
                      <div className="grid gap-4 md:grid-cols-2">
                        {upcomingGames.map(game => (
                          <GameCard 
                            key={game.id} 
                            game={game} 
                            onBetSelect={handleBetSelect}
                            selectedKeys={selectedKeys}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="live" className="mt-6">
                {liveGames.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground">No live games right now.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {liveGames.map(game => (
                      <GameCard 
                        key={game.id} 
                        game={game} 
                        onBetSelect={handleBetSelect}
                        selectedKeys={selectedKeys}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="today" className="mt-6">
                <MyBets />
              </TabsContent>

              <TabsContent value="popular" className="mt-6">
                {filteredGames.filter(game => game.popularBet).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-4">
                      No popular bets available for the selected filters.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSport("all");
                        setSelectedLeague(undefined);
                        const params = new URLSearchParams(searchParams);
                        params.delete("sport");
                        params.delete("league");
                        setSearchParams(params);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredGames.filter(game => game.popularBet).map(game => (
                      <GameCard 
                        key={game.id} 
                        game={game} 
                        onBetSelect={handleBetSelect}
                        selectedKeys={selectedKeys}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Right Sidebar - Bet Slip */}
        {betSelections.some((s) => s.isSelected) && (
          <BetSlip 
            className="hidden lg:block w-80 sticky top-16 m-4 ml-0 self-start"
            selections={betSelections}
            onRemoveSelection={handleRemoveSelection}
            onClearAll={handleClearAll}
          />
        )}
      </div>
      
      {/* Mobile Bet Slip */}
      <MobileBetSlip
        selections={betSelections}
        onRemoveSelection={handleRemoveSelection}
        onClearAll={handleClearAll}
      />
      
      <Footer />
    </div>
  );
};