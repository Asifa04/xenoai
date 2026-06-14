import OpenAI from "openai/index.js";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export function getModel() {
  return {
    async generateContent(prompt: string) {
      const result = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      });

      return {
        response: {
          text: () => result.choices[0].message.content || "",
        },
      };
    },

    startChat(options: any = {}) {
  return {
    async sendMessageStream(prompt: string) {

      const result = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",

        messages: [
          {
            role: "system",
            content: options.system || "",
          },

          ...(options.history || []).map((m: any) => ({
            role: m.role === "model" ? "assistant" : "user",
            content: m.content || m.parts?.[0]?.text || "",
          })),

          {
            role: "user",
            content: prompt,
          },
        ],

        stream: true,
      });
          return {
            stream: (async function* () {
              for await (const chunk of result) {
                const text = chunk.choices[0]?.delta?.content;
                if (text) {
                  yield {
                    text: () => text,
                  };
                }
              }
            })(),
          };
        },
      };
    },
  };
}

/** Robustly extract JSON from model response — handles markdown fences, preamble text, etc. */
function extractJSON(raw: string): unknown {
  const text = raw.trim();

  // 1. Try direct parse
  try { return JSON.parse(text); } catch { /* continue */ }

  // 2. Strip markdown code fences
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  try { return JSON.parse(stripped); } catch { /* continue */ }

  // 3. Find first { ... } block
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* continue */ }
  }

  throw new Error(`Could not parse JSON from model response: ${text.slice(0, 200)}`);
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

export const SEGMENT_SYSTEM_PROMPT = `You are a CRM data analyst. Convert natural language into a JSON segment rule object.

Available fields:
- totalSpend        (number in INR rupees)
- orderCount        (integer)
- daysSinceLastOrder (integer)
- daysSinceSignup   (integer)
- city              (string)
- gender            ("Male", "Female", or "Other")

Valid operators: "gt", "lt", "gte", "lte", "eq", "in"

Respond ONLY with a single JSON object in this exact shape:
{
  "name": "Short segment name",
  "description": "One sentence description",
  "rules": {
    "operator": "AND",
    "conditions": [
      { "field": "totalSpend", "op": "gt", "value": 5000 }
    ]
  }
}`;

export const CAMPAIGN_SYSTEM_PROMPT = `You are a D2C marketing strategist. Given a campaign goal and target audience, generate a campaign.

Respond ONLY with a single JSON object in this exact shape:
{
  "name": "Campaign name (3-5 words)",
  "channel": "EMAIL",
  "message": "Hi {{name}}, your message here. Include a CTA.",
  "reasoning": "One sentence on why this channel and message."
}

Rules:
- channel must be exactly one of: EMAIL, SMS, WHATSAPP
- SMS messages must be under 160 characters
- EMAIL and WHATSAPP messages under 300 characters
- Always use {{name}} as the personalisation placeholder`;

export const ANALYST_SYSTEM_PROMPT = `You are a marketing performance analyst. Analyse the given campaign metrics and provide 3-4 sentences of insight: what worked, what didn't, and one concrete next-best action. Be specific with numbers. No bullet points.`;

export const COPILOT_SYSTEM_PROMPT = `You are XenoAI, an AI marketing copilot for a D2C brand. You help marketers create segments, run campaigns, and understand data. Be concise and action-oriented.`;

// ─── AI Functions ─────────────────────────────────────────────────────────────

export async function generateSegmentRules(prompt: string) {
  const model = getModel();
  const result = await model.generateContent(
    `${SEGMENT_SYSTEM_PROMPT}\n\nUser request: "${prompt}"`
  );
  return extractJSON(result.response.text()) as {
    name: string;
    description: string;
    rules: { operator: 'AND' | 'OR'; conditions: { field: string; op: string; value: number | string }[] };
  };
}

export async function generateCampaign(goal: string, segmentDescription: string) {
  const model = getModel();
  const result = await model.generateContent(
    `${CAMPAIGN_SYSTEM_PROMPT}\n\nCampaign goal: "${goal}"\nTarget audience: "${segmentDescription}"`
  );
  const parsed = extractJSON(result.response.text()) as {
    name: string;
    channel: string;
    message: string;
    reasoning: string;
  };

  // Sanitise channel value — model occasionally returns lowercase or invalid values
  const channelMap: Record<string, string> = {
    email: 'EMAIL', sms: 'SMS', whatsapp: 'WHATSAPP',
    EMAIL: 'EMAIL', SMS: 'SMS', WHATSAPP: 'WHATSAPP',
  };
  parsed.channel = channelMap[parsed.channel] || 'EMAIL';

  return parsed;
}

export async function analyzeCampaign(metrics: {
  name: string;
  totalSent: number;
  delivered: number;
  failed: number;
  opened: number;
  read: number;
  clicked: number;
  conversions: number;
}) {

  const model = getModel();

  const deliveryRate = metrics.totalSent
    ? ((metrics.delivered / metrics.totalSent) * 100).toFixed(1)
    : 0;

  const openRate = metrics.delivered
    ? ((metrics.opened / metrics.delivered) * 100).toFixed(1)
    : 0;

  const clickRate = metrics.opened
    ? ((metrics.clicked / metrics.opened) * 100).toFixed(1)
    : 0;


  const result = await model.generateContent(`${ANALYST_SYSTEM_PROMPT}

Campaign: "${metrics.name}"

Total sent: ${metrics.totalSent}
Delivered: ${metrics.delivered} (${deliveryRate}%)
Failed: ${metrics.failed}
Opened: ${metrics.opened} (${openRate}%)
Read: ${metrics.read}
Clicked: ${metrics.clicked} (${clickRate}%)
Conversions: ${metrics.conversions}

Provide analysis:`);


  return result.response.text().trim();
}