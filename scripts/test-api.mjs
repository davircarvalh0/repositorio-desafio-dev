import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
const reportPath = resolve(root, process.env.REPORT_PATH || 'docs/results.json');
const startedAt = new Date().toISOString();
const prefix = `E2E-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const created = new Set();
const tests = [], cleanup = [];
let fatalError = null, baseline, a, b, c, missingId;
let commit = process.env.GITHUB_SHA || null;
try { commit ||= execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}

async function request(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  const raw = await response.text();
  let data = raw || null;
  try { data = JSON.parse(raw); } catch {}
  return { status: response.status, body: data };
}
async function test(group, name, method, path, body, expectedStatus, expected, check = () => {}) {
  const entry = { id: tests.length + 1, group, name, method, path, body: body ?? null, expectedStatus, expected, startedAt: new Date().toISOString() };
  tests.push(entry);
  const start = performance.now();
  try {
    const result = await request(method, path, body);
    entry.response = result;
    if (method === 'POST' && path === '/plantas' && Number.isInteger(result.body?.id) && result.body?.nome?.startsWith(prefix)) created.add(result.body.id);
    if (Array.isArray(expectedStatus)) assert.ok(expectedStatus.includes(result.status), `Status recebido: ${result.status}`);
    else assert.equal(result.status, expectedStatus, `Esperado HTTP ${expectedStatus}; recebido HTTP ${result.status}`);
    if (result.status === 400 || result.status === 404) {
      assert.equal(typeof result.body?.message, 'string', 'Erro deve conter message');
      assert.ok(result.body.message.trim().length > 0, 'Mensagem vazia');
    }
    await check(result.body, result);
    entry.status = 'passed';
  } catch (error) { entry.status = 'failed'; entry.error = error.message; }
  entry.durationMs = Math.round((performance.now() - start) * 100) / 100;
  console.log(`${entry.status === 'passed' ? 'PASS' : 'FAIL'} ${String(entry.id).padStart(2, '0')} ${name}${entry.error ? ` — ${entry.error}` : ''}`);
  return entry.response;
}
function requirePassed() {
  const latest = tests.at(-1);
  if (latest.status !== 'passed') throw new Error(`Pré-requisito falhou: ${latest.name}. Casos dependentes não executados.`);
  return latest.response.body;
}
const dataA = { nome: `${prefix}-Maranta`, especie: 'Maranta leuconeura', preco: 3990, estoque: 0, luminosidade: 'MEIA_SOMBRA', petFriendly: false, regaACadaDias: 3 };
const dataB = { nome: `${prefix}-Samambaia`, especie: 'Nephrolepis exaltata', preco: 8990, estoque: 5, luminosidade: 'SOMBRA', petFriendly: true, regaACadaDias: 2 };
const totals = (data) => {
  assert.ok(Array.isArray(data), 'A listagem deve ser uma lista');
  return data.reduce((acc, plant) => ({ valorTotalEmCentavos: acc.valorTotalEmCentavos + plant.preco * plant.estoque, totalDeVasos: acc.totalDeVasos + plant.estoque }), { valorTotalEmCentavos: 0, totalDeVasos: 0 });
};
function plantMatches(actual, expected) {
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(actual[key], value, `Campo ${key} incorreto`);
}
try {
  await test('Preparação', 'API disponível', 'GET', '/', undefined, 200, 'API responde HTTP 200.'); requirePassed();
  await test('Estoque', 'Listagem inicial para conferir a soma', 'GET', '/plantas', undefined, 200, 'Uma lista de plantas.', (data) => totals(data));
  const initial = requirePassed();
  const ids = new Set(initial.map((plant) => plant.id));
  missingId = 2147483647;
  while (ids.has(missingId)) missingId--;
  const initialTotals = totals(initial);
  await test('Estoque', 'Valor inicial corresponde à soma das plantas', 'GET', '/plantas/estoque/valor-total', undefined, 200, 'Soma de preco × estoque e quantidade de vasos.', (data) => assert.deepEqual(data, initialTotals));
  baseline = requirePassed();
  if (process.env.E2E_EXPECT_EMPTY === '1') {
    assert.equal(initial.length, 0, 'E2E_EXPECT_EMPTY=1 exige banco sem plantas');
    assert.deepEqual(baseline, { valorTotalEmCentavos: 0, totalDeVasos: 0 });
  }
  await test('Cadastro', 'Aceita estoque zero e petFriendly false', 'POST', '/plantas', dataA, 201, 'Planta criada com estoque 0 e petFriendly false.', (data) => {
    plantMatches(data, dataA); assert.ok(Number.isInteger(data.id) && data.id > 0);
    assert.ok(Number.isFinite(Date.parse(data.createdAt))); assert.ok(Number.isFinite(Date.parse(data.updatedAt)));
  }); a = requirePassed();
  await test('Cadastro', 'Cadastro com estoque disponível', 'POST', '/plantas', dataB, 201, 'Planta criada com estoque 5.', (data) => plantMatches(data, dataB)); b = requirePassed();
  for (const field of Object.keys(dataA)) {
    const body = { ...dataA }; delete body[field];
    await test('Cadastro', `Rejeita ausência de ${field}`, 'POST', '/plantas', body, 400, `Mensagem clara sobre ${field}.`);
  }
  for (const [label, patch] of [
    ['preço zero', { preco: 0 }], ['preço negativo', { preco: -1 }], ['preço como texto', { preco: '8990' }], ['preço fracionado', { preco: 89.9 }],
    ['estoque negativo', { estoque: -1 }], ['estoque fracionado', { estoque: 1.5 }], ['luminosidade inválida', { luminosidade: 'LUA' }],
    ['petFriendly como texto', { petFriendly: 'false' }], ['rega zero', { regaACadaDias: 0 }], ['rega fracionada', { regaACadaDias: 1.5 }],
    ['nome vazio', { nome: '   ' }], ['espécie vazia', { especie: '' }], ['preço nulo', { preco: null }],
  ]) await test('Cadastro', `Rejeita ${label}`, 'POST', '/plantas', { ...dataA, ...patch }, 400, 'Dados inválidos retornam 400 com mensagem.');
  await test('Consulta', 'Lista as duas plantas criadas', 'GET', '/plantas', undefined, 200, 'Lista inclui os dois IDs; cadastros recusados não criam registros.', (data) => {
    assert.ok(Array.isArray(data)); assert.ok(data.some((plant) => plant.id === a.id)); assert.ok(data.some((plant) => plant.id === b.id)); assert.equal(data.length, initial.length + 2);
  });
  await test('Consulta', 'Busca por ID existente', 'GET', `/plantas/${a.id}`, undefined, 200, 'Retorna a planta solicitada.', (data) => plantMatches(data, a));
  await test('Consulta', 'Busca por ID inexistente', 'GET', `/plantas/${missingId}`, undefined, 404, 'Planta não encontrada.');
  await test('Consulta', 'Rejeita ID textual', 'GET', '/plantas/abc', undefined, 400, 'ID deve ser inteiro positivo.');
  await test('Consulta', 'Rejeita ID zero', 'GET', '/plantas/0', undefined, 400, 'ID deve ser inteiro positivo.');
  await test('Edição', 'PATCH altera somente o preço', 'PATCH', `/plantas/${a.id}`, { preco: 4590 }, 200, 'Preço alterado; demais dados preservados.', (data) => {
    plantMatches(data, { ...a, preco: 4590, updatedAt: data.updatedAt }); assert.ok(Date.parse(data.updatedAt) >= Date.parse(a.updatedAt));
  }); requirePassed();
  for (const [label, body] of [['estoque negativo', { estoque: -1 }], ['preço zero', { preco: 0 }], ['booleano em texto', { petFriendly: 'true' }], ['luminosidade inválida', { luminosidade: 'LUA' }]]) await test('Edição', `PATCH rejeita ${label}`, 'PATCH', `/plantas/${a.id}`, body, 400, 'Edição recusada com mensagem clara.');
  await test('Edição', 'Edições recusadas preservam os dados', 'GET', `/plantas/${a.id}`, undefined, 200, 'Preço 4590; demais campos preservados.', (data) => plantMatches(data, { ...dataA, preco: 4590 }));
  await test('Edição', 'PATCH em ID inexistente', 'PATCH', `/plantas/${missingId}`, { preco: 5000 }, 404, 'Planta não encontrada.');
  await test('Edição', 'PATCH rejeita ID textual', 'PATCH', '/plantas/abc', { preco: 5000 }, 400, 'ID inválido.');
  for (const [name, query, predicate, present, absent] of [
    ['Luminosidade', '?luminosidade=SOMBRA', (plant) => plant.luminosidade === 'SOMBRA', b.id, a.id],
    ['petFriendly true', '?petFriendly=true', (plant) => plant.petFriendly === true, b.id, a.id],
    ['petFriendly false', '?petFriendly=false', (plant) => plant.petFriendly === false, a.id, b.id],
    ['Dois filtros combinados', '?luminosidade=MEIA_SOMBRA&petFriendly=false', (plant) => plant.luminosidade === 'MEIA_SOMBRA' && plant.petFriendly === false, a.id, b.id],
  ]) await test('Filtros', name, 'GET', `/plantas${query}`, undefined, 200, 'Todos os resultados atendem ao filtro e incluem a planta esperada.', (data) => {
    assert.ok(Array.isArray(data)); assert.ok(data.every(predicate)); assert.ok(data.some((plant) => plant.id === present)); assert.ok(!data.some((plant) => plant.id === absent));
  });
  for (const query of ['?luminosidade=LUA', '?petFriendly=sim', '?petFriendly=', '?petFriendly=true&petFriendly=false', '?luminosidade=SOMBRA&luminosidade=SOL_PLENO']) await test('Filtros', `Rejeita filtro ${query}`, 'GET', `/plantas${query}`, undefined, 400, 'Filtro inválido retorna 400.');
  const current = await request('GET', '/plantas');
  if (current.status !== 200 || !Array.isArray(current.body)) throw new Error('Não foi possível preparar filtro sem resultados');
  const empty = ['SOMBRA', 'MEIA_SOMBRA', 'SOL_PLENO'].flatMap((light) => [true, false].map((pet) => ({ light, pet }))).find(({ light, pet }) => !current.body.some((plant) => plant.luminosidade === light && plant.petFriendly === pet));
  if (empty) await test('Filtros', 'Filtro válido sem correspondências retorna lista vazia', 'GET', `/plantas?luminosidade=${empty.light}&petFriendly=${empty.pet}`, undefined, 200, 'Lista vazia, nunca 404.', (data) => assert.deepEqual(data, []));
  else tests.push({ id: tests.length + 1, group: 'Filtros', name: 'Filtro válido sem correspondências', status: 'skipped', expected: 'Lista vazia em banco isolado.', error: 'As seis combinações existem no banco. Não removemos plantas preexistentes.' });
  await test('Venda', 'Venda válida diminui estoque de 5 para 3', 'POST', `/plantas/${b.id}/venda`, { quantidade: 2 }, 200, 'Estoque final igual a 3.', (data) => plantMatches(data, { ...dataB, estoque: 3 })); requirePassed();
  await test('Venda', 'Recusa venda além do estoque', 'POST', `/plantas/${b.id}/venda`, { quantidade: 4 }, 400, 'Estoque insuficiente.');
  for (const [label, body] of [['zero', { quantidade: 0 }], ['negativa', { quantidade: -1 }], ['fracionada', { quantidade: 1.5 }], ['texto', { quantidade: '2' }], ['ausente', {}]]) await test('Venda', `Rejeita quantidade ${label}`, 'POST', `/plantas/${b.id}/venda`, body, 400, 'Quantidade deve ser inteiro positivo.');
  await test('Venda', 'Vendas recusadas não alteram estoque', 'GET', `/plantas/${b.id}`, undefined, 200, 'Estoque continua em 3.', (data) => assert.equal(data.estoque, 3));
  await test('Venda', 'Venda de planta inexistente', 'POST', `/plantas/${missingId}/venda`, { quantidade: 1 }, 404, 'Planta não encontrada.');
  await test('Venda', 'Venda com ID inválido', 'POST', '/plantas/abc/venda', { quantidade: 1 }, 400, 'ID inválido.');
  await test('Estoque', 'Totais após cadastro, edição e venda', 'GET', '/plantas/estoque/valor-total', undefined, 200, 'Total inicial + 26970 centavos e + 3 vasos.', (data) => assert.deepEqual(data, { valorTotalEmCentavos: baseline.valorTotalEmCentavos + 26970, totalDeVasos: baseline.totalDeVasos + 3 }));
  await test('Venda', 'Venda de todo o estoque restante', 'POST', `/plantas/${b.id}/venda`, { quantidade: 3 }, 200, 'Estoque final igual a zero.', (data) => assert.equal(data.estoque, 0)); requirePassed();
  await test('Venda', 'Recusa venda de planta esgotada', 'POST', `/plantas/${b.id}/venda`, { quantidade: 1 }, 400, 'Estoque insuficiente.');
  await test('Concorrência', 'Prepara planta com um único vaso', 'POST', '/plantas', { ...dataB, nome: `${prefix}-Concorrencia`, estoque: 1 }, 201, 'Planta criada com estoque 1.'); c = requirePassed();
  const simultaneous = await Promise.all([
    test('Concorrência', 'Compra simultânea A', 'POST', `/plantas/${c.id}/venda`, { quantidade: 1 }, [200, 400], 'Uma compra passa; a outra é recusada.'),
    test('Concorrência', 'Compra simultânea B', 'POST', `/plantas/${c.id}/venda`, { quantidade: 1 }, [200, 400], 'Uma compra passa; a outra é recusada.'),
  ]);
  await test('Concorrência', 'Somente uma compra passa e estoque termina em zero', 'GET', `/plantas/${c.id}`, undefined, 200, 'Status das vendas [200, 400]; estoque final 0.', (data) => {
    assert.deepEqual(simultaneous.map((result) => result?.status).sort((x, y) => x - y), [200, 400]); assert.equal(data.estoque, 0);
  });
  await test('Exclusão', 'Exclui planta criada pela suíte', 'DELETE', `/plantas/${a.id}`, undefined, 204, 'Resposta sem corpo.', (data) => assert.equal(data, null));
  await test('Exclusão', 'Busca após exclusão retorna 404', 'GET', `/plantas/${a.id}`, undefined, 404, 'Planta não encontrada.');
  await test('Exclusão', 'Excluir novamente retorna 404', 'DELETE', `/plantas/${a.id}`, undefined, 404, 'Planta não encontrada.');
  await test('Exclusão', 'Excluir ID inválido retorna 400', 'DELETE', '/plantas/abc', undefined, 400, 'ID inválido.');
} catch (error) { fatalError = error.message; console.error(fatalError); }
finally {
  for (const id of created) {
    try { const result = await request('DELETE', `/plantas/${id}`); cleanup.push({ id, status: result.status, ok: [204, 404].includes(result.status) }); }
    catch (error) { cleanup.push({ id, ok: false, error: error.message }); }
  }
  if (baseline && !fatalError && cleanup.every((item) => item.ok)) await test('Estoque', 'Após limpeza, totais voltam ao valor inicial', 'GET', '/plantas/estoque/valor-total', undefined, 200, 'Totais iguais aos registrados antes da suíte.', (data) => assert.deepEqual(data, baseline));
  const summary = { total: tests.length, passed: tests.filter((test) => test.status === 'passed').length, failed: tests.filter((test) => test.status === 'failed').length, skipped: tests.filter((test) => test.status === 'skipped').length };
  const report = {
    schemaVersion: 1, project: 'Folhagem & Cia', author: 'Davi Rosendo', startedAt, finishedAt: new Date().toISOString(),
    source: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local', commit,
    runUrl: process.env.GITHUB_RUN_ID ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
    baseUrl, runId: prefix, summary, fatalError, cleanup,
    scope: 'Testes HTTP contra a API real. Plantas próprias da suíte; limpeza ao final. Execute sem outras alterações simultâneas no banco.', tests,
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\n${summary.passed}/${summary.total} aprovados; ${summary.failed} falhas; ${summary.skipped} não executados.\nRelatório: ${reportPath}`);
  if (summary.failed || fatalError || cleanup.some((item) => !item.ok)) process.exitCode = 1;
}
