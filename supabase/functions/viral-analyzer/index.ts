/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
// Supabase Edge Function: viral-analyzer (v3 — FASE 1: Coleta Específica em 3 Raias)
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ─── CONSTANTES EDITÁVEIS DE REGRAS E PORTÕES DE COLETA ───────────────────
const MIN_VIEWS_RECRIAR = 5000;
const MIN_VIEWS_PAUTAS = 50; // Para pautas (HN, Reddit), 50 upvotes/pontos indica forte relevância
const MAX_AGE_SHORTS_HOURS = 72;
const MAX_AGE_YOUTUBE_HOURS = 168; // 7 dias
const MAX_AGE_PAUTAS_HOURS = 48; // 48h para notícias quentes

const AI_MODIFIERS = [
  "feito com IA",
  "AI generated",
  "Sora OR Kling OR Veo OR Runway OR Seedance",
];

const NEWS_FEEDS = [
  "https://techcrunch.com/category/artificial-intelligence/feed/",
  "https://venturebeat.com/category/ai/feed/",
  "https://theverge.com/rss/ai/index.xml",
];

const REDDIT_SUBREDDITS = [
  "r/aivideo",
  "r/singularity",
  "r/artificial",
  "r/StableDiffusion",
];

const YT_CATEGORY: Record<string, string> = {
  ia_tech: "28",
  entretenimento: "24",
  educacao: "27",
  lifestyle: "22",
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

function formatMetric(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}k`;
  return n.toLocaleString("pt-BR");
}

function regionToCode(region?: string): string {
  switch ((region || "").toLowerCase()) {
    case "brasil": case "br": return "BR";
    case "eua": case "us": return "US";
    case "europa": case "gb": return "GB";
    case "asia": case "jp": return "JP";
    default: return "US";
  }
}

function isoToSeconds(iso?: string): number {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Similaridade de Títulos para Deduplicação e Agrupamento ───────────────
function tokenizeTitle(text: string): Set<string> {
  const clean = text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(clean);
}

function titleSimilarity(a: string, b: string): number {
  const setA = tokenizeTitle(a);
  const setB = tokenizeTitle(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((w) => {
    if (setB.has(w)) intersection++;
  });
  const unionSet = new Set<string>();
  setA.forEach((w) => unionSet.add(w));
  setB.forEach((w) => unionSet.add(w));
  const union = unionSet.size;
  return union > 0 ? intersection / union : 0;
}

// ─── Interfaces de Dados ───────────────────────────────────────────────────
interface RawItem {
  idPrefix: string;
  postId: string;
  platform: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSec: number | null;
  publishedAt: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  followers: number | null;
  verified?: boolean;
  views: number;
  likes: number;
  comments: number;
  shares: number | null;
  saves: number | null;
  lane: 'recriar' | 'pautas';
  isAiGenerated: boolean | null;
  aiSignals: string[];
  sourceCount: number;
}

interface SearchBody {
  query?: string;
  niche?: string;
  platform?: string;
  region?: string;
  lane?: 'recriar' | 'pautas';
  pageToken?: string;
  refreshCount?: number;
  seenIds?: string[];
}

// ─── Motor de Score da Fase 1 (Estruturado com scoreBreakdown) ─────────────
function computeScoreAndBreakdown(r: RawItem, body: SearchBody) {
  const hours = Math.max(0.5, (Date.now() - new Date(r.publishedAt).getTime()) / 3_600_000);
  const views = Math.max(1, r.views);

  if (r.lane === 'pautas') {
    // Raia Pautas: Foco em frescor, múltiplas fontes e debate
    const freshnessPoints = clamp(Math.round((1 - hours / MAX_AGE_PAUTAS_HOURS) * 25), 0, 25);
    const multiSourcePoints = clamp(Math.min(r.sourceCount, 3) * 5, 5, 15);
    const velocityPoints = clamp(Math.round(Math.min(15, (views / hours) * 2)), 0, 15);
    const debateRatio = (r.comments * 4 + r.likes) / Math.max(10, views);
    const debatePoints = clamp(Math.round(debateRatio * 20), 2, 20);
    const scriptabilityPoints = 12; // Valor neutro antes do enriquecimento LLM na Fase 4

    const total = clamp(freshnessPoints + multiSourcePoints + velocityPoints + debatePoints + scriptabilityPoints, 10, 99);
    return {
      score: total,
      label: total >= 80 ? "Pauta Quente / Viral" : total >= 60 ? "Boa Pauta Validada" : "Pauta em Observação",
      variant: (total >= 80 ? "high" : total >= 60 ? "medium" : "low") as "high" | "medium" | "low",
      isTrendAlert: total >= 80,
      breakdown: {
        frescor: freshnessPoints,
        multiFonte: multiSourcePoints,
        velocidade: velocityPoints,
        debate: debatePoints,
        roteirizacao: scriptabilityPoints,
      },
      viewsPerHour: Math.round(views / hours),
      momentumScore: clamp(Math.round((views / hours) * 5), 5, 100),
      anomalyRatio: 1.0,
      windowRemainingHours: Math.max(2, Math.round(MAX_AGE_PAUTAS_HOURS - hours)),
      signalsEstimated: false,
    };
  }

  // Raia Recriar: Foco em Outlier, Velocidade, Engajamento e Formato Curto
  const followers = r.followers ?? 10000;
  const baseline = Math.max(200, followers * 0.08);
  const anomalyRatio = views / baseline;
  const outlierPoints = clamp(Math.round(25 * (Math.log2(Math.max(0.1, anomalyRatio)) / Math.log2(20))), 2, 25);

  const viewsPerHour = Math.round(views / Math.max(0.5, Math.pow(hours, 0.85)));
  const velocityPoints = clamp(Math.round(25 * (Math.log10(Math.max(10, viewsPerHour)) / Math.log10(50000))), 2, 25);

  const fullSignals = r.shares !== null && r.saves !== null;
  const likeRate = r.likes / views;
  const commentRate = r.comments / views;
  const shareRate = (r.shares ?? 0) / views;
  const saveRate = (r.saves ?? 0) / views;

  const rawEngagement = fullSignals
    ? 7 * shareRate + 5 * saveRate + 4 * commentRate + 1 * likeRate
    : 5 * commentRate + 2 * likeRate;
  const engagementPoints = clamp(Math.round(rawEngagement * 300), 2, 20);

  const recreatabilityPoints = 10; // Valor neutro antes do enriquecimento LLM na Fase 4

  // Bônus de formato: Shorts <= 60s ganha 5 pts, 61-180s ganha 3 pts
  let formatBonus = 2;
  if (r.durationSec !== null && r.durationSec <= 60) formatBonus = 5;
  else if (r.durationSec !== null && r.durationSec <= 180) formatBonus = 3;

  const freshnessBonus = hours <= 48 ? 5 : hours <= 96 ? 3 : 1;
  const formatFreshnessPoints = clamp(formatBonus + freshnessBonus, 2, 10);

  // Bônus lead-lag geográfico
  let leadLagBonus = 1.0;
  const src = (body.region || "").toLowerCase();
  const tgt = "brasil";
  if (["eua", "europa", "asia", "global", "us", "gb", "jp"].includes(src) && ["brasil", "br", "all"].includes(tgt)) {
    if (hours <= 36) leadLagBonus = 1.25;
    else if (hours <= 60) leadLagBonus = 1.15;
  }

  const rawTotal = (outlierPoints + velocityPoints + engagementPoints + recreatabilityPoints + formatFreshnessPoints) * leadLagBonus;
  const score = clamp(Math.round(rawTotal), 10, 99);

  return {
    score,
    label: score >= 80 ? "Viral / Atacar Agora" : score >= 60 ? "Médio Potencial / Validado" : "Baixo Potencial / Observar",
    variant: (score >= 80 ? "high" : score >= 60 ? "medium" : "low") as "high" | "medium" | "low",
    isTrendAlert: score >= 80,
    breakdown: {
      outlier: outlierPoints,
      velocidade: velocityPoints,
      engajamento: engagementPoints,
      recriabilidade: recreatabilityPoints,
      formatoFrescor: formatFreshnessPoints,
    },
    viewsPerHour,
    momentumScore: clamp(Math.round(velocityPoints * 4), 5, 100),
    anomalyRatio: Number(anomalyRatio.toFixed(2)),
    windowRemainingHours: Math.max(2, Math.round(72 - hours)),
    signalsEstimated: !fullSignals,
  };
}

// ─── Monta o Item Final no Formato da UI ───────────────────────────────────
function buildItem(r: RawItem, body: SearchBody) {
  const hours = Math.max(0.5, (Date.now() - new Date(r.publishedAt).getTime()) / 3_600_000);
  const calc = computeScoreAndBreakdown(r, body);
  const color = calc.variant === "high" ? "#23a55a" : calc.variant === "medium" ? "#f59e0b" : "#64748b";

  return {
    id: `${r.idPrefix}-${r.postId}`,
    post_id: r.postId,
    platform: r.platform,
    lane: r.lane,
    title: r.title,
    description: r.description || "",
    hookTranscript: `"${r.title.slice(0, 50)}..."`,
    videoUrl: r.videoUrl,
    thumbnailUrl: r.thumbnailUrl,
    durationFormatted: r.durationSec !== null ? formatDuration(r.durationSec) : "—",
    publishedAt: r.publishedAt,
    author: {
      name: r.authorName,
      handle: r.authorHandle,
      avatarUrl: r.authorAvatar,
      followersFormatted: r.followers !== null ? formatMetric(r.followers) : "—",
      verified: !!r.verified,
    },
    region: body.region || "global",
    niche: body.niche || "geral",
    stats: {
      viewsFormatted: formatMetric(r.views),
      viewsCount: r.views,
      likesFormatted: formatMetric(r.likes),
      sharesFormatted: r.shares !== null ? formatMetric(r.shares) : "—",
      commentsFormatted: formatMetric(r.comments),
    },
    rawCounts: {
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      saves: r.saves,
    },
    metrics: {
      engagementRate: Number(((r.likes + r.comments) / Math.max(1, r.views) * 100).toFixed(1)),
      sharesRatio: Number(((r.shares ?? 0) / Math.max(1, r.likes)).toFixed(2)),
      growthVelocity: `+${formatMetric(calc.viewsPerHour)} views/h`,
      growthVelocityNum: calc.momentumScore,
      viewsPerHour: calc.viewsPerHour,
      channelAnomalyRatio: calc.anomalyRatio,
      opportunityWindow: `Próximas ${calc.windowRemainingHours} horas`,
      hookStrength: clamp(Math.round(calc.score * 0.9 + 8), 50, 98),
      retentionPrediction: clamp(Math.round(calc.score * 0.85 + 10), 45, 95),
      signalsEstimated: calc.signalsEstimated,
    },
    score: calc.score,
    scoreBadge: { label: calc.label, variant: calc.variant, color },
    isTrendAlert: calc.isTrendAlert,
    isFresh: true,
    isAiGenerated: r.isAiGenerated,
    aiSignals: r.aiSignals,
    sourceCount: r.sourceCount,
    scoreBreakdown: calc.breakdown,
    recreatabilityPending: true,
  };
}

// ─── YOUTUBE (Raia RECRIAR com Shorts, Synthetic Media e Watchlist) ────────
async function ytJson(url: URL) {
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`YouTube: ${data?.error?.message || res.statusText} (${res.status})`);
  }
  return data;
}

async function fetchYouTube(body: SearchBody, key: string, seen: Set<string>, supabase: any): Promise<{ items: RawItem[]; nextPageToken?: string }> {
  const regionCode = regionToCode(body.region);
  const userQuery = (body.query || "").trim();
  const niche = body.niche || "geral";
  const lane = body.lane || "recriar";
  let ids: string[] = [];
  let nextPageToken: string | undefined;

  // 1. Montagem controlada de queries de IA (máximo 3 queries para limitar consumo da cota)
  if (userQuery) {
    const searchQueries: string[] = [
      `${userQuery} feito com IA`,
      `${userQuery} AI generated`,
      `${userQuery} (Sora OR Kling OR Veo OR Runway)`,
    ];

    for (const q of searchQueries) {
      try {
        const s = new URL("https://www.googleapis.com/youtube/v3/search");
        s.searchParams.set("part", "snippet");
        s.searchParams.set("type", "video");
        s.searchParams.set("maxResults", "15");
        s.searchParams.set("q", q);
        s.searchParams.set("regionCode", regionCode);
        if (regionCode === "BR") s.searchParams.set("relevanceLanguage", "pt");
        s.searchParams.set("order", "viewCount");
        const days = (body.refreshCount || 0) % 2 === 0 ? 7 : 30;
        s.searchParams.set("publishedAfter", new Date(Date.now() - days * 86_400_000).toISOString());
        s.searchParams.set("key", key);

        const sd = await ytJson(s);
        if (!nextPageToken && sd.nextPageToken) nextPageToken = sd.nextPageToken;
        const found = (sd.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
        ids.push(...found);
      } catch (err: any) {
        console.warn(`[YouTube Search Query Falhou]: ${err?.message}`);
      }
    }
  }

  // 2. Watchlist de Criadores Monitorados (Se existirem canais cadastrados no banco)
  if (supabase) {
    try {
      const { data: watchList } = await supabase
        .from("viral_watchlist")
        .select("target_id")
        .eq("platform", "youtube")
        .limit(5);

      if (watchList && watchList.length > 0) {
        for (const w of watchList) {
          const chUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
          chUrl.searchParams.set("part", "contentDetails");
          chUrl.searchParams.set("id", w.target_id);
          chUrl.searchParams.set("key", key);
          const chData = await ytJson(chUrl);
          const uploadPlaylist = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
          if (uploadPlaylist) {
            const plUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
            plUrl.searchParams.set("part", "contentDetails");
            plUrl.searchParams.set("playlistId", uploadPlaylist);
            plUrl.searchParams.set("maxResults", "10");
            plUrl.searchParams.set("key", key);
            const plData = await ytJson(plUrl);
            const watchedVideoIds = (plData.items || []).map((pi: any) => pi.contentDetails?.videoId).filter(Boolean);
            ids.push(...watchedVideoIds);
          }
        }
      }
    } catch (_) { /* Watchlist opcional */ }
  }

  ids = ids.filter((id, idx) => ids.indexOf(id) === idx);

  // 3. Chamada de Detalhes dos Vídeos (com status para detectar Synthetic Media)
  const v = new URL("https://www.googleapis.com/youtube/v3/videos");
  v.searchParams.set("part", "snippet,statistics,contentDetails,status");
  v.searchParams.set("key", key);

  if (ids.length) {
    v.searchParams.set("id", ids.slice(0, 50).join(","));
  } else if (!userQuery) {
    // Sem termo: usa mostPopular (1 única unidade de cota)
    v.searchParams.set("chart", "mostPopular");
    v.searchParams.set("regionCode", regionCode);
    v.searchParams.set("maxResults", "25");
    if (YT_CATEGORY[niche]) v.searchParams.set("videoCategoryId", YT_CATEGORY[niche]);
    if (body.pageToken) v.searchParams.set("pageToken", body.pageToken);
  } else {
    return { items: [], nextPageToken };
  }

  const vd = await ytJson(v);
  if (!userQuery) nextPageToken = vd.nextPageToken;

  // Seguidores reais dos canais
  const rawChannelIds = (vd.items || []).map((i: any) => i.snippet?.channelId).filter(Boolean) as string[];
  const channelIds = rawChannelIds.filter((cid: string, idx: number) => rawChannelIds.indexOf(cid) === idx);
  const channels: Record<string, { subs: number | null; avatar: string }> = {};
  if (channelIds.length) {
    const c = new URL("https://www.googleapis.com/youtube/v3/channels");
    c.searchParams.set("part", "snippet,statistics");
    c.searchParams.set("id", channelIds.slice(0, 50).join(","));
    c.searchParams.set("key", key);
    try {
      const cd = await ytJson(c);
      for (const ch of cd.items || []) {
        channels[ch.id] = {
          subs: ch.statistics?.hiddenSubscriberCount ? null : parseInt(ch.statistics?.subscriberCount || "0", 10),
          avatar: ch.snippet?.thumbnails?.default?.url || "",
        };
      }
    } catch (_) {}
  }

  const items: RawItem[] = [];
  for (const it of vd.items || []) {
    if (seen.has(`yt-${it.id}`)) continue;
    const st = it.statistics || {};
    const sn = it.snippet || {};
    const status = it.status || {};
    const ch = channels[sn.channelId] || { subs: null, avatar: "" };
    const durationSec = isoToSeconds(it.contentDetails?.duration);

    // PORTÃO DA RAIA RECRIAR: Descarta vídeos longos (> 180s)
    if (lane === "recriar" && durationSec !== null && durationSec > 180) {
      continue;
    }

    const views = parseInt(st.viewCount || "0", 10);
    // PORTÃO DE VIEWS MÍNIMAS
    if (lane === "recriar" && views < MIN_VIEWS_RECRIAR) {
      continue;
    }

    // Detecção de Sinais de IA
    const aiSignals: string[] = [];
    let isAiGenerated: boolean | null = null;

    if (status.containsSyntheticMedia === true) {
      aiSignals.push("IA declarada pelo criador (YouTube Synthetic Media)");
      isAiGenerated = true;
    }

    const textToScan = `${sn.title || ""} ${sn.description || ""}`.toLowerCase();
    const aiKeywords = ["ia", "ai", "sora", "kling", "veo", "runway", "seedance", "midjourney", "artificial intelligence", "feito com ia", "ai generated"];
    const matched = aiKeywords.filter((k) => textToScan.includes(k));
    if (matched.length > 0) {
      aiSignals.push(`Termos detectados: ${matched.slice(0, 3).join(", ")}`);
      if (isAiGenerated === null) isAiGenerated = true;
    }

    items.push({
      idPrefix: "yt",
      postId: it.id,
      platform: "youtube",
      title: sn.title || "Sem título",
      description: sn.description,
      videoUrl: `https://www.youtube.com/watch?v=${it.id}`,
      thumbnailUrl: sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || "",
      durationSec,
      publishedAt: sn.publishedAt || new Date().toISOString(),
      authorName: sn.channelTitle || "Canal",
      authorHandle: `@${(sn.channelTitle || "canal").toLowerCase().replace(/\s+/g, "")}`,
      authorAvatar: ch.avatar,
      followers: ch.subs,
      views,
      likes: parseInt(st.likeCount || "0", 10),
      comments: parseInt(st.commentCount || "0", 10),
      shares: null,
      saves: null,
      lane,
      isAiGenerated,
      aiSignals,
      sourceCount: 1,
    });
  }

  return { items, nextPageToken };
}

