import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
                <Route path="/" element={<Navigate to="/skills" replace />} />
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
