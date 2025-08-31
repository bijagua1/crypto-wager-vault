import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Clock, 
  Target,
  Zap,
  Calendar,
  ChevronDown,
  ChevronRight,
  Gamepad2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface SportCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  liveGames: number;
  todayGames: number;
  leagues?: string[];
}

const sportsData: SportCategory[] = [
  {
    id: "soccer",
    name: "Soccer",
    icon: Gamepad2,
    liveGames: 8,
    todayGames: 24,
    leagues: ["Premier League", "La Liga", "Champions League", "MLS"]
  },
  {
    id: "basketball", 
    name: "Basketball",
    icon: Trophy,
    liveGames: 3,
    todayGames: 12,
    leagues: ["NBA", "NCAA", "EuroLeague"]
  },
  {
    id: "football",
    name: "American Football", 
    icon: Target,
    liveGames: 0,
    todayGames: 6,
    leagues: ["NFL", "NCAA Football"]
  },
  {
    id: "baseball",
    name: "Baseball",
    icon: Calendar,
    liveGames: 5,
    todayGames: 15,
    leagues: ["MLB", "College Baseball"]
  },
  {
    id: "tennis",
    name: "Tennis",
    icon: Zap,
    liveGames: 12,
    todayGames: 28,
    leagues: ["ATP", "WTA", "Grand Slams"]
  }
];

interface SportsNavProps {
  className?: string;
  selectedSport?: string;
  selectedLeague?: string;
  onSportSelect?: (sport: string) => void;
  onLeagueSelect?: (league: string) => void;
}

export const SportsNav = ({ 
  className, 
  selectedSport = "soccer", 
  selectedLeague,
  onSportSelect,
  onLeagueSelect 
}: SportsNavProps) => {
  const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set([selectedSport]));

  const toggleExpanded = (sportId: string) => {
    const newExpanded = new Set(expandedSports);
    if (newExpanded.has(sportId)) {
      newExpanded.delete(sportId);
    } else {
      newExpanded.add(sportId);
    }
    setExpandedSports(newExpanded);
  };

  return (
    <nav className={cn("bg-card border-r border-border p-4 space-y-2", className)}>
      {/* Quick Actions */}
      <div className="space-y-2 mb-6">
        <Button 
          asChild
          variant="secondary" 
          className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20"
        >
          <Link to="/?tab=live">
            <Zap className="h-4 w-4" />
            Live Betting
            <Badge variant="secondary" className="ml-auto bg-live text-white">
              28
            </Badge>
          </Link>
        </Button>
        
        <Button asChild variant="ghost" className="w-full justify-start gap-2">
          <Link to="/?tab=all">
            <Clock className="h-4 w-4" />
            Today's Games
            <Badge variant="secondary" className="ml-auto">
              85
            </Badge>
          </Link>
        </Button>
      </div>

      {/* Sports Categories */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-2">
          Sports
        </h3>
        
        {sportsData.map((sport) => {
          const Icon = sport.icon;
          const isExpanded = expandedSports.has(sport.id);
          const isSelected = selectedSport === sport.id;
          
          return (
            <div key={sport.id} className="space-y-1">
              {/* Main Sport Button */}
              <Button
                variant={isSelected ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 h-auto py-2",
                  isSelected && "bg-primary/10 text-primary border-primary/20"
                )}
                onClick={() => {
                  onSportSelect?.(sport.id);
                  toggleExpanded(sport.id);
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{sport.name}</span>
                
                <div className="flex items-center gap-1">
                  {sport.liveGames > 0 && (
                    <Badge variant="secondary" className="bg-live text-white text-xs px-1">
                      {sport.liveGames}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </div>
              </Button>

              {/* Leagues Submenu */}
              {isExpanded && sport.leagues && (
                <div className="ml-6 space-y-1">
                  {sport.leagues.map((league) => (
                    <Button
                      key={league}
                      variant={selectedLeague === league ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start text-sm",
                        selectedLeague === league 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => {
                        onSportSelect?.(sport.id);
                        onLeagueSelect?.(league);
                      }}
                    >
                      {league}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Stats */}
      <div className="mt-8 pt-4 border-t border-border">
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">
            Join 1000+ Crypto Bettors
          </div>
          <div className="text-xs font-medium text-crypto-green">
            ₿ $2M+ Wagered This Month
          </div>
        </div>
      </div>
    </nav>
  );
};