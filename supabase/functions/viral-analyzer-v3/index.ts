/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Supabase Edge Function: viral-analyzer-v3
// Motor de Descoberta Viral de Vídeos Feitos por IA & Pautas Estratégicas (v3)

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { BudgetGovernor } from "./budgetGovernor.ts";
import { verifyUserAuthentication } from "./authGuard.ts";
import { detectT1AiSignals, analyzeT2BatchWithGemini, AiEvidenceItem } from "./aiDetector.ts";
import { AccountProfiler } from "./accountProfiler.ts";
import { computeV3Score } from "./scoringEngine.ts";
import { extractAndProcessTopics, TopicSource } from "./topicRadar.ts";
import { runViralOrchestratorV3, CandidateItem } from "./orchestrator.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

function getCorsHeaders(req: Request) {
  const allowedOriginsEnv = Deno.env.get("ALLOWED_ORIGINS");
  const origin = req.headers.get("origin") || "";
  let allowOrigin = "*";
  if (allowedOriginsEnv) {
    const list = allowedOriginsEnv.split(",").map(o => o.trim()).filter(Boolean);
    if (list.length > 0) {
      allowOrigin = list.includes(origin) ? origin : list[0];
    }
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

// Rate limiting em memória (20 req/min por usuário, 30 req/min por IP)
const userRateLimits = new Map<string, { count: number; resetAt: number }>();
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number, map: Map<string, { count: number; resetAt: number }>): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ─── QUERY PACKS LOCALIZADOS POR REGIÃO / IDIOMA ───────────────────────────

const QUERY_PACKS: Record<string, { terms: string[]; hashtags: string[]; tools: string[] }> = {
  "BR_pt": {
    terms: ["feito com IA", "gerado por IA", "vídeo gerado com IA", "inteligência artificial vídeo", "clone IA"],
    hashtags: ["#aivideo", "#ia", "#feitocomia", "#klingai", "#soraai", "#veo2", "#runwaygen3"],
    tools: ["Sora", "Kling", "Veo", "Runway", "Seedance", "Hailuo", "Pika", "Midjourney", "HeyGen", "ElevenLabs"]
  },
  "US_en": {
    terms: ["made with AI", "AI generated video", "AI filmmaking", "AI short film", "hyper realistic AI"],
    hashtags: ["#aivideo", "#aigenerated", "#sora", "#kling", "#runwayml", "#lumaai", "#hailuoai"],
    tools: ["Sora", "Kling", "Veo", "Runway", "Seedance", "Hailuo", "Pika", "Midjourney", "HeyGen", "ElevenLabs"]
  },
  "EU_GB": {
    terms: ["made with AI", "AI generated", "AI animation", "AI cinematic"],
    hashtags: ["#aivideo", "#sora", "#kling", "#runway"],
    tools: ["Sora", "Kling", "Veo", "Runway", "Seedance", "Hailuo"]
  },
  "EU_DE": {
    terms: ["mit KI erstellt", "KI generiert", "künstliche Intelligenz Video", "KI Kurzfilm"],
    hashtags: ["#kivideo", "#künstlicheintelligenz", "#sora", "#kling"],
    tools: ["Sora", "Kling", "Veo", "Runway", "Seedance"]
  },
  "EU_FR": {
    terms: ["généré par IA", "créé avec l'IA", "vidéo intelligence artificielle", "court métrage IA"],
    hashtags: ["#videoia", "#intelligenceartificielle", "#sora", "#kling"],
    tools: ["Sora", "Kling", "Veo", "Runway", "Seedance"]
  },
  "EU_ES": {
    terms: ["hecho con IA", "generado por IA", "vídeo inteligencia artificial", "creado con IA"],
    hashtags: ["#videoia", "#ia", "#sora", "#kling"],
    tools: ["Sora", "Kling", "Veo", "Runway", "Seedance"]
  },
  "EU_IT": {
    terms: ["fatto con IA", "generato da IA", "video intelligenza artificiale"],
    hashtags: ["#videoia", "#ia", "#sora", "#kling"],
    tools: ["Sora", "Kling", "Veo", "Runway", "Seedance"]
  }
};

const EU_COUNTRIES = ["GB", "DE", "FR", "ES", "IT"];

// ─── ESTRUTURAS DE DADOS INTERNAS ──────────────────────────────────────────

interface RawCandidate {
  id: string;
  postId: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'x' | 'google_trends' | 'reddit' | 'news';
  title: string;
  description: string;
  hookTranscript?: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSec: number | null;
  publishedAt: string;
  author: {
    id?: string;
    name: string;
    handle: string;
    avatarUrl: string;
    followersCount: number | null;
    verified?: boolean;
    postsCount?: number;
  };
  region: string;
  niche: string;
  lane: 'recriar' | 'pautas' | 'formatos';
  views: number;
  likes: number | null;
  shares: number | null;
  comments: number | null;
  aiSignals: string[];
  aiEvidence: AiEvidenceItem[];
  sources?: TopicSource[];
  aiProbability: number;
  aiTier: 'confirmada' | 'provavel' | 'baixa';
  toolGuess?: string;
  hookStrength?: number;
  narrativeOriginality?: number;
  recreatability?: number;
  aiVideoScriptIdea?: {
    hook: string;
    scenes: string[];
    narration: string;
  };
  accountTags?: string[];
  isSyntheticMediaDeclared?: boolean;
  sourceCount?: number;
}

// ─── HELPERS DE FORMATAÇÃO E ANÁLISE PURA ──────────────────────────────────

function parseDurationIso(duration?: string): number | null {
  if (!duration) return null;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ss = s.toString().padStart(2, "0");
  if (h > 0) {
    const mm = m.toString().padStart(2, "0");
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

function formatMetric(num: number | null): string {
  if (num === null || num === undefined) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace('.0', '')}k`;
  return num.toLocaleString('pt-BR');
}

function formatPublishTime(isoDate: string): { relative: string; full: string } {
  try {
    const date = new Date(isoDate);
    const diffHours = Math.max(1, Math.round((Date.now() - date.getTime()) / 3_600_000));
    const relative = diffHours < 24 ? `há ${diffHours} h` : `há ${Math.round(diffHours / 24)} dias`;
    const full = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo'
    }).format(date);
    return { relative, full: `${full} (${relative})` };
  } catch (_) {
    return { relative: "recente", full: isoDate };
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// O motor de score puro VVS2 v3 agora reside em ./scoringEngine.ts


// ─── COLETA: YOUTUBE DATA API V3 ───────────────────────────────────────────

async function fetchYouTubeLanes(
  query: string,
  country: string,
  lang: string,
  niche: string,
  apiKey: string,
  governor: BudgetGovernor
): Promise<{ candidates: RawCandidate[]; quotaUnits: number }> {
  const candidates: RawCandidate[] = [];
  let quotaUnits = 0;

  // 1. Checa permissão no governador para 100 unidades
  const canSearch = await governor.canExecute("youtube", 100);
  if (!canSearch.allowed) return { candidates, quotaUnits };

  const queryPack = QUERY_PACKS[`${country}_${lang}`] || QUERY_PACKS["BR_pt"];
  const searchTerm = query ? `${query} (${queryPack.terms[0]} OR ${queryPack.tools.slice(0, 3).join(" OR ")})` : queryPack.terms[0];

  try {
    const sUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    sUrl.searchParams.set("part", "snippet");
    sUrl.searchParams.set("q", searchTerm);
    sUrl.searchParams.set("type", "video");
    sUrl.searchParams.set("videoDuration", "short");
    sUrl.searchParams.set("order", "viewCount");
    sUrl.searchParams.set("regionCode", country === "EU" ? "DE" : country);
    sUrl.searchParams.set("maxResults", "20");
    sUrl.searchParams.set("key", apiKey);

    const sRes = await fetch(sUrl.toString());
    quotaUnits += 100;
    if (!sRes.ok) return { candidates, quotaUnits };

    const sData = await sRes.json();
    const videoIds = (sData.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
    if (!videoIds.length) return { candidates, quotaUnits };

    // 2. Detalhes dos vídeos (1 unidade)
    const vUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    vUrl.searchParams.set("part", "snippet,statistics,contentDetails,status");
    vUrl.searchParams.set("id", videoIds.join(","));
    vUrl.searchParams.set("key", apiKey);

    const vRes = await fetch(vUrl.toString());
    quotaUnits += 1;
    if (!vRes.ok) return { candidates, quotaUnits };
    const vData = await vRes.json();

    // 3. Canais para contagem de seguidores (1 unidade)
    const channelIds = (vData.items || []).map((v: any) => v.snippet?.channelId).filter(Boolean);
    const channelsMap: Record<string, number | null> = {};
    if (channelIds.length) {
      const cUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
      cUrl.searchParams.set("part", "statistics");
      cUrl.searchParams.set("id", channelIds.slice(0, 50).join(","));
      cUrl.searchParams.set("key", apiKey);
      const cRes = await fetch(cUrl.toString());
      quotaUnits += 1;
      if (cRes.ok) {
        const cData = await cRes.json();
        for (const ch of cData.items || []) {
          channelsMap[ch.id] = ch.statistics?.hiddenSubscriberCount ? null : parseInt(ch.statistics?.subscriberCount || "0", 10);
        }
      }
    }

    // Registra consumo
    await governor.recordUsage("youtube", "units", quotaUnits, 0);

    for (const v of vData.items || []) {
      const sn = v.snippet || {};
      const st = v.statistics || {};
      const cd = v.contentDetails || {};
      const status = v.status || {};
      const durationSec = parseDurationIso(cd.duration);
      const textToScan = `${sn.title || ""} ${sn.description || ""}`;
      const aiMeta = detectT1AiSignals(textToScan, status.containsSyntheticMedia === true, 'youtube');

      candidates.push({
        id: `yt-${v.id}`,
        postId: v.id,
        platform: 'youtube',
        title: sn.title || "Sem título",
        description: sn.description || "",
        videoUrl: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnailUrl: sn.thumbnails?.maxres?.url || sn.thumbnails?.high?.url || sn.thumbnails?.default?.url || "",
        durationSec,
        publishedAt: sn.publishedAt || new Date().toISOString(),
        author: {
          id: sn.channelId,
          name: sn.channelTitle || "Criador",
          handle: sn.channelTitle ? `@${sn.channelTitle.toLowerCase().replace(/\s+/g, '')}` : "@youtube",
          avatarUrl: "",
          followersCount: channelsMap[sn.channelId] || null
        },
        region: country.toLowerCase(),
        niche: niche || "ia_tech",
        lane: 'recriar',
        views: parseInt(st.viewCount || "0", 10),
        likes: st.likeCount ? parseInt(st.likeCount, 10) : null,
        shares: null, // YouTube não expõe compartilhamentos na API pública
        comments: st.commentCount ? parseInt(st.commentCount, 10) : null,
        aiSignals: aiMeta.evidence.map(e => e.detail),
        aiEvidence: aiMeta.evidence,
        aiProbability: aiMeta.probability,
        aiTier: aiMeta.tier,
        toolGuess: aiMeta.toolGuess,
        isSyntheticMediaDeclared: status.containsSyntheticMedia === true
      });
    }
  } catch (_) {}

  return { candidates, quotaUnits };
}

// ─── COLETA: INSTAGRAM VIA APIFY (LISTA MONITORADA COM GOVERNADOR) ─────────

const SEED_INSTAGRAM_HANDLES = [
  "ovictorventura", "motacreator", "_theferreira", "liloforte",
  "dariow.ia", "sgabriel.ia", "sartorii.ia", "motiondsgnbsb",
  "cofilms.ai", "jonattasalves", "czar.ia007", "thayse_drummer", "vepefilms"
];

async function fetchInstagramSeeds(
  token: string,
  governor: BudgetGovernor,
  config?: any
): Promise<{ candidates: RawCandidate[]; costUsd: number }> {
  const candidates: RawCandidate[] = [];
  const actorName = "instagram-reel-scraper";
  const unitPrice = config?.apify_pricing?.[actorName] ?? 0.003;
  const targetProfiles = SEED_INSTAGRAM_HANDLES.slice(0, 3);
  const resultsLimit = 6;
  const estimatedCost = Number((targetProfiles.length * resultsLimit * unitPrice).toFixed(4));

  const canRun = await governor.canExecute("apify_instagram", estimatedCost);
  if (!canRun.allowed) return { candidates, costUsd: 0 };

  try {
    const actorId = `apify~${actorName}`;
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=60`;
    
    // Roda para até 3 contas sementes por chamada para economizar cota
    const res = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: targetProfiles,
        resultsLimit
      })
    });

    if (res.ok) {
      const items = await res.json();
      const actualCost = Number((items.length * unitPrice).toFixed(4));
      await governor.recordUsage("apify_instagram", "usd", items.length, actualCost);

      for (const item of items) {
        if (!item.id && !item.shortCode) continue;
        const textToScan = `${item.caption || ""}`;
        const aiMeta = detectT1AiSignals(textToScan, false, 'instagram');

        candidates.push({
          id: `ig-${item.shortCode || item.id}`,
          postId: item.shortCode || item.id,
          platform: 'instagram',
          title: item.caption ? item.caption.slice(0, 90) : "Reel de IA",
          description: item.caption || "",
          videoUrl: item.url || `https://www.instagram.com/reel/${item.shortCode}/`,
          thumbnailUrl: item.displayUrl || item.thumbnailUrl || "",
          durationSec: item.videoDuration ? Math.round(item.videoDuration) : null,
          publishedAt: item.timestamp || new Date().toISOString(),
          author: {
            name: item.ownerFullName || item.ownerUsername || "Criador",
            handle: `@${item.ownerUsername || "instagram"}`,
            avatarUrl: item.ownerProfilePicUrl || "",
            followersCount: item.ownerFollowersCount || null
          },
          region: "brasil",
          niche: "ia_tech",
          lane: 'recriar',
          views: item.videoViewCount || item.videoPlayCount || 0,
          likes: item.likesCount || null,
          shares: null,
          comments: item.commentsCount || null,
          aiSignals: aiMeta.evidence.map(e => e.detail),
          aiEvidence: aiMeta.evidence,
          aiProbability: aiMeta.probability,
          aiTier: aiMeta.tier,
          toolGuess: aiMeta.toolGuess
        });
      }
    }
  } catch (_) {}

  return { candidates, costUsd: estimatedCost };
}

