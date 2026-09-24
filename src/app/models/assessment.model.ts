export type QuestionType = 'multiple-choice' | 'fill-blank' | 'reading' | 'vocabulary' | 'speaking';
export type SkillType = 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'speaking';

/**
 * Representa la pregunta pública obtenida de /questions_public.
 * NUNCA contiene 'correctAnswer' para evitar filtraciones en el cliente.
 */
export interface QuestionPublic {
  id: number;
  type: QuestionType;
  skill: SkillType;
  prompt: string;
  context?: string;
  options?: string[];
  cosmoTip: string;
}

export interface StudentAnswers {
  [questionId: number]: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
  avatarIcon?: string;
  cadetTitle?: string;
  xpPoints?: number;
  streakDays?: number;
  createdAt: string;
  lastActive: string;
}

export interface AssessmentAttempt {
  id?: string;
  uid: string;
  studentName: string;
  studentEmail?: string | null;
  score: number; // 0 - 100
  skills: {
    grammar: number;
    vocabulary: number;
    reading: number;
    listening: number;
    speaking: number;
  };
  level: string;
  completedAt: string;
}

export interface CosmoFeedback {
  spokenFeedback: string;
  displayMessage: string;
  imagePrompt: string;
  mood: 'celebration' | 'encouragement' | 'curious';
  focusSkill: string;
}

/**
 * Payload retornado por la Cloud Function callable 'evaluateAssessment'
 */
export interface EvaluationResponse {
  success: boolean;
  attemptId: string;
  attempt: AssessmentAttempt;
  feedback: CosmoFeedback;
}