// ─── TIKTOK VIA APIFY (Hashtags de IA e Filtros) ──────────────────────────
async function runApify(actor: string, input: unknown, token: string): Promise<any[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 100_000);
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) throw new Error(`Apify ${actor}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTikTok(body: SearchBody, token: string, seen: Set<string>): Promise<RawItem[]> {
  const userQ = (body.query || "").trim();
  const q = userQ ? `${userQ} ai video` : "#aivideo #veo3 #klingai";
  const data = await runApify(
    "clockworks~tiktok-scraper",
    { searchQueries: [q], resultsPerPage: 10, searchSection: "/video" },
    token,
  );

  const items: RawItem[] = [];
  for (const d of data) {
    const id = String(d.id || "");
    if (!id || seen.has(`tt-${id}`)) continue;

    const views = d.playCount ?? 0;
    if (views < MIN_VIEWS_RECRIAR) continue;

    const durationSec = typeof d.videoMeta?.duration === "number" ? d.videoMeta.duration : null;
    if (durationSec !== null && durationSec > 180) continue;

    const aiSignals: string[] = ["Hashtags de IA no TikTok (#aivideo, #ai)"];
    items.push({
      idPrefix: "tt",
      postId: id,
      platform: "tiktok",
      title: d.text || "Sem legenda",
      description: d.text,
      videoUrl: d.webVideoUrl || "",
      thumbnailUrl: d.videoMeta?.coverUrl || "",
      durationSec,
      publishedAt: d.createTimeISO || new Date().toISOString(),
      authorName: d.authorMeta?.nickName || d.authorMeta?.name || "Criador",
      authorHandle: `@${d.authorMeta?.name || "creator"}`,
      authorAvatar: d.authorMeta?.avatar || "",
      followers: typeof d.authorMeta?.fans === "number" ? d.authorMeta.fans : null,
      verified: !!d.authorMeta?.verified,
      views,
      likes: d.diggCount ?? 0,
      comments: d.commentCount ?? 0,
      shares: d.shareCount ?? null,
      saves: d.collectCount ?? null,
      lane: "recriar",
      isAiGenerated: true,
      aiSignals,
      sourceCount: 1,
    });
  }
  return items;
}

// ─── RAIA PAUTAS: Hacker News, Reddit e Feeds RSS ─────────────────────────
async function fetchHackerNewsPautas(query: string, seen: Set<string>): Promise<RawItem[]> {
  const since = Math.floor((Date.now() - MAX_AGE_PAUTAS_HOURS * 3600 * 1000) / 1000);
  const q = encodeURIComponent(query ? `${query} AI` : 'AI OR "generative video" OR "Sora" OR "Kling"');
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=story&numericFilters=created_at_i>${since}`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const items: RawItem[] = [];

  for (const hit of data.hits || []) {
    const id = hit.objectID;
    if (!id || seen.has(`hn-${id}`)) continue;
    const points = hit.points || 0;
    if (points < MIN_VIEWS_PAUTAS) continue;

    items.push({
      idPrefix: "hn",
      postId: id,
      platform: "x",
      title: hit.title || "Sem título",
      description: hit.story_text || `Discussão quente no Hacker News (${points} pontos, ${hit.num_comments} comentários).`,
      videoUrl: hit.url || `https://news.ycombinator.com/item?id=${id}`,
      thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
      durationSec: null,
      publishedAt: hit.created_at || new Date().toISOString(),
      authorName: hit.author || "HN Community",
      authorHandle: `@${hit.author || "hn"}`,
      authorAvatar: "",
      followers: null,
      views: points * 10,
      likes: points,
      comments: hit.num_comments || 0,
      shares: null,
      saves: null,
      lane: "pautas",
      isAiGenerated: true,
      aiSignals: ["Pauta em debate no Hacker News"],
      sourceCount: 1,
    });
  }
  return items;
}

