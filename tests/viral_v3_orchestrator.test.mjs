// Testes Unitários de Ponta a Ponta do Orquestrador V3.4 (tests/viral_v3_orchestrator.test.mjs)
// IMPORTAÇÃO DIRETA DOS MESMOS ARQUIVOS-FONTE TYPESCRIPT IMPLANTADOS NO SUPABASE
import { test, describe } from 'node:test';
import assert from 'node:assert';

import { runViralOrchestratorV3 } from '../supabase/functions/viral-analyzer-v3/orchestrator.ts';
import { detectT1AiSignals, resolveFinalAiTier, isAllowedThumbnailHost } from '../supabase/functions/viral-analyzer-v3/aiDetector.ts';
import { computeV3Score } from '../supabase/functions/viral-analyzer-v3/scoringEngine.ts';
import { verifyUserAuthentication } from '../supabase/functions/viral-analyzer-v3/authGuard.ts';
import { BudgetGovernor } from '../supabase/functions/viral-analyzer-v3/budgetGovernor.ts';
import { buildApifyInput, mapApifyItemToCandidate } from '../supabase/functions/viral-analyzer-v3/apifyAdapter.ts';

// Configuração v3.4 Provisória para Testes
const TEST_CONFIG = {
  thresholds: {
    min_views_normal: 5000,
    ai_probability_gate: 0.60,
    velocity_floor: 100,
    velocity_cap: 1000000,
    velocity_floor_provisional: true,
    velocity_cap_provisional: true
  },
  weights: {
    reach_vs_followers: 15,
    outlier_vs_median: 15,
    recency_and_velocity: 25,
    hook_and_idea: 20,
    engagement: 15,
    account_consistency: 10
  },
  t1_weights: {
    declared: 0.98,
    tool: 0.55,
    role: 0.35,
    hashtag: 0.25,
    penalty_tutorial: 0.40,
    penalty_ad: 0.50
  },
  t1_thresholds: {
    confirmed: 0.80,
    probable: 0.60,
    t2_min_prob: 0.20
  },
  apify_pricing: {
    "instagram-reel-scraper": {
      unit_usd: 0.003,
      source: "https://apify.com/apify/instagram-reel-scraper/pricing",
      verified_at: null
    },
    "tiktok-scraper": {
      unit_usd: 0.005,
      source: "https://apify.com/clockworks/tiktok-scraper/pricing",
      verified_at: null
    }
  },
  engagement_refs: {
    youtube: { ref_low: 0.015, ref_high: 0.06, provisional: true },
    instagram: { ref_low: 0.02, ref_high: 0.08, provisional: true },
    tiktok: { ref_low: 0.03, ref_high: 0.10, provisional: true },
    default: { ref_low: 0.02, ref_high: 0.08, provisional: true }
  }
};

