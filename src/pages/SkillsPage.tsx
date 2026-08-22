import { lazy, Suspense, useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import categorySummaries from "@/data/categorySummaries.json";
import { categories as questionCategories } from "@/data/questions";
import { useAuth } from "@/contexts/AuthContext";
import { pullProgressFromDB } from "@/services/progressService";
import CategorySelect from "@/components/CategorySelect";
import UserModeOnboarding from "@/components/UserModeOnboarding";
import { useUserMode } from "@/hooks/useUserMode";

const DifficultySelect = lazy(() => import("@/components/DifficultySelect"));
const QuizGame = lazy(() => import("@/components/QuizGame"));

type Difficulty = "easy" | "intermediate";

// Build a lookup map from actual question arrays for real-time counts
const questionCountMap = new Map(
  questionCategories.map((c) => [c.id, c.questions.length])
);

/* Loading skeleton shown during lazy-load suspense */
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
    <div className="h-10 w-10 rounded-xl bg-primary/10 animate-pulse" />
    <div className="h-4 w-40 rounded-full bg-muted animate-pulse" />
    <div className="h-3 w-28 rounded-full bg-muted/60 animate-pulse" />
  </div>
);

const SkillsPage = () => {
  const { user } = useAuth();
  const { categoryId } = useParams<{ categoryId?: string }>();
  const { ready: modeReady, hasChosen: modeChosen } = useUserMode();
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  // Pull progress from Supabase when user changes (login / app start)
  useEffect(() => {
    pullProgressFromDB(user.id);
  }, [user.id]);

  // Sync / reset difficulty when categoryId changes
  useEffect(() => {
    if (categoryId) {
      setDifficulty("easy");
    } else {
      setDifficulty(null);
    }
  }, [categoryId]);

  const handleCategorySelect = (selectedId: string) => {
    navigate(`/skills/${selectedId}`);
  };

  const handleDifficultySelect = (diff: Difficulty) => {
    setDifficulty(diff);
  };

  const handleBackToSkills = () => {
    navigate("/skills");
  };


  // Nothing renders until localStorage has been read, otherwise the catalog
  // would flash the default mode before the stored one is applied.
  if (!modeReady) return <LoadingSkeleton />;

  if (!modeChosen) return <UserModeOnboarding />;

  // If categoryId is present but invalid, redirect to /skills
  if (categoryId && !questionCategories.some((c) => c.id === categoryId)) {
    return <Navigate to="/skills" replace />;
  }

  // Active quiz
  if (categoryId && difficulty) {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <QuizGame
          categoryId={categoryId}
          difficulty={difficulty}
          onBack={handleBackToSkills}
          onHome={handleBackToSkills}
          onSwitchDifficulty={(newDiff: Difficulty) => setDifficulty(newDiff)}
        />
      </Suspense>
    );
  }

  // Difficulty picker (only for categories with >50 questions)
  if (categoryId && !difficulty) {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <DifficultySelect
          categoryId={categoryId}
          onSelect={handleDifficultySelect}
          onBack={handleBackToSkills}
        />
      </Suspense>
    );
  }

  // Skill picking grid
  return <CategorySelect onSelect={handleCategorySelect} />;
};

export default SkillsPage;
