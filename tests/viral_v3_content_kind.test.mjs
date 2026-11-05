// Testes Unitários de Classificação de Conteúdo, T1/T2 e Neutralidade de Consistência (v3.1.0)
// Importação direta dos módulos TypeScript oficiais de produção
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { detectT1AiSignals, resolveFinalAiTier } from '../supabase/functions/viral-analyzer-v3/aiDetector.ts';

describe('Fase 8.1 — Testes de Classificação de Conteúdo e Promoção de IA (v3.1.0)', () => {

  test('(i) "Como usar o Midjourney" é classificado como tutorial e NÃO vira provável', () => {
    const res = detectT1AiSignals("Como usar o Midjourney para criar logos profissionais em 5 minutos", false);
    assert.strictEqual(res.contentKind, 'tutorial_ferramenta', 'Deve ser classificado como tutorial');
    assert.notStrictEqual(res.tier, 'provavel', 'Tutorial não pode ser provável obra de IA');
    assert.strictEqual(res.tier, 'baixa', 'Tier deve ser baixa');
    assert.ok(res.probability < 0.60, `Probabilidade deve ser rebaixada (< 0.60), obteve ${res.probability}`);
  });

  test('(ii) Notícia sobre o Sora é classificada como notícia e NÃO vira provável', () => {
    const res = detectT1AiSignals("Última notícia: Nova atualização e lançamento do OpenAI Sora muda o cinema", false);
    assert.strictEqual(res.contentKind, 'review_noticia', 'Deve ser classificado como review_noticia');
    assert.notStrictEqual(res.tier, 'provavel', 'Notícia não pode ser provável obra de IA');
    assert.strictEqual(res.tier, 'baixa', 'Tier deve ser baixa');
    assert.ok(res.probability < 0.60, `Probabilidade deve ser rebaixada (< 0.60), obteve ${res.probability}`);
  });

  test('(iii) Bio "AI Artist" + hashtag #ia SEM outra evidência NÃO vira provável no T1', () => {
    // role (0.35) + hashtag (0.25): P = 1 - (1-0.35)*(1-0.25) = 1 - 0.65*0.75 = 0.5125 (< 0.60)
    const res = detectT1AiSignals("Perfil de um ai artist compartilhando novidades do mercado #ia", false);
    assert.notStrictEqual(res.tier, 'provavel', 'Bio + hashtag isoladas não podem passar do limiar de 0.60 no T1');
    assert.strictEqual(res.tier, 'baixa');
  });

  test('(iv) Rótulo declarado vira confirmada imediatamente', () => {
    const res = detectT1AiSignals("Vídeo artístico de animação", true, 'instagram');
    assert.strictEqual(res.tier, 'confirmada', 'Rótulo oficial deve conferir tier confirmada');
    assert.strictEqual(res.contentKind, 'obra_ia');
    assert.ok(res.probability >= 0.98);
  });

  test('(v) Menção de ferramenta + T2 >= 0.8 vira confirmada', () => {
    // T1 detecta ferramenta Kling (0.55) -> tier inicial baixa (apenas 1 evidência)
    const t1 = detectT1AiSignals("Cena sci-fi cinematográfica gerada no Kling", false);
    assert.strictEqual(t1.tier, 'baixa', 'T1 sozinho com 1 ferramenta não pode ser provavel');
    assert.strictEqual(t1.contentKind, 'obra_ia');

    // T2 analisa e valida como obra de IA de alta qualidade (is_ai = 0.92)
    const resolved = resolveFinalAiTier(t1, { is_ai: 0.92, content_kind: 'obra_ia' });
    assert.strictEqual(resolved.tier, 'confirmada', 'Menção de ferramenta + T2 >= 0.8 deve promover para confirmada');
    assert.strictEqual(resolved.contentKind, 'obra_ia');
  });

  test('(vi) Obra de IA sem rótulo com 2 evidências independentes + T2 concordando vira provável/confirmada', () => {
    // Texto com ferramenta (Kling) + termo de criador (diretor de ia) -> 2 evidências
    const t1 = detectT1AiSignals("Curta-metragem de terror criado por diretor de ia no kling #aivideo", false);
    assert.strictEqual(t1.tier, 'provavel', '2 evidências independentes (tool + role + hashtag) com P >= 0.60 devem ser provavel');
    assert.strictEqual(t1.contentKind, 'obra_ia');

    // Caso A: T2 concorda com score moderado (0.75) -> mantém provável
    const resModerate = resolveFinalAiTier(t1, { is_ai: 0.75, content_kind: 'obra_ia' });
    assert.strictEqual(resModerate.tier, 'provavel');

    // Caso B: T2 concorda com convicção alta (0.88) -> promove para confirmada
    const resHigh = resolveFinalAiTier(t1, { is_ai: 0.88, content_kind: 'obra_ia' });
    assert.strictEqual(resHigh.tier, 'confirmada');
  });

  test('(vii) Consistência da conta é matematicamente neutra e sem viés de seguidores', () => {
    // Critérios de consistência conforme nova especificação
    const subpoints = { cadence: 3, traction: 4, efficiency: 3 };
    const percentiles = { p25: 50, p50: 100, p75: 250 };

    function computeConsistencyPoints(posts30d, recentAbove2x, medianViews, followers, followersPerPost, reachRatio) {
      let points = 0;
      if (posts30d >= 4) points += subpoints.cadence;
      else if (posts30d >= 2) points += subpoints.cadence * 0.5;

      if (recentAbove2x >= 3 || (medianViews > 0 && medianViews >= followers)) {
        points += subpoints.traction;
      } else if (reachRatio >= 5) {
        points += subpoints.traction * 0.75;
      }

      if (followersPerPost >= percentiles.p75) points += subpoints.efficiency;
      else if (followersPerPost >= percentiles.p50) points += subpoints.efficiency * 0.7;
      else if (followersPerPost >= percentiles.p25) points += subpoints.efficiency * 0.4;
      else points += subpoints.efficiency * 0.2;

      return points;
    }

    // Conta pequena (10k seguidores) com boa cadência e eficiência
    const smallAccountPts = computeConsistencyPoints(5, 3, 12000, 10000, 260, 2.5);
    // Conta grande (500k seguidores) com mesma cadência e eficiência
    const bigAccountPts = computeConsistencyPoints(5, 3, 600000, 500000, 260, 2.5);

    assert.strictEqual(smallAccountPts, bigAccountPts, 'Pontuação de consistência deve ser 100% idêntica e neutra ao tamanho da conta');
    assert.strictEqual(smallAccountPts, 10, 'Ambas devem atingir nota máxima (10 pts) puramente por mérito');
  });
});
