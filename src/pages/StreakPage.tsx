import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useStreak } from "@/hooks/useStreak";
import { SeoHead } from "@/components/SeoHead";
import StreakDetails from "@/components/streak/StreakDetails";

export default function StreakPage() {
  const { streak, checkedInToday } = useStreak();
  return (
    <MainLayout>
      <SeoHead title="Daily streak" description="Track your daily practice streak, weekly activity, and streak freezes." path="/streak" />
      <div className="streak-screen mx-auto flex h-full w-full max-w-lg flex-col px-5 pt-2 pb-3">
        <h1 className="streak-page-title text-center font-display text-xl font-bold">Daily streak</h1>
        <div className="min-h-0 flex-1 content-center">
          <StreakDetails streak={streak} checkedInToday={checkedInToday} compact />
        </div>
        <Link to="/skills" className="streak-practise-link block shrink-0 rounded-xl bg-primary px-5 py-3 text-center font-semibold text-primary-foreground">Practise now</Link>
      </div>
    </MainLayout>
  );
}
