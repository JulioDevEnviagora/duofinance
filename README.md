# 💑 DuoFinance

Organização financeira **para casais**. Um app web simples, bonito e rápido para
planejar a vida financeira a dois — do jeito que vocês já fazem: **por pagamentos**.

🔗 **Acesse:** https://juliodevenviagora.github.io/duofinance/

## ✨ O que dá pra fazer

- **💳 Cartões de crédito** — cadastre limite, bandeira, dono, dia de fechamento e vencimento, e acompanhe a fatura/uso do mês.
- **🏷️ Categorias** — crie e personalize com cor e ícone (despesas e receitas).
- **💸 Lançamentos** — registre gastos e receitas, à vista ou **parcelados** no cartão (as parcelas se espalham automaticamente pelos meses).
- **📌 Contas fixas** — aquelas que se repetem todo mês (aluguel, internet, assinaturas). Marque como paga conforme acontecem.
- **💰 Salários** — registre quanto cada um recebeu, por data de pagamento.
- **🗓️ Ciclos de pagamento** — a visão "por pagamentos": cada data de recebimento vira um ciclo, mostrando o que entra, o que vence e quanto sobra.
- **📊 Visão geral** — saldo do mês, gráficos de gastos por categoria, evolução de 6 meses e uso dos cartões.

## 🔒 Onde ficam os dados

Tudo é salvo **localmente no navegador** (localStorage) — nada vai pra nenhum servidor.
Em **Configurações** dá pra **exportar/importar** um arquivo de backup para levar os dados
para outro aparelho ou guardar com segurança.

## 🛠️ Tecnologia

100% estático: HTML + CSS + JavaScript puro, com [Chart.js](https://www.chartjs.org/) para os gráficos.
Sem build, sem dependências para instalar. É só abrir o `index.html`.

```
.
├── index.html
└── assets
    ├── css/styles.css
    └── js/{store.js, app.js}
```

## 🚀 Deploy

Publicado automaticamente no GitHub Pages a cada push na branch `main`
(workflow em `.github/workflows/deploy-pages.yml`).

---

Feito com 💜 para o casal.
