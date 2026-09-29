import type { PracticeLevel } from "@/types/aiPractice";

export type InterviewQuestionType = "technical" | "behavioral" | "situational" | "role-specific";

export interface InterviewQuestion {
  id: string;
  question: string;
  type: InterviewQuestionType;
  whyAsked: string;
  keyPoints: string[];
  answerFramework: string;
}

export interface InterviewPracticeSession {
  id: string;
  title: string;
  jobDescription: string;
  degree: string;
  academicYear: string;
  level: PracticeLevel;
  questions: InterviewQuestion[];
  createdAt: string;
  updatedAt: string;
}
