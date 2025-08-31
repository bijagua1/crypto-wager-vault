import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BetSlip } from "@/components/betting/BetSlip";
import { TrendingUp } from "lucide-react";

interface BetSelection {
  gameId: string;
  game: string;
  betType: string;
  selection: string;
  odds: number;
  isSelected: boolean;
}

interface MobileBetSlipProps {
  selections: BetSelection[];
  onRemoveSelection: (gameId: string, betType: string, selection: string) => void;
  onClearAll: () => void;
}

export const MobileBetSlip = ({ selections, onRemoveSelection, onClearAll }: MobileBetSlipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const activeSelections = selections.filter(sel => sel.isSelected);

  if (activeSelections.length === 0) {
    return null;
  }

  return (
    <div className="lg:hidden">
      {/* Mobile Bet Slip Trigger */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="w-full bg-primary hover:bg-primary/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Bet Slip</span>
              </div>
              <Badge variant="secondary" className="bg-background text-foreground">
                {activeSelections.length}
              </Badge>
            </Button>
          </SheetTrigger>
          
          <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Your Bet Slip</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <BetSlip
                selections={selections}
                onRemoveSelection={onRemoveSelection}
                onClearAll={onClearAll}
                className="border-0 shadow-none"
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};