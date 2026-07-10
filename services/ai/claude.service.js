import aiConfig from "../../config/ai.config.js";

export async function callAI(prompt, options = {}) {
  const {
    maxTokens = aiConfig.openrouter.maxTokens,
    temperature = aiConfig.openrouter.temperature,
  } = options;

  const provider = aiConfig.activeProvider;

  if (provider === "openrouter") {
    return await callOpenRouter(prompt, maxTokens, temperature);
  } else if (provider === "claude") {
    return await callClaude(prompt, maxTokens, temperature);
  }

  throw new Error(`Unknown AI provider: ${provider}`);
}

async function callOpenRouter(prompt, maxTokens, temperature) {

  const config = aiConfig.openrouter;
    console.log("Base URL:", config.baseUrl);
console.log("Model:", config.model);
console.log("Provider:", aiConfig.activeProvider);

  if (!config.apiKey) {
    console.log(`   ⚠️  OpenRouter API key not set — returning mock response`);
    return { text: "", success: false, reason: "no_api_key" };
  }

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://linkedin-automation.local",
        "X-Title": "LinkedIn Automation",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return {
      text,
      success: true,
      model: config.model,
      tokensUsed: data.usage?.total_tokens || 0,
    };
  } catch (err) {
    console.log(`   ❌ AI call failed: ${err.message}`);
    return { text: "", success: false, reason: err.message };
  }
}

async function callClaude(prompt, maxTokens, temperature) {
  const config = aiConfig.claude;

  if (!config.apiKey) {
    return { text: "", success: false, reason: "no_claude_api_key" };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    return {
      text,
      success: true,
      model: config.model,
      tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens || 0,
    };
  } catch (err) {
    return { text: "", success: false, reason: err.message };
  }
}

export async function parseAIJson(aiResponse) {
  try {
    const text = aiResponse.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
}