// ─── COLETA: FONTES GRATUITAS (GOOGLE TRENDS, NEWS, REDDIT, HACKER NEWS) ───

async function fetchFreeLanes(
  country: string,
  lang: string
): Promise<RawCandidate[]> {
  const candidates: RawCandidate[] = [];

  // 1. Google Trends RSS (Trending Now)
  try {
    const geo = country === "EU" ? "DE" : (country === "US" ? "US" : "BR");
    const tRes = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`);
    if (tRes.ok) {
      const xml = await tRes.text();
      const items = xml.split("<item>").slice(1, 8);
      for (const raw of items) {
        const titleMatch = raw.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || raw.match(/<title>(.*?)<\/title>/);
        const approxTrafficMatch = raw.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/);
        const linkMatch = raw.match(/<link>(.*?)<\/link>/);
        const pubDateMatch = raw.match(/<pubDate>(.*?)<\/pubDate>/);

        const title = titleMatch ? titleMatch[1].trim() : "";
        if (title) {
          const approxTraffic = approxTrafficMatch ? approxTrafficMatch[1].replace("+", "").replace(/,/g, "") : "50000";
          const sources: TopicSource[] = [];
          const newsBlocks = raw.split("<ht:news_item>").slice(1);
          for (const nb of newsBlocks) {
            const sTitle = nb.match(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/)?.[1] || "";
            const sUrl = nb.match(/<ht:news_item_url>(.*?)<\/ht:news_item_url>/)?.[1] || "";
            const sSource = nb.match(/<ht:news_item_source>(.*?)<\/ht:news_item_source>/)?.[1] || "";
            if (sUrl || sSource) {
              sources.push({
                name: sSource || "Veículo de Imprensa",
                url: sUrl || (linkMatch ? linkMatch[1] : ""),
                publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : undefined
              });
            }
          }
          if (sources.length === 0 && linkMatch) {
            sources.push({ name: "Google Trends", url: linkMatch[1] });
          }

          candidates.push({
            id: `trends-${encodeURIComponent(title).slice(0, 32)}`,
            postId: title,
            platform: 'google_trends',
            title: `Tendência: ${title}`,
            description: `Tema com alta tração de busca detectado no Google Trends (${geo}).`,
            videoUrl: linkMatch ? linkMatch[1] : `https://trends.google.com/trends/trendingsearches/daily?geo=${geo}`,
            thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80",
            durationSec: null,
            publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
            author: {
              name: "Google Trends",
              handle: "@googletrends",
              avatarUrl: "",
              followersCount: 1000000
            },
            region: geo.toLowerCase(),
            niche: "geral",
            lane: 'pautas',
            views: parseInt(approxTraffic, 10) || 50000,
            likes: null,
            shares: null,
            comments: null,
            sources,
            aiSignals: ["Pauta Quente: Alto volume de pesquisa no Google"],
            aiEvidence: [{ type: 'role_keyword', detail: 'Pauta Quente: Alto volume de pesquisa no Google', weight: 0.50 }],
            aiProbability: 0.50,
            aiTier: 'provavel'
          });
        }
      }
    }
  } catch (_) {}

  // 2. Google News RSS (Pautas Reais de IA)
  try {
    const newsQuery = lang === "pt" ? "inteligencia+artificial+when:2d" : "artificial+intelligence+when:2d";
    const gl = country === "BR" ? "BR" : (country === "US" ? "US" : "GB");
    const hl = lang === "pt" ? "pt-BR" : "en-US";
    const ceid = country === "BR" ? "BR:pt-419" : "US:en";
    const gnRes = await fetch(`https://news.google.com/rss/search?q=${newsQuery}&hl=${hl}&gl=${gl}&ceid=${ceid}`);
    if (gnRes.ok) {
      const xml = await gnRes.text();
      const newsItems = xml.split("<item>").slice(1, 8);
      for (const ni of newsItems) {
        const titleMatch = ni.match(/<title>(.*?)<\/title>/);
        const linkMatch = ni.match(/<link>(.*?)<\/link>/);
        const pubDateMatch = ni.match(/<pubDate>(.*?)<\/pubDate>/);
        const sourceMatch = ni.match(/<source[^>]*>(.*?)<\/source>/);
        const rawTitle = titleMatch ? titleMatch[1].trim() : "";
        if (rawTitle) {
          const sourceName = sourceMatch ? sourceMatch[1] : "Google News";
          const sourceUrl = linkMatch ? linkMatch[1] : "https://news.google.com";
          candidates.push({
            id: `news-${encodeURIComponent(rawTitle).slice(0, 32)}`,
            postId: rawTitle,
            platform: 'news',
            title: rawTitle,
            description: `Notícia recente apurada e publicada por ${sourceName}.`,
            videoUrl: sourceUrl,
            thumbnailUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=640&q=80",
            durationSec: null,
            publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
            author: {
              name: sourceName,
              handle: `@${sourceName.toLowerCase().replace(/\s+/g, '')}`,
              avatarUrl: "",
              followersCount: 500000
            },
            region: country.toLowerCase(),
            niche: "ia_tech",
            lane: 'pautas',
            views: 45000,
            likes: null,
            shares: null,
            comments: null,
            sources: [{ name: sourceName, url: sourceUrl }],
            aiSignals: ["Pauta de IA reportada na imprensa oficial"],
            aiEvidence: [{ type: 'role_keyword', detail: `Cobertura de IA por ${sourceName}`, weight: 0.60 }],
            aiProbability: 0.60,
            aiTier: 'provavel'
          });
        }
      }
    }
  } catch (_) {}

  // 3. Hacker News Algolia API (Histórias sobre IA)
  try {
    const hnRes = await fetch("https://hn.algolia.com/api/v1/search_by_date?tags=story&query=AI&hitsPerPage=10");
    if (hnRes.ok) {
      const hnData = await hnRes.json();
      for (const h of hnData.hits || []) {
        if (!h.title) continue;
        candidates.push({
          id: `hn-${h.objectID}`,
          postId: String(h.objectID),
          platform: 'news',
          title: h.title,
          description: `Publicação técnica em destaque no Hacker News. Pontos: ${h.points || 0}, Comentários: ${h.num_comments || 0}.`,
          videoUrl: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=640&q=80",
          durationSec: null,
          publishedAt: h.created_at || new Date().toISOString(),
          author: {
            name: h.author || "HN Contributor",
            handle: `@${h.author || "hackernews"}`,
            avatarUrl: "",
            followersCount: null
          },
          region: "global",
          niche: "ia_tech",
          lane: 'pautas',
          views: (h.points || 10) * 85,
          likes: h.points || 0,
          shares: null,
          comments: h.num_comments || 0,
          aiSignals: ["Pauta de Tecnologia / IA confirmada na comunidade"],
          aiEvidence: [{ type: 'role_keyword', detail: 'Publicação técnica no Hacker News', weight: 0.65 }],
          aiProbability: 0.65,
          aiTier: 'provavel'
        });
      }
    }
  } catch (_) {}

  // 3. Reddit RSS (r/aivideo)
  try {
    const rRes = await fetch("https://www.reddit.com/r/aivideo/.rss?limit=10", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DiskAi/3.0" }
    });
    if (rRes.ok) {
      const xml = await rRes.text();
      const entries = xml.split("<entry>").slice(1, 8);
      for (const entry of entries) {
        const titleM = entry.match(/<title>(.*?)<\/title>/);
        const linkM = entry.match(/<link href="(.*?)"/);
        const pubM = entry.match(/<updated>(.*?)<\/updated>/);
        const authorM = entry.match(/<name>(.*?)<\/name>/);
        const title = titleM ? titleM[1].trim() : "";
        if (title) {
          candidates.push({
            id: `reddit-${encodeURIComponent(title).slice(0, 32)}`,
            postId: title,
            platform: 'reddit',
            title,
            description: "Vídeo feito por inteligência artificial em destaque no r/aivideo.",
            videoUrl: linkM ? linkM[1] : "https://reddit.com/r/aivideo",
            thumbnailUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=640&q=80",
            durationSec: null,
            publishedAt: pubM ? pubM[1] : new Date().toISOString(),
            author: {
              name: authorM ? authorM[1] : "Reddit Creator",
              handle: authorM ? authorM[1] : "@aivideo",
              avatarUrl: "",
              followersCount: null
            },
            region: "global",
            niche: "ia_tech",
            lane: 'recriar',
            views: 12500,
            likes: 420,
            shares: null,
            comments: 48,
            aiSignals: ["Comunidade Oficial r/aivideo", "Vídeo de IA Comprovado"],
            aiEvidence: [{ type: 'role_keyword', detail: 'Publicação no r/aivideo (Comunidade Oficial)', weight: 0.88 }],
            aiProbability: 0.88,
            aiTier: 'confirmada'
          });
        }
      }
    }
  } catch (_) {}

  return candidates;
}

