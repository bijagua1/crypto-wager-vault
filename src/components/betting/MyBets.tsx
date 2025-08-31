import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Clock, TrendingUp, CheckCircle, XCircle, DollarSign, Bitcoin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BetSelection {
  id: string;
  game_id: string;
  league: string | null;
  market: string | null;
  selection: string;
  odds: number;
}

interface Bet {
  id: string;
  type: "single" | "parlay";
  status: string;
  stake_usd: number;
  stake_btc: number;
  potential_payout_usd: number;
  potential_payout_btc: number;
  created_at: string;
  bet_selections: BetSelection[];
}

export const MyBets = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("bets")
          .select(`
            *,
            bet_selections (*)
          `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBets(data || []);
      } catch (error: any) {
        toast({
          title: "Error loading bets",
          description: error.message,
          variant: "destructive" as any,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBets();
  }, [toast]);

  const formatCurrency = (amount: number, currency: "USD" | "BTC") => {
    if (currency === "BTC") {
      return `₿${amount.toFixed(6)}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-blue-500";
      case "won":
        return "bg-green-500";
      case "lost":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "won":
        return <CheckCircle className="h-4 w-4" />;
      case "lost":
        return <XCircle className="h-4 w-4" />;
      case "pending":
      case "approved":
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const pendingBets = bets.filter(bet => bet.status === "pending" || bet.status === "approved");
  const settledBets = bets.filter(bet => bet.status === "won" || bet.status === "lost");

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-muted-foreground">Loading your bets...</div>
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium text-foreground">No Bets Yet</h3>
          <p className="text-muted-foreground">Start betting to see your history here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">My Bets</h2>
        <div className="text-sm text-muted-foreground">
          {bets.length} total bet{bets.length !== 1 ? "s" : ""}
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingBets.length})
          </TabsTrigger>
          <TabsTrigger value="settled" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Settled ({settledBets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingBets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending bets
            </div>
          ) : (
            pendingBets.map((bet) => (
              <BetCard key={bet.id} bet={bet} formatCurrency={formatCurrency} formatOdds={formatOdds} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
            ))
          )}
        </TabsContent>

        <TabsContent value="settled" className="space-y-4 mt-6">
          {settledBets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No settled bets
            </div>
          ) : (
            settledBets.map((bet) => (
              <BetCard key={bet.id} bet={bet} formatCurrency={formatCurrency} formatOdds={formatOdds} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface BetCardProps {
  bet: Bet;
  formatCurrency: (amount: number, currency: "USD" | "BTC") => string;
  formatOdds: (odds: number) => string;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}

const BetCard = ({ bet, formatCurrency, formatOdds, getStatusColor, getStatusIcon }: BetCardProps) => {
  const currency = bet.stake_usd > 0 ? "USD" : "BTC";
  const stake = bet.stake_usd > 0 ? bet.stake_usd : bet.stake_btc;
  const payout = bet.potential_payout_usd > 0 ? bet.potential_payout_usd : bet.potential_payout_btc;

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={`text-white ${getStatusColor(bet.status)}`}>
            {getStatusIcon(bet.status)}
            <span className="ml-1 capitalize">{bet.status}</span>
          </Badge>
          <Badge variant="outline">{bet.type === "single" ? "Single" : "Parlay"}</Badge>
          <div className="text-sm text-muted-foreground">
            {new Date(bet.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Stake</div>
          <div className="font-medium">{formatCurrency(stake, currency)}</div>
        </div>
      </div>

      <Separator />

      {/* Selections */}
      <div className="space-y-2">
        {bet.bet_selections.map((selection, index) => (
          <div key={selection.id} className="flex items-center justify-between text-sm">
            <div className="flex-1">
              <div className="font-medium text-foreground capitalize">
                {selection.market} - {selection.selection}
              </div>
              <div className="text-muted-foreground text-xs">
                {selection.league} • Game ID: {selection.game_id}
              </div>
            </div>
            <div className="font-medium text-primary">
              {formatOdds(selection.odds)}
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground">Stake: </span>
            <span className="font-medium">{formatCurrency(stake, currency)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Potential Payout: </span>
            <span className="font-medium text-crypto-green">{formatCurrency(payout, currency)}</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(bet.created_at).toLocaleString()}
        </div>
      </div>
    </Card>
  );
};