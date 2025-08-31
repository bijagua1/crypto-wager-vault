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

  const homeSpreadOutcome = spreads?.outcomes?.find((o: any) => o.name === evt.home_team);
  const awaySpreadOutcome = spreads?.outcomes?.find((o: any) => o.name === evt.away_team);

  const overOutcome = totals?.outcomes?.find((o: any) => (o.name || "").toLowerCase() === "over");
  const underOutcome = totals?.outcomes?.find((o: any) => (o.name || "").toLowerCase() === "under");

  return {
    id: String(evt.id),
    league: evt.sport_title || evt.sport_key || "Sports",
    homeTeam: { name: evt.home_team, logo: "", record: "" },
    awayTeam: { name: evt.away_team, logo: "", record: "" },
    commenceTime: evt.commence_time,
    isLive: Boolean(evt.inplay || false),
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
    const apiKey = Deno.env.get("ODDS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing ODDS_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sport = "basketball_nba", regions = "us", markets = "h2h,spreads,totals" } = await req.json().catch(() => ({}));

    const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds/`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("regions", String(regions));
    url.searchParams.set("markets", String(markets));
    url.searchParams.set("oddsFormat", "american");
    url.searchParams.set("dateFormat", "iso");

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: "Upstream error", details: txt }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const games = Array.isArray(data) ? data.map(mapEventToGame) : [];

    return new Response(JSON.stringify({ games, count: games.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
