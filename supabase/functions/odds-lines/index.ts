// Supabase Edge Function: odds-lines
// Fetches live odds from The Odds API securely and returns a simplified, UI-friendly format

// CORS headers (required)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Choose preferred bookmakers (first match used)
const PREFERRED_BOOKMAKERS = [
  "draftkings",
  "fanduel",
  "betmgm",
  "williamhill_us",
  "pointsbetus",
  "betfair",
];

// Helper to pick a bookmaker
function pickBookmaker(bookmakers: any[]) {
  if (!Array.isArray(bookmakers) || bookmakers.length === 0) return null;
  for (const pref of PREFERRED_BOOKMAKERS) {
    const match = bookmakers.find((b: any) => b.key === pref);
    if (match) return match;
  }
  return bookmakers[0];
}

// Map The Odds API event into our UI shape
function mapEventToGame(evt: any) {
  const bk = pickBookmaker(evt.bookmakers || []);
  const markets = bk?.markets || [];

  const h2h = markets.find((m: any) => m.key === "h2h");
  const spreads = markets.find((m: any) => m.key === "spreads");
  const totals = markets.find((m: any) => m.key === "totals");

  const homeML = h2h?.outcomes?.find((o: any) => o.name === evt.home_team)?.price ?? null;
  const awayML = h2h?.outcomes?.find((o: any) => o.name === evt.away_team)?.price ?? null;
  const drawOutcome = h2h?.outcomes?.find((o: any) => (o.name || "").toLowerCase() === "draw")
    || h2h?.outcomes?.find((o: any) => o.name !== evt.home_team && o.name !== evt.away_team);

  const homeSpreadOutcome = spreads?.outcomes?.find((o: any) => o.name === evt.home_team);
  const awaySpreadOutcome = spreads?.outcomes?.find((o: any) => o.name === evt.away_team);

  const overOutcome = totals?.outcomes?.find((o: any) => (o.name || "").toLowerCase() === "over");
  const underOutcome = totals?.outcomes?.find((o: any) => (o.name || "").toLowerCase() === "under");

  // Friendly league names for filters/UI
  const key = String(evt.sport_key || "");
  const leagueMap: Record<string, string> = {
    soccer_epl: "Premier League",
    soccer_spain_la_liga: "La Liga",
    soccer_uefa_champs_league: "Champions League",
    soccer_usa_mls: "MLS",
    basketball_nba: "NBA",
    americanfootball_nfl: "NFL",
    baseball_mlb: "MLB",
    tennis_atp_singles: "ATP"
  };
  const leagueFriendly = leagueMap[key] || (evt.sport_title || key || "Sports");

  return {
    id: String(evt.id),
    league: leagueFriendly,
    homeTeam: { name: evt.home_team, logo: "", record: "" },
    awayTeam: { name: evt.away_team, logo: "", record: "" },
    commenceTime: evt.commence_time,
    isLive: Boolean(evt.inplay || false),
    drawMoneyline: Number.isFinite(drawOutcome?.price) ? Math.trunc(drawOutcome.price) : null,
    homeOdds: {
      moneyline: Number.isFinite(homeML) ? Math.trunc(homeML) : 0,
      spread: {
        point: Number.isFinite(homeSpreadOutcome?.point) ? homeSpreadOutcome.point : 0,
        odds: Number.isFinite(homeSpreadOutcome?.price) ? Math.trunc(homeSpreadOutcome.price) : 0,
      },
      total: {
        point: Number.isFinite(overOutcome?.point) ? overOutcome.point : (Number.isFinite(underOutcome?.point) ? underOutcome.point : 0),
        over: Number.isFinite(overOutcome?.price) ? Math.trunc(overOutcome.price) : 0,
        under: Number.isFinite(underOutcome?.price) ? Math.trunc(underOutcome.price) : 0,
      },
    },
    awayOdds: {
      moneyline: Number.isFinite(awayML) ? Math.trunc(awayML) : 0,
      spread: {
        point: Number.isFinite(awaySpreadOutcome?.point) ? awaySpreadOutcome.point : 0,
        odds: Number.isFinite(awaySpreadOutcome?.price) ? Math.trunc(awaySpreadOutcome.price) : 0,
      },
      total: {
        point: Number.isFinite(overOutcome?.point) ? overOutcome.point : (Number.isFinite(underOutcome?.point) ? underOutcome.point : 0),
        over: Number.isFinite(overOutcome?.price) ? Math.trunc(overOutcome.price) : 0,
        under: Number.isFinite(underOutcome?.price) ? Math.trunc(underOutcome.price) : 0,
      },
    },
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Edge function started");
    
    const apiKey = Deno.env.get("ODDS_API_KEY");
    console.log("API key exists:", !!apiKey);
    
    if (!apiKey) {
      console.log("ERROR: Missing ODDS_API_KEY");
      return new Response(JSON.stringify({ error: "Missing ODDS_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sport = "basketball_nba", regions = "us", markets = "h2h,spreads,totals" } = await req.json().catch(() => ({}));
    console.log("Request params:", { sport, regions, markets });

    const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds/`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("regions", String(regions));
    url.searchParams.set("markets", String(markets));
    url.searchParams.set("oddsFormat", "american");
    url.searchParams.set("dateFormat", "iso");

    console.log("Fetching from URL:", url.toString().replace(apiKey, "***"));
    
    const resp = await fetch(url.toString());
    console.log("API response status:", resp.status);
    
    if (!resp.ok) {
      const txt = await resp.text();
      console.log("API error response:", txt);
      return new Response(JSON.stringify({ error: "Upstream error", details: txt }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    console.log("API response data length:", Array.isArray(data) ? data.length : "not array");
    
    const games = Array.isArray(data) ? data.map(mapEventToGame) : [];
    console.log("Processed games count:", games.length);

    return new Response(JSON.stringify({ games, count: games.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
