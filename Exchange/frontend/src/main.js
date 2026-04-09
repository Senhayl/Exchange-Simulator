import "./style.css";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const API = "http://localhost:3002";
const POLL_MS = 1500;
const PAIR = "BTC / USDT";

// ─── STATE ─────────────────────────────────────────────────────────────────
let state = {
  bids: [], asks: [], trades: [],
  lastPrice: 0, prevPrice: 0,
  priceHistory: [],         // [{time, open, high, low, close}]
  openOrders: [],           // locally tracked open limit orders
  balance: { usdt: 100_000, btc: 2 },
  online: false,
  side: "buy",
  orderType: "limit",
  chartInterval: "1m",
};

// ─── HELPERS ───────────────────────────────────────────────────────────────
const fmt  = (n, d = 2) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtQty = n => Number(n).toFixed(4);
const fmtTime = ts => {
  const d = new Date(typeof ts === "number" && ts > 1e12 ? ts / 1000 : ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

// ─── TOAST ─────────────────────────────────────────────────────────────────
function toast(msg, type = "info") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.prepend(t);
  setTimeout(() => t.remove(), 3500);
}

// ─── CHART (OHLC CANDLES) ──────────────────────────────────────────────────
let chartCtx, chartW, chartH;

function initChart() {
  const canvas = document.getElementById("chart");
  chartCtx = canvas.getContext("2d");
  resizeChart();
  window.addEventListener("resize", resizeChart);
}

function resizeChart() {
  const canvas = document.getElementById("chart");
  const wrap   = canvas.parentElement;
  chartW = wrap.clientWidth;
  chartH = wrap.clientHeight;
  canvas.width  = chartW * devicePixelRatio;
  canvas.height = chartH * devicePixelRatio;
  chartCtx.scale(devicePixelRatio, devicePixelRatio);
  drawChart();
}

function drawChart() {
  if (!chartCtx) return;
  const ctx = chartCtx;
  const W = chartW, H = chartH;
  ctx.clearRect(0, 0, W, H);

  // Background grid
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg-panel").trim();
  ctx.fillRect(0, 0, W, H);

  const candles = state.priceHistory;
  if (candles.length < 2) {
    ctx.fillStyle = "rgba(107,122,153,.3)";
    ctx.font = "12px 'Sora', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Waiting for trade data…", W / 2, H / 2);
    return;
  }

  const PAD_L = 8, PAD_R = 60, PAD_T = 28, PAD_B = 28;
  const cW = W - PAD_L - PAD_R;
  const cH = H - PAD_T - PAD_B;

  const n = Math.min(candles.length, 80);
  const visible = candles.slice(-n);

  let lo = Infinity, hi = -Infinity;
  visible.forEach(c => { if (c.low  < lo) lo = c.low; if (c.high > hi) hi = c.high; });
  const range = hi - lo || 1;
  const yScale = cH / range;
  const xStep  = cW / n;

  // Grid lines
  const gridLines = 5;
  ctx.strokeStyle = "rgba(30,36,51,.8)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridLines; i++) {
    const y = PAD_T + (cH / gridLines) * i;
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    const price = hi - (range / gridLines) * i;
    ctx.fillStyle = "rgba(61,74,99,.9)";
    ctx.font = `10px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    ctx.fillText(fmt(price), W - PAD_R + 6, y + 4);
  }

  // Area under close line
  const closePoints = visible.map((c, i) => ({
    x: PAD_L + i * xStep + xStep / 2,
    y: PAD_T + cH - (c.close - lo) * yScale
  }));
  const isUp = visible[visible.length - 1].close >= visible[0].open;
  const color = isUp ? "#00c896" : "#ff4d6a";

  ctx.beginPath();
  ctx.moveTo(closePoints[0].x, PAD_T + cH);
  closePoints.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(closePoints[closePoints.length - 1].x, PAD_T + cH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + cH);
  grad.addColorStop(0, isUp ? "rgba(0,200,150,.25)" : "rgba(255,77,106,.25)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fill();

  // Candles
  const cw = Math.max(2, xStep * 0.6);
  visible.forEach((c, i) => {
    const x  = PAD_L + i * xStep + xStep / 2;
    const yO = PAD_T + cH - (c.open  - lo) * yScale;
    const yC = PAD_T + cH - (c.close - lo) * yScale;
    const yH = PAD_T + cH - (c.high  - lo) * yScale;
    const yL = PAD_T + cH - (c.low   - lo) * yScale;
    const bull = c.close >= c.open;
    const col  = bull ? "#00c896" : "#ff4d6a";

    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();

    ctx.fillStyle = bull ? "rgba(0,200,150,.8)" : "rgba(255,77,106,.8)";
    const top = Math.min(yO, yC);
    const ht  = Math.max(1, Math.abs(yO - yC));
    ctx.fillRect(x - cw / 2, top, cw, ht);
  });

  // Close price line
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  const last = closePoints[closePoints.length - 1];
  ctx.beginPath(); ctx.moveTo(PAD_L, last.y); ctx.lineTo(W - PAD_R, last.y); ctx.stroke();
  ctx.setLineDash([]);
}

// Generate seed candles so the chart looks good from the start
function seedCandles(basePrice) {
  const now = Date.now();
  const candles = [];
  let price = basePrice * 0.97;
  for (let i = 79; i >= 0; i--) {
    const change = (Math.random() - 0.48) * price * 0.004;
    const open  = price;
    const close = price + change;
    const high  = Math.max(open, close) + Math.random() * price * 0.002;
    const low   = Math.min(open, close) - Math.random() * price * 0.002;
    candles.push({ time: now - i * 60000, open, high, low, close });
    price = close;
  }
  return candles;
}

// Aggregate a new trade price into the latest candle (1-min buckets)
function pushPrice(price) {
  const bucket = Math.floor(Date.now() / 60000) * 60000;
  const last = state.priceHistory[state.priceHistory.length - 1];
  if (!last || last.time !== bucket) {
    state.priceHistory.push({ time: bucket, open: price, high: price, low: price, close: price });
    if (state.priceHistory.length > 200) state.priceHistory.shift();
  } else {
    if (price > last.high) last.high = price;
    if (price < last.low)  last.low  = price;
    last.close = price;
  }
  drawChart();
}

// ─── API CALLS ─────────────────────────────────────────────────────────────
async function fetchOrderBook() {
  const res  = await fetch(`${API}/api/orderbook`);
  const data = await res.json();
  state.bids = data.bids;
  state.asks = data.asks;
}

async function fetchTrades() {
  const res  = await fetch(`${API}/api/trades`);
  const data = await res.json();
  const trades = data.trades || [];

  if (trades.length > 0) {
    const latest = trades[0];
    state.prevPrice = state.lastPrice;
    state.lastPrice = latest.price;

    // Seed candles once we know the price
    if (state.priceHistory.length === 0) {
      state.priceHistory = seedCandles(state.lastPrice);
    }
    pushPrice(state.lastPrice);
  }

  state.trades = trades;
}

async function placeOrder(payload) {
  const res  = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function poll() {
  try {
    await Promise.all([fetchOrderBook(), fetchTrades()]);
    state.online = true;

    // Seed candles if still empty (no trades yet)
    if (state.priceHistory.length === 0 && state.lastPrice === 0) {
      state.lastPrice = 65420;
      state.priceHistory = seedCandles(state.lastPrice);
    }
  } catch {
    state.online = false;

    // Work offline with simulated data
    if (state.lastPrice === 0) state.lastPrice = 65420;
    if (state.priceHistory.length === 0) state.priceHistory = seedCandles(state.lastPrice);
    simulateOfflineBook();
  }
  render();
}

// ─── OFFLINE SIMULATION (when API is down) ─────────────────────────────────
function simulateOfflineBook() {
  const base = state.lastPrice || 65420;
  const drift = (Math.random() - 0.5) * 4;
  state.lastPrice = Math.max(1, base + drift);
  pushPrice(state.lastPrice);

  const asks = [], bids = [];
  for (let i = 1; i <= 14; i++) {
    asks.push({ price: +(state.lastPrice + i * 3 + Math.random() * 2).toFixed(1), quantity: +(1 + Math.random() * 3).toFixed(4) });
    bids.push({ price: +(state.lastPrice - i * 3 - Math.random() * 2).toFixed(1), quantity: +(1 + Math.random() * 3).toFixed(4) });
  }
  state.asks = asks;
  state.bids = bids;

  if (Math.random() > 0.6 && state.trades.length < 40) {
    const side = Math.random() > 0.5 ? "buy" : "sell";
    const price = state.lastPrice + (Math.random() - 0.5) * 5;
    state.trades.unshift({ id: Date.now(), price: +price.toFixed(1), quantity: +(Math.random() * 0.5 + 0.01).toFixed(4), timestamp: Date.now() * 1000, side });
    if (state.trades.length > 50) state.trades.pop();
  }
}

// ─── RENDER ────────────────────────────────────────────────────────────────
function render() {
  renderHeader();
  renderOrderBook();
  renderTrades();
  renderOpenOrders();
}

// ── Header ──
function renderHeader() {
  const dot  = document.querySelector(".api-dot");
  const txt  = document.querySelector(".api-txt");
  const pBig = document.querySelector(".price-big");
  const ch24 = document.querySelector(".ch24");

  dot.className = `api-dot ${state.online ? "online" : "offline"}`;
  txt.textContent = state.online ? "API Connected" : "Offline Mode";

  if (state.lastPrice > 0) {
    pBig.textContent = `$${fmt(state.lastPrice)}`;
    pBig.className   = `hstat-val price-big ${state.lastPrice >= state.prevPrice ? "up" : "down"}`;

    const change = state.lastPrice - (state.priceHistory[0]?.open || state.lastPrice);
    const pct    = state.priceHistory[0]?.open ? (change / state.priceHistory[0].open) * 100 : 0;
    ch24.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
    ch24.className   = `hstat-val ${pct >= 0 ? "up" : "down"}`;

    const hi = Math.max(...state.priceHistory.map(c => c.high));
    const lo = Math.min(...state.priceHistory.map(c => c.low));
    const vol = state.trades.reduce((s, t) => s + t.quantity * t.price, 0);
    document.querySelector(".h24hi").textContent = `$${fmt(hi)}`;
    document.querySelector(".h24lo").textContent = `$${fmt(lo)}`;
    document.querySelector(".hvol").textContent  = `${(vol / 1e6).toFixed(2)}M`;
  }
}

// ── Order Book ──
function renderOrderBook() {
  const asksEl = document.querySelector(".ob-asks");
  const bidsEl = document.querySelector(".ob-bids");
  const spreadEl = document.querySelector(".ob-spread-price");
  const pctEl    = document.querySelector(".ob-spread-pct");

  const maxAskVol = Math.max(...state.asks.map(a => a.quantity), 1);
  const maxBidVol = Math.max(...state.bids.map(b => b.quantity), 1);

  asksEl.innerHTML = state.asks.slice(0, 14).map(a => `
    <div class="ob-row ask">
      <span class="price">${fmt(a.price)}</span>
      <span class="qty">${fmtQty(a.quantity)}</span>
      <span class="total">${fmt(a.price * a.quantity)}</span>
      <div class="ob-depth" style="width:${(a.quantity / maxAskVol * 100).toFixed(1)}%"></div>
    </div>`).join("");

  bidsEl.innerHTML = state.bids.slice(0, 14).map(b => `
    <div class="ob-row bid">
      <span class="price">${fmt(b.price)}</span>
      <span class="qty">${fmtQty(b.quantity)}</span>
      <span class="total">${fmt(b.price * b.quantity)}</span>
      <div class="ob-depth" style="width:${(b.quantity / maxBidVol * 100).toFixed(1)}%"></div>
    </div>`).join("");

  if (state.asks.length && state.bids.length) {
    const bestAsk = state.asks[0].price;
    const bestBid = state.bids[0].price;
    const spread  = (bestAsk - bestBid).toFixed(1);
    const pct     = ((bestAsk - bestBid) / bestBid * 100).toFixed(3);
    spreadEl.textContent = `$${fmt(state.lastPrice || bestBid)} ${state.lastPrice >= state.prevPrice ? "▲" : "▼"}`;
    spreadEl.className   = `ob-spread-price ${state.lastPrice < state.prevPrice ? "down" : ""}`;
    pctEl.textContent    = `Spread: ${spread} (${pct}%)`;
  }
}

// ── Trades ──
function renderTrades() {
  const el = document.querySelector(".trades-scroll");
  el.innerHTML = state.trades.slice(0, 40).map(t => {
    const side = t.side || (t.buyOrderId < t.sellOrderId ? "buy" : "sell");
    return `<div class="trade-row ${side}">
      <span class="t-price">${fmt(t.price)}</span>
      <span class="t-qty">${fmtQty(t.quantity)}</span>
      <span class="t-time">${fmtTime(t.timestamp)}</span>
    </div>`;
  }).join("");
}

// ── Open Orders Table ──
function renderOpenOrders() {
  const tbody = document.querySelector("#orders-tbody");
  if (!state.openOrders.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No open orders</div></td></tr>`;
    return;
  }
  tbody.innerHTML = state.openOrders.map(o => `
    <tr>
      <td>${fmtTime(o.timestamp)}</td>
      <td>${PAIR}</td>
      <td><span class="badge ${o.side}">${o.side.toUpperCase()}</span></td>
      <td><span class="badge ${o.orderType}">${o.orderType.toUpperCase()}</span></td>
      <td>$${fmt(o.price || state.lastPrice)}</td>
      <td>${fmtQty(o.remaining)} / ${fmtQty(o.quantity)}</td>
      <td><button class="cancel-btn" data-id="${o.id}">Cancel</button></td>
    </tr>`).join("");

  tbody.querySelectorAll(".cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = +btn.dataset.id;
      state.openOrders = state.openOrders.filter(o => o.id !== id);
      toast("Order cancelled", "error");
      renderOpenOrders();
    });
  });
}

