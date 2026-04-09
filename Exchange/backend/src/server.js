import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

let nextOrderId = 1;
let nextTradeId = 1;

const book = {
  bids: [],
  asks: [],
  trades: []
};

function nowTs() {
  return Date.now() * 1000;
}

function sideContainer(side) {
  return side === "buy" ? book.bids : book.asks;
}

function oppositeContainer(side) {
  return side === "buy" ? book.asks : book.bids;
}

function sortLevels(side, levels) {
  levels.sort((a, b) => (side === "buy" ? b.price - a.price : a.price - b.price));
}

function upsertLevel(side, price) {
  const levels = sideContainer(side);
  let level = levels.find((l) => l.price === price);
  if (!level) {
    level = { price, orders: [] };
    levels.push(level);
    sortLevels(side, levels);
  }
  return level;
}

function levelMatchable(incoming, bestOpposite) {
  if (!bestOpposite) return false;
  if (incoming.type === "market") return true;
  if (incoming.side === "buy") return incoming.price >= bestOpposite.price;
  return incoming.price <= bestOpposite.price;
}

function bestLevel(side) {
  const levels = oppositeContainer(side);
  return levels.length > 0 ? levels[0] : null;
}

function cleanBestLevel(side) {
  const levels = oppositeContainer(side);
  if (levels.length === 0) return;
  const first = levels[0];
  if (first.orders.length === 0) {
    levels.shift();
  }
}

function createTrade(incoming, resting, qty) {
  const buyOrderId = incoming.side === "buy" ? incoming.id : resting.id;
  const sellOrderId = incoming.side === "sell" ? incoming.id : resting.id;
  const trade = {
    id: nextTradeId++,
    buyOrderId,
    sellOrderId,
    price: resting.price,
    quantity: qty,
    timestamp: nowTs()
  };
  book.trades.push(trade);
  if (book.trades.length > 500) {
    book.trades.splice(0, book.trades.length - 500);
  }
  return trade;
}

function toLevels(levels) {
  return levels.map((level) => {
    const totalQuantity = level.orders.reduce((sum, order) => sum + order.remaining, 0);
    return { price: level.price, quantity: totalQuantity, orderCount: level.orders.length };
  });
}

function validateOrderPayload(payload) {
  const side = payload?.side;
  const type = payload?.type;
  const quantity = Number(payload?.quantity);
  const price = payload?.price !== undefined ? Number(payload.price) : undefined;

  if (side !== "buy" && side !== "sell") return "side must be buy or sell";
  if (type !== "limit" && type !== "market") return "type must be limit or market";
  if (!Number.isFinite(quantity) || quantity <= 0) return "quantity must be > 0";
  if (type === "limit" && (!Number.isFinite(price) || price <= 0)) return "limit orders require price > 0";
  if (type === "market" && price !== undefined) return "market orders must not include price";
  return null;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: nowTs() });
});

app.get("/api/orderbook", (_req, res) => {
  res.json({
    bids: toLevels(book.bids),
    asks: toLevels(book.asks)
  });
});

app.get("/api/trades", (_req, res) => {
  res.json({ trades: [...book.trades].reverse() });
});

app.post("/api/orders", (req, res) => {
  const error = validateOrderPayload(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const incoming = {
    id: nextOrderId++,
    side: req.body.side,
    type: req.body.type,
    quantity: Number(req.body.quantity),
    remaining: Number(req.body.quantity),
    price: req.body.type === "limit" ? Number(req.body.price) : undefined,
    timestamp: nowTs()
  };

  const trades = [];

  while (incoming.remaining > 0) {
    const oppositeBest = bestLevel(incoming.side);
    if (!levelMatchable(incoming, oppositeBest)) break;

    const resting = oppositeBest.orders[0];
    const execQty = Math.min(incoming.remaining, resting.remaining);

    incoming.remaining -= execQty;
    resting.remaining -= execQty;

    trades.push(createTrade(incoming, resting, execQty));

    if (resting.remaining === 0) {
      oppositeBest.orders.shift();
      cleanBestLevel(incoming.side);
    }
  }

  if (incoming.type === "limit" && incoming.remaining > 0) {
    const level = upsertLevel(incoming.side, incoming.price);
    level.orders.push(incoming);
  }

  return res.status(201).json({
    order: {
      id: incoming.id,
      side: incoming.side,
      type: incoming.type,
      quantity: incoming.quantity,
      remaining: incoming.remaining,
      price: incoming.price,
      timestamp: incoming.timestamp,
      status: incoming.remaining === 0 ? "filled" : incoming.remaining < incoming.quantity ? "partially_filled" : incoming.type === "limit" ? "open" : "cancelled"
    },
    trades
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.resolve(__dirname, "../../frontend/dist");
app.use(express.static(staticDir));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(staticDir, "index.html"), (err) => {
    if (err) {
      res.status(404).send("Frontend build not found. Run frontend build first.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`Exchange backend listening on :${PORT}`);
});