async function fetchRedditPautas(query: string, seen: Set<string>): Promise<RawItem[]> {
  const items: RawItem[] = [];
  const headers = { "User-Agent": "DiskAi-Agent/1.0 (contact: admin@diskai.app)" };

  for (const sub of REDDIT_SUBREDDITS) {
    try {
      const cleanSub = sub.replace("r/", "");
      const res = await fetch(`https://www.reddit.com/r/${cleanSub}/hot.json?limit=10`, { headers });
      if (!res.ok) continue;
      const data = await res.json();

      for (const child of data.data?.children || []) {
        const post = child.data;
        if (!post || post.stickied || seen.has(`rd-${post.id}`)) continue;
        if (post.score < MIN_VIEWS_PAUTAS) continue;

        items.push({
          idPrefix: "rd",
          postId: post.id,
          platform: "x",
          title: post.title || "Discussão Reddit",
          description: post.selftext?.slice(0, 200) || `Tópico em destaque no ${sub}`,
          videoUrl: `https://reddit.com${post.permalink}`,
          thumbnailUrl: post.thumbnail && post.thumbnail.startsWith("http") ? post.thumbnail : "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
          durationSec: null,
          publishedAt: new Date(post.created_utc * 1000).toISOString(),
          authorName: `r/${cleanSub}`,
          authorHandle: `@${post.author || "reddit"}`,
          authorAvatar: "",
          followers: null,
          views: post.score * 12,
          likes: post.score,
          comments: post.num_comments || 0,
          shares: null,
          saves: null,
          lane: "pautas",
          isAiGenerated: true,
          aiSignals: [`Thread viral em ${sub}`],
          sourceCount: 1,
        });
      }
    } catch (_) {}
  }
  return items;
}