// ─── ORDER FORM LOGIC ──────────────────────────────────────────────────────
function initForm() {
  // Side tabs
  document.querySelectorAll(".side-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      state.side = tab.dataset.side;
      document.querySelectorAll(".side-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      updateFormUI();
    });
  });

  // Order type tabs
  document.querySelectorAll(".ttype").forEach(tab => {
    tab.addEventListener("click", () => {
      state.orderType = tab.dataset.type;
      document.querySelectorAll(".ttype").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const priceInput = document.getElementById("f-price");
      priceInput.disabled = state.orderType === "market";
      priceInput.placeholder = state.orderType === "market" ? "Market Price" : "0.00";
      updateTotal();
    });
  });

  // Inputs → update total
  document.getElementById("f-price").addEventListener("input", updateTotal);
  document.getElementById("f-qty").addEventListener("input", updateTotal);

  // % buttons
  document.querySelectorAll(".pct").forEach(btn => {
    btn.addEventListener("click", () => {
      const pct = +btn.dataset.pct / 100;
      const qtyInput = document.getElementById("f-qty");
      if (state.side === "buy") {
        const avail = state.balance.usdt;
        const price = +document.getElementById("f-price").value || state.lastPrice;
        qtyInput.value = (avail * pct / price).toFixed(4);
      } else {
        qtyInput.value = (state.balance.btc * pct).toFixed(4);
      }
      updateTotal();
    });
  });

  // Submit
  document.getElementById("order-form").addEventListener("submit", async e => {
    e.preventDefault();
    const price = +document.getElementById("f-price").value;
    const qty   = +document.getElementById("f-qty").value;

    if (!qty || qty <= 0) { toast("Enter a valid quantity", "error"); return; }
    if (state.orderType === "limit" && (!price || price <= 0)) { toast("Enter a valid price", "error"); return; }

    const payload = {
      side: state.side,
      type: state.orderType,
      quantity: qty,
      ...(state.orderType === "limit" ? { price } : {}),
    };

    // Flash
    const flash = document.querySelector(".submit-flash");
    flash.classList.remove("flash");
    void flash.offsetWidth;
    flash.classList.add("flash");

    try {
      const res = await placeOrder(payload);
      if (res.error) { toast(res.error, "error"); return; }

      const order = res.order;
      // Update local balance
      if (state.side === "buy") {
        const cost = qty * (price || state.lastPrice);
        state.balance.usdt -= cost;
        state.balance.btc  += qty - (order.remaining || 0);
      } else {
        state.balance.btc  -= qty;
        const revenue = qty * (price || state.lastPrice);
        state.balance.usdt += revenue;
      }
      state.balance.usdt = Math.max(0, state.balance.usdt);
      state.balance.btc  = Math.max(0, state.balance.btc);

      if (order.status === "open" || order.status === "partially_filled") {
        state.openOrders.unshift({ ...order, orderType: state.orderType });
      }

      const trades = res.trades || [];
      toast(
        trades.length
          ? `✓ ${trades.length} fill(s) at $${fmt(trades[0].price)}`
          : `Limit order #${order.id} placed`,
        "success"
      );

      document.getElementById("f-price").value = "";
      document.getElementById("f-qty").value   = "";
      updateTotal();
      await poll();
    } catch {
      toast("API unreachable — order not sent", "error");
    }
  });
}

