import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SeoHead } from "@/components/SeoHead";
import PYQExamSelect from "@/components/pyq/PYQExamSelect";
import PYQSubjectSelect from "@/components/pyq/PYQSubjectSelect";
import PYQQuizGame from "@/components/pyq/PYQQuizGame";
import { MainLayout } from "@/components/layout/MainLayout";

type ExamType = "jee_main" | "jee_advanced" | "neet";
type SubjectType = "physics" | "chemistry" | "mathematics" | "biology";

export default function PYQPage() {
  const { user } = useAuth();
  const { exam, subjectId } = useParams<{ exam?: string; subjectId?: string }>();
  const navigate = useNavigate();

  // Validate route params and typecast
  const isValidExam = (ex: string): ex is ExamType => {
    return ["jee_main", "jee_advanced", "neet"].includes(ex);
  };

  const isValidSubject = (sub: string): sub is SubjectType => {
    return ["physics", "chemistry", "mathematics", "biology"].includes(sub);
  };

  const handleExamSelect = (selectedExam: ExamType) => {
    navigate(`/pyq/${selectedExam}`);
  };

  const handleSubjectSelect = (selectedSubject: SubjectType) => {
    if (exam && isValidExam(exam)) {
      navigate(`/pyq/${exam}/${selectedSubject}`);
    }
  };

  const handleBackToExams = () => {
    navigate("/pyq");
  };

  const handleBackToSubjects = () => {
    if (exam && isValidExam(exam)) {
      navigate(`/pyq/${exam}`);
    }
  };

  // 1. Step 3: Active MCQ Quiz Screen
  if (exam && isValidExam(exam) && subjectId && isValidSubject(subjectId)) {
    return (
      <>
        <SeoHead
          title={`${exam === "jee_main" ? "JEE Main" : exam === "jee_advanced" ? "JEE Advanced" : "NEET"} ${subjectId.charAt(0).toUpperCase() + subjectId.slice(1)} Practice`}
          description={`Solve authentic Previous Year Questions (PYQs) for ${exam} ${subjectId} in real MCQ test formats.`}
          path={`/pyq/${exam}/${subjectId}`}
        />
        <PYQQuizGame
          exam={exam}
          subject={subjectId}
          userId={user.id}
          onBack={handleBackToSubjects}
        />
      </>
    );
  }

  // 2. Step 2: Subject Picker Grid
  if (exam && isValidExam(exam)) {
    return (
      <MainLayout>
        <SeoHead
          title={`${exam === "jee_main" ? "JEE Main" : exam === "jee_advanced" ? "JEE Advanced" : "NEET"} Subjects`}
          description={`Practice subject-wise Previous Year Questions (PYQs) for ${exam}.`}
          path={`/pyq/${exam}`}
        />
        <PYQSubjectSelect
          exam={exam}
          userId={user.id}
          onSelect={handleSubjectSelect}
          onBack={handleBackToExams}
        />
      </MainLayout>
    );
  }

  // 3. Step 1: Exam Picker Grid (Default Landing)
  return (
    <MainLayout>
      <SeoHead
        title="PYQ Practice - JEE & NEET Solved Papers"
        description="Solve authentic JEE Main, JEE Advanced, and NEET Previous Year Questions (PYQs) with real marking schemes."
        path="/pyq"
      />
      <PYQExamSelect onSelect={handleExamSelect} />
    </MainLayout>
  );
}
