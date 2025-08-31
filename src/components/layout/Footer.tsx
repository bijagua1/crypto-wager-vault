import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CryptoBetsLogo } from "./CryptoBetsLogo";
import { Link } from "react-router-dom";
import { 
  Twitter, 
  MessageCircle, 
  Mail, 
  Shield, 
  FileText, 
  HelpCircle,
  Github,
  Bitcoin
} from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Description */}
          <div className="space-y-4">
            <CryptoBetsLogo />
            <p className="text-sm text-muted-foreground">
              The world's premier crypto sportsbook. Bet smart, win crypto, and join thousands of successful bettors.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Bitcoin className="h-4 w-4 text-crypto-gold" />
              <span className="text-muted-foreground">Licensed & Regulated</span>
            </div>
          </div>

          {/* Sports */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Sports</h3>
            <div className="space-y-2">
              <Button asChild variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                <Link to="/?tab=all&sport=soccer">Soccer Betting</Link>
              </Button>
              <Button asChild variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                <Link to="/?tab=all&sport=basketball">Basketball Betting</Link>
              </Button>
              <Button asChild variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                <Link to="/?tab=all&sport=football">NFL Betting</Link>
              </Button>
              <Button asChild variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                <Link to="/?tab=all&sport=baseball">Baseball Betting</Link>
              </Button>
              <Button asChild variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                <Link to="/?tab=all&sport=tennis">Tennis Betting</Link>
              </Button>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Support</h3>
            <div className="space-y-2">
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <HelpCircle className="h-3 w-3" />
                Help Center
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <MessageCircle className="h-3 w-3" />
                Live Chat
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <Mail className="h-3 w-3" />
                Contact Us
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <Shield className="h-3 w-3" />
                Responsible Gaming
              </Button>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <div className="space-y-2">
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Terms of Service
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Privacy Policy
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Cookie Policy
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Compliance
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © 2024 CryptoBets.com. All rights reserved.
          </div>
          
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Twitter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Github className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Responsible Gaming Notice */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            <Shield className="h-3 w-3 inline mr-1" />
            Gambling can be addictive. Please bet responsibly. If you or someone you know has a gambling problem, 
            seek help from organizations like the National Council on Problem Gambling.
          </p>
        </div>
      </div>
    </footer>
  );
};