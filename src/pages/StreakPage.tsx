import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useStreak } from "@/hooks/useStreak";
import { SeoHead } from "@/components/SeoHead";
import StreakDetails from "@/components/streak/StreakDetails";

export default function StreakPage() {
  const { streak, checkedInToday } = useStreak();
  return (
    <MainLayout>
      <SeoHead title="Daily streak" description="Track your daily practice streak, weekly activity, and streak freezes." path="/streak" />
      <div className="mx-auto max-w-lg px-5 py-6">
        <Link to="/info" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Profile</Link>
        <h1 className="mb-6 mt-5 text-center font-display text-2xl font-bold">Daily streak</h1>
        <StreakDetails streak={streak} checkedInToday={checkedInToday} />
        <Link to="/skills" className="mt-7 block rounded-xl bg-primary px-5 py-3.5 text-center font-semibold text-primary-foreground">Practise now</Link>
      </div>
    </MainLayout>
  );
}
