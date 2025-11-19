"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/modules/auth/lib/auth-client";
import { Menu } from "lucide-react";
import Link from "next/link";

export const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const isMobile = useIsMobile();
  const { data: session } = authClient.useSession()

  return (
    <header className="flex items-center justify-between py-4 px-6 border-b">
      <div className="flex items-center gap-2">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="mr-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="font-semibold text-lg">Workflow</span>
      </div>

      <div className="flex items-center gap-4">
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-2 pl-4 border-l">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {  session?.user.name?.split(' ').map(name => name[0]).join('').toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
