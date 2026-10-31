const $ = (selector) => document.querySelector(selector);
const names = { passed: 'Aprovado', failed: 'Falhou', skipped: 'Não executado' };
let report, category = 'Todas';
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const json = (value) => JSON.stringify(value, null, 2);
const date = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'medium' }) + ' · Fortaleza' : 'Não informado';
try { document.documentElement.dataset.theme = localStorage.getItem('folhagem-theme') || 'light'; } catch {}
$('#theme').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('folhagem-theme', theme); } catch {}
});
function validate(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.tests)) throw new Error('Formato de relatório não reconhecido. Use o JSON gerado por scripts/test-api.mjs.');
  const ids = new Set();
  for (const test of data.tests) {
    if (!Number.isInteger(test.id) || ids.has(test.id) || !['passed', 'failed', 'skipped'].includes(test.status) || typeof test.name !== 'string' || typeof test.group !== 'string') throw new Error('O relatório contém testes inválidos ou IDs repetidos.');
    ids.add(test.id);
  }
  return data;
}
function notice(message) { $('#notice').hidden = !message; $('#notice').textContent = message || ''; }
function requestText(test) {
  if (test.method === 'CLI') return `${test.path}\n\nVariáveis do teste:\n${json(test.body || {})}`;
  return `${test.method || '—'} ${test.path || '—'}${test.body === null || test.body === undefined ? '\n\nSem body.' : `\nContent-Type: application/json\n\n${json(test.body)}`}`;
}
function responseText(test) {
  if (test.method === 'CLI') return test.response ? `Código de saída: ${test.response.status}\n\n${json(test.response.body)}` : 'Comando sem resultado registrado.';
  return test.response ? `HTTP ${test.response.status}\n\n${test.response.body === null ? '(sem corpo)' : typeof test.response.body === 'string' ? test.response.body : json(test.response.body)}` : 'Sem resposta registrada.';
}
function render() {
  if (!report) return;
  const term = $('#search').value.trim().toLocaleLowerCase('pt-BR');
  const status = $('#status').value;
  const visible = report.tests.filter((test) => (category === 'Todas' || test.group === category) && (status === 'all' || test.status === status) && `${test.name} ${test.method} ${test.path} ${test.group}`.toLocaleLowerCase('pt-BR').includes(term));
  $('#list-count').textContent = `${visible.length} de ${report.tests.length} testes`;
  $('#empty').hidden = visible.length !== 0;
  $('#tests').innerHTML = visible.map((test) => `<details class="test-row" id="teste-${test.id}"><summary><span class="test-index">${String(test.id).padStart(2, '0')}</span><span class="test-info"><strong>${esc(test.name)}</strong><span class="test-route"><span class="method ${esc(test.method)}">${esc(test.method || '—')}</span>${esc(test.path || test.group)}</span></span><span class="badge ${esc(test.status)}">${names[test.status]}</span><span class="timing">${test.durationMs === undefined ? '—' : esc(test.durationMs) + ' ms'}</span><span class="chevron" aria-hidden="true">›</span></summary><div class="details-body"><div class="expected"><strong>Esperado${test.expectedStatus !== undefined ? (test.method === 'CLI' ? ' · código ' : ' · HTTP ') + esc(Array.isArray(test.expectedStatus) ? test.expectedStatus.join(' ou ') : test.expectedStatus) : ''}:</strong> ${esc(test.expected)}</div>${test.error ? `<p class="error">${esc(test.error)}</p>` : ''}<div class="code-grid"><div class="code-panel"><div class="code-head">${test.method === 'CLI' ? 'COMANDO' : 'REQUISIÇÃO'}<button class="copy" data-copy="request" data-id="${test.id}">Copiar</button></div><pre>${esc(requestText(test))}</pre></div><div class="code-panel"><div class="code-head">${test.method === 'CLI' ? 'RESULTADO REAL' : 'RESPOSTA REAL'}<button class="copy" data-copy="response" data-id="${test.id}">Copiar</button></div><pre>${esc(responseText(test))}</pre></div></div><div class="evidence-footer"><span>Teste ${String(test.id).padStart(2, '0')} · ${esc(test.group)} · ${esc(date(test.startedAt))}</span><button data-print="${test.id}">Imprimir evidência ↗</button></div></div></details>`).join('');
  $('#expand-all').textContent = 'Expandir testes';
}
function showReport(data) {
  report = validate(data);
  const summary = { total: report.tests.length, passed: 0, failed: 0, skipped: 0 };
  for (const test of report.tests) summary[test.status]++;
  for (const key of ['passed', 'failed', 'skipped']) $(`#${key}`).textContent = summary[key];
  $('#hero-score').textContent = summary.passed;
  $('#hero-total').textContent = `de ${summary.total} testes registrados`;
  const problems = report.fatalError || (report.cleanup || []).some((item) => !item.ok);
  $('#score-state').textContent = problems ? 'Execução incompleta' : summary.failed ? 'Revisão necessária' : summary.skipped ? 'Há cenários não executados' : summary.total ? 'Verificações aprovadas' : 'Sem testes';
  $('#score-ring').style.setProperty('--progress-angle', `${summary.total ? summary.passed / summary.total * 360 : 0}deg`);
  const seconds = (Date.parse(report.finishedAt) - Date.parse(report.startedAt)) / 1000;
  $('#duration').textContent = Number.isFinite(seconds) && seconds >= 0 ? `${seconds.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} s` : '—';
  $('#meta-source').textContent = report.source === 'github-actions' ? 'GitHub Actions · banco isolado' : 'API local · requisições reais';
  $('#meta-cleanup').textContent = !report.cleanup?.length ? 'Nenhum registro criado' : report.cleanup.every((item) => item.ok) ? `${report.cleanup.length} registros removidos ou já ausentes` : 'Falha na limpeza — consulte o JSON';
  const runLink = $('#run-link');
  runLink.hidden = true;
  if (typeof report.runUrl === 'string' && /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+$/.test(report.runUrl)) { runLink.href = report.runUrl; runLink.hidden = false; }
  category = 'Todas'; $('#search').value = ''; $('#status').value = 'all';
  $('#categories').innerHTML = ['Todas', ...new Set(report.tests.map((test) => test.group))].map((name) => `<button class="category" aria-pressed="${name === 'Todas'}" data-category="${esc(name)}">${esc(name)}</button>`).join('');
  notice(problems ? `Atenção: ${report.fatalError || 'houve falha na limpeza dos registros.'} Os resultados abaixo correspondem apenas aos casos registrados.` : '');
  $('#download').disabled = false;
  render();
  if (/^#teste-\d+$/.test(location.hash)) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) { target.open = true; target.scrollIntoView(); }
  }
}
$('#categories').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]'); if (!button) return;
  category = button.dataset.category;
  for (const item of $('#categories').children) item.setAttribute('aria-pressed', String(item === button));
  render();
});
$('#search').addEventListener('input', render);
$('#status').addEventListener('change', render);
$('#expand-all').addEventListener('click', () => {
  const rows = [...document.querySelectorAll('.test-row')];
  const open = rows.some((row) => !row.open);
  for (const row of rows) row.open = open;
  $('#expand-all').textContent = open ? 'Recolher testes' : 'Expandir testes';
});
$('#tests').addEventListener('click', async (event) => {
  const copy = event.target.closest('[data-copy]');
  if (copy) {
    const test = report.tests.find((test) => test.id === Number(copy.dataset.id));
    try { await navigator.clipboard.writeText(copy.dataset.copy === 'request' ? requestText(test) : responseText(test)); copy.textContent = 'Copiado'; }
    catch { copy.textContent = 'Selecione o texto abaixo'; }
    setTimeout(() => { copy.textContent = 'Copiar'; }, 2000);
  }
  const print = event.target.closest('[data-print]');
  if (print) {
    const id = `teste-${print.dataset.print}`;
    for (const row of document.querySelectorAll('.test-row')) row.classList.toggle('print-hidden', row.id !== id);
    window.print();
  }
});
window.addEventListener('afterprint', () => document.querySelectorAll('.print-hidden').forEach((row) => row.classList.remove('print-hidden')));
$('#download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([json(report)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'folhagem-resultados.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
fetch('./results.json', { cache: 'no-store' }).then((response) => {
  if (!response.ok) throw new Error(`Relatório indisponível (HTTP ${response.status}).`);
  return response.json();
}).then(showReport).catch((error) => {
  $('#list-count').textContent = 'Sem relatório';
  notice(`${error.message} Abra a página pela prévia local ou pelo endereço publicado para carregar o relatório. Nenhum resultado foi presumido.`);
});



