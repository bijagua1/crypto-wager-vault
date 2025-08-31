// React import not needed as we avoid local state here
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  name: string;
  logo: string;
  record?: string;
}

interface GameOdds {
  moneyline: number;
  spread: { point: number; odds: number };
  total: { point: number; over: number; under: number };
}

interface Game {
  id: string;
  league: string;
  homeTeam: Team;
  awayTeam: Team;
  commenceTime: string;
  isLive: boolean;
  homeScore?: number;
  awayScore?: number;
  homeOdds: GameOdds;
  awayOdds: GameOdds;
  drawMoneyline?: number | null;
  popularBet?: string;
}

interface GameCardProps {
  game: Game;
  onBetSelect: (bet: any) => void;
  selectedKeys: Set<string>;
}

export const GameCard = ({ game, onBetSelect, selectedKeys }: GameCardProps) => {
  // Selection state is controlled by parent via selectedKeys

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

const handleBetClick = (betType: string, selection: string, odds: number) => {
  const betId = `${game.id}-${betType}-${selection}`;
  const currentlySelected = selectedKeys.has(betId);

  onBetSelect({
    gameId: game.id,
    game: `${game.awayTeam.name} @ ${game.homeTeam.name}`,
    betType,
    selection,
    odds,
    isSelected: !currentlySelected,
  });
};

const isBetSelected = (betType: string, selection: string) => {
  return selectedKeys.has(`${game.id}-${betType}-${selection}`);
};

  return (
    <Card className="p-4 space-y-4 hover:shadow-lg transition-shadow bg-card border-border">
      {/* Game Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {game.league}
          </Badge>
          {game.isLive && (
            <Badge className="bg-live text-white text-xs animate-pulse">
              🔴 LIVE
            </Badge>
          )}
          {game.popularBet && (
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Popular
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          {game.isLive ? "Live" : formatTime(game.commenceTime)}
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-3">
        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
              {game.awayTeam.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-foreground">{game.awayTeam.name}</div>
              {game.awayTeam.record && (
                <div className="text-xs text-muted-foreground">{game.awayTeam.record}</div>
              )}
            </div>
            {game.isLive && game.awayScore !== undefined && (
              <div className="text-lg font-bold text-foreground ml-auto mr-4">
                {game.awayScore}
              </div>
            )}
          </div>
          
          {/* Away Team Odds */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={isBetSelected("moneyline", "away") ? "default" : "outline"}
              className={cn(
                "text-xs px-2 py-1 h-8",
                isBetSelected("moneyline", "away") && "bg-primary text-primary-foreground"
              )}
              onClick={() => handleBetClick("moneyline", "away", game.awayOdds.moneyline)}
            >
              {formatOdds(game.awayOdds.moneyline)}
            </Button>
            <Button
              size="sm"
              variant={isBetSelected("spread", "away") ? "default" : "outline"}
              className={cn(
                "text-xs px-2 py-1 h-8",
                isBetSelected("spread", "away") && "bg-primary text-primary-foreground"
              )}
              onClick={() => handleBetClick("spread", "away", game.awayOdds.spread.odds)}
            >
              {game.awayOdds.spread.point > 0 ? "+" : ""}{game.awayOdds.spread.point}
            </Button>
            <Button
              size="sm"
              variant={isBetSelected("total", "over") ? "default" : "outline"}
              className={cn(
                "text-xs px-2 py-1 h-8",
                isBetSelected("total", "over") && "bg-primary text-primary-foreground"
              )}
              onClick={() => handleBetClick("total", "over", game.awayOdds.total.over)}
            >
              O {game.awayOdds.total.point}
            </Button>
          </div>
        </div>

        {/* VS Divider + Draw */}
        <div className="flex items-center justify-center gap-2">
          <div className="text-xs text-muted-foreground font-medium">VS</div>
          {typeof game.drawMoneyline === 'number' && game.drawMoneyline !== 0 && (
            <Button
              size="sm"
              variant={isBetSelected("moneyline", "draw") ? "default" : "outline"}
              className={cn(
                "text-xs px-2 py-1 h-8",
                isBetSelected("moneyline", "draw") && "bg-primary text-primary-foreground"
              )}
              onClick={() => handleBetClick("moneyline", "draw", game.drawMoneyline as number)}
              aria-label="Draw odds"
            >
              Draw {formatOdds(game.drawMoneyline as number)}
            </Button>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
              {game.homeTeam.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-foreground">{game.homeTeam.name}</div>
              {game.homeTeam.record && (
                <div className="text-xs text-muted-foreground">{game.homeTeam.record}</div>
              )}
            </div>
            {game.isLive && game.homeScore !== undefined && (
              <div className="text-lg font-bold text-foreground ml-auto mr-4">
                {game.homeScore}
              </div>
            )}
          </div>
          
          {/* Home Team Odds */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={isBetSelected("moneyline", "home") ? "default" : "outline"}
              className={cn(
                "text-xs px-2 py-1 h-8",
                isBetSelected("moneyline", "home") && "bg-primary text-primary-foreground"
              )}
              onClick={() => handleBetClick("moneyline", "home", game.homeOdds.moneyline)}
            >
              {formatOdds(game.homeOdds.moneyline)}
            </Button>
            <Button
              size="sm"
              variant={isBetSelected("spread", "home") ? "default" : "outline"}
              className={cn(
                "text-xs px-2 py-1 h-8",
                isBetSelected("spread", "home") && "bg-primary text-primary-foreground"
              )}
              onClick={() => handleBetClick("spread", "home", game.homeOdds.spread.odds)}
            >
              {game.homeOdds.spread.point > 0 ? "+" : ""}{game.homeOdds.spread.point}
            </Button>
            <Button
              size="sm"
              variant={isBetSelected("total", "under") ? "default" : "outline"}
              className={cn(
                "text-xs px-2 py-1 h-8",
                isBetSelected("total", "under") && "bg-primary text-primary-foreground"
              )}
              onClick={() => handleBetClick("total", "under", game.awayOdds.total.under)}
            >
              U {game.awayOdds.total.point}
            </Button>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      {game.popularBet && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <Users className="h-3 w-3 inline mr-1" />
          Most popular: {game.popularBet}
        </div>
      )}
    </Card>
  );
};