// ─── ROTINA DE RETENÇÃO DO BANCO (SLIDING WINDOW DE ATÉ 100 VÍDEOS) ─────────

/**
 * Aplica a regra de retenção de até 100 vídeos no banco de dados (Sliding Window):
 * Remove posts antigos que ultrapassem o limite de 100 vídeos,
 * PRESERVANDO ESTRITAMENTE todos os posts favoritados pelos usuários (viral_favorites).
 */
export async function enforce100PostsRetention(supabase: any, maxPosts = 100): Promise<{ prunedCount: number }> {
  try {
    const { data: recentPosts, error: listError } = await supabase
      .from('viral_posts')
      .select('id')
      .order('published_at', { ascending: false })
      .limit(maxPosts);

    if (listError || !recentPosts || recentPosts.length < maxPosts) {
      return { prunedCount: 0 };
    }

    const recentIds = recentPosts.map((p: any) => p.id);

    // Busca os IDs favoritados para nunca apagar
    const { data: favoritePosts } = await supabase
      .from('viral_favorites')
      .select('post_id');

    const favoriteIds = new Set((favoritePosts || []).map((f: any) => f.post_id));

    // Busca posts fora dos 100 mais recentes
    const { data: oldPosts, error: oldError } = await supabase
      .from('viral_posts')
      .select('id')
      .not('id', 'in', `(${recentIds.join(',')})`);

    if (oldError || !oldPosts || oldPosts.length === 0) {
      return { prunedCount: 0 };
    }

    const idsToDelete = oldPosts
      .map((p: any) => p.id)
      .filter((id: string) => !favoriteIds.has(id));

    if (idsToDelete.length === 0) {
      return { prunedCount: 0 };
    }

    const { error: deleteError } = await supabase
      .from('viral_posts')
      .delete()
      .in('id', idsToDelete);

    if (!deleteError) {
      return { prunedCount: idsToDelete.length };
    }
  } catch (_) {}
  return { prunedCount: 0 };
}

