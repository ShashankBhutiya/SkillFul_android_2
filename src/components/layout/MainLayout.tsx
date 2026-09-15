import { Link, useLocation } from "react-router-dom";
import { 
  ArrowRight, 
  Compass, 
  Trophy, 
  Gift, 
  Sparkles, 
  User, 
  Check, 
  Wifi, 
  Battery, 
  Smartphone, 
  Info,
  Laptop
} from "lucide-react";
import ProfileBadge from "@/components/ProfileBadge";
import { CompanionMascot } from "@/components/mascot/CompanionMascot";
import { PwaInstallPrompt } from "@/components/layout/PwaInstallPrompt";
import { getNotificationSettings } from "@/services/notificationService";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface MainLayoutProps {
  children: React.ReactNode;
}

const TAB_ITEMS = [
  { to: "/skills", label: "Explore", icon: Compass, pattern: /^\/skills/ },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, pattern: /^\/leaderboard/ },
  { to: "/refer", label: "Refer", icon: Gift, pattern: /^\/refer/ },
  { to: "/premium", label: "Premium", icon: Sparkles, pattern: /^\/premium/ },
  { to: "/info", label: "Profile", icon: User, pattern: /^\/(info|streak|about|contact|privacy|terms|blog)/ },
];

interface BottomTabBarProps {
  pathname: string;
  className?: string;
}

