"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/modules/auth/lib/auth-client";
import { Home, Server, Settings, Workflow, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export const SideBar = ({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  const { data: session } = authClient.useSession()

  console.log({ session });

  const [activeItem, setActiveItem] = useState("overview");
  const isMobile = useIsMobile();

  const menuItems = [
    { id: "overview", icon: Home, label: "Overview" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const sections = [
    {
      items: [
        { id: "workflows", icon: Workflow, label: "Workflows" },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    setActiveItem(id);
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Don't render on mobile when closed
  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        w-[250px] min-h-[calc(100vh-5rem)] border-r py-6 bg-background
        ${isMobile ? "fixed left-0 top-[73px] z-50 h-[calc(100vh-73px)]" : ""}
      `}
      >
        {isMobile && (
          <div className="px-4 mb-4">
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{session?.user.name}</span>
            <Link href="/settings" className="ml-auto text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
            </Link>
          </div>
          <div className="text-xs text-muted-foreground">
            Free Plan •  {session?.user.email}
          </div>
        </div>

        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              href={`/${item.id === "overview" ? "" : item.id}`}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                activeItem === item.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}

          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="pt-4">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/${item.id}`}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeItem === item.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};