// ─── HANDLER PRINCIPAL ─────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const reply = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body: SearchBody = await req.json().catch(() => ({}));
    const lane = body.lane || "recriar";
    const platform = body.platform || "all";
    const seen = new Set<string>(body.seenIds || []);

    const YT = Deno.env.get("YOUTUBE_API_KEY") || "";
    const APIFY = Deno.env.get("APIFY_API_TOKEN") || "";
    const SB_URL = Deno.env.get("SUPABASE_URL") || "";
    const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = SB_URL && SB_KEY
      ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false } }) : null;

    const errors: string[] = [];
    const jobs: Promise<RawItem[]>[] = [];
    let nextPageToken: string | undefined;

    if (lane === "recriar") {
      // Raia RECRIAR: YouTube + TikTok (economia de cotas no "all")
      if (platform === "youtube" || platform === "all") {
        if (!YT) errors.push("YOUTUBE_API_KEY não configurada nos secrets");
        else {
          jobs.push(fetchYouTube(body, YT, seen, supabase).then((r) => {
            nextPageToken = r.nextPageToken;
            return r.items;
          }));
        }
      }
      if (platform === "tiktok" || platform === "all") {
        if (!APIFY) {
          if (platform !== "all") errors.push("APIFY_API_TOKEN não configurado nos secrets");
        } else {
          jobs.push(fetchTikTok(body, APIFY, seen));
        }
      }
    } else if (lane === "pautas") {
      // Raia PAUTAS: Hacker News, Reddit e Feeds RSS
      const userQ = (body.query || "").trim();
      jobs.push(fetchHackerNewsPautas(userQ, seen));
      jobs.push(fetchRedditPautas(userQ, seen));
    }

    const settled = await Promise.allSettled(jobs);
    const raw: RawItem[] = [];
    for (const s of settled) {
      if (s.status === "fulfilled") raw.push(...s.value);
      else errors.push(String(s.reason?.message || s.reason));
    }

    // ─── Agrupamento por Similaridade de Pauta e Portões de Descarte ───────
    const clustered: RawItem[] = [];
    for (const item of raw) {
      let matchedCluster = false;
      for (const existing of clustered) {
        if (titleSimilarity(item.title, existing.title) > 0.70) {
          existing.sourceCount = (existing.sourceCount || 1) + 1;
          const combinedSigs = existing.aiSignals.concat(item.aiSignals);
          existing.aiSignals = combinedSigs.filter((sig, idx) => combinedSigs.indexOf(sig) === idx);
          matchedCluster = true;
          break;
        }
      }
      if (!matchedCluster) {
        clustered.push(item);
      }
    }

    // Processamento do Score e Decomposição
    const results = clustered.map((r) => buildItem(r, body));
    results.sort((a, b) => b.score - a.score);

    // ─── Gravação no Supabase ──────────────────────────────────────────────
    let savedToDb = false;
    let dbError: string | undefined;
    if (supabase && results.length > 0) {
      try {
        const postsPayload = results.map((v) => ({
          id: v.id,
          post_id: v.post_id,
          external_id: v.post_id,
          platform: v.platform,
          title: v.title,
          description: v.description,
          hook_transcript: v.hookTranscript,
          video_url: v.videoUrl,
          thumbnail_url: v.thumbnailUrl,
          author: v.author,
          region: v.region,
          niche: v.niche,
          score: v.score,
          metrics: v.metrics,
          is_trend_alert: v.isTrendAlert,
          published_at: v.publishedAt,
          updated_at: new Date().toISOString(),
        }));

        const up = await supabase.from("viral_posts").upsert(postsPayload, { onConflict: "platform,post_id" });
        if (up.error) {
          dbError = `viral_posts: ${up.error.message}`;
        } else {
          const snaps = results.map((v) => ({
            post_id: v.id,
            views_count: v.rawCounts.views,
            likes_count: v.rawCounts.likes,
            shares_count: v.rawCounts.shares ?? 0,
            comments_count: v.rawCounts.comments,
            views_per_hour: v.metrics.viewsPerHour,
            captured_at: new Date().toISOString(),
          }));
          const sn = await supabase.from("viral_snapshots").insert(snaps);
          if (sn.error) dbError = `viral_snapshots: ${sn.error.message}`;
          else savedToDb = true;
        }
      } catch (err: any) {
        dbError = err?.message;
      }
    }

    return reply({
      success: results.length > 0 || errors.length === 0,
      total: results.length,
      lane,
      videos: results,
      nextPageToken,
      highViralAlertCount: results.filter((v) => v.score >= 80).length,
      source: results.length > 0 ? "live_api" : "empty",
      cachedAt: new Date().toISOString(),
      savedToDb,
      errors,
      dbError,
      keysPresent: { youtube: !!YT, apify: !!APIFY },
    });
  } catch (err: any) {
    return reply({ success: false, error: err.message || "Erro interno", videos: [], errors: [err.message] }, 500);
  }
});
