const express = require('express');
const { readAll } = require('../db');

const router = express.Router();

const DEFAULT_ENDPOINT = process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const DEFAULT_IMAGE_ENDPOINT = process.env.AI_IMAGE_ENDPOINT || 'https://api.openai.com/v1/images/generations';
const DEFAULT_IMAGE_MODEL = process.env.AI_IMAGE_MODEL || 'gpt-image-1';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const DEFAULT_GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';
const OPENROUTER_API_BASE = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const DEFAULT_OPENROUTER_IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL || 'openai/gpt-5-image';
const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_PAID_IMAGE_MODE = ['1', 'true', 'yes', 'on'].includes(String(process.env.GEMINI_PAID_IMAGE_MODE || '').trim().toLowerCase());
const GEMINI_IMAGE_MAX_COUNT = GEMINI_PAID_IMAGE_MODE
  ? Math.min(4, Math.max(1, Number.parseInt(process.env.GEMINI_IMAGE_MAX_COUNT || '4', 10) || 4))
  : 1;

const GEMINI_TEXT_MODELS = new Set([
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
]);
const GEMINI_IMAGE_MODELS = new Set([
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-lite-image',
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
]);
let openRouterModelsCache = { at: 0, models: [] };

async function getOpenRouterModels() {
  const now = Date.now();
  if (openRouterModelsCache.models.length && now - openRouterModelsCache.at < 10 * 60 * 1000) {
    return openRouterModelsCache.models;
  }
  const response = await fetch(`${OPENROUTER_API_BASE}/models`);
  if (!response.ok) throw new Error(`OpenRouter model catalog request failed (${response.status}).`);
  const payload = await response.json();
  const models = (Array.isArray(payload?.data) ? payload.data : [])
    .filter((model) => model?.id && model?.name)
    .map((model) => {
      const prompt = Number(model?.pricing?.prompt || 0);
      const completion = Number(model?.pricing?.completion || 0);
      const imageOutput = Number(model?.pricing?.image_output || model?.pricing?.image || 0);
      const modalities = model?.architecture?.output_modalities || [];
      return {
        id: String(model.id),
        name: String(model.name),
        // A model with free text tokens may still charge for generated pixels.
        // Mark it free only when both the text and image output are zero-cost.
        free: prompt === 0 && completion === 0 && imageOutput === 0,
        image: /image/i.test(String(model.id)) || modalities.includes('image'),
        imageOutput,
        contextLength: Number(model.context_length || 0),
      };
    });
  openRouterModelsCache = { at: now, models };
  return models;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map(v => v.trim())
      .filter(Boolean);
  }
  return [];
}

function parseModelJson(content) {
  if (!content || typeof content !== 'string') return null;
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function sanitizeOutput(result) {
  return {
    hook: decodeHtmlEntities(result?.hook).trim(),
    caption: decodeHtmlEntities(result?.caption).trim(),
    hashtags: normalizeArray(result?.hashtags).map(decodeHtmlEntities).slice(0, 20),
    imagePrompts: normalizeArray(result?.imagePrompts).map(decodeHtmlEntities).slice(0, 5),
    cta: decodeHtmlEntities(result?.cta).trim(),
    bestPostTime: String(result?.bestPostTime || '').trim(),
    trendAngle: String(result?.trendAngle || '').trim(),
  };
}

function toHashtag(value) {
  return `#${String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '')
    .trim()}`;
}

function buildFallbackOutput({ topic, platform, tone, goal, audience, language }) {
  const topicText = String(topic || '').trim();
  const toneText = String(tone || 'bold and energetic').trim();
  const goalText = String(goal || 'engagement and shares').trim();
  const audienceText = String(audience || 'Indian young adults').trim();
  const platformText = String(platform || 'instagram').trim();
  const languageText = String(language || 'Hinglish').trim();

  const words = topicText.split(/\s+/).filter(Boolean);
  const topicShort = words.slice(0, 4).join(' ') || 'your next big idea';

  const baseTags = [
    toHashtag(topicShort),
    toHashtag(platformText),
    toHashtag(goalText.split(/\s+/).slice(0, 2).join(' ')),
    '#YehMeraIndia',
    '#PostizAI',
  ].filter((tag) => tag && tag !== '#');

  return sanitizeOutput({
    hook: `${topicShort} - made for scroll-stopping impact`,
    caption: `Fresh drop for ${audienceText}: ${topicText}. Keeping it ${toneText} and focused on ${goalText}. Save this for your next ${platformText} plan.`,
    hashtags: Array.from(new Set(baseTags)).slice(0, 8),
    imagePrompts: [
      `Create a premium ${platformText} visual about ${topicText}. Tone: ${toneText}. Audience: ${audienceText}. Language style cue: ${languageText}.`,
    ],
    cta: 'Comment your favorite pick and DM for details.',
    bestPostTime: '7:30 PM - 9:00 PM IST',
    trendAngle: 'Lifestyle-driven visual storytelling with clear product focus.',
  });
}

function isQuotaError(status, rawBody) {
  if (Number(status) === 429) return true;
  const text = String(rawBody || '').toLowerCase();
  return (
    text.includes('insufficient_quota') ||
    text.includes('credit_balance_exhausted') ||
    text.includes('no credits remaining')
  );
}

function normalizeRows(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && row.provider)
    .map((row) => ({
      provider: String(row.provider).toLowerCase(),
      label: String(row.label || '').trim(),
      client_id: String(row.client_id || ''),
      client_secret: String(row.client_secret || ''),
      is_active: !!row.is_active,
      updated_at: row.updated_at || '',
    }));
}

