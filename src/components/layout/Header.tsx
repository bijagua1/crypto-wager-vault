import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, User, Wallet } from "lucide-react";
import { CryptoBetsLogo } from "./CryptoBetsLogo";
import { supabase } from "@/integrations/supabase/client";

export const Header = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [balanceUSD, setBalanceUSD] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(Boolean(session?.user));
      if (session?.user) {
        const userId = session.user.id;
        // Defer Supabase calls to avoid deadlocks
        setTimeout(async () => {
          const { data: balance } = await supabase
            .from('user_balances')
            .select('balance_usd')
            .eq('user_id', userId)
            .maybeSingle();
          setBalanceUSD(balance?.balance_usd ?? 0);

          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);
          setIsAdmin(!!roles?.some((r: any) => r.role === 'admin'));
        }, 0);
      } else {
        setBalanceUSD(0);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(Boolean(session?.user));
      if (session?.user) {
        const userId = session.user.id;
        setTimeout(async () => {
          const { data: balance } = await supabase
            .from('user_balances')
            .select('balance_usd')
            .eq('user_id', userId)
            .maybeSingle();
          setBalanceUSD(balance?.balance_usd ?? 0);

          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);
          setIsAdmin(!!roles?.some((r: any) => r.role === 'admin'));
        }, 0);
      }
    });


    const refreshBalance = async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const userId = sessionRes.session?.user?.id;
      if (!userId) return;
      const { data: balance } = await supabase
        .from('user_balances')
        .select('balance_usd')
        .eq('user_id', userId)
        .maybeSingle();
      setBalanceUSD(balance?.balance_usd ?? 0);
    };

    const onBalanceRefresh = () => { refreshBalance(); };
    window.addEventListener('balance:refresh', onBalanceRefresh);

    return () => { 
      subscription.unsubscribe();
      window.removeEventListener('balance:refresh', onBalanceRefresh);
    };
  }, []);
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left: Logo & Mobile Menu */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/">
            <CryptoBetsLogo />
          </Link>
        </div>

        {/* Center: Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-6">
          <Button variant="ghost" className="text-foreground hover:text-primary" onClick={() => navigate("/?tab=all")}>Sports</Button>
          <Button variant="ghost" className="text-foreground hover:text-primary" onClick={() => navigate("/?tab=live")}>Live Betting</Button>
          <Button variant="ghost" className="text-foreground hover:text-primary" onClick={() => navigate("/?tab=today")}>My Bets</Button>
          <Button variant="ghost" className="text-foreground hover:text-primary" onClick={() => navigate("/?tab=popular")}>Promotions</Button>
        </nav>

        {/* Right: User Actions */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {/* Balance Display */}
              <div className="hidden sm:flex items-center gap-2 bg-card px-3 py-2 rounded-lg border">
                <Wallet className="h-4 w-4 text-crypto-green" />
                <span className="text-sm font-medium text-foreground">${balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                  Admin
                </Button>
              )}
              {/* User Menu */}
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleLogout}>Log out</Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Login</Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => navigate("/auth?mode=signup")}>Sign Up</Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-border bg-card">
        <div className="container px-4 py-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate("/?tab=all")}>Sports</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/?tab=live")}>Live</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/?tab=today")}>My Bets</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/?tab=popular")}>Wallet</Button>
          </div>
        </div>
      </div>
    </header>
  );
};
