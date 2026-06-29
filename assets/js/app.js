/* ============================================================
   DuoFinance — app (views, render, interactions)
   Direction: calm warm premium-fintech · ink + emerald
   Numbers render in Geist Mono (CSS). Chrome icons: Phosphor.
   Category icons stay as user-chosen emoji (personalization data).
   ============================================================ */
(function () {
  const S = window.Store;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- formatting ----------
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const money = (v) => BRL.format(v || 0);
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const fmtDate = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}`; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ph = (name) => `<i class="ph ${name}"></i>`;
  const initial = (name) => esc((name || '?').trim().charAt(0).toUpperCase());

  // ---------- app state ----------
  const state = { view: 'dashboard', month: new Date(2026, 5, 1) };
  state.month.setDate(1);

  // ---------- helpers ----------
  function monthTx(mk) { return S.transactions().filter((t) => t.date.slice(0, 7) === mk); }
  function catOf(id) { return S.category(id) || { name: 'Sem categoria', icon: '•', color: '#7c8aa0', kind: 'expense' }; }
  function personOf(id) { return S.person(id) || { name: '—', color: '#7c8aa0' }; }
  function day(iso) { return parseInt(iso.slice(8, 10), 10); }

  function alpha(hex, a) {
    const h = String(hex || '#7c8aa0').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function shade(hex) {
    const h = String(hex || '#3b6fe0').replace('#', ''); const n = parseInt(h, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, r - 42); g = Math.max(0, g - 28); b = Math.min(255, b + 22);
    return `rgb(${r},${g},${b})`;
  }
  // person identity avatar (initial in their color) — semantic, not decorative
  function whoAv(p, sm) { return `<span class="who-av${sm ? ' sm' : ''}" style="--c:${p.color}">${initial(p.name)}</span>`; }
  function cssVar(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }

  // ===================================================================
  // VIEWS
  // ===================================================================
  const views = {};

  // ---------- DASHBOARD ----------
  views.dashboard = function () {
    const mk = monthKey(state.month);
    const tx = monthTx(mk);
    const income = tx.filter((t) => t.kind === 'income').reduce((a, t) => a + t.amount, 0);
    const salaryIncome = S.salaries().filter((s) => s.month === mk && s.received).reduce((a, s) => a + s.amount, 0);
    const totalIncome = income + salaryIncome;
    const expense = tx.filter((t) => t.kind === 'expense').reduce((a, t) => a + t.amount, 0);
    const fixedTotal = S.fixedBills().filter((f) => f.active && (f.kind || 'expense') === 'expense').reduce((a, f) => a + f.amount, 0);
    const cardInvoice = tx.filter((t) => t.kind === 'expense' && t.cardId).reduce((a, t) => a + t.amount, 0);
    const balance = totalIncome - expense;

    const byCat = {};
    tx.filter((t) => t.kind === 'expense').forEach((t) => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount; });
    const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

    const today = new Date(2026, 5, 27);
    const upcoming = S.fixedBills().filter((f) => f.active && (f.kind || 'expense') === 'expense' && !S.fixedPaid(f.id, mk)).sort((a, b) => a.dueDay - b.dueDay);

    const el = document.createElement('div');
    el.innerHTML = `
      <div class="view-head">
        <div><h2>Visão geral</h2><p>O panorama financeiro de vocês em ${MONTHS[state.month.getMonth()]} de ${state.month.getFullYear()}.</p></div>
      </div>

      <div class="grid cols-4">
        ${statCard('ph-trend-up', 'Entradas do mês', totalIncome, salaryIncome ? `${money(salaryIncome)} de salários` : 'Salários e receitas', 'var(--pos)')}
        ${statCard('ph-trend-down', 'Saídas do mês', expense, `${tx.filter((t) => t.kind === 'expense').length} lançamentos`, 'var(--neg)')}
        ${statCard('ph-wallet', 'Saldo do mês', balance, balance >= 0 ? 'No positivo' : 'Atenção, no vermelho', balance >= 0 ? 'var(--pos)' : 'var(--neg)')}
        ${statCard('ph-credit-card', 'Fatura nos cartões', cardInvoice, `Fixas previstas: ${money(fixedTotal)}`, '')}
      </div>

      <div class="grid cols-2" style="margin-top:14px; align-items:start;">
        <div class="card pad">
          <div class="section-title" style="margin:0 0 16px">Gastos por categoria</div>
          ${catRows.length ? `
            <div class="cat-split">
              <div class="chart-box" style="height:182px"><canvas id="catChart"></canvas></div>
              <div class="legend">
                ${catRows.slice(0, 7).map(([cid, v]) => {
                  const c = catOf(cid);
                  return `<div class="lg"><span class="lk" style="background:${c.color}"></span><span>${c.icon} ${esc(c.name)}</span><span class="lv">${money(v)}</span></div>`;
                }).join('')}
              </div>
            </div>` : emptyState('ph-chart-donut', 'Sem gastos ainda', 'Lance um gasto para ver a divisão por categoria.')}
        </div>

        <div class="card pad">
          <div class="section-title" style="margin:0 0 6px">Próximas contas a pagar</div>
          <div class="list">
            ${upcoming.length ? upcoming.slice(0, 6).map((f) => {
              const c = catOf(f.categoryId); const late = f.dueDay < today.getDate(); const pr = personOf(f.personId);
              return `<div class="row">
                <div class="ic" style="background:${alpha(c.color, .15)}">${c.icon}</div>
                <div class="meta"><div class="t">${esc(f.desc)}</div>
                  <div class="s"><span class="txt ${late ? 'neg' : ''}">vence dia ${f.dueDay}${late ? ' · atrasada' : ''}</span>${whoAv(pr, true)}</div></div>
                <div class="row-end">
                  <div class="amt">${money(f.amount)}</div>
                  <button class="chip-btn" data-pay-fixed="${f.id}">${ph('ph-check')} Pagar</button>
                </div>
              </div>`;
            }).join('') : emptyState('ph-confetti', 'Tudo em dia', 'Nenhuma conta fixa pendente neste mês.')}
          </div>
        </div>
      </div>

      <div class="grid cols-2" style="margin-top:14px; align-items:start;">
        <div class="card pad">
          <div class="section-title" style="margin:0 0 16px">Entradas e saídas (6 meses)</div>
          <div class="chart-box"><canvas id="trendChart"></canvas></div>
        </div>
        <div class="card pad">
          <div class="section-title" style="margin:0 0 16px">Uso dos cartões</div>
          ${S.cards().length ? S.cards().map((card) => {
            const used = monthTx(mk).filter((t) => t.cardId === card.id && t.kind === 'expense').reduce((a, t) => a + t.amount, 0);
            const pct = card.limit ? Math.min(100, (used / card.limit) * 100) : 0;
            const clr = pct > 80 ? 'var(--neg)' : pct > 50 ? 'var(--warn)' : 'var(--pos)';
            return `<div class="usage">
              <div class="usage-head"><b>${esc(card.name)}</b><span class="usage-val">${money(used)} / ${money(card.limit)}</span></div>
              <div class="bar"><i style="width:${pct}%; background:${clr}"></i></div></div>`;
          }).join('') : emptyState('ph-credit-card', 'Nenhum cartão', 'Cadastre um cartão na aba Cartões.')}
        </div>
      </div>
    `;

    queueMicrotask(() => {
      const dim = cssVar('--dim'), line = cssVar('--line'), pos = cssVar('--accent-ink') || '#36d9a3', neg = cssVar('--neg') || '#ff6b6b';
      if (catRows.length && window.Chart) {
        new Chart($('#catChart', el), {
          type: 'doughnut',
          data: { labels: catRows.map(([c]) => catOf(c).name), datasets: [{ data: catRows.map(([, v]) => v), backgroundColor: catRows.map(([c]) => catOf(c).color), borderWidth: 0, hoverOffset: 6 }] },
          options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => ' ' + money(x.raw) } } } },
        });
      }
      if (window.Chart) {
        const labels = [], incomes = [], expenses = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(state.month.getFullYear(), state.month.getMonth() - i, 1);
          const k = monthKey(d);
          labels.push(MONTHS[d.getMonth()].slice(0, 3));
          const t = monthTx(k);
          incomes.push(t.filter((x) => x.kind === 'income').reduce((a, x) => a + x.amount, 0) + S.salaries().filter((s) => s.month === k && s.received).reduce((a, s) => a + s.amount, 0));
          expenses.push(t.filter((x) => x.kind === 'expense').reduce((a, x) => a + x.amount, 0));
        }
        new Chart($('#trendChart', el), {
          type: 'bar',
          data: { labels, datasets: [
            { label: 'Entradas', data: incomes, backgroundColor: pos, borderRadius: 5, maxBarThickness: 20 },
            { label: 'Saídas', data: expenses, backgroundColor: neg, borderRadius: 5, maxBarThickness: 20 },
          ] },
          options: {
            animation: reduceMotion() ? false : { duration: 600 },
            plugins: { legend: { labels: { color: dim, boxWidth: 10, font: { family: 'Geist' } } }, tooltip: { callbacks: { label: (x) => ` ${x.dataset.label}: ${money(x.raw)}` } } },
            scales: { x: { grid: { display: false }, ticks: { color: dim, font: { family: 'Geist' } } }, y: { grid: { color: line }, ticks: { color: dim, font: { family: 'Geist Mono' }, callback: (v) => 'R$' + (v / 1000) + 'k' } } },
          },
        });
      }
    });
    return el;
  };

  // ---------- CYCLES (por pagamento) ----------
  views.cycles = function () {
    const mk = monthKey(state.month);
    const Y = state.month.getFullYear(), M = state.month.getMonth();
    const lastDay = new Date(Y, M + 1, 0).getDate();

    const pdSet = new Set();
    S.data.people.forEach((p) => (p.paydays || []).forEach((d) => pdSet.add(Math.min(d, lastDay))));
    const paydays = [...pdSet].sort((a, b) => a - b);
    if (!paydays.length) paydays.push(1);

    const tx = monthTx(mk);
    const cycles = paydays.map((p, i) => {
      const start = p;
      const end = i < paydays.length - 1 ? paydays[i + 1] - 1 : lastDay;
      const earners = S.data.people.filter((per) => (per.paydays || []).some((d) => Math.min(d, lastDay) === p));
      const sal = S.salaries().filter((s) => s.month === mk && Math.min(s.payday, lastDay) >= start && Math.min(s.payday, lastDay) <= end);
      const incomeTx = tx.filter((t) => t.kind === 'income' && day(t.date) >= start && day(t.date) <= end);
      const income = sal.reduce((a, s) => a + (s.received ? s.amount : 0), 0) + incomeTx.reduce((a, t) => a + t.amount, 0);
      const plannedSal = sal.reduce((a, s) => a + s.amount, 0);
      const expTx = tx.filter((t) => t.kind === 'expense' && day(t.date) >= start && day(t.date) <= end);
      const fixed = S.fixedBills().filter((f) => f.active && (f.kind || 'expense') === 'expense' && f.dueDay >= start && f.dueDay <= end);
      const expense = expTx.reduce((a, t) => a + t.amount, 0) + fixed.reduce((a, f) => a + f.amount, 0);
      return { p, start, end, earners, sal, income, plannedSal, expTx, fixed, expense, balance: income - expense };
    });

    const el = document.createElement('div');
    el.innerHTML = `
      <div class="view-head">
        <div><h2>Ciclos de pagamento</h2><p>Organizado por data de recebimento, do jeito que vocês fazem. Cada recebimento vira um ciclo com o que entra e o que vence.</p></div>
      </div>
      <div class="grid" style="gap:16px">
        ${cycles.map((c) => {
          const items = [
            ...c.fixed.map((f) => ({ desc: f.desc, amount: f.amount, day: f.dueDay, cat: catOf(f.categoryId), person: personOf(f.personId), fixed: true, paid: S.fixedPaid(f.id, mk), id: f.id })),
            ...c.expTx.map((t) => ({ desc: t.desc, amount: t.amount, day: day(t.date), cat: catOf(t.categoryId), person: personOf(t.personId), fixed: false, paid: true })),
          ].sort((a, b) => a.day - b.day);
          return `<div class="cycle">
            <div class="cycle-head">
              <div class="cyc-day"><small>DIA</small><b>${c.p}</b></div>
              <div class="cyc-info">
                <div class="ct">Dia ${c.p}${c.earners.length ? ' ' + c.earners.map((e) => whoAv(e, true)).join('') : ''}</div>
                <div class="cs">Vencimentos de ${c.start} a ${c.end}. Entra ${money(c.income)}${c.plannedSal > c.income ? ` (previsto ${money(c.plannedSal)})` : ''}</div>
              </div>
              <div class="cyc-balance">
                <div class="cb-l">sobra do ciclo</div>
                <div class="cb-v ${c.balance >= 0 ? 'pos' : 'neg'}">${money(c.balance)}</div>
              </div>
            </div>
            <div class="pad" style="padding-top:4px">
              <div class="list">
                ${items.length ? items.map((it) => `
                  <div class="row">
                    <div class="ic" style="background:${alpha(it.cat.color, .15)}">${it.cat.icon}</div>
                    <div class="meta"><div class="t">${esc(it.desc)} ${it.fixed ? `<span class="tag">${ph('ph-repeat')} fixa</span>` : ''}</div>
                      <div class="s"><span class="txt">dia ${it.day}</span>${whoAv(it.person, true)}${it.fixed ? `<span class="txt ${it.paid ? 'pos' : 'warnclr'}">${it.paid ? 'paga' : 'pendente'}</span>` : ''}</div></div>
                    <div class="row-end">
                      <div class="amt neg">- ${money(it.amount)}</div>
                      ${it.fixed ? `<button class="mini-btn" data-pay-fixed="${it.id}" title="Marcar paga/pendente">${ph(it.paid ? 'ph-arrow-counter-clockwise' : 'ph-check')}</button>` : ''}
                    </div>
                  </div>`).join('') : `<div class="empty" style="padding:22px"><div class="e-t">Sem contas neste ciclo</div></div>`}
              </div>
              ${c.income ? `<div class="row" style="border-top:1px dashed var(--line); margin-top:2px;">
                <div class="ic" style="background:var(--accent-soft); color:var(--accent-ink)">${ph('ph-arrow-down-left')}</div>
                <div class="meta"><div class="t">Entradas do ciclo</div><div class="s"><span class="txt">salários e receitas recebidos</span></div></div>
                <div class="row-end"><div class="amt pos">+ ${money(c.income)}</div></div></div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
    return el;
  };

  // ---------- TRANSACTIONS ----------
  views.transactions = function () {
    const mk = monthKey(state.month);
    const list = monthTx(mk).slice().sort((a, b) => b.date.localeCompare(a.date) || 0);
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="view-head">
        <div><h2>Lançamentos</h2><p>Todos os gastos e receitas de ${MONTHS[state.month.getMonth()]}.</p></div>
        <button class="primary-btn" data-add-tx>${ph('ph-plus')}<span>Novo lançamento</span></button>
      </div>
      <div class="card pad">
        <div class="list" id="txList">
          ${list.length ? list.map(txRow).join('') : emptyState('ph-receipt', 'Nenhum lançamento', 'Comece registrando um gasto ou uma receita deste mês.')}
        </div>
      </div>
    `;
    return el;
  };

  function txRow(t) {
    const c = catOf(t.categoryId), p = personOf(t.personId);
    const card = t.cardId ? S.card(t.cardId) : null;
    const inc = t.kind === 'income';
    const inst = t.installment ? ` ${t.installment.n}/${t.installment.of}` : '';
    return `<div class="row">
      <div class="ic" style="background:${inc ? 'var(--accent-soft)' : alpha(c.color, .15)}; ${inc ? 'color:var(--accent-ink)' : ''}">${inc ? ph('ph-arrow-down-left') : c.icon}</div>
      <div class="meta">
        <div class="t">${esc(t.desc || c.name)}</div>
        <div class="s"><span class="txt">${fmtDate(t.date)}</span><span class="sep"></span><span class="txt">${esc(c.name)}</span>${whoAv(p, true)}${card ? `<span class="cardref">${ph('ph-credit-card')}${esc(card.name)}${inst}</span>` : ''}</div>
      </div>
      <div class="row-end">
        <div class="amt ${inc ? 'pos' : 'neg'}">${inc ? '+' : '-'} ${money(t.amount)}</div>
        <div class="row-actions">
          <button class="mini-btn" data-edit-tx="${t.id}" aria-label="Editar">${ph('ph-pencil-simple')}</button>
          <button class="mini-btn" data-del-tx="${t.id}" aria-label="Excluir">${ph('ph-trash')}</button>
        </div>
      </div>
    </div>`;
  }

  // ---------- CARDS ----------
  views.cards = function () {
    const mk = monthKey(state.month);
    const cards = S.cards();
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="view-head">
        <div><h2>Cartões de crédito</h2><p>Limites, faturas e datas de fechamento de cada cartão.</p></div>
      </div>
      <div class="grid cols-3">
        ${cards.map((card) => {
          const used = monthTx(mk).filter((t) => t.cardId === card.id && t.kind === 'expense').reduce((a, t) => a + t.amount, 0);
          const pct = card.limit ? Math.min(100, (used / card.limit) * 100) : 0;
          const owner = personOf(card.ownerId);
          return `<div class="cc" style="--c1:${card.color || '#3b6fe0'}; --c2:${shade(card.color || '#3b6fe0')}">
            <div class="cc-actions">
              <button class="mini-btn" data-edit-card="${card.id}" aria-label="Editar">${ph('ph-pencil-simple')}</button>
              <button class="mini-btn" data-del-card="${card.id}" aria-label="Excluir">${ph('ph-trash')}</button>
            </div>
            <div class="cc-top"><div class="cc-chip"></div><div class="cc-brand">${esc(card.brand || 'Cartão')}</div></div>
            <div>
              <div class="cc-owner">${esc(owner.name)}</div>
              <div class="cc-name">${esc(card.name)}</div>
            </div>
            <div>
              <div class="cc-meta"><span>Fatura ${MONTHS[state.month.getMonth()].slice(0,3)}</span><span>${money(used)} / ${money(card.limit)}</span></div>
              <div class="cc-bar"><i style="width:${pct}%"></i></div>
              <div class="cc-meta" style="margin-top:8px"><span>Fecha dia ${card.closingDay || '-'}</span><span>Vence dia ${card.dueDay || '-'}</span></div>
            </div>
          </div>`;
        }).join('')}
        <button class="add-tile" data-add-card><span class="plus">${ph('ph-plus')}</span><span>Adicionar cartão</span></button>
      </div>
    `;
    return el;
  };

  // ---------- FIXED ----------
  views.fixed = function () {
    const mk = monthKey(state.month);
    const bills = S.fixedBills().slice().sort((a, b) => a.dueDay - b.dueDay);
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="view-head">
        <div><h2>Contas fixas</h2><p>Aquelas que se repetem todo mês. Marque como paga conforme acontecem.</p></div>
        <button class="primary-btn" data-add-fixed>${ph('ph-plus')}<span>Nova conta fixa</span></button>
      </div>
      <div class="card pad">
        <div class="list">
          ${bills.length ? bills.map((f) => {
            const c = catOf(f.categoryId); const paid = S.fixedPaid(f.id, mk); const inc = (f.kind || 'expense') === 'income'; const pr = personOf(f.personId);
            return `<div class="row ${f.active ? '' : 'is-off'}">
              <div class="ic" style="background:${alpha(c.color, .15)}">${c.icon}</div>
              <div class="meta">
                <div class="t">${esc(f.desc)} ${inc ? '<span class="tag" style="color:var(--pos)">entrada</span>' : ''}</div>
                <div class="s"><span class="txt">vence dia ${f.dueDay}</span><span class="sep"></span><span class="txt">${esc(c.name)}</span>${whoAv(pr, true)}</div>
              </div>
              <div class="row-end">
                <div class="amt ${inc ? 'pos' : ''}">${money(f.amount)}</div>
                <button class="chip-btn ${paid ? 'done' : ''}" data-pay-fixed="${f.id}">${paid ? ph('ph-check') + ' Paga' : 'Pendente'}</button>
                <div class="row-actions">
                  <div class="switch ${f.active ? 'on' : ''}" data-toggle-fixed="${f.id}" title="Ativar ou pausar"><i></i></div>
                  <button class="mini-btn" data-edit-fixed="${f.id}" aria-label="Editar">${ph('ph-pencil-simple')}</button>
                  <button class="mini-btn" data-del-fixed="${f.id}" aria-label="Excluir">${ph('ph-trash')}</button>
                </div>
              </div>
            </div>`;
          }).join('') : emptyState('ph-repeat', 'Nenhuma conta fixa', 'Cadastre aluguel, internet, assinaturas. Tudo que se repete todo mês.')}
        </div>
      </div>
    `;
    return el;
  };

  // ---------- SALARIES ----------
  views.salaries = function () {
    const mk = monthKey(state.month);
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="view-head">
        <div><h2>Salários</h2><p>Registre o que cada um recebeu em ${MONTHS[state.month.getMonth()]}.</p></div>
        <button class="primary-btn" data-add-salary>${ph('ph-plus')}<span>Registrar salário</span></button>
      </div>
      <div class="grid cols-2">
        ${S.data.people.map((p) => {
          const sals = S.salaries().filter((s) => s.month === mk && s.personId === p.id).sort((a, b) => a.payday - b.payday);
          const total = sals.filter((s) => s.received).reduce((a, s) => a + s.amount, 0);
          return `<div class="card pad">
            <div style="display:flex; align-items:center; gap:11px; margin-bottom:16px;">
              ${whoAv(p)}
              <div style="flex:1"><div style="font-weight:600; font-size:16px">${esc(p.name)}</div>
                <div style="font-size:12.5px;color:var(--dim)">recebe dia ${(p.paydays || []).join(' e ')}</div></div>
              <div style="text-align:right"><div style="font-size:11px;color:var(--faint)">recebido no mês</div>
                <div class="amt pos" style="font-size:17px">${money(total)}</div></div>
            </div>
            <div class="list">
              ${sals.length ? sals.map((s) => `<div class="row">
                <div class="ic" style="background:var(--accent-soft); color:var(--accent-ink)">${ph('ph-money')}</div>
                <div class="meta"><div class="t">Pagamento dia ${s.payday}</div>
                  <div class="s"><span class="txt ${s.received ? 'pos' : 'warnclr'}">${s.received ? 'recebido' : 'a receber'}</span></div></div>
                <div class="row-end">
                  <div class="amt pos">${money(s.amount)}</div>
                  <div class="row-actions"><button class="mini-btn" data-edit-salary="${s.id}" aria-label="Editar">${ph('ph-pencil-simple')}</button><button class="mini-btn" data-del-salary="${s.id}" aria-label="Excluir">${ph('ph-trash')}</button></div>
                </div>
              </div>`).join('') : `<div class="empty" style="padding:22px"><div class="e-t">Nada registrado</div><div>Adicione os recebimentos do mês.</div></div>`}
            </div>
            <button class="btn-line" style="width:100%; margin-top:12px; display:inline-flex; align-items:center; justify-content:center; gap:7px" data-add-salary data-person="${p.id}">${ph('ph-plus')} Adicionar para ${esc(p.name)}</button>
          </div>`;
        }).join('')}
      </div>
    `;
    return el;
  };

  // ---------- CATEGORIES ----------
  views.categories = function () {
    const el = document.createElement('div');
    const groups = [['expense', 'Despesas'], ['income', 'Receitas']];
    el.innerHTML = `
      <div class="view-head">
        <div><h2>Categorias</h2><p>Personalize com cor e ícone do seu jeito.</p></div>
        <button class="primary-btn" data-add-cat>${ph('ph-plus')}<span>Nova categoria</span></button>
      </div>
      ${groups.map(([k, title]) => {
        const cats = S.categories(k);
        return `<div class="section-title">${title}</div>
          <div class="cat-grid">
            ${cats.map((c) => `<div class="cat-chip">
              <div class="cact"><button class="mini-btn" data-edit-cat="${c.id}" aria-label="Editar">${ph('ph-pencil-simple')}</button><button class="mini-btn" data-del-cat="${c.id}" aria-label="Excluir">${ph('ph-trash')}</button></div>
              <div class="ci" style="background:${alpha(c.color, .18)}">${c.icon}</div>
              <div><div class="cn">${esc(c.name)}</div><div class="ck">${k === 'income' ? 'receita' : 'despesa'}</div></div>
            </div>`).join('')}
            <button class="add-tile" style="min-height:auto;padding:14px" data-add-cat data-kind="${k}"><span class="plus" style="font-size:20px">${ph('ph-plus')}</span></button>
          </div>`;
      }).join('')}
    `;
    return el;
  };

  // ---------- SETTINGS ----------
  views.settings = function () {
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="view-head"><div><h2>Configurações</h2><p>Pessoas do casal, backup e preferências.</p></div></div>

      <div class="section-title">O casal</div>
      <div class="grid cols-2">
        ${S.data.people.map((p) => `<div class="card pad">
          <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px">
            ${whoAv(p)}<b style="font-size:16px">${esc(p.name)}</b>
          </div>
          <div class="field"><label>Nome</label><input data-person-name="${p.id}" value="${esc(p.name)}"></div>
          <div class="field" style="margin-top:12px"><label>Dias de recebimento (separados por vírgula)</label>
            <input data-person-paydays="${p.id}" value="${(p.paydays || []).join(', ')}" placeholder="ex: 5, 20"></div>
          <div class="field" style="margin-top:12px"><label>Cor</label>
            <div class="swatch-row">${S.PALETTE.map((c) => `<div class="swatch ${c === p.color ? 'on' : ''}" style="background:${c}" data-person-color="${p.id}" data-color="${c}"></div>`).join('')}</div></div>
        </div>`).join('')}
      </div>

      <div class="section-title">Backup dos dados</div>
      <div class="card pad">
        <p style="color:var(--dim);font-size:14px;margin-bottom:16px">Seus dados ficam salvos só neste navegador. Exporte um arquivo para guardar ou levar para outro aparelho.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="primary-btn" id="btnExport">${ph('ph-download-simple')}<span>Exportar backup</span></button>
          <button class="btn-line" id="btnImport" style="display:inline-flex;align-items:center;gap:7px">${ph('ph-upload-simple')} Importar backup</button>
          <input type="file" id="fileImport" accept="application/json" hidden>
          <button class="btn-line" id="btnReset" style="display:inline-flex;align-items:center;gap:7px;color:var(--neg);border-color:color-mix(in srgb, var(--neg) 40%, transparent)">${ph('ph-trash')} Zerar tudo</button>
        </div>
      </div>

      <div class="section-title">Aparência</div>
      <div class="card pad" style="display:flex;align-items:center;justify-content:space-between">
        <div><b style="font-weight:600">Tema escuro</b><div style="font-size:13px;color:var(--dim)">Alterna entre claro e escuro.</div></div>
        <div class="switch ${document.body.dataset.theme === 'dark' ? 'on' : ''}" id="themeSwitch"><i></i></div>
      </div>

      <p style="text-align:center;color:var(--faint);font-size:12.5px;margin-top:32px;display:flex;align-items:center;justify-content:center;gap:6px">DuoFinance · feito ${ph('ph-heart-straight')} para vocês dois</p>
    `;
    return el;
  };

  // ---------- shared bits ----------
  function statCard(icon, label, value, foot, clr) {
    return `<div class="stat">
      <div class="stat-ico">${ph(icon)}</div>
      <div class="stat-label">${label}</div>
      <div class="stat-value" style="${clr ? `color:${clr}` : ''}" data-count="${value}">${money(value)}</div>
      <div class="stat-foot">${foot}</div>
    </div>`;
  }
  function emptyState(icon, t, s) {
    return `<div class="empty"><div class="e-ico">${ph(icon)}</div><div class="e-t">${t}</div><div>${s}</div></div>`;
  }

  // count-up on money figures (motivated: directs the eye to the totals)
  function animateCounts(root) {
    if (reduceMotion()) return;
    root.querySelectorAll('[data-count]').forEach((n) => {
      const end = parseFloat(n.dataset.count); if (isNaN(end)) return;
      const t0 = performance.now(), dur = 540;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        n.textContent = money(end * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  // light entrance stagger for grid tiles
  function stagger(root) {
    if (reduceMotion()) return;
    root.querySelectorAll('.stat, .cc, .cat-chip').forEach((n, i) => { n.classList.add('stagger'); n.style.setProperty('--i', i % 8); });
  }

  // ===================================================================
  // MODALS / FORMS
  // ===================================================================
  const modalBackdrop = $('#modalBackdrop');
  function openModal(title, bodyHTML, onMount) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHTML;
    modalBackdrop.hidden = false;
    if (onMount) onMount($('#modalBody'));
  }
  function closeModal() { modalBackdrop.hidden = true; $('#modalBody').innerHTML = ''; }
  $('#modalClose').onclick = closeModal;
  modalBackdrop.onclick = (e) => { if (e.target === modalBackdrop) closeModal(); };

  function catOptions(kind, sel) {
    return S.categories(kind).map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('');
  }
  function personOptions(sel) {
    return S.data.people.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  }
  function cardOptions(sel) {
    return `<option value="">Sem cartão (dinheiro, pix ou débito)</option>` + S.cards().map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  }
  function todayInMonth() {
    const t = new Date(2026, 5, 27);
    if (monthKey(t) === monthKey(state.month)) return S.ymd(t);
    return S.ymd(new Date(state.month.getFullYear(), state.month.getMonth(), 1));
  }

  // ---- transaction form ----
  function txForm(existing) {
    const t = existing || { kind: 'expense', date: todayInMonth(), method: 'cartao' };
    openModal(existing ? 'Editar lançamento' : 'Novo lançamento', `
      <div class="form">
        <div class="seg" id="kindSeg">
          <button data-kind="expense" class="${t.kind === 'expense' ? 'on' : ''}">${ph('ph-arrow-up-right')} Gasto</button>
          <button data-kind="income" class="${t.kind === 'income' ? 'on' : ''}">${ph('ph-arrow-down-left')} Receita</button>
        </div>
        <div class="field"><label>Descrição</label><input id="f_desc" value="${esc(t.desc || '')}" placeholder="ex: Mercado da semana"></div>
        <div class="field-row">
          <div class="field"><label>Valor (R$)</label><input id="f_amount" type="number" step="0.01" inputmode="decimal" value="${t.amount || ''}" placeholder="0,00"></div>
          <div class="field"><label>Data</label><input id="f_date" type="date" value="${t.date}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Categoria</label><select id="f_cat">${catOptions(t.kind, t.categoryId)}</select></div>
          <div class="field"><label>Quem</label><select id="f_person">${personOptions(t.personId)}</select></div>
        </div>
        <div id="cardWrap">
          <div class="field-row">
            <div class="field"><label>Cartão</label><select id="f_card">${cardOptions(t.cardId)}</select></div>
            <div class="field"><label>Parcelas</label><input id="f_inst" type="number" min="1" max="48" value="${existing && t.installment ? t.installment.of : 1}" ${existing ? 'disabled' : ''}></div>
          </div>
          <div class="hint" id="instHint"></div>
        </div>
        <div class="form-actions">
          <button class="primary-btn" id="f_save">${existing ? 'Salvar' : 'Lançar'}</button>
        </div>
      </div>
    `, (root) => {
      let kind = t.kind;
      const segBtns = $$('#kindSeg button', root);
      const cardWrap = $('#cardWrap', root);
      const refreshCats = () => { $('#f_cat', root).innerHTML = catOptions(kind, t.categoryId); };
      const refreshCard = () => { cardWrap.style.display = kind === 'income' ? 'none' : ''; };
      const updHint = () => {
        const n = parseInt($('#f_inst', root).value || 1, 10);
        const amt = parseFloat($('#f_amount', root).value || 0);
        const cardSel = $('#f_card', root).value;
        $('#instHint', root).textContent = (cardSel && n > 1 && amt) ? `${n}x de ${money(amt / n)}, lançado ao longo de ${n} meses.` : '';
      };
      refreshCard();
      segBtns.forEach((b) => b.onclick = () => { segBtns.forEach((x) => x.classList.remove('on')); b.classList.add('on'); kind = b.dataset.kind; refreshCats(); refreshCard(); });
      $('#f_inst', root).oninput = updHint; $('#f_amount', root).oninput = updHint; $('#f_card', root).onchange = updHint;
      $('#f_save', root).onclick = () => {
        const amount = parseFloat($('#f_amount', root).value);
        const desc = $('#f_desc', root).value.trim();
        if (!amount || amount <= 0) return toast('Informe um valor válido', 'err');
        const payload = {
          kind, desc, amount, date: $('#f_date', root).value,
          categoryId: $('#f_cat', root).value, personId: $('#f_person', root).value,
          cardId: kind === 'income' ? null : ($('#f_card', root).value || null),
          method: kind === 'income' ? 'receita' : ($('#f_card', root).value ? 'cartao' : 'dinheiro'),
          installmentsCount: $('#f_inst', root).value,
        };
        if (existing) {
          S.updateTransaction(existing.id, { kind, desc, amount, date: payload.date, categoryId: payload.categoryId, personId: payload.personId, cardId: payload.cardId, method: payload.method });
          toast('Lançamento atualizado');
        } else {
          S.addTransaction(payload);
          toast('Lançamento adicionado');
        }
        closeModal(); render();
      };
    });
  }

  // ---- card form ----
  function cardForm(existing) {
    const c = existing || { color: S.PALETTE[1], ownerId: S.data.people[0].id, brand: 'Visa' };
    openModal(existing ? 'Editar cartão' : 'Novo cartão', `
      <div class="form">
        <div class="field"><label>Nome do cartão</label><input id="c_name" value="${esc(c.name || '')}" placeholder="ex: Nubank Julio"></div>
        <div class="field-row">
          <div class="field"><label>Bandeira</label>
            <select id="c_brand">${['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outro'].map((b) => `<option ${b === c.brand ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
          <div class="field"><label>Dono</label><select id="c_owner">${personOptions(c.ownerId)}</select></div>
        </div>
        <div class="field"><label>Limite (R$)</label><input id="c_limit" type="number" step="0.01" value="${c.limit || ''}" placeholder="0,00"></div>
        <div class="field-row">
          <div class="field"><label>Dia do fechamento</label><input id="c_close" type="number" min="1" max="31" value="${c.closingDay || ''}" placeholder="ex: 28"></div>
          <div class="field"><label>Dia do vencimento</label><input id="c_due" type="number" min="1" max="31" value="${c.dueDay || ''}" placeholder="ex: 5"></div>
        </div>
        <div class="field"><label>Cor</label><div class="swatch-row" id="c_swatch">
          ${S.PALETTE.map((col) => `<div class="swatch ${col === c.color ? 'on' : ''}" style="background:${col}" data-color="${col}"></div>`).join('')}
        </div></div>
        <div class="form-actions"><button class="primary-btn" id="c_save">${existing ? 'Salvar' : 'Adicionar'}</button></div>
      </div>
    `, (root) => {
      let color = c.color;
      $$('#c_swatch .swatch', root).forEach((s) => s.onclick = () => { $$('#c_swatch .swatch', root).forEach((x) => x.classList.remove('on')); s.classList.add('on'); color = s.dataset.color; });
      $('#c_save', root).onclick = () => {
        const name = $('#c_name', root).value.trim();
        if (!name) return toast('Dê um nome ao cartão', 'err');
        const payload = {
          name, brand: $('#c_brand', root).value, ownerId: $('#c_owner', root).value,
          limit: parseFloat($('#c_limit', root).value) || 0,
          closingDay: parseInt($('#c_close', root).value) || null, dueDay: parseInt($('#c_due', root).value) || null,
          color,
        };
        if (existing) { S.updateCard(existing.id, payload); toast('Cartão atualizado'); }
        else { S.addCard(payload); toast('Cartão adicionado'); }
        closeModal(); render();
      };
    });
  }

  // ---- category form ----
  const EMOJIS = ['🏠', '🛒', '🚗', '🍔', '💊', '🎮', '📚', '📺', '🧾', '💼', '✨', '🐶', '👗', '✈️', '🎁', '💡', '📱', '⛽', '☕', '🍻', '🏋️', '💄', '🎬', '🧹'];
  function catForm(existing, defaultKind) {
    const c = existing || { kind: defaultKind || 'expense', color: S.PALETTE[0], icon: '✨' };
    openModal(existing ? 'Editar categoria' : 'Nova categoria', `
      <div class="form">
        <div class="seg" id="ck_seg">
          <button data-kind="expense" class="${c.kind === 'expense' ? 'on' : ''}">${ph('ph-arrow-up-right')} Despesa</button>
          <button data-kind="income" class="${c.kind === 'income' ? 'on' : ''}">${ph('ph-arrow-down-left')} Receita</button>
        </div>
        <div class="field"><label>Nome</label><input id="ck_name" value="${esc(c.name || '')}" placeholder="ex: Pets"></div>
        <div class="field"><label>Ícone</label><div class="emoji-row" id="ck_emoji">
          ${EMOJIS.map((e) => `<button class="emoji-pick ${e === c.icon ? 'on' : ''}" data-emoji="${e}">${e}</button>`).join('')}
        </div></div>
        <div class="field"><label>Cor</label><div class="swatch-row" id="ck_swatch">
          ${S.PALETTE.map((col) => `<div class="swatch ${col === c.color ? 'on' : ''}" style="background:${col}" data-color="${col}"></div>`).join('')}
        </div></div>
        <div class="form-actions"><button class="primary-btn" id="ck_save">${existing ? 'Salvar' : 'Criar'}</button></div>
      </div>
    `, (root) => {
      let kind = c.kind, color = c.color, icon = c.icon;
      $$('#ck_seg button', root).forEach((b) => b.onclick = () => { $$('#ck_seg button', root).forEach((x) => x.classList.remove('on')); b.classList.add('on'); kind = b.dataset.kind; });
      $$('#ck_emoji .emoji-pick', root).forEach((b) => b.onclick = () => { $$('#ck_emoji .emoji-pick', root).forEach((x) => x.classList.remove('on')); b.classList.add('on'); icon = b.dataset.emoji; });
      $$('#ck_swatch .swatch', root).forEach((s) => s.onclick = () => { $$('#ck_swatch .swatch', root).forEach((x) => x.classList.remove('on')); s.classList.add('on'); color = s.dataset.color; });
      $('#ck_save', root).onclick = () => {
        const name = $('#ck_name', root).value.trim();
        if (!name) return toast('Dê um nome à categoria', 'err');
        if (existing) { S.updateCategory(existing.id, { name, kind, color, icon }); toast('Categoria atualizada'); }
        else { S.addCategory({ name, kind, color, icon }); toast('Categoria criada'); }
        closeModal(); render();
      };
    });
  }

  // ---- fixed bill form ----
  function fixedForm(existing) {
    const f = existing || { kind: 'expense', dueDay: 5, personId: S.data.people[0].id, active: true };
    openModal(existing ? 'Editar conta fixa' : 'Nova conta fixa', `
      <div class="form">
        <div class="seg" id="fx_seg">
          <button data-kind="expense" class="${(f.kind || 'expense') === 'expense' ? 'on' : ''}">${ph('ph-arrow-up-right')} Despesa fixa</button>
          <button data-kind="income" class="${f.kind === 'income' ? 'on' : ''}">${ph('ph-arrow-down-left')} Entrada fixa</button>
        </div>
        <div class="field"><label>Descrição</label><input id="fx_desc" value="${esc(f.desc || '')}" placeholder="ex: Aluguel"></div>
        <div class="field-row">
          <div class="field"><label>Valor (R$)</label><input id="fx_amount" type="number" step="0.01" value="${f.amount || ''}" placeholder="0,00"></div>
          <div class="field"><label>Vence todo dia</label><input id="fx_day" type="number" min="1" max="31" value="${f.dueDay || 5}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Categoria</label><select id="fx_cat">${catOptions(f.kind, f.categoryId)}</select></div>
          <div class="field"><label>Responsável</label><select id="fx_person">${personOptions(f.personId)}</select></div>
        </div>
        <div class="form-actions"><button class="primary-btn" id="fx_save">${existing ? 'Salvar' : 'Adicionar'}</button></div>
      </div>
    `, (root) => {
      let kind = f.kind || 'expense';
      $$('#fx_seg button', root).forEach((b) => b.onclick = () => { $$('#fx_seg button', root).forEach((x) => x.classList.remove('on')); b.classList.add('on'); kind = b.dataset.kind; $('#fx_cat', root).innerHTML = catOptions(kind, f.categoryId); });
      $('#fx_save', root).onclick = () => {
        const desc = $('#fx_desc', root).value.trim();
        const amount = parseFloat($('#fx_amount', root).value);
        if (!desc) return toast('Informe a descrição', 'err');
        if (!amount || amount <= 0) return toast('Informe um valor válido', 'err');
        const payload = { kind, desc, amount, dueDay: parseInt($('#fx_day', root).value) || 1, categoryId: $('#fx_cat', root).value, personId: $('#fx_person', root).value };
        if (existing) { S.updateFixed(existing.id, payload); toast('Conta fixa atualizada'); }
        else { S.addFixed(payload); toast('Conta fixa adicionada'); }
        closeModal(); render();
      };
    });
  }

  // ---- salary form ----
  function salaryForm(existing, personId) {
    const mk = monthKey(state.month);
    const pid = personId || (existing && existing.personId) || S.data.people[0].id;
    const per = personOf(pid);
    const s = existing || { personId: pid, month: mk, payday: (per.paydays || [5])[0], received: true };
    openModal(existing ? 'Editar salário' : 'Registrar salário', `
      <div class="form">
        <div class="field"><label>Quem recebeu</label><select id="s_person">${personOptions(s.personId)}</select></div>
        <div class="field-row">
          <div class="field"><label>Valor (R$)</label><input id="s_amount" type="number" step="0.01" value="${s.amount || ''}" placeholder="0,00"></div>
          <div class="field"><label>Dia do pagamento</label><input id="s_day" type="number" min="1" max="31" value="${s.payday || 5}"></div>
        </div>
        <div class="field" style="flex-direction:row;align-items:center;justify-content:space-between">
          <label>Já recebido?</label>
          <div class="switch ${s.received ? 'on' : ''}" id="s_received"><i></i></div>
        </div>
        <div class="hint">Referente a ${MONTHS[state.month.getMonth()]} de ${state.month.getFullYear()}.</div>
        <div class="form-actions"><button class="primary-btn" id="s_save">${existing ? 'Salvar' : 'Registrar'}</button></div>
      </div>
    `, (root) => {
      let received = s.received !== false;
      const sw = $('#s_received', root);
      sw.onclick = () => { received = !received; sw.classList.toggle('on', received); };
      $('#s_save', root).onclick = () => {
        const amount = parseFloat($('#s_amount', root).value);
        if (!amount || amount <= 0) return toast('Informe um valor válido', 'err');
        const payload = { personId: $('#s_person', root).value, month: mk, payday: parseInt($('#s_day', root).value) || 1, amount, received };
        if (existing) { S.updateSalary(existing.id, payload); toast('Salário atualizado'); }
        else { S.addSalary(payload); toast('Salário registrado'); }
        closeModal(); render();
      };
    });
  }

  // ---- confirm ----
  function confirmDel(msg, onYes) {
    openModal('Confirmar', `
      <div class="form">
        <p style="color:var(--dim);font-size:15px">${msg}</p>
        <div class="form-actions">
          <button class="btn-line" id="cf_no" style="flex:1">Cancelar</button>
          <button class="primary-btn" id="cf_yes" style="background:var(--neg);color:#fff">Excluir</button>
        </div>
      </div>
    `, (root) => {
      $('#cf_no', root).onclick = closeModal;
      $('#cf_yes', root).onclick = () => { onYes(); closeModal(); render(); };
    });
  }

  // ===================================================================
  // EVENT DELEGATION
  // ===================================================================
  $('#viewWrap').addEventListener('click', (e) => {
    const t = e.target.closest('[data-add-tx],[data-edit-tx],[data-del-tx],[data-add-card],[data-edit-card],[data-del-card],[data-add-cat],[data-edit-cat],[data-del-cat],[data-add-fixed],[data-edit-fixed],[data-del-fixed],[data-toggle-fixed],[data-pay-fixed],[data-add-salary],[data-edit-salary],[data-del-salary]');
    if (!t) return handleSettingsClicks(e);
    const d = t.dataset;
    if ('addTx' in d) txForm();
    else if (d.editTx) txForm(S.transaction(d.editTx));
    else if (d.delTx) confirmDel('Excluir este lançamento?', () => S.removeTransaction(d.delTx));
    else if ('addCard' in d) cardForm();
    else if (d.editCard) cardForm(S.card(d.editCard));
    else if (d.delCard) confirmDel('Excluir este cartão? Os lançamentos ficam, mas sem cartão vinculado.', () => S.removeCard(d.delCard));
    else if ('addCat' in d) catForm(null, d.kind);
    else if (d.editCat) catForm(S.category(d.editCat));
    else if (d.delCat) confirmDel('Excluir esta categoria?', () => S.removeCategory(d.delCat));
    else if ('addFixed' in d) fixedForm();
    else if (d.editFixed) fixedForm(S.fixedBill(d.editFixed));
    else if (d.delFixed) confirmDel('Excluir esta conta fixa?', () => S.removeFixed(d.delFixed));
    else if (d.toggleFixed) { const f = S.fixedBill(d.toggleFixed); S.updateFixed(d.toggleFixed, { active: !f.active }); render(); }
    else if (d.payFixed) { S.toggleFixedPaid(d.payFixed, monthKey(state.month)); toast(S.fixedPaid(d.payFixed, monthKey(state.month)) ? 'Marcada como paga' : 'Marcada como pendente'); render(); }
    else if ('addSalary' in d) salaryForm(null, d.person);
    else if (d.editSalary) salaryForm(S.salary(d.editSalary));
    else if (d.delSalary) confirmDel('Excluir este registro de salário?', () => S.removeSalary(d.delSalary));
  });

  function handleSettingsClicks(e) {
    if (e.target.closest('#themeSwitch')) return toggleTheme();
    const sc = e.target.closest('[data-person-color]'); if (sc) { S.updatePerson(sc.dataset.personColor, { color: sc.dataset.color }); render(); paintCouple(); return; }
    if (e.target.closest('#btnExport')) return doExport();
    if (e.target.closest('#btnImport')) return $('#fileImport').click();
    if (e.target.closest('#btnReset')) return confirmDel('Isso apaga TODOS os dados (cartões, gastos, salários). Tem certeza?', () => { S.reset(); toast('Tudo zerado'); });
  }

  $('#viewWrap').addEventListener('change', (e) => {
    const pn = e.target.closest('[data-person-name]'); if (pn) { S.updatePerson(pn.dataset.personName, { name: pn.value.trim() || '—' }); paintCouple(); return; }
    const pp = e.target.closest('[data-person-paydays]'); if (pp) {
      const days = pp.value.split(',').map((x) => parseInt(x.trim())).filter((x) => x >= 1 && x <= 31);
      S.updatePerson(pp.dataset.personPaydays, { paydays: days.length ? days : [1] }); return;
    }
    if (e.target.id === 'fileImport' && e.target.files[0]) {
      const fr = new FileReader();
      fr.onload = () => { try { S.import(fr.result); toast('Backup importado'); render(); paintCouple(); } catch (err) { toast('Arquivo inválido', 'err'); } };
      fr.readAsText(e.target.files[0]);
    }
  });

  function doExport() {
    const blob = new Blob([S.export()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `duofinance-backup-${monthKey(new Date(2026, 5, 27))}.json`; a.click();
    URL.revokeObjectURL(url);
    toast('Backup exportado');
  }

  // ===================================================================
  // SHELL / NAV
  // ===================================================================
  function setView(v) {
    state.view = v;
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    $$('.bn-item[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    closeSidebar();
    render();
  }
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('.nav-item'); if (b) setView(b.dataset.view); });
  $('#bottomNav').addEventListener('click', (e) => { const b = e.target.closest('.bn-item[data-view]'); if (b) setView(b.dataset.view); });
  $('#bnAdd').onclick = () => txForm();
  $('#quickAdd').onclick = () => txForm();

  function shiftMonth(n) { state.month.setMonth(state.month.getMonth() + n); render(); }
  $('#prevMonth').onclick = () => shiftMonth(-1);
  $('#nextMonth').onclick = () => shiftMonth(1);
  $('#monthLabel').onclick = () => { state.month = new Date(2026, 5, 1); render(); };

  function setThemeIcon(theme) { $('#themeBtn').innerHTML = ph(theme === 'dark' ? 'ph-moon' : 'ph-sun'); }
  function toggleTheme() {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    setThemeIcon(next);
    S.setSetting('theme', next);
    render();
  }
  $('#themeBtn').onclick = toggleTheme;

  const scrim = document.createElement('div'); scrim.className = 'scrim'; document.body.appendChild(scrim);
  function openSidebar() { $('#sidebar').classList.add('open'); scrim.classList.add('show'); }
  function closeSidebar() { $('#sidebar').classList.remove('open'); scrim.classList.remove('show'); }
  $('#menuBtn').onclick = openSidebar;
  scrim.onclick = closeSidebar;

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modalBackdrop.hidden) closeModal(); });

  // ---------- toast ----------
  function toast(msg, type = 'ok') {
    const wrap = $('#toastWrap');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `${ph(type === 'ok' ? 'ph-check-circle' : 'ph-warning-circle')}<span>${esc(msg)}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, 2600);
  }

  // ---------- couple chip ----------
  function paintCouple() {
    $('#coupleChip').innerHTML = S.data.people.map((p) =>
      `<div class="ppl">${whoAv(p, true)}<span>${esc(p.name)} · dia ${(p.paydays || []).join(' e ')}</span></div>`).join('');
  }

  // ---------- render ----------
  function render() {
    $('#monthLabel').textContent = `${MONTHS[state.month.getMonth()]} ${state.month.getFullYear()}`;
    const wrap = $('#viewWrap');
    wrap.innerHTML = '';
    const view = (views[state.view] || views.dashboard)();
    wrap.appendChild(view);
    stagger(wrap);
    animateCounts(wrap);
    window.scrollTo(0, 0);
  }

  // ---------- init ----------
  function init() {
    const theme = S.data.settings.theme || 'dark';
    document.body.dataset.theme = theme;
    setThemeIcon(theme);
    paintCouple();
    render();
  }
  init();
})();