// Keep these components at module scope. Defining them inside MainLayout would
// give them a new identity on every layout update and reset stateful children
// such as ProfileBadge (including any modal it currently has open).
const BottomTabBar = ({ pathname, className = "sticky" }: BottomTabBarProps) => (
  <div className={`${className} bottom-0 left-0 right-0 h-[64px] bg-background border-t border-border flex items-stretch justify-around px-1 z-40 pb-[env(safe-area-inset-bottom,4px)] shrink-0`}>
    {TAB_ITEMS.map((tab) => {
      const isActive = tab.pattern.test(pathname) || (tab.to === "/skills" && pathname === "/");
      const Icon = tab.icon;

      return (
        <Link
          key={tab.to}
          to={tab.to}
          aria-current={isActive ? "page" : undefined}
          className="relative flex flex-col items-center justify-center flex-1 gap-1 text-center group"
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
  </div>
);

const AppHeader = ({ extraClass = "" }: { extraClass?: string }) => (
  <header className={`sticky top-0 z-40 border-b border-border bg-background shrink-0 ${extraClass}`}>
    <div className="flex h-14 items-center justify-between px-4">
      <Link to="/skills" className="flex items-center gap-2.5 group shrink-0">
        <img
          src="/favicon.png"
          alt=""
          className="h-7 w-7 rounded-md object-cover"
        />
        <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
          Skillful
        </span>
      </Link>

      <div className="flex items-center gap-1.5">
        <ProfileBadge />
      </div>
    </div>
  </header>
);

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(true);
  const [currentTime, setCurrentTime] = useState("9:41 AM");

  // Track window resizing to dynamically switch between mobile full-screen and desktop device showcase
  useEffect(() => {
    const checkMobile = () => {
      const mobileQuery = window.matchMedia("(max-width: 640px)");
      const isCapacitor = (window as Window & { Capacitor?: unknown }).Capacitor !== undefined;
      setIsMobile(mobileQuery.matches || isCapacitor);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update clock in the simulated smartphone header
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Companion Mascot greetings
  const [mascotMessage, setMascotMessage] = useState("");
  const [mascotTrigger, setMascotTrigger] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const settings = getNotificationSettings();
      if (settings.mascotTipsEnabled) {
        setMascotMessage("Hey! 🦉 Ready to sharpen your skills today? Let's go!");
        setMascotTrigger((t) => t + 1);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Scroll to top when path changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0 });
    }
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // ─── Render Mobile Layout ───
  if (isMobile) {
    return (
      <div className="relative h-screen h-[100dvh] bg-background flex flex-col overflow-hidden">
        {mascotMessage && (
          <CompanionMascot message={mascotMessage} triggerKey={mascotTrigger} />
        )}

        <PwaInstallPrompt />


        {/* Minimal top app header */}
        <AppHeader />

        {/* Scrollable screen container */}
        <main ref={scrollRef} className="flex-1 relative z-10 w-full overflow-y-auto pb-24">
          {children}
        </main>

        {/* Sticky bottom navigation bar */}
        <BottomTabBar pathname={location.pathname} className="absolute" />
      </div>
    );
  }

  // ─── Render Desktop Showcase Layout ───
  return (
    <div className="relative min-h-screen bg-[#090a0f] text-slate-100 flex items-center justify-center p-6 overflow-hidden">
      
      {/* Dynamic ambient lights behind content */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-accent/80 rounded-full blur-[140px] pointer-events-none opacity-[0.04] animate-pulse" style={{ animationDuration: '12s' }} />

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center z-10 px-4">
        
        {/* Left Side: Desktop Marketing Showcase */}
        <div className="hidden lg:flex flex-col gap-6 text-left max-w-lg">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
              <img src="/favicon.png" alt="Skillful" className="h-9 w-9 rounded-xl object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
                  Skillful
                </h1>
                <span className="text-[10px] uppercase bg-primary/20 text-primary border border-primary/30 rounded-full px-2.5 py-0.5 font-bold tracking-wider">
                  Mobile Hub
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Interactive judgment training gym</p>
            </div>
          </div>

          <h2 className="font-display text-4xl font-extrabold leading-[1.15] text-white">
            Train your instincts <br />
            <span className="text-gradient">before life asks.</span>
          </h2>
          
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            Master career development, relationships, and financial strategy through rapid-fire scenarios. Run as a native app on your phone, or preview it dynamically here.
          </p>

          {/* Core App Features Checklist */}
          <div className="space-y-3 mt-2">
            {[
              "Swipe mechanics for active learning",
              "Instant feedback and detailed explanations",
              "Compare scores on the global leaderboard",
              "Optimized for Android & iOS via Capacitor",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-300 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>

          {/* QR Code / Capacitor Platform Card */}
          <div className="mt-4 flex items-center gap-5 p-4.5 rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl max-w-md shadow-2xl relative overflow-hidden group">
            {/* Glossy sheen */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" style={{ animationDuration: '2.5s' }} />
            
            {/* Visual simulated QR block */}
            <div className="h-16 w-16 bg-white rounded-xl p-2 shrink-0 flex flex-col justify-between shadow-inner">
              <div className="flex justify-between h-4">
                <div className="w-4 h-4 bg-slate-900 rounded-[2px]" />
                <div className="w-4 h-4 bg-slate-900 rounded-[2px]" />
              </div>
              <div className="flex justify-between h-4 items-end">
                <div className="w-4 h-4 bg-slate-900 rounded-[2px]" />
                <div className="w-1.5 h-1.5 bg-slate-900 rounded-[1px]" />
              </div>
            </div>
            <div>
              <p className="text-white text-sm font-bold flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-primary" />
                Mobile Showcase Mode
              </p>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Experience full-screen interface responsiveness on small viewport devices or within native Capacitor wrappers.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Centered iPhone 15 Pro style phone mockup */}
        <div className="flex justify-center select-none relative">
          
          {/* Phone chassis shadow and backlight glow */}
          <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-[58px] opacity-40 blur-2xl pointer-events-none" />

          {/* Simulated hardware volume / power buttons */}
          <div className="absolute left-[-16px] top-[140px] w-[4px] h-[35px] bg-slate-800 rounded-l-md border-r border-black/30 shadow-md" />
          <div className="absolute left-[-16px] top-[190px] w-[4px] h-[55px] bg-slate-800 rounded-l-md border-r border-black/30 shadow-md" />
          <div className="absolute left-[-16px] top-[255px] w-[4px] h-[55px] bg-slate-800 rounded-l-md border-r border-black/30 shadow-md" />
          <div className="absolute right-[-16px] top-[210px] w-[4px] h-[75px] bg-slate-800 rounded-r-md border-l border-black/30 shadow-md" />

          {/* Phone container */}
          <div className="relative w-[375px] h-[812px] rounded-[52px] border-[10px] border-neutral-900 bg-background overflow-hidden flex flex-col ring-1 ring-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
            
            {/* Simulated iPhone Screen Glare overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.015] to-white/[0.05] pointer-events-none z-50 rounded-[42px]" />

            {/* Dynamic Island Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-[26px] bg-black rounded-full z-50 flex items-center justify-between px-3 text-[10px] text-white/50 pointer-events-none">
              <span className="font-semibold text-white/95 scale-90 -ml-0.5">{currentTime.split(" ")[0]}</span>
              <div className="flex items-center gap-1.5 scale-90 -mr-0.5">
                <Wifi className="w-3 h-3 text-white/80" />
                <Battery className="w-3.5 h-3.5 text-white/80" />
              </div>
            </div>

            {/* Inner Phone Screen Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative rounded-[42px]">
              {/* Mascot, Prompts inside the device view */}
              {mascotMessage && (
                <CompanionMascot message={mascotMessage} triggerKey={mascotTrigger} />
              )}
              <PwaInstallPrompt />
      

              {/* Header with status bar padding */}
              <AppHeader extraClass="pt-7" />

              {/* Scrollable Content inside phone screen */}
              <main ref={scrollRef} className="flex-1 relative z-10 w-full overflow-y-auto scrollbar-none pb-24">
                {children}
              </main>

              {/* Bottom Tab Bar */}
              <BottomTabBar pathname={location.pathname} className="absolute" />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default MainLayout;
