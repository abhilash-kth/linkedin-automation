import aiConfig from "../../config/ai.config.js";

/**
 * Try AI providers in fallback order
 * Rotates through multiple models to avoid rate limits
 */
export async function callAI(prompt, options = {}) {
  const { maxTokens = 1024, temperature = 0.7 } = options;

  const providers = aiConfig.providerFallbackOrder;

  for (const provider of providers) {
    let result;

    if (provider === "openrouter") {
      result = await callOpenRouterWithFallback(prompt, maxTokens, temperature);
    } else if (provider === "groq") {
      result = await callGroqWithFallback(prompt, maxTokens, temperature);
    } else if (provider === "claude") {
      result = await callClaude(prompt, maxTokens, temperature);
    }

    if (result && result.success) {
      return result;
    }
  }

  return { text: "", success: false, reason: "all_providers_failed" };
}

/**
 * Try OpenRouter with multiple model fallbacks
 */
async function callOpenRouterWithFallback(prompt, maxTokens, temperature) {
  const config = aiConfig.openrouter;

  if (!config.apiKey) {
    return { text: "", success: false, reason: "no_openrouter_key" };
  }

  for (const model of config.models) {
    const result = await callOpenRouterSingle(prompt, maxTokens, temperature, model);

    // Success — return immediately
    if (result.success) {
      return result;
    }

    // If it's a rate limit or model error, try next model
    if (result.reason?.includes("429") || result.reason?.includes("rate")) {
      console.log(`   🔄 OpenRouter ${model} rate-limited, trying next model...`);
      continue;
    }

    // If it's a different error, try next model
    if (result.reason?.includes("api_error") || result.reason?.includes("empty")) {
      console.log(`   🔄 OpenRouter ${model} failed, trying next model...`);
      continue;
    }
  }

  return { text: "", success: false, reason: "all_openrouter_models_failed" };
}

async function callOpenRouterSingle(prompt, maxTokens, temperature, model) {
  const config = aiConfig.openrouter;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kriscent.com",
        "X-Title": "Kriscent LinkedIn Automation",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        text: "",
        success: false,
        reason: `api_error_${response.status}`,
        errorDetail: errText.substring(0, 200),
      };
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      return { text: "", success: false, reason: "no_choices" };
    }

    const text = data.choices[0]?.message?.content || "";
    if (!text || text.trim().length === 0) {
      return { text: "", success: false, reason: "empty_response" };
    }

    return {
      text: text.trim(),
      success: true,
      model,
      provider: "openrouter",
      tokensUsed: data.usage?.total_tokens || 0,
    };
  } catch (err) {
    return { text: "", success: false, reason: err.message };
  }
}

/**
 * Try Groq with multiple model fallbacks (FREE, faster than OpenRouter)
 */
async function callGroqWithFallback(prompt, maxTokens, temperature) {
  const config = aiConfig.groq;

  if (!config.apiKey) {
    return { text: "", success: false, reason: "no_groq_key" };
  }

  for (const model of config.models) {
    const result = await callGroqSingle(prompt, maxTokens, temperature, model);

    if (result.success) {
      console.log(`   ✅ Groq ${model} succeeded`);
      return result;
    }

    if (result.reason?.includes("rate") || result.reason?.includes("429")) {
      console.log(`   🔄 Groq ${model} rate-limited, trying next...`);
      continue;
    }

    if (result.reason?.includes("api_error") || result.reason?.includes("empty")) {
      console.log(`   🔄 Groq ${model} failed, trying next...`);
      continue;
    }
  }

  return { text: "", success: false, reason: "all_groq_models_failed" };
}

async function callGroqSingle(prompt, maxTokens, temperature, model) {
  const config = aiConfig.groq;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        text: "",
        success: false,
        reason: `api_error_${response.status}`,
        errorDetail: errText.substring(0, 200),
      };
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      return { text: "", success: false, reason: "no_choices" };
    }

    const text = data.choices[0]?.message?.content || "";
    if (!text || text.trim().length === 0) {
      return { text: "", success: false, reason: "empty_response" };
    }

    return {
      text: text.trim(),
      success: true,
      model,
      provider: "groq",
      tokensUsed: data.usage?.total_tokens || 0,
    };
  } catch (err) {
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
      return { text: "", success: false, reason: `claude_${response.status}` };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    return {
      text,
      success: true,
      model: config.model,
      provider: "claude",
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };
  } catch (err) {
    return { text: "", success: false, reason: err.message };
  }
}

export async function parseAIJson(aiResponse) {
  try {
    const text = aiResponse.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch {
    return null;
  }
}