function updateFormUI() {
  const balUSDT = document.getElementById("bal-usdt");
  const balBTC  = document.getElementById("bal-btc");
  balUSDT.textContent = `${fmt(state.balance.usdt)} USDT`;
  balBTC.textContent  = `${fmtQty(state.balance.btc)} BTC`;
  updateTotal();
}

function updateTotal() {
  const price = +document.getElementById("f-price").value || state.lastPrice;
  const qty   = +document.getElementById("f-qty").value || 0;
  const total = (price * qty).toFixed(2);
  document.getElementById("f-total").textContent = `$${fmt(+total)}`;
  updateFormUI();

  const btn = document.querySelector(".submit");
  btn.className  = `submit ${state.side}`;
  btn.textContent = state.side === "buy"
    ? `Buy BTC`
    : `Sell BTC`;
}

// ─── BUILD DOM ─────────────────────────────────────────────────────────────
function buildDOM() {
  document.getElementById("app").innerHTML = `
  <!-- Toast -->
  <div id="toast-container"></div>

  <!-- Header -->
  <header class="header">
    <div class="logo">
      <div class="logo-mark">N</div>
      NexEx
    </div>

    <div class="pair-selector">
      <span class="pair-name">${PAIR}</span>
      <span class="pair-tag">SPOT</span>
      <span class="pair-arrow">▾</span>
    </div>

    <div class="header-stats">
      <div class="hstat">
        <span class="hstat-val price-big" id="last-price">—</span>
        <span class="hstat-lbl">Last Price</span>
      </div>
      <div class="hstat">
        <span class="hstat-val ch24">—</span>
        <span class="hstat-lbl">24h Change</span>
      </div>
      <div class="hstat">
        <span class="hstat-val h24hi">—</span>
        <span class="hstat-lbl">24h High</span>
      </div>
      <div class="hstat">
        <span class="hstat-val h24lo">—</span>
        <span class="hstat-lbl">24h Low</span>
      </div>
      <div class="hstat">
        <span class="hstat-val hvol">—</span>
        <span class="hstat-lbl">24h Volume</span>
      </div>
    </div>

    <div class="header-right">
      <div class="api-status">
        <div class="api-dot"></div>
        <span class="api-txt">Connecting…</span>
      </div>
    </div>
  </header>

  <!-- Exchange -->
  <div class="exchange">

    <!-- ORDER BOOK -->
    <div class="panel ob-panel">
      <div class="panel-hd">
        <span class="panel-title">Order Book</span>
        <div class="panel-tabs">
          <span class="ptab active">All</span>
          <span class="ptab">Bids</span>
          <span class="ptab">Asks</span>
        </div>
      </div>
      <div class="ob-cols">
        <span>Price (USDT)</span>
        <span>Amount (BTC)</span>
        <span>Total</span>
      </div>
      <div class="ob-asks"></div>
      <div class="ob-spread">
        <span class="ob-spread-price">—</span>
        <span class="ob-spread-pct">Spread: —</span>
      </div>
      <div class="ob-bids"></div>
    </div>

    <!-- CENTER -->
    <div class="center-col">

      <!-- Chart -->
      <div class="chart-wrap">
        <div class="chart-toolbar">
          <button class="ctab active" data-i="1m">1m</button>
          <button class="ctab" data-i="5m">5m</button>
          <button class="ctab" data-i="15m">15m</button>
          <button class="ctab" data-i="1h">1h</button>
        </div>
        <div class="chart-info" id="chart-info">BTC/USDT</div>
        <canvas id="chart"></canvas>
      </div>

      <!-- Open Orders -->
      <div class="orders-wrap">
        <div class="panel-hd">
          <span class="panel-title">Open Orders</span>
          <div class="panel-tabs">
            <span class="ptab active">Open</span>
            <span class="ptab">History</span>
          </div>
        </div>
        <div class="orders-scroll">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Pair</th>
                <th>Side</th>
                <th>Type</th>
                <th>Price</th>
                <th>Remaining / Qty</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="orders-tbody">
              <tr><td colspan="7"><div class="empty-state">No open orders</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div><!-- /center -->

    <!-- RIGHT -->
    <div class="right-col panel">

      <!-- Order Form -->
      <div class="form-wrap">
        <div class="side-tabs">
          <div class="side-tab buy active" data-side="buy">Buy</div>
          <div class="side-tab sell" data-side="sell">Sell</div>
        </div>

        <form class="order-form" id="order-form">
          <div>
            <span class="flabel">Order Type</span>
            <div class="type-tabs">
              <div class="ttype active" data-type="limit">Limit</div>
              <div class="ttype" data-type="market">Market</div>
            </div>
          </div>

          <div>
            <span class="flabel">Price</span>
            <div class="igroup">
              <input type="number" id="f-price" placeholder="0.00" step="0.01" min="0" />
              <span class="iunit">USDT</span>
            </div>
          </div>

          <div>
            <span class="flabel">Amount</span>
            <div class="igroup">
              <input type="number" id="f-qty" placeholder="0.0000" step="0.0001" min="0" />
              <span class="iunit">BTC</span>
            </div>
          </div>

          <div class="pct-row">
            <div class="pct" data-pct="25">25%</div>
            <div class="pct" data-pct="50">50%</div>
            <div class="pct" data-pct="75">75%</div>
            <div class="pct" data-pct="100">100%</div>
          </div>

          <div class="balance-row">
            <div class="bal-item">
              <span class="bal-lbl">USDT Balance</span>
              <span class="bal-val" id="bal-usdt">—</span>
            </div>
            <div class="bal-item" style="text-align:right">
              <span class="bal-lbl">BTC Balance</span>
              <span class="bal-val" id="bal-btc">—</span>
            </div>
          </div>

          <div class="total-line">
            <span>Order Total</span>
            <strong id="f-total">$0.00</strong>
          </div>

          <button type="submit" class="submit buy">
            Buy BTC
            <div class="submit-flash"></div>
          </button>

          <div class="fee-note">Fee: 0.10% · Maker / 0.10% · Taker</div>
        </form>
      </div><!-- /form-wrap -->

      <!-- Recent Trades -->
      <div class="trades-wrap">
        <div class="panel-hd">
          <span class="panel-title">Recent Trades</span>
        </div>
        <div class="trades-cols">
          <span>Price (USDT)</span>
          <span>Amount (BTC)</span>
          <span>Time</span>
        </div>
        <div class="trades-scroll"></div>
      </div>

    </div><!-- /right -->

  </div><!-- /exchange -->
  `;
}

// ─── BOOT ──────────────────────────────────────────────────────────────────
buildDOM();
initChart();
initForm();
updateFormUI();

// Chart interval tabs
document.querySelectorAll(".ctab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".ctab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    state.chartInterval = tab.dataset.i;
  });
});

// Initial poll + recurring
poll();
setInterval(poll, POLL_MS);
