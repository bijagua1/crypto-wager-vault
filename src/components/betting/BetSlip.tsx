import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, TrendingUp, Bitcoin, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
interface BetSelection {
  gameId: string;
  game: string;
  betType: string;
  selection: string;
  odds: number;
  isSelected: boolean;
}

interface BetSlipProps {
  selections: BetSelection[];
  onRemoveSelection: (gameId: string, betType: string, selection: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const BetSlip = ({ selections, onRemoveSelection, onClearAll, className }: BetSlipProps) => {
  const [betType, setBetType] = useState<"single" | "parlay">("single");
  const [stakes, setStakes] = useState<Record<string, number>>({});
  const [parlayStake, setParlayStake] = useState<number>(0);
  const [currency, setCurrency] = useState<"USD" | "BTC">("USD");
  const { toast } = useToast();
  const [isPlacing, setIsPlacing] = useState(false);

  const quickStakes = [10, 25, 50, 100, 250, 500];
  
  const activeSelections = selections.filter(sel => sel.isSelected);

  // Convert American odds to decimal
  const toDecimal = (americanOdds: number) => {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  };

  // Calculate potential payout for single bet
  const calculateSinglePayout = (odds: number, stake: number) => {
    if (stake === 0) return 0;
    const decimal = toDecimal(odds);
    return stake * decimal;
  };

  // Calculate parlay odds and payout
  const calculateParlayPayout = () => {
    if (activeSelections.length < 2 || parlayStake === 0) return 0;
    const combinedDecimal = activeSelections.reduce((acc, sel) => {
      return acc * toDecimal(sel.odds);
    }, 1);
    return parlayStake * combinedDecimal;
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const formatCurrency = (amount: number) => {
    if (currency === "BTC") {
      return `₿${(amount / 45000).toFixed(6)}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const setQuickStake = (amount: number, selectionKey?: string) => {
    if (betType === "parlay") {
      setParlayStake(amount);
    } else if (selectionKey) {
      setStakes(prev => ({ ...prev, [selectionKey]: amount }));
    }
  };

  // Auto-switch to parlay if multiple selections
  useEffect(() => {
    if (activeSelections.length >= 2 && betType === "single") {
      setBetType("parlay");
    } else if (activeSelections.length < 2 && betType === "parlay") {
      setBetType("single");
    }
  }, [activeSelections.length, betType]);

  const handlePlaceBet = async () => {
    try {
      setIsPlacing(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        toast({ title: "Please log in", description: "You must be logged in to place a bet." });
        return;
      }

      if (betType === 'single') {
        const singles = activeSelections.map(sel => {
          const key = `${sel.gameId}-${sel.betType}-${sel.selection}`;
          const stake = stakes[key] || 0;
          return { sel, stake };
        }).filter(s => s.stake > 0);
        
        if (singles.length === 0) {
          toast({ title: "No stakes entered", description: "Please enter a stake amount for your bets." });
          return;
        }

        // Place each single bet using the database function
        for (const { sel, stake } of singles) {
          const payout = calculateSinglePayout(sel.odds, stake);
          const selections = [{
            game_id: sel.gameId,
            selection: sel.selection,
            odds: sel.odds,
            league: sel.game,
            market: sel.betType
          }];

          const { error } = await supabase.rpc('place_bet', {
            p_user_id: userId,
            p_bet_type: 'single',
            p_stake_usd: currency === 'USD' ? stake : 0,
            p_stake_btc: currency === 'BTC' ? stake : 0,
            p_potential_payout_usd: currency === 'USD' ? Number(payout.toFixed(2)) : 0,
            p_potential_payout_btc: currency === 'BTC' ? Number(payout.toFixed(8)) : 0,
            p_selections: JSON.stringify(selections)
          });

          if (error) throw error;
        }

        toast({ 
          title: "Bets placed successfully!", 
          description: `${singles.length} single bet(s) placed and balance updated.` 
        });

      } else {
        // Parlay bet
        if (parlayStake <= 0) {
          toast({ title: "No stake entered", description: "Please enter a stake amount for your parlay bet." });
          return;
        }

        const payout = calculateParlayPayout();
        const selections = activeSelections.map(sel => ({
          game_id: sel.gameId,
          selection: sel.selection,
          odds: sel.odds,
          league: sel.game,
          market: sel.betType
        }));

        const { error } = await supabase.rpc('place_bet', {
          p_user_id: userId,
          p_bet_type: 'parlay',
          p_stake_usd: currency === 'USD' ? parlayStake : 0,
          p_stake_btc: currency === 'BTC' ? parlayStake : 0,
          p_potential_payout_usd: currency === 'USD' ? Number(payout.toFixed(2)) : 0,
          p_potential_payout_btc: currency === 'BTC' ? Number(payout.toFixed(8)) : 0,
          p_selections: JSON.stringify(selections)
        });

        if (error) throw error;

        toast({ 
          title: "Parlay bet placed successfully!", 
          description: `Your ${activeSelections.length}-leg parlay has been accepted and balance updated.` 
        });
      }
      
      setStakes({});
      setParlayStake(0);
      onClearAll();
    } catch (e: any) {
      let errorMessage = "Please try again.";
      
      if (e.message?.includes('Insufficient')) {
        errorMessage = e.message;
      } else if (e.message?.includes('User profile not found')) {
        errorMessage = "User profile not found. Please contact support.";
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      toast({ 
        title: "Bet failed", 
        description: errorMessage, 
        variant: "destructive" as any 
      });
    } finally {
      setIsPlacing(false);
    }
  };

  if (activeSelections.length === 0) {
    return (
      <Card className={cn("p-6 bg-card border-border", className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Your Bet Slip is Empty</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Click on odds to add them to your bet slip
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card border-border", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Bet Slip</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {activeSelections.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Currency Toggle */}
        <div className="flex items-center gap-1 mt-3">
          <Button
            variant={currency === "USD" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrency("USD")}
            className="flex-1"
          >
            <DollarSign className="h-3 w-3 mr-1" />
            USD
          </Button>
          <Button
            variant={currency === "BTC" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrency("BTC")}
            className="flex-1"
          >
            <Bitcoin className="h-3 w-3 mr-1" />
            BTC
          </Button>
        </div>
      </div>

      {/* Bet Type Tabs */}
      <Tabs value={betType} onValueChange={(value) => setBetType(value as "single" | "parlay")}>
        <div className="p-4 pb-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="single" 
              disabled={activeSelections.length > 1}
              className="disabled:opacity-50"
            >
              Single Bets
            </TabsTrigger>
            <TabsTrigger 
              value="parlay"
              disabled={activeSelections.length < 2}
              className="disabled:opacity-50"
            >
              Parlay
              {activeSelections.length >= 2 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {activeSelections.length}x
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Single Bets */}
        <TabsContent value="single" className="p-4 pt-2 space-y-3">
          {activeSelections.map((selection, index) => {
            const selectionKey = `${selection.gameId}-${selection.betType}-${selection.selection}`;
            const stake = stakes[selectionKey] || 0;
            const payout = calculateSinglePayout(selection.odds, stake);

            return (
              <div key={selectionKey} className="border border-border rounded-lg p-3 space-y-3">
                {/* Selection Info */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {selection.game}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {selection.betType} - {selection.selection}
                    </div>
                    <div className="text-sm font-medium text-primary mt-1">
                      {formatOdds(selection.odds)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveSelection(selection.gameId, selection.betType, selection.selection)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Stake Input */}
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {quickStakes.map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        className="text-xs flex-1"
                        onClick={() => setQuickStake(amount, selectionKey)}
                      >
                        {formatCurrency(amount)}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    placeholder="Enter stake"
                    value={stake || ""}
                    onChange={(e) => setStakes(prev => ({ 
                      ...prev, 
                      [selectionKey]: parseFloat(e.target.value) || 0 
                    }))}
                    className="text-center"
                  />
                </div>

                {/* Payout */}
                {stake > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Potential Payout:</span>
                    <span className="font-medium text-crypto-green">
                      {formatCurrency(payout)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* Parlay */}
        <TabsContent value="parlay" className="p-4 pt-2 space-y-3">
          {activeSelections.length >= 2 && (
            <div className="border border-border rounded-lg p-3 space-y-3">
              {/* Selections List */}
              <div className="space-y-2">
                {activeSelections.map((selection, index) => (
                  <div key={`${selection.gameId}-${selection.betType}-${selection.selection}`} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{selection.game}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {selection.betType} - {selection.selection}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-medium">{formatOdds(selection.odds)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveSelection(selection.gameId, selection.betType, selection.selection)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Combined Odds */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Combined Odds:</span>
                <span className="font-bold text-primary">
                  {formatOdds(
                    Math.round((activeSelections.reduce((acc, sel) => acc * toDecimal(sel.odds), 1) - 1) * 100)
                  )}
                </span>
              </div>

              {/* Stake Input */}
              <div className="space-y-2">
                <div className="flex gap-1">
                  {quickStakes.map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => setQuickStake(amount)}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Enter parlay stake"
                  value={parlayStake || ""}
                  onChange={(e) => setParlayStake(parseFloat(e.target.value) || 0)}
                  className="text-center"
                />
              </div>

              {/* Payout */}
              {parlayStake > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">Potential Payout:</span>
                  <span className="font-bold text-crypto-green text-lg">
                    {formatCurrency(calculateParlayPayout())}
                  </span>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Place Bet Button */}
      <div className="p-4 border-t border-border">
        <Button 
          className="w-full bg-primary hover:bg-primary/90" 
          size="lg"
          onClick={handlePlaceBet}
          disabled={
            isPlacing ||
            (betType === "single" && Object.values(stakes).every(stake => stake === 0)) ||
            (betType === "parlay" && (parlayStake === 0 || activeSelections.length < 2))
          }
        >
          {isPlacing ? "Placing..." : "Place Bet"}
          {betType === "parlay" && parlayStake > 0 && (
            <span className="ml-2">
              {formatCurrency(parlayStake)}
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
};