function chooseActive(rows, provider) {
  const candidates = rows.filter((row) => row.provider === provider);
  if (candidates.length === 0) return null;
  const active = candidates.find((row) => row.is_active);
  if (active) return active;
  return candidates
    .slice()
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0];
}

function resolveProvider(body) {
  const requested = String(body?.provider || 'auto').trim().toLowerCase();
  if (requested === 'gemini' || requested === 'openai' || requested === 'openrouter') return requested;

  const rows = normalizeRows(readAll());
  const hasGeminiCredential = !!chooseActive(rows, 'gemini')?.client_id;
  return hasGeminiCredential || !!String(process.env.GEMINI_API_KEY || '').trim()
    ? 'gemini'
    : 'openai';
}

function buildFallbackRewrite({ content, mood, audience, area, language }) {
  const source = String(content || '').trim();
  const moodText = String(mood || 'friendly').trim();
  const audienceText = String(audience || 'your audience').trim();
  const areaText = String(area || '').trim();
  const languageText = String(language || 'Hinglish').trim();
  const openings = {
    professional: 'A clearer update for',
    excited: 'Big energy for',
    'luxurious and aspirational': 'A premium note for',
    playful: 'A fun update for',
    'urgent but trustworthy': 'A timely update for',
    'warm and empathetic': 'A warm note for',
  };
  const opening = openings[moodText] || 'A friendly update for';
  const location = areaText ? ` in ${areaText}` : '';
  return `${opening} ${audienceText}${location}.\n\n${source}\n\n— Refined in a ${moodText} ${languageText} style.`;
}

function resolveApiKey(body, provider) {
  const directKey = String(body?.apiKey || '').trim();
  if (directKey) return directKey;

  const rows = normalizeRows(readAll());
  const active = chooseActive(rows, provider);
  if (active?.client_id) return String(active.client_id).trim();

  if (provider === 'gemini') return String(process.env.GEMINI_API_KEY || '').trim();
  if (provider === 'openrouter') return String(process.env.OPENROUTER_API_KEY || '').trim();
  return String(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
}

function openAiCompatibleConfig(provider, token) {
  if (provider === 'openrouter') {
    return {
      endpoint: `${OPENROUTER_API_BASE}/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:4007',
        'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME || 'Postiz Local',
      },
    };
  }
  return {
    endpoint: DEFAULT_ENDPOINT,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  };
}

async function generateOpenAiCompatible({ provider, token, model, messages, temperature = 0.85, tools }) {
  const config = openAiCompatibleConfig(provider, token);
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify({ model, temperature, messages, ...(tools ? { tools } : {}) }),
  });
  const raw = await response.text();
  return { response, raw, payload: response.ok ? JSON.parse(raw) : null };
}

function findImageUrls(value, found = []) {
  if (!value) return found;
  if (typeof value === 'string') {
    const urls = value.match(/https?:\/\/[^\s"'<>`\\)]+/g) || [];
    urls.forEach((url) => found.push(url));
    return found;
  }
  if (Array.isArray(value)) { value.forEach((entry) => findImageUrls(entry, found)); return found; }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => {
      if (['imageurl', 'image_url', 'url'].includes(String(key).toLowerCase()) && typeof entry === 'string') found.push(entry);
      else findImageUrls(entry, found);
    });
  }
  return found;
}