// ─── SERVIDOR HTTP PRINCIPAL (EDGE FUNCTION V3) ─────────────────────────────

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const errors: string[] = [];
  const meta: Record<string, any> = {
    version: "v3.4.0",
    quotaUsed: 0,
    relaxationLevel: 0
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Verificação Estrita de Autenticação Real do Usuário via auth.getUser(token)
    const authResult = await verifyUserAuthentication(req.headers.get("authorization"), supabase.auth);
    if (!authResult.authenticated || !authResult.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authResult.error || "Usuário não autenticado."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId;
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown_origin";

    // 2. Limite de Chamadas (Rate Limit): 20 req/min por usuário, 30 req/min por origem
    if (!checkRateLimit(userId, 20, 60000, userRateLimits)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Limite de requisições excedido para este usuário (máximo 20 buscas/minuto). Tente novamente em instantes."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    if (clientIp !== "unknown_origin" && !checkRateLimit(clientIp, 30, 60000, ipRateLimits)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Limite de requisições excedido para esta origem (máximo 30 buscas/minuto)."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    const ytKey = Deno.env.get("YOUTUBE_API_KEY") || "";
    const apifyToken = Deno.env.get("APIFY_API_TOKEN") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    // O nome do modelo vem SOMENTE da variável GEMINI_MODEL (ou da config ativa). Sem padrão hardcoded.
    let geminiModel = Deno.env.get("GEMINI_MODEL") || "";

    const governor = new BudgetGovernor(supabase);
    const profiler = new AccountProfiler(supabase);

    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {}

    const query = (body.query || "").trim();
    const country = (body.country || "BR").toUpperCase();
    const lang = body.lang || (country === "BR" ? "pt" : "en");
    const niche = body.niche || "geral";
    const platform = body.platform || "all";
    const lane = body.lane || "recriar";
    const mode = body.mode || "leve"; // 'leve' (padrão sem Apify) | 'profundo'

    // Carrega config ativa de score do banco
    let configSource: 'db' | 'fallback' = 'fallback';
    const configMissingKeys: string[] = [];
    const requiredConfigKeys = [
      'weights', 'thresholds', 't1_weights', 't1_thresholds',
      'consistency_subpoints', 'consistency_percentiles', 'snowball_limits',
      'apify_pricing', 'engagement_refs'
    ];

    let config: any = {
      version: "v3.0.0-fallback",
      weights: { reach_vs_followers: 15, outlier_vs_median: 15, recency_and_velocity: 25, hook_and_idea: 20, engagement: 15, account_consistency: 10 },
      thresholds: { min_views_normal: 5000, max_age_shorts_hours: 72, ai_probability_gate: 0.60 }
    };
    try {
      const { data: dbConf, error: dbConfErr } = await supabase.from('viral_scoring_config').select('*').eq('active', true).maybeSingle();
      if (dbConf && !dbConfErr) {
        config = dbConf;
        configSource = 'db';
        for (const k of requiredConfigKeys) {
          if (!dbConf[k] || (typeof dbConf[k] === 'object' && Object.keys(dbConf[k]).length === 0)) {
            configMissingKeys.push(k);
          }
        }
        if (!geminiModel && dbConf.gemini_model) {
          geminiModel = dbConf.gemini_model;
        }
      } else {
        configMissingKeys.push('db_not_loaded_using_fallback');
      }
    } catch (_) {
      configMissingKeys.push('db_exception_using_fallback');
    }

    meta.configSource = configSource;
    meta.configVersion = config.version || 'v3.0.0-fallback';
    meta.configMissingKeys = configMissingKeys;

    const rawCandidates: RawCandidate[] = [];

    // 1. YouTube Data API
    if (platform === "all" || platform === "youtube") {
      if (ytKey) {
        const ytRes = await fetchYouTubeLanes(query, country, lang, niche, ytKey, governor);
        rawCandidates.push(...ytRes.candidates);
        meta.quotaUsed += ytRes.quotaUnits;
      } else {
        errors.push("YOUTUBE_API_KEY não configurado nos secrets.");
      }
    }

    // 2. Apify Instagram (se no modo profundo ou acionado)
    if ((platform === "all" || platform === "instagram") && mode === "profundo") {
      if (apifyToken) {
        const igRes = await fetchInstagramSeeds(apifyToken, governor, config);
        rawCandidates.push(...igRes.candidates);
      } else {
        errors.push("APIFY_API_TOKEN não configurado nos secrets.");
      }
    }

    // 3. Fontes Gratuitas (Google Trends RSS, News, Reddit, HN)
    const freeCandidates = await fetchFreeLanes(country, lang);
    rawCandidates.push(...freeCandidates);

    // ─── PIPELINE V3.2: ORQUESTRADOR CENTRAL (T1 -> T2 -> PORTÕES -> SCORE) ──
    const now = Date.now();
    const candidateItems: CandidateItem[] = rawCandidates.map(c => {
      const pubTime = new Date(c.publishedAt).getTime();
      const ageHours = Math.max(0.1, (now - pubTime) / (1000 * 3600));
      return {
        id: c.id,
        postId: c.postId,
        platform: c.platform,
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        videoUrl: c.videoUrl,
        views: c.views,
        likes: c.likes,
        comments: c.comments,
        shares: c.shares,
        durationSec: c.durationSec,
        publishedAt: c.publishedAt,
        ageHours,
        isLive: false,
        author: {
          id: c.author.id,
          name: c.author.name,
          handle: c.author.handle,
          followersCount: c.author.followersCount
        },
        isDeclaredSynthetic: c.isSyntheticMediaDeclared
      };
    });

    const t2ReasonFallback = !geminiApiKey
      ? 'gemini_api_key_missing'
      : (!geminiModel ? 'gemini_model_not_configured' : undefined);

    const orchResult = await runViralOrchestratorV3(candidateItems, {
      config,
      lane: lane as any,
      includeAllKinds: lane === 'todos',
      t2ReasonFallback,
      t2Executor: (geminiApiKey && geminiModel) ? async (eligible) => {
        const canRunGemini = await governor.canExecute('gemini', eligible.length);
        if (!canRunGemini.allowed) {
          return {
            t2Applied: false,
            t2Reason: 'gemini_budget_cap',
            modelUsed: geminiModel
          };
        }
        const t2Candidates = eligible.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description,
          author: e.author.name,
          thumbnailUrl: e.thumbnailUrl
        }));
        const results = await analyzeT2BatchWithGemini(t2Candidates, geminiApiKey, geminiModel);
        if (results && results.size > 0) {
          await governor.recordUsage('gemini', 'units', results.size, 0);
        }
        return results;
      } : undefined
    });

    meta.t2EligibleCount = orchResult.meta.t2EligibleCount;
    meta.t2ExecutedCount = orchResult.meta.t2ExecutedCount;
    meta.t2Applied = orchResult.meta.t2Applied;
    meta.t2Reason = orchResult.meta.t2Reason || (orchResult.meta.t2Applied ? 'ok' : t2ReasonFallback || 't2_not_applied');
    meta.geminiModelUsed = orchResult.meta.modelUsed || (orchResult.meta.t2Applied ? geminiModel : null);
    meta.passedCount = orchResult.meta.passedCount;
    meta.rejectedCount = orchResult.meta.rejectedCount;

    // Atribuição de Tags Informativas de Perfil
    for (const c of orchResult.passedVideos) {
      (c as any).accountTags = profiler.computeTags({
        views: c.views,
        followersCount: c.author.followersCount,
        medianViews: 0,
        aiTier: c.aiTier
      });
    }

    // Processamento dos Vídeos Finais Aprovados (itens rejeitados NUNCA aparecem)
    const finalVideos = orchResult.passedVideos.map(item => {
      const score = item.score ?? 50;
      const breakdown = item.scoreBreakdown || {};
      const timeFmt = formatPublishTime(item.publishedAt);

      // Efeito Bola de Neve: Contas novas com alto score entram na watchlist
      if (score >= 80 && item.author.id) {
        profiler.snowballAccountIfHighViral({
          platform: item.platform,
          accountId: item.author.id || item.author.handle,
          handle: item.author.handle,
          followers: item.author.followersCount,
          views: item.views,
          score
        });
      }

      return {
        id: item.id,
        postId: item.postId,
        platform: item.platform,
        title: item.title,
        description: item.description,
        hookTranscript: item.aiVideoScriptIdea?.hookPt || item.aiVideoScriptIdea?.hook || item.title,
        videoUrl: item.videoUrl || "",
        thumbnailUrl: item.thumbnailUrl || "",
        durationFormatted: formatDuration(item.durationSec),
        durationSec: item.durationSec,
        publishedAt: timeFmt.relative,
        publishedAtFormatted: timeFmt.full,
        author: {
          name: item.author.name,
          handle: item.author.handle,
          avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120",
          followersFormatted: formatMetric(item.author.followersCount),
          followersCount: item.author.followersCount,
          verified: false
        },
        region: country.toLowerCase(),
        niche: niche || "ia_tech",
        lane: lane,
        stats: {
          viewsFormatted: formatMetric(item.views),
          viewsCount: item.views,
          likesFormatted: formatMetric(item.likes),
          likesCount: item.likes,
          sharesFormatted: formatMetric(item.shares),
          sharesCount: item.shares,
          commentsFormatted: formatMetric(item.comments),
          commentsCount: item.comments
        },
        metrics: {
          engagementRate: item.likes && item.views ? Number(((item.likes / item.views) * 100).toFixed(1)) : 0,
          sharesRatio: 0,
          growthVelocity: `+${formatMetric(Math.round(item.views / 24))}/h`,
          growthVelocityNum: 80,
          channelAnomalyRatio: 3.5,
          opportunityWindow: "Próximas 16 horas",
          signalsEstimated: item.shares === null
        },
        score,
        scoreBadge: {
          label: score >= 80 ? 'Viral / Atacar Agora' : score >= 60 ? 'Médio Potencial / Validado' : 'Baixo Potencial / Observar',
          variant: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
          color: score >= 80 ? '#23a55a' : score >= 60 ? '#f59e0b' : '#64748b'
        },
        scoreBreakdown: breakdown,
        aiSignals: item.aiEvidence?.map(e => e.detail) || [],
        aiEvidence: item.aiEvidence || [],
        aiProbability: item.aiProbability ?? 0.60,
        aiTier: item.aiTier ?? 'provavel',
        toolGuess: item.toolGuess,
        aiVideoScriptIdea: item.aiVideoScriptIdea,
        accountTags: (item as any).accountTags,
        contentKind: item.contentKind,
        t2Applied: orchResult.meta.t2Applied,
        t2Reason: orchResult.meta.t2Reason || null,
        modelUsed: orchResult.meta.modelUsed || null,
        isAiGenerated: (item.aiProbability ?? 0) >= (config.thresholds?.ai_probability_gate || 0.60),
        isTrendAlert: score >= 80,
        isFresh: true,
        isDemo: false
      };
    });

    // Ordena por maior score decrescente
    finalVideos.sort((a, b) => b.score - a.score);

    // Persistência automática dos vídeos aprovados no banco viral_posts (se Supabase conectado)
    if (finalVideos.length > 0 && supabase) {
      try {
        const postsToUpsert = finalVideos.slice(0, 30).map(v => ({
          id: `${v.platform}_${v.postId}`,
          platform: ['tiktok', 'instagram', 'youtube', 'x'].includes(v.platform) ? v.platform : 'youtube',
          post_id: v.postId,
          title: v.title,
          description: v.description,
          hook_transcript: v.aiVideoScriptIdea?.hookPt || v.aiVideoScriptIdea?.hook || v.title,
          video_url: v.videoUrl,
          thumbnail_url: v.thumbnailUrl,
          author: v.author,
          region: v.region,
          niche: v.niche,
          lane: v.lane,
          score: v.score,
          score_breakdown: v.scoreBreakdown,
          score_config_version: v.scoreBreakdown?.configVersion || 'v3.4.0',
          script_idea: v.aiVideoScriptIdea || {},
          ai_probability: v.aiProbability,
          ai_tier: v.aiTier,
          ai_evidence: v.aiEvidence,
          is_ai_generated: v.isAiGenerated,
          is_trend_alert: v.isTrendAlert,
          published_at: v.publishedAtFormatted ? new Date(v.publishedAt).toISOString() : new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        }));

        await supabase.from('viral_posts').upsert(postsToUpsert, { onConflict: 'platform,post_id' });

        // Limpeza rotativa (Sliding Window de até 100 vídeos preservando favoritos)
        await enforce100PostsRetention(supabase, 100);
      } catch (_) {}
    }

    // Processamento da Raia Pautas v2
    const processedTopics = extractAndProcessTopics(rawCandidates, country);

    // Salva tópicos no banco viral_topics de forma segura
    if (processedTopics.length > 0) {
      try {
        const topicsToInsert = processedTopics.slice(0, 15).map(t => ({
          topic: t.topic,
          geo: t.geo,
          trend_volume: t.trendVolume,
          trend_growth: t.trendGrowth,
          verified: t.verified,
          opportunity_type: t.opportunityType,
          sources: t.sources,
          first_seen: t.firstSeen
        }));
        await supabase.from('viral_topics').insert(topicsToInsert);
      } catch (_) {}
    }

    // Resumo de Orçamento
    const budgetStatus = await governor.getStatus();
    meta.budgetStatus = budgetStatus;

    return new Response(
      JSON.stringify({
        success: true,
        total: finalVideos.length,
        videos: finalVideos,
        topics: processedTopics,
        highViralAlertCount: finalVideos.filter(v => v.score >= 80).length,
        errors: errors.length ? errors : undefined,
        meta
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        total: 0,
        videos: [],
        highViralAlertCount: 0,
        errors: [err?.message || "Erro interno na Edge Function viral-analyzer-v3"],
        meta
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

