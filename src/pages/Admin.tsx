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

  // Balance tools
  const [emailQuery, setEmailQuery] = useState("");
  const [profile, setProfile] = useState<any | null>(null);
  const [amountUSD, setAmountUSD] = useState<number>(0);
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit");

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

      setLoading(false);
    };
    init();
  }, []);

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

  const processTransaction = async () => {
    if (!profile || amountUSD <= 0) return;
    
    const isDeposit = transactionType === "deposit";
    const newBalance = isDeposit 
      ? Number((profile.balance_usd + amountUSD).toFixed(2))
      : Math.max(0, Number((profile.balance_usd - amountUSD).toFixed(2)));
    
    const { error } = await supabase
      .from("profiles")
      .update({ balance_usd: newBalance })
      .eq("id", profile.id);
    
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" as any });
      return;
    }

    // Record the transaction
    await supabase.from("transactions").insert({
      user_id: profile.id,
      type: transactionType,
      amount_usd: isDeposit ? amountUSD : -amountUSD,
      amount_btc: 0,
      note: `Admin ${transactionType} - $${amountUSD.toFixed(2)}`,
    });

    toast({ 
      title: `${isDeposit ? "Deposit" : "Withdrawal"} processed`, 
      description: `${profile.email}: $${newBalance.toFixed(2)} (${isDeposit ? "+" : "-"}$${amountUSD.toFixed(2)})` 
    });
    
    setProfile({ ...profile, balance_usd: newBalance });
    setAmountUSD(0);
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
        <Card className="p-4 space-y-4">
          <h2 className="text-xl font-semibold mb-4">User Balance Management</h2>
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <Input placeholder="Search by email" value={emailQuery} onChange={(e) => setEmailQuery(e.target.value)} />
            <Button onClick={searchProfileByEmail}>Search</Button>
          </div>

          {profile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">User</div>
                  <div className="font-medium">{profile.display_name} ({profile.email})</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Balance</div>
                  <div className="font-semibold text-lg">${profile.balance_usd.toFixed(2)}</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button 
                    variant={transactionType === "deposit" ? "default" : "outline"}
                    onClick={() => setTransactionType("deposit")}
                  >
                    Deposit
                  </Button>
                  <Button 
                    variant={transactionType === "withdrawal" ? "default" : "outline"}
                    onClick={() => setTransactionType("withdrawal")}
                  >
                    Withdrawal
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    placeholder="Amount (USD)" 
                    value={amountUSD || ""} 
                    onChange={(e) => setAmountUSD(parseFloat(e.target.value) || 0)} 
                    className="w-40" 
                  />
                  <Button onClick={processTransaction} disabled={!amountUSD || amountUSD <= 0}>
                    Process {transactionType === "deposit" ? "Deposit" : "Withdrawal"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!profile && (
            <div className="text-center text-muted-foreground py-8">
              Search for a user by email to manage their balance
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
