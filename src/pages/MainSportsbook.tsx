import { useEffect, useState } from "react";
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
import { useSearchParams } from "react-router-dom";

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
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const fetchOdds = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("odds-lines", {
        body: { sport: "basketball_nba", regions: "us", markets: "h2h,spreads,totals" },
      });
      if (!error && data?.games) {
        setGames(data.games);
      } else {
        console.error("odds-lines error", error || data);
      }
      setLoading(false);
    };
    fetchOdds();
  }, []);

  // Sync tab with URL ?tab=
  useEffect(() => {
    const tabParam = (searchParams.get("tab") || "all").toLowerCase();
    if (tabParam !== activeTab) setActiveTab(tabParam);
  }, [searchParams, activeTab]);

  const sourceGames = games.length ? games : sampleGames;

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

const liveGames = [...sourceGames.filter((game) => game.isLive)].sort(
  (a, b) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
);
const upcomingGames = [...sourceGames.filter((game) => !game.isLive)].sort(
  (a, b) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex">
        {/* Left Sidebar - Sports Navigation */}
        <SportsNav className="hidden lg:block w-64 h-[calc(100vh-4rem)] sticky top-16" />
        
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
            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); if (value === "all") setSearchParams({}); else setSearchParams({ tab: value }); }}>
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
                  Today
                </TabsTrigger>
                <TabsTrigger value="popular" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Popular
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
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
              </TabsContent>

              <TabsContent value="live" className="mt-6">
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
              </TabsContent>

              <TabsContent value="today" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {sourceGames.map(game => (
                    <GameCard 
                      key={game.id} 
                      game={game} 
                      onBetSelect={handleBetSelect}
                      selectedKeys={selectedKeys}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="popular" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {sourceGames.filter(game => game.popularBet).map(game => (
                    <GameCard 
                      key={game.id} 
                      game={game} 
                      onBetSelect={handleBetSelect}
                      selectedKeys={selectedKeys}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Right Sidebar - Bet Slip */}
        <BetSlip 
          className="hidden lg:block w-80 h-[calc(100vh-4rem)] sticky top-16 m-4 ml-0"
          selections={betSelections}
          onRemoveSelection={handleRemoveSelection}
          onClearAll={handleClearAll}
        />
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