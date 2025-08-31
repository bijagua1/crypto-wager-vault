import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BetRow {
  id: string;
  user_id: string;
  type: "single" | "parlay";
  status: string;
  stake_usd: number;
  stake_btc: number;
  potential_payout_usd: number;
  potential_payout_btc: number;
  created_at: string;
}

interface BetSelectionRow {
  id: string;
  bet_id: string;
  game_id: string;
  league: string | null;
  market: string | null;
  selection: string;
  odds: number;
}

const Admin = () => {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Bets state
  const [bets, setBets] = useState<BetRow[]>([]);
  const [legs, setLegs] = useState<Record<string, BetSelectionRow[]>>({});

  // Balance tools
  const [emailQuery, setEmailQuery] = useState("");
  const [profile, setProfile] = useState<any | null>(null);
  const [amountUSD, setAmountUSD] = useState<number>(0);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);

      const admin = !!roles?.some((r: any) => r.role === "admin");
      setIsAdmin(admin);

      if (!admin) {
        setLoading(false);
        return;
      }

      await fetchPendingBets();
      setLoading(false);
    };
    init();
  }, []);

  const fetchPendingBets = async () => {
    const { data: betRows, error } = await supabase
      .from("bets")
      .select("id, user_id, type, status, stake_usd, stake_btc, potential_payout_usd, potential_payout_btc, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load bets", description: error.message, variant: "destructive" as any });
      return;
    }
    setBets(betRows || []);

    const betIds = (betRows || []).map(b => b.id);
    if (betIds.length) {
      const { data: legRows, error: legsErr } = await supabase
        .from("bet_selections")
        .select("id, bet_id, game_id, league, market, selection, odds")
        .in("bet_id", betIds);
      if (!legsErr) {
        const grouped: Record<string, BetSelectionRow[]> = {};
        (legRows || []).forEach((l) => {
          grouped[l.bet_id] = grouped[l.bet_id] || [];
          grouped[l.bet_id].push(l as any);
        });
        setLegs(grouped);
      }
    } else {
      setLegs({});
    }
  };

  const approveBet = async (betId: string, approve: boolean) => {
    const { error } = await supabase
      .from("bets")
      .update({ status: approve ? "approved" : "rejected" })
      .eq("id", betId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" as any });
    } else {
      toast({ title: approve ? "Bet approved" : "Bet rejected" });
      await fetchPendingBets();
    }
  };

  const searchProfileByEmail = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, balance_usd, balance_btc")
      .ilike("email", emailQuery.trim());
    if (error) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" as any });
      return;
    }
    setProfile((data || [])[0] || null);
  };

  const adjustBalance = async (sign: 1 | -1) => {
    if (!profile) return;
    const newBalance = Math.max(0, Number((profile.balance_usd + sign * amountUSD).toFixed(2)));
    const { error } = await supabase
      .from("profiles")
      .update({ balance_usd: newBalance })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" as any });
    } else {
      toast({ title: "Balance updated", description: `${profile.email}: $${newBalance.toFixed(2)}` });
      setProfile({ ...profile, balance_usd: newBalance });
      setAmountUSD(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background"><Header /><main className="container p-6">Loading...</main><Footer /></div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container p-6">
          <Card className="p-6">
            <h1 className="text-xl font-semibold mb-2">Unauthorized</h1>
            <p className="text-muted-foreground">You must be an admin to access this page.</p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container p-4 lg:p-6">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <Tabs defaultValue="bets">
          <TabsList>
            <TabsTrigger value="bets">Pending Bets</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
          </TabsList>

          <TabsContent value="bets" className="mt-4 space-y-3">
            {(bets || []).map((bet) => (
              <Card key={bet.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Bet ID: {bet.id}</div>
                    <div className="text-sm">User: {bet.user_id}</div>
                    <div className="text-sm">Type: <Badge variant="secondary" className="capitalize">{bet.type}</Badge></div>
                    <div className="text-sm">
                      Stake: {bet.stake_usd > 0 ? `$${bet.stake_usd.toFixed(2)}` : `₿${bet.stake_btc}`}
                      {" "}→ Potential: {bet.potential_payout_usd > 0 ? `$${bet.potential_payout_usd.toFixed(2)}` : `₿${bet.potential_payout_btc}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => approveBet(bet.id, false)}>Reject</Button>
                    <Button onClick={() => approveBet(bet.id, true)}>Approve</Button>
                  </div>
                </div>

                <Separator className="my-3" />
                <div className="space-y-2">
                  {(legs[bet.id] || []).map((l) => (
                    <div key={l.id} className="text-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium">{l.league || "Game"}</div>
                        <div className="text-muted-foreground">{l.market} - {l.selection}</div>
                      </div>
                      <div className="font-semibold">{l.odds > 0 ? `+${l.odds}` : l.odds}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            {bets.length === 0 && <Card className="p-6 text-center text-muted-foreground">No pending bets.</Card>}
          </TabsContent>

          <TabsContent value="balances" className="mt-4">
            <Card className="p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-2">
                <Input placeholder="Search by email" value={emailQuery} onChange={(e) => setEmailQuery(e.target.value)} />
                <Button onClick={searchProfileByEmail}>Search</Button>
              </div>

              {profile && (
                <div className="space-y-2">
                  <div className="text-sm">User: <span className="font-medium">{profile.display_name} ({profile.email})</span></div>
                  <div className="text-sm">Balance USD: <span className="font-semibold">${profile.balance_usd.toFixed(2)}</span></div>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Amount (USD)" value={amountUSD || ""} onChange={(e) => setAmountUSD(parseFloat(e.target.value) || 0)} className="w-40" />
                    <Button variant="outline" onClick={() => adjustBalance(-1)}>Subtract</Button>
                    <Button onClick={() => adjustBalance(1)}>Add</Button>
                  </div>
                </div>
              )}

              {!profile && (
                <div className="text-sm text-muted-foreground">Search a user by email to view and update balance.</div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
