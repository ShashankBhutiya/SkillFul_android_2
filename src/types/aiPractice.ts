export type PracticeLevel = "beginner" | "intermediate" | "advanced";

export interface AIPracticeQuestion {
  id: string;
  statement: string;
  answer: boolean;
  explanation: string;
  concept: string;
  categoryId?: string;
  classificationConfidence?: number;
}

export interface LegacyAIPracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  concept: string;
  categoryId?: string;
  classificationConfidence?: number;
}

export interface AIPracticeSet {
  id: string;
  title: string;
  topic: string;
  degree: string;
  academicYear: string;
  level: PracticeLevel;
  questions: AIPracticeQuestion[] | LegacyAIPracticeQuestion[];
  createdAt: string;
}

export interface PracticeAnswer {
  questionId: string;
  selectedOption: number;
  correct: boolean;
}

