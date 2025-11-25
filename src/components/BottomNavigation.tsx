import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, Megaphone, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { path: "/dashboard/business", label: "Dashboard", icon: LayoutDashboard },
  { path: "/business/calendar", label: "Calendário", icon: Calendar },
  { path: "/business/marketing", label: "Marketing", icon: Megaphone },
  { path: "/business/settings", label: "Configurações", icon: Settings },
];

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Só mostra em dispositivos móveis
  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 mb-1 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