async function tryGenerateOpenRouterImageWithTool({ token, prompt, model, imageModel, size }) {
  try {
    const aspectRatio = String(size) === '1792x1024' ? '16:9' : String(size) === '1024x1792' ? '9:16' : '1:1';
    const result = await generateOpenAiCompatible({
      provider: 'openrouter',
      token,
      model: String(model || DEFAULT_OPENROUTER_MODEL),
      messages: [{ role: 'user', content: `Generate exactly one campaign image. ${prompt}` }],
      temperature: 0.7,
      tools: [{ type: 'openrouter:image_generation', parameters: {
        model: String(imageModel || DEFAULT_OPENROUTER_IMAGE_MODEL),
        size: String(size || '1024x1024'), aspect_ratio: aspectRatio, quality: 'high', output_format: 'jpeg',
      } }],
    });
    if (!result.response.ok) return { url: null, quotaExceeded: isQuotaError(result.response.status, result.raw), error: result.raw };
    const url = findImageUrls(result.payload).find((candidate) => /^https?:\/\//.test(candidate));
    if (!url) return { url: null, quotaExceeded: false, error: 'OpenRouter completed but did not return an image URL.' };
    // The Postiz browser must upload the generated asset to its media library.
    // Convert the remote result to a data URL here so a third-party CORS policy
    // cannot break that browser-side upload.
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) return { url, quotaExceeded: false };
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = String(imageResponse.headers.get('content-type') || 'image/png').split(';')[0];
    return { url: `data:${mimeType};base64,${bytes.toString('base64')}`, quotaExceeded: false };
  } catch (error) {
    return { url: null, quotaExceeded: false, error: error?.message || 'OpenRouter image request failed.' };
  }
}

async function tryGenerateOpenRouterImage({ token, prompt, model, imageModel, size }) {
  const aspectRatio = String(size) === '1792x1024' ? '16:9' : String(size) === '1024x1792' ? '9:16' : '1:1';
  const config = openAiCompatibleConfig('openrouter', token);
  const selectedImageModel = String(imageModel || DEFAULT_OPENROUTER_IMAGE_MODEL);

  // Use the dedicated Images API first. Unlike the beta chat server tool, it
  // never depends on a separate text model deciding to invoke image creation.
  try {
    // Do not send output_format, quality, or a made-up pixel size here.  The
    // Image API validates each field against the selected model's published
    // capabilities.  For example, Gemini 2.5 Flash Image supports
    // aspect_ratio but rejects output_format.  Request only the portable
    // parameters, then use the media_type returned by OpenRouter.
    const commonBody = { model: selectedImageModel, prompt: String(prompt || ''), n: 1 };
    // A few image providers expose no aspect-ratio control. A rejected 4xx
    // request is not a completed image and therefore is safe to retry with the
    // absolute minimum request shape.
    const requestBodies = [{ ...commonBody, aspect_ratio: aspectRatio }, commonBody];
    for (let attempt = 0; attempt < requestBodies.length; attempt += 1) {
      const response = await fetch(`${OPENROUTER_API_BASE}/images`, {
        method: 'POST', headers: config.headers, body: JSON.stringify(requestBodies[attempt]),
      });
      const raw = await response.text();
      let payload = null;
      try { payload = raw ? JSON.parse(raw) : null; } catch (_) { /* preserve raw error below */ }
      const image = Array.isArray(payload?.data) ? payload.data[0] : null;
      if (response.ok && image?.b64_json) {
        const mimeType = String(image.media_type || 'image/jpeg').split(';')[0];
        return { url: `data:${mimeType};base64,${image.b64_json}`, quotaExceeded: false };
      }
      const responseError = String(
        payload?.error?.message || payload?.message || raw ||
        (response.ok ? 'OpenRouter returned no image data.' : `OpenRouter Images request failed (${response.status}).`)
      );
      console.warn(`[AI image] OpenRouter ${response.status} for ${selectedImageModel}: ${responseError.slice(0, 300)}`);
      if (response.ok) return { url: null, quotaExceeded: false, error: responseError };
      if ((response.status === 400 || response.status === 422) && attempt === 0) continue;
      if (response.status !== 404 && response.status !== 422) {
        return { url: null, quotaExceeded: isQuotaError(response.status, raw), error: responseError };
      }
    }
  } catch (error) {
    // Fall through to the server-tool compatibility path below.
  }

  // Some catalog entries are chat-only image models. Retain the tool path as
  // a compatibility fallback for those models.
  return tryGenerateOpenRouterImageWithTool({ token, prompt, model, imageModel: selectedImageModel, size });
}

