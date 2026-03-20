export type CallStatus = "processing" | "completed" | "failed";
export type CallSentiment = "positive" | "neutral" | "negative";

export type TranscriptSegment = {
  start: number;
  end: number;
  speaker: string;
  text: string;
};

export type ObjectionInsight = {
  type: string;
  customer_text: string;
  agent_response: string;
  handled_well: boolean;
};

export type CompetitorMentionInsight = {
  name: string;
  context: string;
  agent_response: string;
};

export type EmotionTimelinePoint = {
  minute: number;
  sentiment: CallSentiment;
  score: number;
};

/** Stored as JSON on \`calls.extended_insights\`; mirrors coach-specific LLM output. */
export type ExtendedCoachInsights = {
  objections: ObjectionInsight[];
  competitor_mentions: CompetitorMentionInsight[];
  emotion_timeline: EmotionTimelinePoint[];
  customer_sentiment_start: CallSentiment;
  customer_sentiment_end: CallSentiment;
  filler_word_count: Record<string, number>;
  coaching_tips: string[];
  best_moments: string[];
  missed_opportunities: string[];
  conversion_probability: number;
  question_quality_score: number;
  question_quality_notes: string;
  next_best_action: string;
};

export type ConversionTag = "converted" | "not_converted" | "follow_up_pending";

export type CallRow = {
  id: string;
  file_name: string;
  file_url: string;
  duration_seconds: number | null;
  status: CallStatus;
  transcript: string | null;
  transcript_segments: TranscriptSegment[] | null;
  agent_name: string | null;
  agent_talk_percent: number | null;
  customer_talk_percent: number | null;
  overall_score: number | null;
  sentiment: CallSentiment | null;
  call_summary: string | null;
  positive_observations: string[] | null;
  negative_observations: string[] | null;
  action_items: string[] | null;
  keywords: string[] | null;
  extended_insights: ExtendedCoachInsights | null;
  manager_notes: string | null;
  manager_rating: number | null;
  conversion_tag: ConversionTag | null;
  flagged_for_review: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
};

export type PerformanceScoresRow = {
  id: string;
  call_id: string;
  communication_clarity: number;
  politeness: number;
  business_knowledge: number;
  problem_handling: number;
  listening_ability: number;
};

export type QuestionnaireRow = {
  id: string;
  call_id: string;
  question_topic: string;
  was_asked: boolean;
};

export type ClaudeAnalysis = {
  overall_score: number;
  sentiment: CallSentiment;
  call_summary: string;
  performance_scores: {
    communication_clarity: number;
    politeness: number;
    business_knowledge: number;
    problem_handling: number;
    listening_ability: number;
  };
  positive_observations: string[];
  negative_observations: string[];
  action_items: string[];
  keywords: string[];
  questionnaire_coverage: { question_topic: string; was_asked: boolean }[];
  objections: ObjectionInsight[];
  competitor_mentions: CompetitorMentionInsight[];
  emotion_timeline: EmotionTimelinePoint[];
  customer_sentiment_start: CallSentiment;
  customer_sentiment_end: CallSentiment;
  filler_word_count: Record<string, number>;
  coaching_tips: string[];
  best_moments: string[];
  missed_opportunities: string[];
  conversion_probability: number;
  question_quality_score: number;
  question_quality_notes: string;
  next_best_action: string;
};
