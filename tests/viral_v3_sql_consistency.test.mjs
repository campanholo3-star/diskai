import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Teste Estático de Consistência SQL x Código v3 (Sem dependências externas)
describe('Consistência Estática SQL x Código v3', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  const migrationFiles = [
    '20261028_viral_intelligence_tables.sql',
    '20261029_viral_watchlist_and_lanes.sql',
    '20261030_viral_v3_foundation.sql',
    '20261101_viral_v3_format_seeds.sql'
  ];

  // 1. Extrai tabelas e colunas das migrações
  const schema = new Map(); // tableName -> Set<columnName>
  const policies = []; // { file, policyName, table, hasDropBefore, body }
  const inserts = []; // { file, table, columns: string[] }

  for (const f of migrationFiles) {
    const fullPath = path.join(migrationsDir, f);
    const sql = fs.readFileSync(fullPath, 'utf8');

    // CREATE TABLE [IF NOT EXISTS] [public.]table_name ( ... );
    const tableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
    let match;
    while ((match = tableRegex.exec(sql)) !== null) {
      const tableName = match[1].toLowerCase();
      if (!schema.has(tableName)) schema.set(tableName, new Set());
      const colsBlock = match[2];

      const lines = colsBlock.split('\n');
      for (const line of lines) {
        const trimmed = line.trim().replace(/,$/, '');
        if (!trimmed || trimmed.startsWith('--') || trimmed.toUpperCase().startsWith('CONSTRAINT') || trimmed.toUpperCase().startsWith('PRIMARY') || trimmed.toUpperCase().startsWith('UNIQUE') || trimmed.toUpperCase().startsWith('CHECK')) {
          continue;
        }
        const colMatch = trimmed.match(/^(\w+)\s+/);
        if (colMatch) {
          schema.get(tableName).add(colMatch[1].toLowerCase());
        }
      }
    }

    // ALTER TABLE [public.]table_name ADD COLUMN [IF NOT EXISTS] col_name type
    const alterRegex = /ALTER\s+TABLE(?:\s+ONLY)?\s+(?:public\.)?(\w+)\s+ADD\s+COLUMN(?:\s+IF\s+NOT\s+EXISTS)?\s+([\s\S]*?);/gi;
    let alterMatch;
    while ((alterMatch = alterRegex.exec(sql)) !== null) {
      const tableName = alterMatch[1].toLowerCase();
      if (!schema.has(tableName)) schema.set(tableName, new Set());
      const adds = alterMatch[2].split(',');
      for (const add of adds) {
        const colMatch = add.trim().match(/^(?:ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?)?(\w+)\s+/i);
        if (colMatch && !['constraint', 'check', 'unique', 'foreign'].includes(colMatch[1].toLowerCase())) {
          schema.get(tableName).add(colMatch[1].toLowerCase());
        }
      }
    }

    // INSERT INTO [public.]table_name (col1, col2, ...)
    const insertRegex = /INSERT\s+INTO\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)\)/gi;
    let insMatch;
    while ((insMatch = insertRegex.exec(sql)) !== null) {
      const tableName = insMatch[1].toLowerCase();
      const cols = insMatch[2].split(',').map(c => c.trim().toLowerCase());
      inserts.push({ file: f, table: tableName, columns: cols });
    }

    // CREATE POLICY "name" ON [public.]table
    const policyRegex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?(\w+)([\s\S]*?);/gi;
    let polMatch;
    while ((polMatch = policyRegex.exec(sql)) !== null) {
      const polName = polMatch[1];
      const tableName = polMatch[2].toLowerCase();
      const body = polMatch[3];
      const polIndex = polMatch.index;
      const precedingSql = sql.substring(Math.max(0, polIndex - 300), polIndex);
      const hasDrop = precedingSql.includes(`DROP POLICY IF EXISTS "${polName}" ON`);

      policies.push({
        file: f,
        name: polName,
        table: tableName,
        hasDropBefore: hasDrop,
        body
      });
    }
  }

  test('(a) Toda coluna referenciada em comandos INSERT existe na definição da tabela', () => {
    for (const ins of inserts) {
      const tableCols = schema.get(ins.table);
      assert.ok(tableCols, `Tabela ${ins.table} não encontrada no schema consolidado das migrações`);
      for (const col of ins.columns) {
        assert.ok(
          tableCols.has(col),
          `Coluna "${col}" usada no INSERT de ${ins.table} em ${ins.file} NÃO existe na tabela! Colunas existentes: ${Array.from(tableCols).join(', ')}`
        );
      }
    }
  });

  test('(b) Tabelas e colunas usadas em .from(), .insert(), .upsert(), .select() no código v3 existem no banco', () => {
    const fnDir = path.resolve(process.cwd(), 'supabase/functions/viral-analyzer-v3');
    const fnFiles = fs.readdirSync(fnDir).filter(f => f.endsWith('.ts'));

    const fromRegex = /\.from\(['"](\w+)['"]\)/g;
    for (const f of fnFiles) {
      const content = fs.readFileSync(path.join(fnDir, f), 'utf8');
      let m;
      while ((m = fromRegex.exec(content)) !== null) {
        const table = m[1].toLowerCase();
        assert.ok(schema.has(table), `Código em ${f} referencia tabela inexistente no schema: "${table}"`);
      }
    }
  });

  test('(c) Índices e políticas das migrações v3 referenciam colunas existentes', () => {
    for (const pol of policies) {
      const tableCols = schema.get(pol.table);
      assert.ok(tableCols, `Política "${pol.name}" criada sobre tabela inexistente: ${pol.table}`);
    }
  });

  test('(d) Nenhuma política nova (20261030 e 20261101) referencia tabelas fora das migrações virais (ex: profiles)', () => {
    const v3Policies = policies.filter(p => p.file.startsWith('20261030') || p.file.startsWith('20261101'));
    for (const pol of v3Policies) {
      const hasExternalTable = pol.body.toLowerCase().includes('from profiles') || pol.body.toLowerCase().includes('public.profiles');
      assert.strictEqual(
        hasExternalTable,
        false,
        `Política v3 "${pol.name}" em ${pol.file} referencia tabela externa "profiles"! O acesso deve ser restrito a service_role.`
      );
    }
  });

  test('(e) Toda política criada nas migrações v3 está estritamente precedida de DROP POLICY IF EXISTS', () => {
    const v3Policies = policies.filter(p => p.file.startsWith('20261030') || p.file.startsWith('20261101'));
    for (const pol of v3Policies) {
      assert.strictEqual(
        pol.hasDropBefore,
        true,
        `Política "${pol.name}" em ${pol.file} NÃO possui DROP POLICY IF EXISTS imediatamente antes de sua criação!`
      );
    }
  });
});

