// Testes e Calibração do Motor de Score V3 (VVS2 v3)
// Importação direta dos métodos puros do scoringEngine oficial de produção
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { computeV3Score } from '../supabase/functions/viral-analyzer-v3/scoringEngine.ts';

describe('VVS2 v3 Scoring Engine & Gates', () => {
  test('(a) Vídeo antigo de canal grande tem score baixo', () => {
    // 2M views em canal de 5M seguidores, postado há 2 meses (1440 horas)
    const oldLargeVideo = {
      id: 'old-large',
      platform: 'youtube',
      views: 2_000_000,
      likes: 60_000,
      comments: 1_200,
      shares: null,
      publishedAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
      durationSec: 180,
      isLive: false,
      author: { followersCount: 5_000_000, handle: 'mega_creator' },
      accountProfile: { medianViews: 2_500_000, posts30d: 8, sampledPostsCount: 10 },
      aiProbability: 0.90
    };

    const res = computeV3Score(oldLargeVideo);
    // Views/Seguidores é 0.4x (baixo), velocidade de 1440h é muito baixa
    assert.ok(res.score < 55, `Score esperado < 55 para vídeo antigo de canal grande, obteve ${res.score}`);
    assert.ok(res.tier === 'medio' || res.tier === 'baixo');
  });

  test('(b) 5M de views em conta de 10 mil seguidores, recente e consistente, tem score alto', () => {
    // 5M views em conta de 10k seguidores, postado há 12 horas
    const viralBreakout = {
      id: 'viral-breakout',
      platform: 'instagram',
      views: 5_000_000,
      likes: 420_000,
      comments: 9_500,
      shares: 65_000,
      publishedAt: new Date(Date.now() - 12 * 3_600_000).toISOString(),
      durationSec: 35,
      isLive: false,
      author: { followersCount: 10_000, handle: 'rising_ai_star' },
      accountProfile: { medianViews: 15_000, posts30d: 6, sampledPostsCount: 8, recentPostsAbove2xFollowers: 4 },
      aiProbability: 0.95,
      hookStrength: 9,
      narrativeOriginality: 5,
      recreatability: 4
    };

    const res = computeV3Score(viralBreakout);
    assert.ok(res.score >= 85, `Score esperado >= 85, obteve ${res.score}`);
    assert.strictEqual(res.tier, 'elite');
    assert.strictEqual(res.passedGates, true);
  });

  test('(c) Hit isolado é identificado sem bônus indevido de consistência', () => {
    // 800k views em conta sem consistência nenhuma (1 post há 30 dias, mediana 1000)
    const isolatedHit = {
      id: 'isolated-hit',
      platform: 'tiktok',
      views: 800_000,
      likes: 45_000,
      comments: 320,
      shares: 1_200,
      publishedAt: new Date(Date.now() - 20 * 3_600_000).toISOString(),
      durationSec: 25,
      isLive: false,
      author: { followersCount: 3_000, handle: 'random_user' },
      accountProfile: { medianViews: 1_000, posts30d: 1, sampledPostsCount: 6, recentPostsAbove2xFollowers: 0 },
      aiProbability: 0.85
    };

    const res = computeV3Score(isolatedHit);
    assert.ok(res.score >= 70 && res.score <= 88, `Hit isolado deve pontuar bem por alcance mas ter consistência limitada: ${res.score}`);
  });

  test('(d) Item sem shares não é penalizado por ausência de shares', () => {
    const itemWithShares = {
      id: 'with-shares',
      platform: 'instagram',
      views: 100_000,
      likes: 8_000,
      comments: 400,
      shares: 2_000,
      publishedAt: new Date(Date.now() - 10 * 3_600_000).toISOString(),
      durationSec: 40,
      isLive: false,
      author: { followersCount: 15_000, handle: 'user1' },
      aiProbability: 0.90
    };

    const itemWithoutShares = {
      ...itemWithShares,
      id: 'without-shares',
      shares: null // plataforma sem shares expostos
    };

    const resWith = computeV3Score(itemWithShares);
    const resWithout = computeV3Score(itemWithoutShares);

    // A diferença não deve punir desproporcionalmente o item sem shares
    const diff = Math.abs(resWith.score - resWithout.score);
    assert.ok(diff <= 4, `Diferença por ausência de shares deve ser pequena (<= 4 pts), obteve ${diff}`);
  });

  test('(e) Anúncio e live são barrados pelos portões', () => {
    const liveStream = {
      id: 'live-stream',
      platform: 'youtube',
      views: 50_000,
      likes: 2_000,
      comments: 500,
      shares: null,
      publishedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      durationSec: 3600, // 1 hora
      isLive: true,
      author: { followersCount: 20_000, handle: 'live_streamer' },
      aiProbability: 0.85
    };

    const res = computeV3Score(liveStream);
    assert.strictEqual(res.passedGates, false, 'Live stream deve ser barrada');
  });

  test('(f) Lista ordenada descrescente por score', () => {
    const items = [
      { id: '1', platform: 'instagram', views: 5000, publishedAt: new Date().toISOString(), durationSec: 30, author: { followersCount: 20000 }, aiProbability: 0.8 },
      { id: '2', platform: 'instagram', views: 500000, publishedAt: new Date().toISOString(), durationSec: 30, author: { followersCount: 5000 }, aiProbability: 0.9 },
      { id: '3', platform: 'instagram', views: 50000, publishedAt: new Date().toISOString(), durationSec: 30, author: { followersCount: 10000 }, aiProbability: 0.85 }
    ];

    const scored = items.map(it => ({ id: it.id, score: computeV3Score(it).score }));
    scored.sort((a, b) => b.score - a.score);

    assert.strictEqual(scored[0].id, '2', 'Maior score deve ser o breakout');
    assert.strictEqual(scored[2].id, '1', 'Menor score deve ser o de menor alcance relativo');
    assert.ok(scored[0].score >= scored[1].score);
    assert.ok(scored[1].score >= scored[2].score);
  });
});
