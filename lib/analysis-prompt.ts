export type AnalysisPromptContext = {
  transcript: string;
  agent_talk_percent: number;
  customer_talk_percent: number;
  duration_seconds: number;
  words_per_minute: number;
};

const BODY = `You are an expert sales call analyst and coach. Analyze the following 
sales call transcript deeply and return ONLY a valid JSON object.

Transcript:
{{transcript}}

Agent Talk Time: {{agent_talk_percent}}%
Customer Talk Time: {{customer_talk_percent}}%
Call Duration: {{duration_seconds}} seconds
Speaking Pace: {{words_per_minute}} WPM

Return this exact JSON structure:
{
  "overall_score": <0-10>,
  "sentiment": "<positive|neutral|negative>",
  "call_summary": "<2-3 sentences: purpose, main topics, outcome>",
  
  "performance_scores": {
    "communication_clarity": <1-10>,
    "politeness": <1-10>,
    "business_knowledge": <1-10>,
    "problem_handling": <1-10>,
    "listening_ability": <1-10>
  },

  "positive_observations": ["<obs 1>", "<obs 2>", "<obs 3>"],
  "negative_observations": ["<obs 1>", "<obs 2>", "<obs 3>"],
  "action_items": ["<item 1>", "<item 2>", "<item 3>"],
  "keywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>"],

  "questionnaire_coverage": [
    { "question_topic": "Budget Discussion", "was_asked": <bool> },
    { "question_topic": "Competitor Comparison", "was_asked": <bool> },
    { "question_topic": "Kitchen Size / Scope", "was_asked": <bool> },
    { "question_topic": "Cabinet Style Preference", "was_asked": <bool> },
    { "question_topic": "Remodeling Full Kitchen?", "was_asked": <bool> },
    { "question_topic": "Timeline / Urgency", "was_asked": <bool> },
    { "question_topic": "Decision Maker Identified", "was_asked": <bool> }
  ],

  "objections": [
    {
      "type": "<price|timing|competitor|trust|other>",
      "customer_text": "<exact or paraphrased objection>",
      "agent_response": "<how agent responded>",
      "handled_well": <true|false>
    }
  ],

  "competitor_mentions": [
    {
      "name": "<competitor name>",
      "context": "<why customer mentioned them>",
      "agent_response": "<how agent responded>"
    }
  ],

  "emotion_timeline": [
    { "minute": 1, "sentiment": "<positive|neutral|negative>", "score": <0.0-1.0> },
    { "minute": 2, "sentiment": "<positive|neutral|negative>", "score": <0.0-1.0> }
  ],

  "customer_sentiment_start": "<positive|neutral|negative>",
  "customer_sentiment_end": "<positive|neutral|negative>",

  "filler_word_count": {
    "um": <int>,
    "uh": <int>,
    "like": <int>,
    "basically": <int>,
    "you_know": <int>,
    "right": <int>,
    "honestly": <int>
  },

  "coaching_tips": [
    "<Specific, actionable tip referencing exact moment in call>",
    "<Specific, actionable tip referencing exact moment in call>",
    "<Specific, actionable tip referencing exact moment in call>"
  ],

  "best_moments": [
    "<A specific moment where agent performed exceptionally well>"
  ],

  "missed_opportunities": [
    "<A specific moment where agent could have done better with exact suggestion>"
  ],

  "conversion_probability": <0.0-1.0>,

  "question_quality_score": <1-10>,
  "question_quality_notes": "<Were questions open-ended or closed? Deep or surface-level?>",

  "next_best_action": "<The single most important next step to move this deal forward>"
}

Important: For "emotion_timeline", include one entry per minute of the call from minute 1 through ceil(call duration in seconds / 60). If duration is 0 or unknown, provide a single minute 1 entry estimated from the transcript. Use "score" as 0.0-1.0 where higher reflects more positive customer emotion that minute. If there are no objections or competitors, use empty arrays [].`;

export function buildEnrichedCoachPrompt(ctx: AnalysisPromptContext): string {
  return BODY.replace("{{transcript}}", ctx.transcript)
    .replace("{{agent_talk_percent}}", String(ctx.agent_talk_percent))
    .replace("{{customer_talk_percent}}", String(ctx.customer_talk_percent))
    .replace("{{duration_seconds}}", String(ctx.duration_seconds))
    .replace("{{words_per_minute}}", String(ctx.words_per_minute));
}
