export type PracticeLevel = "beginner" | "intermediate" | "advanced";

export interface AIPracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  concept: string;
}

export interface AIPracticeSet {
  id: string;
  title: string;
  topic: string;
  degree: string;
  academicYear: string;
  level: PracticeLevel;
  questions: AIPracticeQuestion[];
  createdAt: string;
}

export interface PracticeAnswer {
  questionId: string;
  selectedOption: number;
  correct: boolean;
}

