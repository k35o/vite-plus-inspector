import type { InspectorData } from './model.ts';

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function styles(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --sans: system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      --mono: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Fira Code', Menlo, monospace;
      --radius: 14px;
      --radius-sm: 9px;

      /* Light palette — the primary design target. */
      --bg: #f5f6f8;
      --surface: #ffffff;
      --surface2: #f1f3f6;
      --border: #e6e8ec;
      --text: #1a1d24;
      --muted: #677084;
      --accent: #0f766e;
      --accent-strong: #0b5e57;
      --accent-dim: #e3f3f0;
      --error: #b42318; --error-bg: #fdecea;
      --warn: #b54708;  --warn-bg: #fbf0e2;
      --off: #667085;   --off-bg: #eef0f3;
      --green: #067647; --blue: #175cd3; --yellow: #92500a;
      --row-hover: #f8f9fb;
      --shadow: 0 1px 2px rgba(16,24,40,0.04), 0 6px 16px rgba(16,24,40,0.06);
    }

    /* Dark — designed as an independent tone, not an inversion. */
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme='light']) {
        --bg: #14161b;
        --surface: #1b1e25;
        --surface2: #232730;
        --border: #2c313b;
        --text: #e7e9ed;
        --muted: #939cab;
        --accent: #2dd4bf;
        --accent-strong: #5eead4;
        --accent-dim: rgba(45,212,191,0.15);
        --error: #f97066; --error-bg: rgba(249,112,102,0.14);
        --warn: #fdb022;  --warn-bg: rgba(253,176,34,0.14);
        --off: #98a2b3;   --off-bg: rgba(152,162,179,0.14);
        --green: #6ce9a6; --blue: #84caff; --yellow: #fec84b;
        --row-hover: rgba(255,255,255,0.03);
        --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.34);
      }
    }
    :root[data-theme='dark'] {
      --bg: #14161b;
      --surface: #1b1e25;
      --surface2: #232730;
      --border: #2c313b;
      --text: #e7e9ed;
      --muted: #939cab;
      --accent: #2dd4bf;
      --accent-strong: #5eead4;
      --accent-dim: rgba(45,212,191,0.15);
      --error: #f97066; --error-bg: rgba(249,112,102,0.14);
      --warn: #fdb022;  --warn-bg: rgba(253,176,34,0.14);
      --off: #98a2b3;   --off-bg: rgba(152,162,179,0.14);
      --green: #6ce9a6; --blue: #84caff; --yellow: #fec84b;
      --row-hover: rgba(255,255,255,0.03);
      --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.34);
    }

    html, body { height: 100%; }
    body {
      background: var(--bg); color: var(--text);
      font-family: var(--sans);
      font-size: 13px; line-height: 1.6;
      display: flex; height: 100vh; overflow: hidden;
    }
    a { color: inherit; }
    .mono { font-family: var(--mono); }

    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

    #sidebar {
      width: 248px; min-width: 248px; background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .logo {
      padding: 16px 18px; font-size: 13px; font-weight: 700; letter-spacing: -0.01em;
      border-bottom: 1px solid var(--border); color: var(--text);
      display: flex; align-items: center; gap: 9px;
    }
    .logo-mark {
      width: 16px; height: 16px; border-radius: 5px; flex-shrink: 0;
      background: var(--accent);
    }
    .theme-toggle {
      margin-left: auto; font: inherit; font-size: 11px; color: var(--muted);
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 999px; padding: 4px 11px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
      transition: color 0.15s ease-out, border-color 0.15s ease-out;
    }
    .theme-toggle:hover { color: var(--text); border-color: var(--accent); }
    .theme-toggle svg { width: 13px; height: 13px; flex-shrink: 0; }
    .config-path {
      padding: 10px 18px; font-size: 10px; color: var(--muted); font-family: var(--mono);
      border-bottom: 1px solid var(--border); word-break: break-all;
    }
    .nav-section { padding: 10px; flex: 1; overflow-y: auto; }
    .nav-label {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em;
      color: var(--muted); padding: 6px 8px 6px; font-weight: 600;
    }
    .nav-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 11px; border-radius: var(--radius-sm); cursor: pointer; color: var(--muted);
      transition: background 0.15s ease-out, color 0.15s ease-out; user-select: none;
    }
    .nav-item:hover { background: var(--surface2); color: var(--text); }
    .nav-item.active { background: var(--accent-dim); color: var(--accent-strong); font-weight: 600; }
    .nav-badge {
      font-size: 10px; padding: 1px 7px; background: var(--surface2);
      border: 1px solid var(--border); border-radius: 999px; color: var(--muted); font-family: var(--mono);
    }
    .nav-item.active .nav-badge { background: var(--surface); border-color: var(--accent-dim); color: var(--accent-strong); }

    #content { flex: 1; overflow-y: auto; padding: 32px 36px; max-width: 1100px; }
    .section-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.02em; }
    .section-desc { font-size: 12px; color: var(--muted); margin-bottom: 24px; }

    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); margin-bottom: 18px; overflow: hidden;
      box-shadow: var(--shadow);
    }
    .card-header {
      padding: 12px 16px; font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--muted); border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 8px;
    }
    .card-header .ml-auto { margin-left: auto; display: flex; gap: 6px; align-items: center; }
    .card-body { padding: 16px; }

    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left; padding: 9px 16px; background: var(--surface2); color: var(--muted);
      font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
    }
    td { padding: 9px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; overflow-wrap: anywhere; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--row-hover); }

    .badge {
      display: inline-flex; align-items: center; font-size: 10px; padding: 2px 9px;
      border-radius: 999px; font-weight: 600; white-space: nowrap;
    }
    .badge-error { background: var(--error-bg); color: var(--error); }
    .badge-warn  { background: var(--warn-bg);  color: var(--warn); }
    .badge-off   { background: var(--off-bg);   color: var(--off); }
    .badge-info  { background: var(--accent-dim); color: var(--accent-strong); }

    .text-green { color: var(--green); } .text-blue { color: var(--blue); }
    .text-yellow { color: var(--yellow); } .text-muted { color: var(--muted); }
    .text-small { font-size: 11px; }
    .rule-link { color: var(--blue); text-decoration: none; font-family: var(--mono); }
    .rule-link:hover { text-decoration: underline; }

    .filter-wrap { padding: 10px 16px; border-bottom: 1px solid var(--border); }
    .filter-input {
      width: 100%; background: var(--bg); border: 1px solid var(--border);
      color: var(--text); padding: 7px 12px; border-radius: var(--radius-sm);
      font-family: var(--mono); font-size: 12px; outline: none;
      transition: border-color 0.15s ease-out;
    }
    .filter-input:focus { border-color: var(--accent); }
    .filter-input::placeholder { color: var(--muted); font-family: var(--sans); }

    .resolve-bar {
      padding: 14px 16px; border-bottom: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 9px;
    }
    .resolve-label { font-size: 11px; color: var(--muted); }
    .resolve-status { font-size: 11px; }

    .preset-row {
      padding: 14px 16px; border-bottom: 1px solid var(--border);
      display: flex; align-items: flex-start; gap: 13px;
    }
    .preset-row:last-child { border-bottom: none; }
    .preset-index {
      width: 22px; height: 22px; border-radius: 50%; background: var(--accent-dim);
      color: var(--accent-strong); font-size: 10px; font-weight: 700; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
    }

    .overview-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(212px, 1fr));
      gap: 14px; margin-bottom: 20px;
    }
    .overview-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 18px; cursor: pointer; box-shadow: var(--shadow);
      transition: border-color 0.15s ease-out, transform 0.15s ease-out;
    }
    .overview-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .overview-label {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em;
      color: var(--muted); margin-bottom: 8px; font-weight: 600;
    }
    .overview-value { font-size: 22px; font-weight: 700; margin-bottom: 3px; letter-spacing: -0.03em; }
    .overview-sub { font-size: 11px; color: var(--muted); }

    .tag {
      display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 999px;
      background: var(--surface2); border: 1px solid var(--border); color: var(--muted);
      margin-right: 4px; margin-bottom: 3px; font-family: var(--mono);
    }
    .empty { color: var(--muted); font-size: 12px; padding: 18px 16px; }

    @media (max-width: 760px) {
      body { flex-direction: column; height: auto; min-height: 100vh; overflow: auto; }
      #sidebar {
        width: 100%; min-width: 0; border-right: none; border-bottom: 1px solid var(--border);
      }
      .nav-label { display: none; }
      .nav-section { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; overflow: visible; }
      .nav-item { width: auto; gap: 7px; padding: 6px 12px; background: var(--surface2); }
      #content { padding: 18px 16px; overflow: visible; max-width: none; }
      .overview-grid { grid-template-columns: 1fr; }
      /* Share width evenly so a long key column can't starve its value. */
      table { table-layout: fixed; }
      th, td { width: auto !important; padding: 8px 11px; }
    }

    @media (prefers-reduced-motion: reduce) {
      * { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
    }
  `;
}

/**
 * The browser-side renderer. Written without backticks or `${` so it can be
 * embedded verbatim inside this module's template literal. It reads the
 * pre-resolved view-model from window.__INSPECTOR__ and renders sections;
 * the lint "resolve for file" box calls the server's /__resolve endpoint.
 */
function clientScript(): string {
  return `
(function () {
  var data = window.__INSPECTOR__;

  var SECTIONS = [
    { id: 'overview', label: 'Overview', sub: '' },
    { id: 'fmt',    label: 'fmt',    sub: 'oxfmt' },
    { id: 'lint',   label: 'lint',   sub: 'oxlint' },
    { id: 'staged', label: 'staged', sub: 'lint-staged' },
    { id: 'pack',   label: 'pack',   sub: 'tsdown' },
    { id: 'test',   label: 'test',   sub: 'vitest' },
    { id: 'run',    label: 'run',    sub: 'vp run' },
    { id: 'create', label: 'create', sub: 'scaffolding' }
  ];

  var active = 'overview';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function badge(text, cls) { return '<span class="badge badge-' + cls + '">' + esc(text) + '</span>'; }
  function tags(arr) { return arr.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join(''); }

  function renderValue(v) {
    if (v === true) return '<span class="text-green">true</span>';
    if (v === false) return '<span class="text-muted">false</span>';
    if (v === null || v === undefined) return '<span class="text-muted">null</span>';
    if (typeof v === 'string') return '<span class="text-yellow">"' + esc(v) + '"</span>';
    if (typeof v === 'number') return '<span class="text-blue">' + v + '</span>';
    if (Array.isArray(v)) return '<span class="text-muted">[' + v.length + ' items]</span>';
    if (typeof v === 'object') return '<span class="text-muted">' + esc(JSON.stringify(v)) + '</span>';
    return esc(String(v));
  }

  function kvTable(obj, keyWidth) {
    var keys = Object.keys(obj);
    if (!keys.length) return '<div class="empty">None</div>';
    var w = keyWidth ? ' style="width:' + keyWidth + '"' : '';
    var rows = keys.map(function (k) {
      return '<tr><td class="mono text-blue"' + w + '>' + esc(k) + '</td><td>' + renderValue(obj[k]) + '</td></tr>';
    }).join('');
    return '<table><tbody>' + rows + '</tbody></table>';
  }

  function patternsCard(title, list) {
    if (!list || !list.length) return '';
    var rows = list.map(function (p) { return '<tr><td class="mono text-green">' + esc(p) + '</td></tr>'; }).join('');
    return '<div class="card"><div class="card-header">' + esc(title) + ' <span class="nav-badge">' + list.length +
      '</span></div><table><tbody>' + rows + '</tbody></table></div>';
  }

  function optionsText(opts) {
    if (!opts || !opts.length) return '';
    return opts.map(function (o) { return esc(JSON.stringify(o)); }).join(', ');
  }

  function rulesTable(rules) {
    var head = '<table><thead><tr><th style="width:110px">Source</th><th>Rule</th>' +
      '<th style="width:70px">Severity</th><th>Options</th></tr></thead><tbody id="rules-body">';
    var body = rules.map(function (r) {
      var name = r.docsUrl
        ? '<a class="rule-link" href="' + esc(r.docsUrl) + '" target="_blank" rel="noreferrer">' + esc(r.id) + '</a>'
        : esc(r.id);
      return '<tr data-name="' + esc(r.id) + '" data-src="' + esc(r.source) + '">' +
        '<td class="text-muted text-small">' + esc(r.source) + '</td>' +
        '<td>' + name + '</td>' +
        '<td>' + badge(r.severity, r.severity) + '</td>' +
        '<td class="text-muted text-small">' + optionsText(r.options) + '</td></tr>';
    }).join('');
    return head + body + '</tbody></table>';
  }

  function countsBadges(c) {
    return badge(c.error + ' error', 'error') + badge(c.warn + ' warn', 'warn') + badge(c.off + ' off', 'off');
  }

  function navBadge(id) {
    var l;
    if (id === 'lint' && data.lint) return data.lint.baseRules.length;
    if (id === 'fmt' && data.fmt) { l = Object.keys(data.fmt).filter(notMeta).length; return l || null; }
    if (id === 'staged' && data.staged) return Object.keys(data.staged).length;
    if (id === 'pack' && data.pack) return data.pack.length;
    return null;
  }
  function notMeta(k) { return k !== 'ignorePatterns' && k !== 'overrides'; }

  function renderNav() {
    var html = '<div class="nav-label">Sections</div>';
    SECTIONS.forEach(function (s) {
      if (s.id !== 'overview' && !data.present[s.id]) return;
      var n = navBadge(s.id);
      html += '<div class="nav-item' + (s.id === active ? ' active' : '') + '" data-section="' + s.id + '">' +
        '<span>' + esc(s.label) + '</span>' + (n !== null ? '<span class="nav-badge">' + n + '</span>' : '') + '</div>';
    });
    document.getElementById('nav').innerHTML = html;
  }

  function go(id) { active = id; renderNav(); renderSection(id); }
  window.__go = go;

  function renderSection(id) {
    var el = document.getElementById('content');
    if (id === 'overview') el.innerHTML = renderOverview();
    else if (id === 'fmt') el.innerHTML = renderFmt(data.fmt || {});
    else if (id === 'lint') { el.innerHTML = renderLint(data.lint); wireLint(); }
    else if (id === 'staged') el.innerHTML = renderStaged(data.staged || {});
    else if (id === 'pack') el.innerHTML = renderPack(data.pack || []);
    else if (id === 'test') el.innerHTML = renderTest(data.test || {});
    else if (id === 'run') el.innerHTML = renderRun(data.run || {});
    else if (id === 'create') el.innerHTML = renderCreate(data.create || {});
  }

  function renderOverview() {
    var stats = [
      { id: 'fmt', sub: 'oxfmt formatting', val: data.fmt ? Object.keys(data.fmt).filter(notMeta).length + ' options' : '—' },
      { id: 'lint', sub: 'oxlint linting', val: data.lint ? data.lint.baseRules.length + ' rules' : '—' },
      { id: 'staged', sub: 'git staged hooks', val: data.staged ? Object.keys(data.staged).length + ' patterns' : '—' },
      { id: 'pack', sub: 'tsdown packaging', val: data.pack ? data.pack.length + ' build' + (data.pack.length === 1 ? '' : 's') : '—' },
      { id: 'test', sub: 'vitest testing', val: data.test ? 'configured' : '—' },
      { id: 'run', sub: 'task runner', val: data.run ? (data.run.tasks ? Object.keys(data.run.tasks).length + ' tasks' : 'configured') : '—' },
      { id: 'create', sub: 'scaffolding', val: data.create ? 'configured' : '—' }
    ];
    var html = '<div class="section-title">Overview</div><div class="section-desc">vite.config.ts summary</div><div class="overview-grid">';
    stats.forEach(function (s) {
      var on = data.present[s.id];
      html += '<div class="overview-card" data-section="' + s.id + '">' +
        '<div class="overview-label">' + esc(s.id) + '</div>' +
        '<div class="overview-value" style="color:' + (on ? 'var(--text)' : 'var(--muted)') + '">' + esc(s.val) + '</div>' +
        '<div class="overview-sub">' + esc(s.sub) + '</div></div>';
    });
    return html + '</div>';
  }

  function renderFmt(fmt) {
    var opts = {};
    Object.keys(fmt).forEach(function (k) { if (notMeta(k)) opts[k] = fmt[k]; });
    var html = '<div class="section-title">fmt</div><div class="section-desc">oxfmt configuration</div>';
    html += '<div class="card"><div class="card-header">Options</div>' + kvTable(opts) + '</div>';
    html += patternsCard('Ignore Patterns', fmt.ignorePatterns);
    if (fmt.overrides && fmt.overrides.length) {
      html += '<div class="card"><div class="card-header">Overrides</div>';
      fmt.overrides.forEach(function (o) {
        var files = Array.isArray(o.files) ? o.files : [o.files];
        html += '<div style="padding:10px 14px;border-bottom:1px solid var(--border)">' +
          '<div style="margin-bottom:8px">' + tags(files) + '</div>' + kvTable(o.options || {}, '200px') + '</div>';
      });
      html += '</div>';
    }
    return html;
  }

  function renderLint(lint) {
    if (!lint) return '<div class="empty">No lint config</div>';
    var html = '<div class="section-title">lint</div><div class="section-desc">oxlint configuration — effective (resolved) severities</div>';

    if (Object.keys(lint.options).length) html += '<div class="card"><div class="card-header">Options</div>' + kvTable(lint.options, '300px') + '</div>';

    if (lint.plugins.length) html += '<div class="card"><div class="card-header">Plugins <span class="nav-badge">' + lint.plugins.length + '</span></div><div class="card-body">' + tags(lint.plugins) + '</div></div>';

    if (Object.keys(lint.categories).length) {
      var cats = Object.keys(lint.categories).map(function (c) { return badge(c + ': ' + lint.categories[c], lint.categories[c]); }).join(' ');
      html += '<div class="card"><div class="card-header">Categories (baseline)</div><div class="card-body">' + cats + '</div></div>';
    }

    if (lint.presets.length) {
      html += '<div class="card"><div class="card-header">Presets (extends)</div>';
      lint.presets.forEach(function (p, i) {
        var cats = Object.keys(p.categories).map(function (c) { return badge(c + ': ' + p.categories[c], p.categories[c]); }).join(' ');
        html += '<div class="preset-row"><div class="preset-index">' + (i + 1) + '</div><div style="flex:1">' +
          '<div style="font-weight:600;margin-bottom:5px">' + esc(p.label) + '</div>' +
          (p.plugins.length ? '<div class="text-small text-muted" style="margin-bottom:5px">plugins: ' + tags(p.plugins) + '</div>' : '') +
          (cats ? '<div>' + cats + '</div>' : '') +
          '</div><span class="nav-badge">' + p.ruleCount + ' rules</span></div>';
      });
      html += '</div>';
    }

    html += '<div class="card"><div class="card-header">Rules <span class="nav-badge" id="rule-count">' + lint.baseRules.length + '</span>' +
      '<div class="ml-auto" id="rule-counts">' + countsBadges(lint.counts) + '</div></div>';
    html += '<div class="resolve-bar"><span class="resolve-label">Resolve effective rules for a file path (applies matching overrides):</span>' +
      '<input class="filter-input" id="resolve-input" placeholder="e.g. tests/foo.test.ts" />' +
      '<span class="resolve-status text-muted" id="resolve-status"></span></div>';
    html += '<div class="filter-wrap"><input class="filter-input" id="filter-input" placeholder="Filter rules by name or source…" /></div>';
    html += '<div id="rules-container">' + rulesTable(lint.baseRules) + '</div></div>';

    if (lint.overrides.length) {
      html += '<div class="card"><div class="card-header">Overrides <span class="nav-badge">' + lint.overrides.length + '</span></div>';
      lint.overrides.forEach(function (o) {
        html += '<div style="padding:10px 14px;border-bottom:1px solid var(--border)">' +
          '<div>' + tags(o.files) + '</div>' +
          '<div class="text-small text-muted" style="margin-top:4px">' + o.ruleCount + ' rule override' + (o.ruleCount === 1 ? '' : 's') + '</div></div>';
      });
      html += '</div>';
    }

    if (Object.keys(lint.settings).length) html += '<div class="card"><div class="card-header">Settings</div>' + kvTable(lint.settings) + '</div>';
    html += patternsCard('Ignore Patterns', lint.ignorePatterns);
    return html;
  }

  function wireLint() {
    var filter = document.getElementById('filter-input');
    if (filter) filter.addEventListener('input', applyFilter);
    var resolve = document.getElementById('resolve-input');
    if (resolve) resolve.addEventListener('input', debounce(onResolve, 200));
  }

  function applyFilter() {
    var input = document.getElementById('filter-input');
    if (!input) return;
    var q = input.value.toLowerCase();
    var rows = document.querySelectorAll('#rules-body tr');
    var visible = 0;
    rows.forEach(function (row) {
      var name = (row.getAttribute('data-name') || '').toLowerCase();
      var src = (row.getAttribute('data-src') || '').toLowerCase();
      var show = !q || name.indexOf(q) !== -1 || src.indexOf(q) !== -1;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var counter = document.getElementById('rule-count');
    if (counter) counter.textContent = String(visible);
  }

  function onResolve() {
    var input = document.getElementById('resolve-input');
    var status = document.getElementById('resolve-status');
    var container = document.getElementById('rules-container');
    var counts = document.getElementById('rule-counts');
    var counter = document.getElementById('rule-count');
    if (!input || !container) return;
    var file = input.value.trim();
    if (!file) {
      container.innerHTML = rulesTable(data.lint.baseRules);
      if (status) status.textContent = '';
      if (counts) counts.innerHTML = countsBadges(data.lint.counts);
      if (counter) counter.textContent = String(data.lint.baseRules.length);
      var f = document.getElementById('filter-input'); if (f) f.value = '';
      return;
    }
    fetch('/__resolve?file=' + encodeURIComponent(file)).then(function (r) { return r.json(); }).then(function (res) {
      container.innerHTML = rulesTable(res.rules);
      var c = { error: 0, warn: 0, off: 0 };
      res.rules.forEach(function (r) { c[r.severity]++; });
      if (counts) counts.innerHTML = countsBadges(c);
      if (counter) counter.textContent = String(res.rules.length);
      if (status) {
        status.innerHTML = res.matchedOverrides.length
          ? 'Matched overrides: ' + tags(res.matchedOverrides)
          : 'No overrides matched — base config applies.';
      }
    }).catch(function () { if (status) status.textContent = 'Failed to resolve.'; });
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function renderStaged(staged) {
    var rows = Object.keys(staged).map(function (k) {
      return '<tr><td class="mono text-green">' + esc(k) + '</td><td class="mono">' + esc(staged[k]) + '</td></tr>';
    }).join('');
    return '<div class="section-title">staged</div><div class="section-desc">git staged-file hooks (lint-staged)</div>' +
      '<div class="card"><table><thead><tr><th>Pattern</th><th>Command</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderPack(packs) {
    var html = '<div class="section-title">pack</div><div class="section-desc">tsdown library packaging</div>';
    packs.forEach(function (pack, idx) {
      if (packs.length > 1) html += '<div class="card-header" style="border:none;padding:4px 0 8px">Build ' + (idx + 1) + '</div>';
      var entry = pack.entry;
      if (entry) {
        var entries = typeof entry === 'string' ? { default: entry }
          : Array.isArray(entry) ? entry.reduce(function (a, e, i) { a[i] = e; return a; }, {}) : entry;
        var rows = Object.keys(entries).map(function (k) {
          return '<tr><td class="mono text-blue">' + esc(k) + '</td><td class="mono text-green">' + esc(entries[k]) + '</td></tr>';
        }).join('');
        html += '<div class="card"><div class="card-header">Entry Points</div><table><thead><tr><th>Name</th><th>File</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      }
      var opts = {};
      Object.keys(pack).forEach(function (k) { if (k !== 'entry') opts[k] = pack[k]; });
      html += '<div class="card"><div class="card-header">Options</div>' + kvTable(opts, '140px') + '</div>';
    });
    return html;
  }

  function renderTest(test) {
    var html = '<div class="section-title">test</div><div class="section-desc">vitest configuration</div>';
    if (!test || !Object.keys(test).length) return html + '<div class="card"><div class="empty">Enabled with default settings</div></div>';
    if (Array.isArray(test.projects)) {
      html += '<div class="card"><div class="card-header">Projects</div>';
      test.projects.forEach(function (proj, i) {
        var t = proj.test || {};
        var name = t.name ? (typeof t.name === 'object' ? t.name.label : t.name) : ('Project ' + (i + 1));
        html += '<div style="padding:10px 14px;border-bottom:1px solid var(--border)"><div style="font-weight:600;margin-bottom:4px">' + esc(name) + '</div>';
        if (t.browser && t.browser.enabled) {
          var inst = (t.browser.instances || []).map(function (b) { return b.browser; }).join(', ');
          html += '<div class="text-small text-muted">Browser: ' + esc(inst || 'enabled') + (t.browser.headless ? ' (headless)' : '') + '</div>';
        }
        html += '</div>';
      });
      return html + '</div>';
    }
    return html + '<div class="card">' + kvTable(test, '200px') + '</div>';
  }

  function renderRun(run) {
    var html = '<div class="section-title">run</div><div class="section-desc">vp run task configuration</div>';
    if (!run || !Object.keys(run).length) return html + '<div class="card"><div class="empty">Not configured</div></div>';
    var top = {};
    if (run.cache !== undefined) top.cache = run.cache;
    if (run.enablePrePostScripts !== undefined) top.enablePrePostScripts = run.enablePrePostScripts;
    if (Object.keys(top).length) html += '<div class="card"><div class="card-header">Settings</div>' + kvTable(top, '180px') + '</div>';
    if (run.tasks && Object.keys(run.tasks).length) {
      html += '<div class="card"><div class="card-header">Tasks</div><table><thead><tr><th style="width:120px">Name</th><th>Command</th><th>Details</th></tr></thead><tbody>';
      Object.keys(run.tasks).forEach(function (name) {
        var task = run.tasks[name] || {};
        var details = [];
        if (task.cache === false) details.push('cache: off');
        if (task.dependsOn) details.push('dependsOn: ' + JSON.stringify(task.dependsOn));
        if (task.cwd) details.push('cwd: ' + task.cwd);
        if (task.input) details.push('input: ' + JSON.stringify(task.input));
        if (task.output) details.push('output: ' + JSON.stringify(task.output));
        html += '<tr><td class="mono text-blue">' + esc(name) + '</td><td class="mono">' + esc(task.command || '') + '</td>' +
          '<td class="text-muted text-small">' + esc(details.join(' · ')) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    return html;
  }

  function renderCreate(create) {
    var html = '<div class="section-title">create</div><div class="section-desc">project scaffolding defaults</div>';
    return html + '<div class="card"><div class="card-header">Options</div>' + kvTable(create, '180px') + '</div>';
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-section]');
    if (el) go(el.getAttribute('data-section'));
  });

  var THEMES = ['system', 'light', 'dark'];
  var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
  var ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICON_SYSTEM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>';
  var THEME_META = {
    system: { label: 'System', icon: ICON_SYSTEM, hint: 'follows your OS' },
    light: { label: 'Light', icon: ICON_SUN, hint: '' },
    dark: { label: 'Dark', icon: ICON_MOON, hint: '' },
  };
  function readTheme() {
    try { return localStorage.getItem('vpi-theme') || 'system'; } catch (e) { return 'system'; }
  }
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('vpi-theme', t); } catch (e) {}
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      var meta = THEME_META[t];
      btn.innerHTML = meta.icon + '<span>' + meta.label + '</span>';
      btn.title = 'Theme: ' + meta.label + (meta.hint ? ' (' + meta.hint + ')' : '') + ' — click to change';
    }
  }
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = THEMES[(THEMES.indexOf(readTheme()) + 1) % THEMES.length];
      applyTheme(next);
    });
    applyTheme(readTheme());
  }

  renderNav();
  renderSection(active);
})();
`;
}

export function buildHtml(data: InspectorData): string {
  const dataJson = JSON.stringify(data).replaceAll(
    /<\/script>/giu,
    '<\\/script>',
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vite+ Inspector</title>
  <script>(function(){try{var t=localStorage.getItem('vpi-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})();</script>
  <style>${styles()}</style>
</head>
<body>
  <nav id="sidebar">
    <div class="logo">
      <span class="logo-mark"></span>
      <span>Vite+ Inspector</span>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Switch color theme">Theme</button>
    </div>
    <div class="config-path">${escapeHtml(data.configPath)}</div>
    <div class="nav-section" id="nav"></div>
  </nav>
  <main id="content"></main>
  <script>window.__INSPECTOR__ = ${dataJson};</script>
  <script>${clientScript()}</script>
</body>
</html>`;
}
