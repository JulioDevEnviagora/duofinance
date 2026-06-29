/* ============================================================
   DuoFinance — store (localStorage data layer)
   ============================================================ */
(function () {
  const KEY = 'duofinance.v1';

  let _seq = 0;
  const uid = () => 'id' + Math.random().toString(36).slice(2, 9) + (++_seq);

  const PALETTE = ['#1ec48d', '#3b6fe0', '#f4795b', '#e0a83c', '#23b8c7', '#ef5da8', '#5a6ad4', '#d97706', '#7c8aa0', '#9b6df0'];

  function defaultData() {
    const julio = { id: uid(), name: 'Julio', color: '#3b6fe0', paydays: [5, 20] };
    const par = { id: uid(), name: 'Esposa', color: '#f4795b', paydays: [15, 30] };
    const cat = (name, icon, color, kind = 'expense') => ({ id: uid(), name, icon, color, kind });
    return {
      version: 1,
      people: [julio, par],
      cards: [],
      categories: [
        cat('Moradia', '🏠', '#3b6fe0'),
        cat('Mercado', '🛒', '#1ec48d'),
        cat('Transporte', '🚗', '#23b8c7'),
        cat('Alimentação', '🍔', '#f4795b'),
        cat('Saúde', '💊', '#10b6a0'),
        cat('Lazer', '🎮', '#e0a83c'),
        cat('Educação', '📚', '#5a6ad4'),
        cat('Assinaturas', '📺', '#9b6df0'),
        cat('Contas', '🧾', '#ef5da8'),
        cat('Salário', '💼', '#1ec48d', 'income'),
        cat('Outros', '✨', '#7c8aa0'),
      ],
      transactions: [],
      fixedBills: [],
      salaries: [],
      fixedPayments: {}, // key `${fixedId}:${YYYY-MM}` -> { paid, date }
      settings: { theme: 'dark' },
    };
  }

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultData(), parsed);
    } catch (e) {
      console.warn('Falha ao carregar dados, usando padrão.', e);
      return defaultData();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.error('Falha ao salvar', e); }
    if (Store.onChange) Store.onChange();
  }

  const byId = (arr, id) => arr.find((x) => x.id === id);

  const Store = {
    PALETTE,
    uid,
    get data() { return data; },

    // ---- people ----
    person: (id) => byId(data.people, id),
    updatePerson(id, patch) { Object.assign(byId(data.people, id), patch); save(); },

    // ---- categories ----
    categories: (kind) => kind ? data.categories.filter((c) => c.kind === kind) : data.categories,
    category: (id) => byId(data.categories, id),
    addCategory(c) { c.id = uid(); data.categories.push(c); save(); return c; },
    updateCategory(id, patch) { Object.assign(byId(data.categories, id), patch); save(); },
    removeCategory(id) { data.categories = data.categories.filter((c) => c.id !== id); save(); },

    // ---- cards ----
    cards: () => data.cards,
    card: (id) => byId(data.cards, id),
    addCard(c) { c.id = uid(); data.cards.push(c); save(); return c; },
    updateCard(id, patch) { Object.assign(byId(data.cards, id), patch); save(); },
    removeCard(id) { data.cards = data.cards.filter((c) => c.id !== id); save(); },

    // ---- transactions ----
    transactions: () => data.transactions,
    transaction: (id) => byId(data.transactions, id),
    addTransaction(t) {
      t.id = uid();
      const n = Math.max(1, parseInt(t.installmentsCount || 1, 10));
      if (t.kind === 'expense' && t.cardId && n > 1) {
        // split installments across months
        const group = uid();
        const base = new Date(t.date + 'T12:00:00');
        const per = +(t.amount / n).toFixed(2);
        for (let i = 0; i < n; i++) {
          const d = new Date(base.getFullYear(), base.getMonth() + i, base.getDate());
          data.transactions.push({
            id: uid(), kind: 'expense', desc: t.desc, amount: per,
            date: ymd(d), categoryId: t.categoryId, personId: t.personId,
            cardId: t.cardId, method: 'cartao',
            installment: { n: i + 1, of: n, group, total: t.amount },
          });
        }
      } else {
        data.transactions.push({
          id: t.id, kind: t.kind, desc: t.desc, amount: +t.amount,
          date: t.date, categoryId: t.categoryId, personId: t.personId,
          cardId: t.cardId || null, method: t.method || 'dinheiro', installment: null,
        });
      }
      save();
    },
    updateTransaction(id, patch) { Object.assign(byId(data.transactions, id), patch); save(); },
    removeTransaction(id) {
      const t = byId(data.transactions, id);
      if (t && t.installment && t.installment.group) {
        data.transactions = data.transactions.filter((x) => !(x.installment && x.installment.group === t.installment.group));
      } else {
        data.transactions = data.transactions.filter((x) => x.id !== id);
      }
      save();
    },

    // ---- fixed bills ----
    fixedBills: () => data.fixedBills,
    fixedBill: (id) => byId(data.fixedBills, id),
    addFixed(f) { f.id = uid(); f.active = f.active !== false; data.fixedBills.push(f); save(); return f; },
    updateFixed(id, patch) { Object.assign(byId(data.fixedBills, id), patch); save(); },
    removeFixed(id) { data.fixedBills = data.fixedBills.filter((f) => f.id !== id); save(); },
    fixedPaid(fixedId, month) { return !!data.fixedPayments[`${fixedId}:${month}`]; },
    toggleFixedPaid(fixedId, month, date) {
      const k = `${fixedId}:${month}`;
      if (data.fixedPayments[k]) delete data.fixedPayments[k];
      else data.fixedPayments[k] = { paid: true, date: date || month + '-01' };
      save();
    },

    // ---- salaries ----
    salaries: () => data.salaries,
    salary: (id) => byId(data.salaries, id),
    addSalary(s) { s.id = uid(); data.salaries.push(s); save(); return s; },
    updateSalary(id, patch) { Object.assign(byId(data.salaries, id), patch); save(); },
    removeSalary(id) { data.salaries = data.salaries.filter((s) => s.id !== id); save(); },

    // ---- settings ----
    setSetting(k, v) { data.settings[k] = v; save(); },

    // ---- backup ----
    export() { return JSON.stringify(data, null, 2); },
    import(json) {
      const parsed = JSON.parse(json);
      if (!parsed.people || !parsed.categories) throw new Error('Arquivo inválido');
      data = Object.assign(defaultData(), parsed);
      save();
    },
    reset() { data = defaultData(); save(); },

    onChange: null,
    _save: save,
  };

  function ymd(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  Store.ymd = ymd;

  window.Store = Store;
})();
