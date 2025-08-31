import { Bitcoin } from "lucide-react";

export const CryptoBetsLogo = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
        <Bitcoin className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="text-xl font-bold tracking-tight">
        <span className="text-primary">CRYPTO</span>
        <span className="text-foreground">BETS</span>
      </div>
    </div>
  );
};