async function generateWithGemini({ token, model, prompt }) {
  const selectedModel = GEMINI_TEXT_MODELS.has(String(model || '')) ? String(model) : DEFAULT_GEMINI_MODEL;
  const response = await fetch(`${GEMINI_API_BASE}/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': token },
    body: JSON.stringify({
      model: selectedModel,
      input: `You are a high-performing social media strategist. Create trendy, tasteful, high-engagement social copy for Indian audiences. Return ONLY valid JSON with keys hook, caption, hashtags, imagePrompts, cta, bestPostTime, trendAngle. Keep hashtags relevant and not spammy.\n\n${prompt}`,
      store: false,
    }),
  });
  const raw = await response.text();
  const payload = response.ok ? JSON.parse(raw) : null;
  const content = String(payload?.output_text || '') || (payload?.steps || [])
    .filter((step) => step?.type === 'model_output')
    .flatMap((step) => step?.content || [])
    .filter((part) => part?.type === 'text')
    .map((part) => part?.text || '')
    .join('');
  return { response, raw, content };
}

async function tryGenerateGeminiImage({ token, prompt, model, size = '1024x1024' }) {
  const selectedModel = GEMINI_IMAGE_MODELS.has(String(model || '')) ? String(model) : DEFAULT_GEMINI_IMAGE_MODEL;
  const aspectRatio = String(size) === '1792x1024' ? '16:9' : String(size) === '1024x1792' ? '9:16' : '1:1';
  try {
    const response = await fetch(`${GEMINI_API_BASE}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': token },
      body: JSON.stringify({
        model: selectedModel,
        input: prompt,
        response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: aspectRatio, image_size: '1K' },
        store: false,
      }),
    });
    const raw = await response.text();
    if (!response.ok) return { url: null, quotaExceeded: isQuotaError(response.status, raw), error: raw };
    const payload = JSON.parse(raw);
    const image = payload?.output_image || (payload?.steps || [])
      .filter((step) => step?.type === 'model_output')
      .flatMap((step) => step?.content || [])
      .find((part) => part?.type === 'image' && part?.data);
    const responseError = String(payload?.error?.message || payload?.status_message || '').trim();
    const outputTypes = (payload?.steps || [])
      .filter((step) => step?.type === 'model_output')
      .flatMap((step) => step?.content || [])
      .map((part) => part?.type)
      .filter(Boolean)
      .join(', ');
    return image?.data
      ? { url: `data:${image.mime_type || 'image/png'};base64,${image.data}`, quotaExceeded: false }
      : { url: null, quotaExceeded: false, error: responseError || `Gemini returned no image data (status: ${payload?.status || 'unknown'}; output: ${outputTypes || 'none'}). Verify that the selected image model is enabled for this API key and project.` };
  } catch (error) {
    return { url: null, quotaExceeded: false, error: error?.message || 'Gemini image request failed.' };
  }
}

function fillTemplate(template, values) {
  let out = String(template || '');
  Object.entries(values).forEach(([key, value]) => {
    out = out.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), String(value || ''));
  });
  return out;
}

function buildImagePrompt({
  imagePromptTemplate,
  brandName,
  tagline,
  topic,
  tone,
  goal,
  audience,
  language,
  imageObjects,
  imageMoods,
  imageStyle,
  imageLighting,
  fallbackPrompt,
}) {
  const objectsText = normalizeArray(imageObjects).join(', ');
  const moodsText = normalizeArray(imageMoods).join(', ');
  const styleText = String(imageStyle || '').trim();
  const lightingText = String(imageLighting || '').trim();

  const directives = [
    objectsText ? `Preferred objects: ${objectsText}` : null,
    moodsText ? `Mood options: ${moodsText}` : null,
    styleText ? `Visual style preference: ${styleText}` : null,
    lightingText ? `Lighting preference: ${lightingText}` : null,
  ].filter(Boolean).join('\n');

  const subjectGuard = [
    `Mandatory subject: ${String(topic || '').trim()}.`,
    'Show this exact campaign product, service, occasion, or offer prominently.',
    'Do not replace it with an unrelated product, room, furniture item, or stock-scene concept.',
    'Leave a clean, low-detail strip across the top of the composition for the exact brand lockup that Postiz applies after generation.',
    'Do not generate logos, captions, brand names, taglines, watermarks, or any other text yourself; Postiz adds the exact text after generation.',
  ].join(' ');
  const tpl = String(imagePromptTemplate || '').trim();
  if (!tpl) {
    const base = String(fallbackPrompt || '').trim();
    if (!base) return [subjectGuard, directives].filter(Boolean).join('\n\n');
    return [base, subjectGuard, directives].filter(Boolean).join('\n\n');
  }

  const templated = fillTemplate(tpl, {
    brand: brandName,
    tagline,
    topic,
    tone,
    goal,
    audience,
    language,
    objects: objectsText,
    moods: moodsText,
    style: String(imageStyle || '').trim(),
    lighting: String(imageLighting || '').trim(),
  }).trim();

  return [templated, subjectGuard, directives].filter(Boolean).join('\n\n').trim();
}

