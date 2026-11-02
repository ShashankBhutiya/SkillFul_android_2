import { Suspense, lazy, useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth, withTimeout } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Analytics } from "@vercel/analytics/react";
import { initGA } from "@/utils/analytics";
import { usePageTracking } from "@/hooks/usePageTracking";
import CookieConsent from "@/components/layout/CookieConsent";
import { useForceUpdate } from "@/hooks/useForceUpdate";
import ForceUpdateModal from "@/components/ForceUpdateModal";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Loader2 } from "lucide-react";
import { readOnboardingDraft } from "@/config/onboarding";

const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const BlogIndexPage = lazy(() => import("./pages/BlogIndexPage"));
const BlogArticlePage = lazy(() => import("./pages/BlogArticlePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PitchStats = lazy(() => import("./pages/PitchStats"));
const SkillsPage = lazy(() => import("./pages/SkillsPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const ReferPage = lazy(() => import("./pages/ReferPage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const InfoPage = lazy(() => import("./pages/InfoPage"));
const ProfilePage = lazy(() => import("./pages/ProfileSettingsPage"));
const StreakPage = lazy(() => import("./pages/StreakPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

const queryClient = new QueryClient();

const NavigationTracker = () => {
  usePageTracking();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("pending_referral_code", ref);
      console.log("Captured pending referral code:", ref);
    }
  }, []);

  return null;
};

const PushNotificationInitializer = () => {
  usePushNotifications();
  return null;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let safetyTimer: ReturnType<typeof setTimeout>;

    const completeSignIn = async () => {
      const params = new URLSearchParams(window.location.search);
      const redirectError = params.get("error_description") || params.get("error");
      if (redirectError) {
        if (active) setError(redirectError);
        return;
      }
      if (!supabase) {
        if (active) setError("Sign-in is unavailable right now. Please try again later.");
        return;
      }

      // Safety timer: show actionable error instead of waiting indefinitely
      safetyTimer = setTimeout(() => {
        if (active) {
          setError("Sign-in is taking longer than expected. Please check your connection or try again.");
        }
      }, 5000);

      try {
        // getSession waits for Supabase to exchange the OAuth code in the URL.
        const { data, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          4500,
          "Sign-in"
        );
        clearTimeout(safetyTimer);
        if (!active) return;
        if (sessionError) throw sessionError;
        if (data.session?.user) {
          navigate(readOnboardingDraft()?.pendingAuth ? "/onboarding" : "/skills", { replace: true });
        } else {
          setError("Sign-in could not be completed. Please return and try Google sign-in again.");
        }
      } catch (sessionError) {
        clearTimeout(safetyTimer);
        if (active) setError(sessionError instanceof Error ? sessionError.message : "Sign-in could not be completed.");
      }
    };
    void completeSignIn();
    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, [navigate]);

  useEffect(() => {
    if (!user.isGuest && !error) navigate(readOnboardingDraft()?.pendingAuth ? "/onboarding" : "/skills", { replace: true });
  }, [user.isGuest, error, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      {!error && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
      <h1 className="text-xl font-semibold">{error ? "Sign-in could not complete" : "Finishing sign-in…"}</h1>
      {error && (
        <div className="flex flex-col items-center gap-3">
          <p className="max-w-md text-sm text-muted-foreground">{error}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <a
              className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              href="/skills"
            >
              Return to Skillful
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const RootRoute = () => {
  const { isLoading } = useAuth();
  const params = new URLSearchParams(window.location.search);
  if (isLoading) return <div className="min-h-screen bg-background" />;
  return params.has("code") || params.has("error") || params.has("error_description") || window.location.hash.includes("access_token=")
    ? <AuthCallback />
    : <Navigate to="/onboarding" replace />;
};

const App = () => {
  const { needsUpdate, loading, currentVersion, minimumVersion, updateMessage } =
    useForceUpdate();

  useEffect(() => {
    initGA();
  }, []);

  if (needsUpdate && !loading) {
    return (
      <ForceUpdateModal
        currentVersion={currentVersion}
        minimumVersion={minimumVersion}
        updateMessage={updateMessage}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="skillful_theme"
      >
        <AuthProvider>
          <Analytics />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <NavigationTracker />
              <PushNotificationInitializer />
              <Suspense fallback={<div className="min-h-screen bg-background" />}>
                <Routes>
                  <Route path="/" element={<RootRoute />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/skills" element={<SkillsPage />} />
                  <Route path="/skills/ai" element={<SkillsPage ai />} />
                  <Route path="/skills/classic" element={<SkillsPage classic />} />
                  <Route path="/skills/:categoryId" element={<SkillsPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/blog" element={<BlogIndexPage />} />
                  <Route path="/blog/:slug" element={<BlogArticlePage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/categories/:slug" element={<CategoryPage />} />
                  <Route path="/pitch_stats/:title" element={<PitchStats />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/refer" element={<ReferPage />} />
                  <Route path="/premium" element={<PremiumPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/info" element={<ProfilePage />} />
                  <Route path="/streak" element={<StreakPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <CookieConsent />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
