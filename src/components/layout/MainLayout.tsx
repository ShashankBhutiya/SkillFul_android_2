import { Link, useLocation } from "react-router-dom";
import { 
  Compass, 
  Trophy, 
  User, 
  Zap,
  Sparkles
} from "lucide-react";
import ProfileBadge from "@/components/ProfileBadge";
import ThemeToggle from "@/components/ThemeToggle";
import { PwaInstallPrompt } from "@/components/layout/PwaInstallPrompt";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface MainLayoutProps {
  children: React.ReactNode;
}

const TAB_ITEMS = [
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, pattern: /^\/leaderboard/ },
  { to: "/skills", label: "Explore", icon: Compass, pattern: /^\/skills/, center: true },
  { to: "/profile", label: "Profile", icon: User, pattern: /^\/(profile|info|streak|about|contact|privacy|terms|blog|refer|premium)/ },
];

const DESKTOP_NAV_ITEMS = [
  { to: "/skills", label: "Explore", icon: Compass, pattern: /^\/(skills|categories|$)/ },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, pattern: /^\/leaderboard/ },
  { to: "/streak", label: "Streak", icon: Zap, pattern: /^\/streak/ },
  { to: "/premium", label: "Premium", icon: Sparkles, pattern: /^\/premium/, badge: "PRO" },
];

interface BottomTabBarProps {
  pathname: string;
  className?: string;
}

// Keep these components at module scope. Defining them inside MainLayout would
// give them a new identity on every layout update and reset stateful children
// such as ProfileBadge (including any modal it currently has open).
const BottomTabBar = ({ pathname, className = "fixed" }: BottomTabBarProps) => (
  <nav aria-label="Mobile Navigation" className={`${className} bottom-0 left-0 right-0 min-h-16 bg-background/95 backdrop-blur-xl border-t border-border flex items-end justify-around px-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] z-40 safe-bottom shrink-0`}>
    {TAB_ITEMS.map((tab) => {
      const isActive = tab.pattern.test(pathname) || (tab.to === "/skills" && pathname === "/");
      const Icon = tab.icon;

      if (tab.center) {
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? "page" : undefined}
            className="relative -mt-4 flex flex-1 flex-col items-center justify-end gap-1 pb-1.5 text-center group"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all duration-150 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-primary/30"
                  : "bg-primary/90 text-primary-foreground group-hover:bg-primary group-hover:shadow-primary/25"
              }`}
            >
              <Icon strokeWidth={2.25} className="h-5 w-5" />
            </div>
            <span
              className={`text-[10px] leading-none tracking-tight transition-colors duration-150 ${
                isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-foreground"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      }

      return (
        <Link
          key={tab.to}
          to={tab.to}
          aria-current={isActive ? "page" : undefined}
          className="relative flex flex-col items-center justify-center flex-1 gap-1 py-2 text-center group"
        >
          {isActive && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}

          <Icon
            strokeWidth={isActive ? 2.25 : 1.75}
            className={`h-5 w-5 transition-colors duration-150 ${
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            }`}
          />
          <span
            className={`text-[10px] leading-none tracking-tight transition-colors duration-150 ${
              isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-foreground"
            }`}
          >
            {tab.label}
          </span>
        </Link>
      );
    })}
  </nav>
);

interface AppHeaderProps {
  pathname: string;
  extraClass?: string;
}

const AppHeader = ({ pathname, extraClass = "" }: AppHeaderProps) => (
  <header className={`sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl shrink-0 safe-top ${extraClass}`}>
    <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Brand & Desktop Navigation */}
      <div className="flex items-center gap-6 lg:gap-8">
        <Link to="/skills" className="flex items-center gap-2.5 group shrink-0">
          <img
            src="/favicon.png"
            alt="Skillful"
            className="h-7 w-7 rounded-md object-cover shadow-sm transition-transform duration-200 group-hover:scale-105"
          />
          <span className="font-display text-[16px] font-bold tracking-tight text-foreground">
            Skillful
          </span>
        </Link>

        {/* Desktop Navigation Links (md:flex) */}
        <nav aria-label="Desktop Navigation" className="hidden md:flex items-center gap-1.5">
          {DESKTOP_NAV_ITEMS.map((item) => {
            const isActive = item.pattern.test(pathname) || (item.to === "/skills" && pathname === "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={isActive ? 2.25 : 1.8} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <ThemeToggle variant="icon" />
        <ProfileBadge />
      </div>
    </div>
  </header>
);

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFixedViewportRoute = location.pathname === "/streak";

  // Check if running inside native Capacitor mobile wrapper
  const isCapacitor = typeof window !== "undefined" && (window as Window & { Capacitor?: unknown }).Capacitor !== undefined;

  // Scroll to top when path changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0 });
    }
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // If in native mobile Capacitor wrapper, preserve app-viewport containment
  if (isCapacitor) {
    return (
      <div className="app-viewport relative bg-background flex flex-col overflow-hidden">
        <PwaInstallPrompt />
        <AppHeader pathname={location.pathname} />
        <main
          id="main-content"
          ref={scrollRef}
          className={`app-scroll-content flex-1 min-h-0 relative z-10 w-full overflow-x-hidden ${isFixedViewportRoute ? "overflow-y-hidden" : "overflow-y-auto"}`}
        >
          {children}
        </main>
        <BottomTabBar pathname={location.pathname} className="absolute" />
      </div>
    );
  }

  // Unified Responsive Web Layout (Mobile < 768px, Tablet 768px-1023px, Desktop >= 1024px)
  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground flex flex-col relative selection:bg-primary/20">
      <PwaInstallPrompt />

      {/* Top Header: Sticky at top with responsive desktop navigation */}
      <AppHeader pathname={location.pathname} />

      {/* Main Content Area: Responsive spacing, fluid scrolling */}
      <main
        id="main-content"
        ref={scrollRef}
        className={`flex-1 w-full relative z-10 flex flex-col pb-20 md:pb-8 ${isFixedViewportRoute ? "overflow-hidden" : ""}`}
      >
        {children}
      </main>

      {/* Mobile Bottom Tab Bar: Visible strictly on mobile, hidden on tablet and desktop */}
      <BottomTabBar pathname={location.pathname} className="fixed md:hidden" />
    </div>
  );
};

export default MainLayout;