async function tryGenerateImageUrl({ token, prompt, size = '1024x1024' }) {
  if (!token || !prompt) return null;

  try {
    const response = await fetch(DEFAULT_IMAGE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: DEFAULT_IMAGE_MODEL,
        prompt,
        size,
      }),
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => '');
      if (isQuotaError(response.status, raw)) {
        return { url: null, quotaExceeded: true };
      }
      return { url: null, quotaExceeded: false };
    }

    const payload = await response.json().catch(() => null);
    const first = payload?.data?.[0];
    if (!first) return { url: null, quotaExceeded: false };

    if (first.url) return { url: String(first.url), quotaExceeded: false };
    if (first.b64_json) return { url: `data:image/png;base64,${first.b64_json}`, quotaExceeded: false };
    return { url: null, quotaExceeded: false };
  } catch {
    return { url: null, quotaExceeded: false };
  }
}

function clampImageCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.floor(n)));
}

function pickFromList(list, index) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return String(list[index % list.length] || '').trim();
}

function buildImageVariantPrompt(basePrompt, index, directives = {}) {
  const mood = pickFromList(directives.moods, index);
  const objectFocus = pickFromList(directives.objects, index);
  const style = String(directives.style || '').trim();
  const lighting = String(directives.lighting || '').trim();

  const guidance = [
    `Carousel panel ${index + 1}: keep the same brand identity and typography, but create a visually distinct image that does not repeat another panel.`,
    mood ? `Mood focus: ${mood}.` : 'Mood focus: change emotional tone significantly from prior image.',
    objectFocus ? `Primary object focus: ${objectFocus}.` : 'Primary object focus: use a different hero product/object than previous image.',
    style ? `Visual style direction: ${style}.` : null,
    lighting ? `Lighting direction: ${lighting}.` : null,
    'Also change camera angle, composition, and depth while preserving photorealism and premium quality.',
  ].filter(Boolean).join(' ');

  return `${basePrompt}\n\n${guidance}`;
}

