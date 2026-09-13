import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Index from "./pages/Index";
import { Analytics } from "@vercel/analytics/react";
import { initGA } from "@/utils/analytics";
import { usePageTracking } from "@/hooks/usePageTracking";
import CookieConsent from "@/components/layout/CookieConsent";
import { useForceUpdate } from "@/hooks/useForceUpdate";
import ForceUpdateModal from "@/components/ForceUpdateModal";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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
      try {
        // getSession waits for Supabase to exchange the OAuth code in the URL.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;
        if (sessionError) throw sessionError;
        if (data.session?.user) {
          navigate("/skills", { replace: true });
        } else {
          setError("Sign-in could not be completed. Please return and try Google sign-in again.");
        }
      } catch (sessionError) {
        if (active) setError(sessionError instanceof Error ? sessionError.message : "Sign-in could not be completed.");
      }
    };
    void completeSignIn();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (!user.isGuest && !error) navigate("/skills", { replace: true });
  }, [user.isGuest, error, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">{error ? "Google sign-in failed" : "Finishing sign-in…"}</h1>
      {error && <><p className="max-w-md text-sm text-muted-foreground">{error}</p><a className="text-primary underline" href="/skills">Return to Skillful</a></>}
    </div>
  );
};

const RootRoute = () => {
  const params = new URLSearchParams(window.location.search);
  return params.has("code") || params.has("error") || params.has("error_description") || window.location.hash.includes("access_token=")
    ? <AuthCallback />
    : <Navigate to="/skills" replace />;
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
                <Route path="/info" element={<InfoPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <CookieConsent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