describe('Pipeline V3.4 — Importação Direta dos Módulos TypeScript e Orquestrador', () => {

  // ─── 1. TESTES DO FUNIL E RESGATE T2 ─────────────────────────────────────

  test('(a) Obra de IA com "comenta CURSO" no CTA final é resgatada e confirmada como obra_ia pelo T2', async () => {
    const candidates = [{
      id: 'video-obra-cta',
      postId: 'cta123',
      platform: 'instagram',
      title: 'Curta Sci-Fi Ultra Realista com Veo 2 e Kling',
      description: 'Renderizado 100% com modelos neurais gerando cena cinematográfica espacial.\n\nSe gostou, comenta CURSO que te envio a lista de ferramentas na DM!',
      views: 85000,
      likes: 6200,
      comments: 480,
      shares: null,
      durationSec: 45,
      publishedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      ageHours: 12,
      author: { name: 'Criador IA', handle: '@criadoria', followersCount: 15000 }
    }];

    const t2Executor = async () => {
      const map = new Map();
      map.set('video-obra-cta', {
        is_ai: 0.92,
        content_kind: 'obra_ia',
        hook_strength: 0.85,
        narrative_originality: 4,
        recreatability: 4,
        t2_inputs_used: ['title', 'caption', 'thumbnail']
      });
      return { results: map, t2Applied: true, modelUsed: 'gemini-1.5-flash-provisional' };
    };

    const res = await runViralOrchestratorV3(candidates, { config: TEST_CONFIG, t2Executor });

    assert.strictEqual(res.passedVideos.length, 1, 'Obra deve ser aprovada');
    assert.strictEqual(res.rejectedVideos.length, 0, 'Nenhum deve ser rejeitado');
    const passed = res.passedVideos[0];
    assert.strictEqual(passed.contentKind, 'obra_ia');
    assert.strictEqual(passed.aiTier, 'confirmada');
    assert(passed.aiProbability >= 0.80, 'Probabilidade confirmada');
  });

  test('(b) Tutorial real com termo no título/início permanece tutorial e é rejeitado na raia recriar', async () => {
    const candidates = [{
      id: 'video-tutorial-real',
      postId: 'tut123',
      platform: 'youtube',
      title: 'Como usar o Midjourney v6 do zero - Passo a Passo Completo',
      description: 'Tutorial completo ensinando a criar prompts profissionais com IA.',
      views: 45000,
      likes: 2100,
      comments: 110,
      shares: null,
      durationSec: 600,
      publishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      ageHours: 24,
      author: { name: 'Canal de Cursos', handle: '@cursosia', followersCount: 50000 }
    }];

    const t2Executor = async () => {
      const map = new Map();
      map.set('video-tutorial-real', {
        is_ai: 0.88,
        content_kind: 'tutorial',
        hook_strength: 0.70,
        narrative_originality: 3,
        recreatability: 5
      });
      return { results: map, t2Applied: true, modelUsed: 'gemini-1.5-flash-provisional' };
    };

    const res = await runViralOrchestratorV3(candidates, { config: TEST_CONFIG, t2Executor });

    assert.strictEqual(res.passedVideos.length, 0, 'Tutorial não passa na raia recriar');
    assert.strictEqual(res.rejectedVideos.length, 1, 'Deve estar na lista de rejeitados');
    assert.strictEqual(res.rejectedVideos[0].item.contentKind, 'tutorial');
  });

  test('(c) Item sem nenhuma evidência de IA não vira elegível para T2 e não consome cota', async () => {
    const candidates = [{
      id: 'video-sem-ia',
      postId: 'vlog123',
      platform: 'youtube',
      title: 'Passeio com meu cachorro no parque no domingo de sol',
      description: 'Dia incrível curtindo a natureza e relaxando em família.',
      views: 30000,
      likes: 1500,
      comments: 50,
      shares: null,
      durationSec: 60,
      publishedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      ageHours: 18,
      author: { name: 'Vlog Diário', handle: '@vlog', followersCount: 10000 }
    }];

    let t2Called = false;
    const t2Executor = async () => {
      t2Called = true;
      return new Map();
    };

    const res = await runViralOrchestratorV3(candidates, { config: TEST_CONFIG, t2Executor });

    assert.strictEqual(candidates[0].t2Eligible, false, 'Não deve ser elegível para T2');
    assert.strictEqual(t2Called, false, 'T2 não deve ser acionado');
    assert.strictEqual(res.passedVideos.length, 0);
    assert.strictEqual(res.rejectedVideos.length, 1);
  });

  // ─── 2. AUTENTICAÇÃO REAL E SEGURANÇA ────────────────────────────────────

  test('(d) Autenticação da Função v3 via authGuard: sem Authorization ou só chave anônima resulta em 401', async () => {
    // 1. Sem Authorization -> 401
    const resNoAuth = await verifyUserAuthentication("", { getUser: async () => ({ data: null, error: new Error("no token") }) });
    assert.strictEqual(resNoAuth.authenticated, false);
    assert.strictEqual(resNoAuth.statusCode, 401);
    assert(resNoAuth.error.includes("login ativo"));

    // 2. Só chave anônima (sem sessão de usuário no getUser) -> 401
    const resAnonOnly = await verifyUserAuthentication("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_key_mock", {
      getUser: async () => ({ data: { user: null }, error: { message: "invalid token" } })
    });
    assert.strictEqual(resAnonOnly.authenticated, false);
    assert.strictEqual(resAnonOnly.statusCode, 401);
    assert(resAnonOnly.error.includes("chave anônima pública sem sessão"));

    // 3. Usuário válido autenticado -> 200 / authenticated: true
    const resValidUser = await verifyUserAuthentication("Bearer valid_user_jwt_mock", {
      getUser: async (token) => token === "valid_user_jwt_mock" ? { data: { user: { id: "user-uuid-123" } }, error: null } : { data: null, error: new Error("invalid") }
    });
    assert.strictEqual(resValidUser.authenticated, true);
    assert.strictEqual(resValidUser.userId, "user-uuid-123");
  });

  test('(e) Governador de Orçamento: teto diário do Gemini (400 req) impõe gemini_budget_cap', async () => {
    // Simula mock do supabase client para o governador com 400 chamadas hoje de Gemini
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: async () => ({
            data: [
              { fonte: 'gemini', quantidade: 400, custo_estimado: 0 },
              { fonte: 'youtube', quantidade: 500, custo_estimado: 0 }
            ],
            error: null
          })
        }),
        insert: async () => ({ error: null })
      })
    };

    const gov = new BudgetGovernor(mockSupabase, { geminiDailyRequests: 400 });
    const checkAllowed = await gov.canExecute('gemini', 1);

    assert.strictEqual(checkAllowed.allowed, false, 'Deve barrar quando o teto de 400 requisições Gemini for atingido');
    assert.strictEqual(checkAllowed.reason, 'gemini_budget_cap', 'Motivo deve ser exatamente gemini_budget_cap');
  });

  // ─── 3. CALIBRAÇÃO DE VELOCIDADE COM EXPOENTE 0.85 DA FUNÇÃO REAL ─────────

  test('(f) Velocidade Real (computeV3Score): 5M/20h dá ~22.5 pts, 900k/30h dá ~16.9 pts e 5k/72h dá ~0.8 pts', () => {
    const config = {
      weights: { recency_and_velocity: 25 },
      thresholds: { velocity_floor: 100, velocity_cap: 1000000, min_views_normal: 1000, ai_probability_gate: 0.60 }
    };

    const video5M = {
      views: 5000000,
      author: { followersCount: 50000 },
      publishedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
    };
    const video900k = {
      views: 900000,
      author: { followersCount: 50000 },
      publishedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString()
    };
    const video5k = {
      views: 5000,
      author: { followersCount: 50000 },
      publishedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    };

    const res5M = computeV3Score(video5M, config, { isCalibration: true });
    const res900k = computeV3Score(video900k, config, { isCalibration: true });
    const res5k = computeV3Score(video5k, config, { isCalibration: true });

    const pts5M = res5M.breakdown.criteria.find(k => k.id === 'recency_and_velocity').points;
    const pts900k = res900k.breakdown.criteria.find(k => k.id === 'recency_and_velocity').points;
    const pts5k = res5k.breakdown.criteria.find(k => k.id === 'recency_and_velocity').points;

    // Comparação numérica exata esperada pelo usuário
    assert(Math.abs(pts5M - 22.5) <= 0.2, `5M/20h esperado ~22.5, obteve ${pts5M}`);
    assert(Math.abs(pts900k - 16.9) <= 0.2, `900k/30h esperado ~16.9, obteve ${pts900k}`);
    assert(Math.abs(pts5k - 0.8) <= 0.2, `5k/72h esperado ~0.8, obteve ${pts5k}`);

    assert(pts5M > pts900k, `5M/20h (${pts5M}) deve superar estritamente 900k/30h (${pts900k})`);
    assert(pts5k <= 2.5, `5k/72h (${pts5k}) deve ser <= 10% do pilar de velocidade (<= 2.5 pts)`);
  });

  // ─── 4. MINIATURAS E HOSTS AUTORIZADOS ───────────────────────────────────

  test('(g) isAllowedThumbnailHost: valida estritamente os domínios oficiais e barra hosts desconhecidos', () => {
    assert.strictEqual(isAllowedThumbnailHost('https://i.ytimg.com/vi/123/hqdefault.jpg'), true, 'YouTube');
    assert.strictEqual(isAllowedThumbnailHost('https://scontent.cdninstagram.com/v/t51/123.jpg'), true, 'Instagram');
    assert.strictEqual(isAllowedThumbnailHost('https://p16-sign-va.tiktokcdn.com/123.jpg'), true, 'TikTok');
    assert.strictEqual(isAllowedThumbnailHost('https://preview.redd.it/123.png'), true, 'Reddit');
    assert.strictEqual(isAllowedThumbnailHost('https://images.unsplash.com/photo-123'), true, 'Unsplash');

    assert.strictEqual(isAllowedThumbnailHost('https://unknown-cdn.net/hack.jpg'), false, 'Host desconhecido barrado');
    assert.strictEqual(isAllowedThumbnailHost('https://malicious.org/image.png'), false, 'Host arbitrário barrado');
  });

  // ─── 5. CONFIGURAÇÃO TRANSPARENTE E PRECIFICAÇÃO APIFY ───────────────────

  test('(h) Apify Pricing na Config: verified_at é null e source aponta para a aba Pricing', () => {
    const igPricing = TEST_CONFIG.apify_pricing['instagram-reel-scraper'];
    const ttPricing = TEST_CONFIG.apify_pricing['tiktok-scraper'];

    assert.strictEqual(igPricing.verified_at, null, 'verified_at deve ser null até confirmação');
    assert(igPricing.source.endsWith('/pricing'), 'source deve apontar para aba Pricing');

    assert.strictEqual(ttPricing.verified_at, null, 'verified_at deve ser null até confirmação');
    assert(ttPricing.source.endsWith('/pricing'), 'source deve apontar para aba Pricing');
  });

  test('(i) apifyAdapter: constrói input flexível e mapeia item de dataset sem suposições rígidas', () => {
    // 1. Constrói input com URLs diretas (para os 11 reels positivos)
    const inputUrls = buildApifyInput({
      actorSlug: 'apify/instagram-reel-scraper',
      targetUrls: ['https://www.instagram.com/reel/DZKzJpwtx6X/'],
      resultsLimit: 1
    });
    assert.deepStrictEqual(inputUrls.directUrls, ['https://www.instagram.com/reel/DZKzJpwtx6X/']);
    assert.strictEqual(inputUrls.resultsLimit, 1);

    // 2. Constrói input com usernames
    const inputUsers = buildApifyInput({
      actorSlug: 'apify/instagram-reel-scraper',
      usernames: ['ovictorventura'],
      resultsLimit: 15
    });
    assert.deepStrictEqual(inputUsers.usernames, ['ovictorventura']);

    // 3. Mapeador de item genérico
    const candidate = mapApifyItemToCandidate({
      shortCode: 'DZKzJpwtx6X',
      caption: 'Incrível animação criada com inteligência artificial #sora',
      videoViewCount: 2800000,
      likesCount: 182000,
      commentsCount: 4200,
      sharesCount: 14000,
      videoDuration: 32.5,
      ownerUsername: 'ovictorventura',
      ownerFullName: 'Victor Ventura',
      ownerFollowersCount: 45000
    });

    assert.ok(candidate);
    assert.strictEqual(candidate.postId, 'DZKzJpwtx6X');
    assert.strictEqual(candidate.views, 2800000);
    assert.strictEqual(candidate.likes, 182000);
    assert.strictEqual(candidate.durationSec, 33);
    assert.strictEqual(candidate.authorHandle, '@ovictorventura');
    assert.strictEqual(candidate.followersCount, 45000);
  });

});