router.get('/models', async (req, res) => {
  try {
    const includePaid = ['1', 'true', 'yes'].includes(String(req.query.includePaid || '').toLowerCase());
    const models = await getOpenRouterModels();
    const textModels = models
      .filter((model) => !model.image && (includePaid || model.free))
      .sort((a, b) => Number(b.free) - Number(a.free) || a.name.localeCompare(b.name));
    // OpenRouter currently lists no zero-price image generators. Always return
    // image-capable models so the composer can show Nano Banana/Gemini choices
    // instead of an unusable empty selector.
    const preferredImageModels = [
      'google/gemini-3.1-flash-image',
      'google/gemini-2.5-flash-image',
      'google/gemini-3.1-flash-lite-image',
    ];
    const imageModels = models
      .filter((model) => model.image && !/^openrouter\/auto(?:$|:)/.test(model.id))
      .sort((a, b) => {
        const aPriority = preferredImageModels.indexOf(a.id);
        const bPriority = preferredImageModels.indexOf(b.id);
        return (aPriority < 0 ? 99 : aPriority) - (bPriority < 0 ? 99 : bPriority)
          || Number(b.free) - Number(a.free)
          || a.name.localeCompare(b.name);
      });
    res.json({ provider: 'openrouter', includePaid, textModels, imageModels, refreshedAt: new Date(openRouterModelsCache.at).toISOString() });
  } catch (error) {
    res.status(502).json({ error: error?.message || 'Could not load the OpenRouter model catalog.' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const {
      topic,
      platform = 'instagram',
      audience = 'Indian young adults',
      area = '',
      tone = 'bold and energetic',
      goal = 'engagement and shares',
      language = 'Hinglish',
      includeEmojis = true,
      brandVoice = '',
      keyPoints = '',
      generateImage = true,
      imageSize = '1024x1024',
      imageCount = 1,
      imagePromptTemplate = '',
      brandName = 'JK Mall',
      tagline = 'Where Spaces Become Yours.',
      imageObjects = '',
      imageMoods = 'luxury, cozy, modern, festive, dramatic',
      imageStyle = 'ultra-premium commercial photography',
      imageLighting = 'cinematic warm ambient lighting',
      provider = 'auto',
      imageProvider = '',
      model,
      imageModel,
      apiKey,
    } = req.body || {};

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const textProvider = resolveProvider({ ...(req.body || {}), provider });
    const requestedImageProvider = String(imageProvider || '').trim().toLowerCase();
    const resolvedImageProvider = ['gemini', 'openrouter'].includes(requestedImageProvider)
      ? requestedImageProvider
      : (textProvider === 'openrouter' ? 'openrouter' : 'gemini');
    const textToken = resolveApiKey({ ...(req.body || {}), apiKey }, textProvider);
    const imageToken = generateImage
      ? resolveApiKey(req.body || {}, resolvedImageProvider)
      : '';
    if (!textToken) {
      return res.status(400).json({
        error: `${textProvider === 'openrouter' ? 'OpenRouter' : textProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key missing. Save an active credential in Admin UI for post writing.`,
      });
    }
    if (generateImage && !imageToken) {
      return res.status(400).json({ error: `${resolvedImageProvider === 'openrouter' ? 'OpenRouter' : 'Gemini'} API key missing. Save an active credential in Admin UI for image generation.` });
    }

    const prompt = [
      `Topic: ${topic}`,
      `Platform: ${platform}`,
      `Audience: ${audience}`,
      String(area || '').trim() ? `Area / service location: ${String(area).trim()}` : null,
      `Tone: ${tone}`,
      `Goal: ${goal}`,
      `Language: ${language}`,
      `Use emojis: ${includeEmojis ? 'yes' : 'no'}`,
      brandVoice ? `Brand voice: ${brandVoice}` : null,
      keyPoints ? `Must include points: ${keyPoints}` : null,
      normalizeArray(imageObjects).length ? `Image object focus: ${normalizeArray(imageObjects).join(', ')}` : null,
      normalizeArray(imageMoods).length ? `Image mood options: ${normalizeArray(imageMoods).join(', ')}` : null,
      String(imageStyle || '').trim() ? `Image style preference: ${String(imageStyle || '').trim()}` : null,
      String(imageLighting || '').trim() ? `Image lighting preference: ${String(imageLighting || '').trim()}` : null,
      `Date context: ${new Date().toISOString().slice(0, 10)}`,
      'Writing rules: use simple natural Hinglish that a real Indian customer understands. Keep the hook to one short line, caption to 2-4 short sentences, and CTA to one short sentence. Do not use HTML, encoded entities, made-up slogans, repetitive words, or confusing punctuation. Do not state a discount, deadline, price, or offer condition unless the topic or must-include points explicitly supplies it.',
    ].filter(Boolean).join('\n');

    let output = null;
    let freeMode = false;
    let freeModeReason = '';

    const schemaPrompt = `${prompt}\n\nOutput schema:\n{\n  "hook": "string",\n  "caption": "string",\n  "hashtags": ["#one", "#two"],\n  "imagePrompts": ["prompt 1", "prompt 2"],\n  "cta": "string",\n  "bestPostTime": "string",\n  "trendAngle": "string"\n}`;
    let response;
    let raw;
    let payload;
    let content;
    if (textProvider === 'gemini') {
      const gemini = await generateWithGemini({ token: textToken, model, prompt: schemaPrompt });
      response = gemini.response; raw = gemini.raw; content = gemini.content;
    } else {
      const completion = await generateOpenAiCompatible({
        provider: textProvider,
        token: textToken,
        model: model || (textProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : DEFAULT_MODEL),
        messages: [
          {
            role: 'system',
            content:
              'You write clear, natural marketing copy for Indian customers. Return ONLY valid JSON with keys hook, caption, hashtags, imagePrompts, cta, bestPostTime, trendAngle. Make the wording coherent and specific to the topic. Never use HTML or HTML entities. Never invent discounts, prices, deadlines, addresses, or claims. Use at most 4 relevant hashtags and no hashtag stuffing.',
          },
          {
            role: 'user',
            content: schemaPrompt,
          },
        ],
      });
      response = completion.response; raw = completion.raw; payload = completion.payload;
      content = payload?.choices?.[0]?.message?.content;
    }

    if (!response.ok) {
      if (isQuotaError(response.status, raw)) {
        output = buildFallbackOutput({ topic, platform, tone, goal, audience, language });
        freeMode = true;
        freeModeReason = `${textProvider} quota exhausted. Using built-in free fallback output.`;
      } else {
        return res.status(response.status).json({ error: `AI generation failed: ${raw.slice(0, 500)}` });
      }
    } else {
      const parsed = parseModelJson(content);
      if (!parsed) {
        output = buildFallbackOutput({ topic, platform, tone, goal, audience, language });
        freeMode = true;
        freeModeReason = 'Model returned non-JSON output. Using built-in free fallback output.';
      } else {
        output = sanitizeOutput(parsed);
      }
    }

    if (!output.caption) {
      return res.status(502).json({ error: 'AI result missing caption. Try regenerating.' });
    }

    const primaryPrompt = output.imagePrompts.length > 0 ? output.imagePrompts[0] : '';
    const imagePromptUsed = buildImagePrompt({
      imagePromptTemplate,
      brandName,
      tagline,
      topic,
      tone,
      goal,
      audience,
      language,
      imageObjects,
      imageMoods,
      imageStyle,
      imageLighting,
      fallbackPrompt: primaryPrompt,
    });

    if (imagePromptUsed) {
      output.imagePrompts = [imagePromptUsed, ...output.imagePrompts.filter((p) => p !== imagePromptUsed)].slice(0, 5);
    }

    const generatedImages = [];
    let imageQuotaExceeded = false;
    let imageGenerationError = '';
    let mediaGenerationNotice = '';
    let imageProviderUsed = resolvedImageProvider;
    let imageProviderFallbackNotice = '';
    if (generateImage && imagePromptUsed) {
      const requestedCount = clampImageCount(imageCount);
      const count = Math.min(requestedCount, GEMINI_IMAGE_MAX_COUNT);
      if (requestedCount > GEMINI_IMAGE_MAX_COUNT) {
        mediaGenerationNotice = GEMINI_PAID_IMAGE_MODE
          ? `Gemini is configured for a maximum of ${GEMINI_IMAGE_MAX_COUNT} carousel images per post.`
          : 'Multi-image Gemini generation is disabled. Set GEMINI_PAID_IMAGE_MODE=true after enabling paid Gemini image billing.';
      }
      const directives = {
        moods: normalizeArray(imageMoods),
        objects: normalizeArray(imageObjects),
        style: imageStyle,
        lighting: imageLighting,
      };
      for (let i = 0; i < count; i += 1) {
        const variantPrompt = buildImageVariantPrompt(imagePromptUsed, i, directives);
        let imageResult = resolvedImageProvider === 'openrouter'
          ? await tryGenerateOpenRouterImage({ token: imageToken, prompt: variantPrompt, model: model || DEFAULT_OPENROUTER_MODEL, imageModel, size: imageSize })
          : await tryGenerateGeminiImage({ token: imageToken, prompt: variantPrompt, model: imageModel, size: imageSize });
        // OpenRouter free-tier accounts can write text but cannot generate
        // images until credits are purchased.  If the workspace has a Gemini
        // key, preserve the user's post flow by using it as an explicit,
        // reported fallback instead of dropping the requested image.
        if (resolvedImageProvider === 'openrouter' && !imageResult?.url && imageResult?.quotaExceeded) {
          const geminiFallbackToken = resolveApiKey(req.body, 'gemini');
          if (geminiFallbackToken) {
            const geminiResult = await tryGenerateGeminiImage({
              token: geminiFallbackToken,
              prompt: variantPrompt,
              model: DEFAULT_GEMINI_IMAGE_MODEL,
              size: imageSize,
            });
            if (geminiResult?.url) {
              imageResult = geminiResult;
              imageProviderUsed = 'gemini';
              imageProviderFallbackNotice = 'OpenRouter image credits were unavailable, so Gemini generated this image.';
            }
          }
        }
        if (imageResult?.quotaExceeded) {
          imageQuotaExceeded = true;
          break;
        }
        if (imageResult?.url) generatedImages.push(imageResult.url);
        else if (imageResult?.error) imageGenerationError = String(imageResult.error).slice(0, 500);
      }
    }

    return res.json({
      ...output,
      freeMode,
      freeModeReason,
      imageQuotaExceeded,
      imageGenerationError,
      imagePromptUsed,
      generatedImage: generatedImages[0] || null,
      generatedImages,
      provider: { text: textProvider, image: imageProviderUsed },
      imageProviderFallbackNotice,
      paidImageMode: GEMINI_PAID_IMAGE_MODE,
      imageLimit: GEMINI_IMAGE_MAX_COUNT,
      mediaGenerationNotice,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

router.post('/rewrite', async (req, res) => {
  try {
    const {
      content,
      mood = 'friendly',
      audience = 'general audience',
      area = '',
      language = 'Hinglish',
      model,
      apiKey,
      provider = 'openai',
    } = req.body || {};
    const source = String(content || '').trim();
    if (!source) return res.status(400).json({ error: 'Write a post in the composer before rewriting it.' });

    const requestedProvider = String(provider || 'openai').toLowerCase();
    const selectedProvider = ['gemini', 'openrouter'].includes(requestedProvider) ? requestedProvider : 'openai';
    const token = resolveApiKey({ ...(req.body || {}), apiKey }, selectedProvider);
    if (!token) return res.status(400).json({ error: `${selectedProvider === 'gemini' ? 'Gemini' : selectedProvider === 'openrouter' ? 'OpenRouter' : 'OpenAI'} API key missing. Save an active credential in Admin UI for rewriting.` });

    const instruction = [
      'Rewrite the following organic social-media post. Return only the finished post, without labels, commentary, or quotation marks.',
      `Mood / feeling: ${mood}.`,
      `Audience: ${audience}.`,
      String(area || '').trim() ? `Area or service location: ${String(area).trim()}. Mention it naturally only when useful.` : null,
      `Language: ${language}.`,
      'Keep factual claims, calls-to-action, and any existing hashtags unless improving their relevance. Do not invent prices, offers, addresses, or guarantees.',
      `Post to rewrite:\n${source}`,
    ].filter(Boolean).join('\n\n');

    let rewritten = '';
    if (selectedProvider === 'gemini') {
      const selectedModel = GEMINI_TEXT_MODELS.has(String(model || '')) ? String(model) : DEFAULT_GEMINI_MODEL;
      const response = await fetch(`${GEMINI_API_BASE}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': token },
        body: JSON.stringify({ model: selectedModel, input: instruction, store: false }),
      });
      const raw = await response.text();
      if (!response.ok) {
        if (isQuotaError(response.status, raw)) {
          return res.json({
            content: buildFallbackRewrite({ content: source, mood, audience, area, language }),
            provider: 'local-fallback',
            notice: 'Gemini quota is exhausted, so a local rewrite fallback was used.',
          });
        }
        return res.status(response.status).json({ error: `AI rewrite failed: ${raw.slice(0, 500)}` });
      }
      const payload = JSON.parse(raw);
      rewritten = String(payload?.output_text || '') || (payload?.steps || [])
        .filter((step) => step?.type === 'model_output')
        .flatMap((step) => step?.content || [])
        .filter((part) => part?.type === 'text')
        .map((part) => part?.text || '')
        .join('');
    } else {
      const completion = await generateOpenAiCompatible({
        provider: selectedProvider,
        token,
        model: model || (selectedProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : DEFAULT_MODEL),
        temperature: 0.7,
        messages: [{ role: 'user', content: instruction }],
      });
      const response = completion.response;
      const raw = completion.raw;
      if (!response.ok) {
        if (isQuotaError(response.status, raw)) {
          return res.json({
            content: buildFallbackRewrite({ content: source, mood, audience, area, language }),
            provider: 'local-fallback',
            notice: `${selectedProvider === 'openrouter' ? 'OpenRouter' : 'OpenAI'} API credits are exhausted, so a local rewrite fallback was used.`,
          });
        }
        return res.status(response.status).json({ error: `AI rewrite failed: ${raw.slice(0, 500)}` });
      }
      rewritten = String(completion.payload?.choices?.[0]?.message?.content || '');
    }
    rewritten = rewritten.trim();
    if (!rewritten) return res.status(502).json({ error: 'AI returned an empty rewrite. Please try again.' });
    return res.json({ content: rewritten, provider: selectedProvider });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'AI rewrite failed' });
  }
});

module.exports = router;
