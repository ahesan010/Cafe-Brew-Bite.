const $ = (s, r = document) => r.querySelector(s),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const ls = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  },
};
const CATS = ["All", "Coffee", "Food", "Dessert", "Coolers"];
const ST = [
  [
    "s1",
    "Cappuccino",
    160,
    "Coffee",
    "☕",
    "Velvety espresso, steamed milk, cocoa dust",
  ],
  [
    "s2",
    "Cold Coffee",
    180,
    "Coffee",
    "🧋",
    "Chilled, creamy and just sweet enough",
  ],
  [
    "s3",
    "Masala Chai",
    80,
    "Coffee",
    "🍵",
    "Ginger, cardamom and slow-simmered tea",
  ],
  [
    "s4",
    "Filter Coffee",
    90,
    "Coffee",
    "☕",
    "South Indian decoction with frothy milk",
  ],
  [
    "s5",
    "Veg Club Sandwich",
    140,
    "Food",
    "🥪",
    "Toasted triple-decker with mint chutney",
  ],
  [
    "s6",
    "Paneer Tikka Wrap",
    190,
    "Food",
    "🌯",
    "Smoky paneer, onions and tangy sauce",
  ],
  [
    "s7",
    "Pasta Alfredo",
    260,
    "Food",
    "🍝",
    "Creamy white sauce with herbs and garlic",
  ],
  [
    "s8",
    "Margherita Pizza",
    280,
    "Food",
    "🍕",
    "Stone-baked, fresh basil and mozzarella",
  ],
  ["s9", "Peri Peri Fries", 120, "Food", "🍟", "Crisp, spicy and addictive"],
  [
    "s10",
    "Choco Brownie",
    150,
    "Dessert",
    "🍫",
    "Warm, fudgy, with a scoop of vanilla",
  ],
  [
    "s11",
    "Blueberry Cheesecake",
    210,
    "Dessert",
    "🍰",
    "Baked slow, finished with berry compote",
  ],
  ["s12", "Mint Mojito", 140, "Coolers", "🍹", "Lime, mint and sparkling soda"],
  [
    "s13",
    "Lemon Iced Tea",
    120,
    "Coolers",
    "🧊",
    "Black tea, lemon and a hint of honey",
  ],
].map(([id, name, price, cat, e, desc]) => ({ id, name, price, cat, e, desc }));
const S = {
  menu: [],
  orders: [],
  stock: {},
  cart: {},
  cat: "All",
  pay: "counter",
  mine: ls.get("cafe_mine"),
};
let B,
  seen = null;
const menuList = () => (S.menu.length ? S.menu : ST),
  isOut = (i) => !!(S.stock[i.id] && S.stock[i.id].out);
const cartSub = () =>
  Object.entries(S.cart).reduce((a, [id, q]) => {
    const i = menuList().find((x) => x.id === id);
    return a + (i ? i.price * q : 0);
  }, 0);
const route = () => window.PAGE || "customer";
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("s");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("s"), 2600);
}
let AC;
function ping() {
  try {
    const c =
      AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
    if (c.state === "suspended") c.resume();
    const o = c.createOscillator(),
      g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    o.start();
    o.stop(c.currentTime + 0.5);
  } catch (e) {}
}
/* data layer: live shared db when available, else localStorage (syncs across tabs) */
function local() {
  const subs = {},
    rd = (c) => {
      try {
        return JSON.parse(ls.get("cafe_" + c) || "{}");
      } catch (e) {
        return {};
      }
    },
    wr = (c, o) => ls.set("cafe_" + c, JSON.stringify(o)),
    emit = (c) => (subs[c] || []).forEach((f) => f(Object.values(rd(c))));
  addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("cafe_")) emit(e.key.slice(5));
  });
  return {
    mode: "demo",
    sub(c, f) {
      (subs[c] = subs[c] || []).push(f);
      f(Object.values(rd(c)));
      return () => {
        subs[c] = subs[c].filter((x) => x !== f);
      };
    },
    set(c, id, d) {
      const o = rd(c);
      o[id] = { ...d, id };
      wr(c, o);
      emit(c);
    },
    upd(c, id, p) {
      const o = rd(c);
      if (o[id]) {
        Object.assign(o[id], p);
        wr(c, o);
        emit(c);
      }
    },
    del(c, id) {
      const o = rd(c);
      delete o[id];
      wr(c, o);
      emit(c);
    },
  };
}
function remote(db) {
  return {
    mode: "live",
    sub: (c, f) =>
      db.collection(c).onSnapshot(
        (s) => f(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (e) => console.warn(e),
      ),
    set: (c, id, d) => db.collection(c).doc(id).set(d),
    upd: (c, id, p) => db.collection(c).doc(id).update(p),
    del: (c, id) => db.collection(c).doc(id).delete(),
  };
}
const W = async (fn) => {
  try {
    await fn();
  } catch (e) {
    toast("Could not save. Please try again.");
    console.warn(e);
  }
};
/* views */
/* café hours: ordering opens and closes by itself (India time). Owner can override. */
const TZ = "Asia/Kolkata";
const within = (n, o, c) => (o <= c ? n >= o && n < c : n >= o || n < c);
const nowMin = () => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  return (
    +p.find((x) => x.type === "hour").value * 60 +
    +p.find((x) => x.type === "minute").value
  );
};
const mins = (t) => {
  const [h, m] = String(t || "0:0")
    .split(":")
    .map(Number);
  return h * 60 + (m || 0);
};
const fmtT = (t) => {
  const [h, m] = String(t || "0:0")
    .split(":")
    .map(Number);
  return (
    (h % 12 || 12) +
    ":" +
    String(m || 0).padStart(2, "0") +
    " " +
    (h < 12 ? "AM" : "PM")
  );
};
function openState() {
  const h = S.hours;
  if (!h || h.mode === "open") return { open: true };
  if (h.mode === "closed")
    return { open: false, text: "We are closed right now." };
  const open = within(nowMin(), mins(h.open), mins(h.close));
  return {
    open,
    text: open
      ? ""
      : "We are closed right now. We open at " + fmtT(h.open) + ".",
  };
}
const closedBanner = () => {
  const s = openState();
  return s.open
    ? ""
    : `<div class="track" style="border-color:var(--bad)"><b>🔒 ${esc(s.text)}</b><div style="color:var(--mut);font-size:14px">You can browse the menu. Ordering is available during café hours.</div></div>`;
};
function hoursBox() {
  const h = S.hours || { open: "09:00", close: "22:00", mode: "auto" },
    s = openState(),
    L = "font-size:13px;color:var(--mut)";
  return `<div class="box" style="margin-bottom:16px"><div class="row"><h3>🕘 Café hours</h3><span class="tag ${s.open ? "g" : ""}">${s.open ? "Open now" : "Closed now"}</span></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;align-items:flex-end"><div><label style="${L}">Opens</label><input id="hopen" type="time" value="${esc(h.open)}" style="width:auto"></div><div><label style="${L}">Closes</label><input id="hclose" type="time" value="${esc(h.close)}" style="width:auto"></div><div><label style="${L}">Mode</label><select id="hmode" style="width:auto"><option value="auto" ${h.mode === "auto" ? "selected" : ""}>Automatic (by timing)</option><option value="open" ${h.mode === "open" ? "selected" : ""}>Open now (ignore timing)</option><option value="closed" ${h.mode === "closed" ? "selected" : ""}>Closed now</option></select></div><button data-act="hours">Save</button></div><p style="font-size:13px;color:var(--mut);margin:8px 0 0">In Automatic mode, ordering opens and closes by itself at these times (India time). Orders already placed continue as usual.</p></div>`;
}
function card(i) {
  const q = S.cart[i.id] || 0,
    out = isOut(i),
    cl = !openState().open;
  return `<div class="card"><div class="e">${esc(i.e)}</div><h3>${esc(i.name)}</h3><p>${esc(i.desc)}</p><div class="row"><span class="price">${inr(i.price)}</span>${cl ? '<span class="sold">Closed</span>' : out ? '<span class="sold">Sold out</span>' : q ? `<div class="qty"><button data-act="dec" data-id="${i.id}">−</button><b>${q}</b><button data-act="inc" data-id="${i.id}">+</button></div>` : `<button data-act="inc" data-id="${i.id}">Add</button>`}</div></div>`;
}
const STEPS = ["new", "preparing", "ready", "served"],
  LBL = ["Received", "Cooking", "Ready!", "Served"];
function track(o) {
  const k = STEPS.indexOf(o.status);
  return `<div class="track"><div class="row"><b>Order #${esc(o.id.slice(-4))} · Table ${esc(o.table)}</b><span style="display:flex;gap:6px"><button class="ghost" data-act="receipt">🧾 Receipt</button>${["served", "cancelled"].includes(o.status) ? '<button class="ghost" data-act="clear">Dismiss</button>' : ""}</span></div><div style="color:var(--mut);font-size:14px">${{ pending: "Waiting for the cafe to confirm your UPI payment…", cancelled: "We could not confirm your payment. Please check with the counter.", ready: "Your order is ready — it’s on its way!", served: "Enjoy your meal 💛" }[o.status] || "We’re on it. This updates live."}</div><div class="steps">${LBL.map((l, i) => `<div class="${i <= k ? "d" : ""}">${l}</div>`).join("")}</div></div>`;
}
function vCust() {
  const items = menuList().filter((i) => S.cat === "All" || i.cat === S.cat),
    n = Object.values(S.cart).reduce((a, b) => a + b, 0),
    mine = S.orders.find((o) => o.id === S.mine);
  return `${mine ? track(mine) + notifBtn() : ""}${closedBanner()}<section class="hero"><h1>What are you craving today?</h1><p>Browse the menu, add to your order and we’ll bring it to your table.</p></section><div class="chips">${CATS.map((c) => `<button class="chip ${c === S.cat ? "on" : ""}" data-act="cat" data-v="${c}">${c}</button>`).join("")}</div><div class="grid">${items.map(card).join("")}</div>${n && openState().open ? `<button class="cartbar" data-act="checkout"><span>${n} item${n > 1 ? "s" : ""}</span><b>View order · ${inr(cartSub())}</b></button>` : ""}`;
}
function oc(o) {
  const m = Math.floor((Date.now() - o.ts) / 60000),
    nx = {
      new: "Start cooking",
      preparing: "Mark ready",
      ready: "Mark served",
    }[o.status];
  return `<div class="oc ${m > 10 && o.status !== "ready" ? "late" : ""}"><div class="row"><b>#${esc(o.id.slice(-4))} · Table ${esc(o.table)}</b><span class="tag">${m < 1 ? "just now" : m + " min"}</span></div><div style="font-size:13px;color:var(--mut)">${esc(o.name)} · <span class="tag ${o.paid ? "g" : ""}">${o.paid ? "Paid " + esc(o.pay.toUpperCase()) : o.pay === "upi" ? "⚠ UPI payment to verify" : "Pay at counter"}</span></div><ul>${(o.items || []).map((x) => `<li><b>${x.q}×</b> ${esc(x.n)}</li>`).join("")}</ul>${o.note ? `<div style="font-size:13px">📝 ${esc(o.note)}</div>` : ""}${o.pay === "upi" && !o.paid ? `<button style="width:100%;margin-top:8px;background:var(--ok)" data-act="paid" data-id="${o.id}">✓ Payment received</button>` : ""}<button style="width:100%;margin-top:8px" data-act="adv" data-id="${o.id}">${nx}</button></div>`;
}
function vChef() {
  const col = (st, t) => {
    const l = S.orders
      .filter((o) => o.status === st)
      .sort((a, b) => a.ts - b.ts);
    return `<div class="col"><h3>${t} <span class="badge">${l.length}</span></h3>${l.map(oc).join("") || '<p class="empty">Nothing here</p>'}</div>`;
  };
  return `<h2 style="margin-bottom:12px">Kitchen board</h2>${notifBtn()}<div class="kan">${col("new", "New")}${col("preparing", "Cooking")}${col("ready", "Ready to serve")}</div><h3 style="margin-bottom:6px">Item availability</h3><p style="color:var(--mut);font-size:14px;margin:0 0 8px">Tap an item to mark it sold out. Customers see it instantly.</p><div class="chips" style="flex-wrap:wrap">${menuList()
    .map(
      (i) =>
        `<button class="chip ${isOut(i) ? "out" : ""}" data-act="stock" data-id="${i.id}">${esc(i.e)} ${esc(i.name)}</button>`,
    )
    .join("")}</div>`;
}
/* free WhatsApp: opens a chat with the customer and a ready-made thanks + receipt message */
const waLink = (o) => {
  const L = (o.items || [])
    .map((x) => x.q + "× " + x.n + " – " + inr(x.p * x.q))
    .join("\n");
  const t =
    "Hi " +
    o.name +
    "! ☕ Thank you for visiting Brew & Bite Café.\n\n🧾 Receipt – Order #" +
    o.id.slice(-4) +
    " (Table " +
    o.table +
    ")\n" +
    L +
    "\nSubtotal: " +
    inr(o.sub) +
    "\nGST (5%): " +
    inr(o.gst) +
    "\nTotal: " +
    inr(o.total) +
    "\nPayment: " +
    (o.pay === "upi" ? "Paid via UPI" : "Paid at counter") +
    "\n\nWe hope to see you again soon! 💛";
  return (
    "https://wa.me/91" +
    String(o.phone || "")
      .replace(/\D/g, "")
      .slice(-10) +
    "?text=" +
    encodeURIComponent(t)
  );
};
const waBtn = (x) =>
  x.waOptIn && x.status === "served"
    ? `<button data-act="wa" data-id="${x.id}" style="padding:3px 8px;font-size:12px;margin-left:6px">${x.waSent ? "💬 Resend" : "💬 WhatsApp"}</button>`
    : "";
function pendingBox() {
  const p = S.orders
    .filter((o) => o.status === "pending")
    .sort((a, b) => a.ts - b.ts);
  if (!p.length) return "";
  return `<div class="box" style="border:2px solid var(--warn);margin-bottom:16px"><h3>💳 UPI payments to confirm <span class="badge">${p.length}</span></h3><p style="font-size:13px;color:var(--mut);margin:4px 0 10px">Open the FamPay app, check the amount, then confirm.</p>${p.map((o) => `<div class="oc"><div class="row"><b>#${esc(o.id.slice(-4))} · ${esc(o.name)} · ${inr(o.total)}</b><span class="tag">Table ${esc(o.table)}</span></div><div style="font-size:13px;color:var(--mut)">📞 ${esc(o.phone || "")} · ${(o.items || []).map((x) => x.q + "× " + esc(x.n)).join(", ")}</div><div class="row" style="margin-top:8px;gap:8px"><button style="flex:1" data-act="paid" data-id="${o.id}">✓ Payment received</button><button class="ghost" data-act="payno" data-id="${o.id}">Not received</button></div></div>`).join("")}</div>`;
}
function vOwner() {
  const o = S.orders,
    rev = o.filter((x) => x.paid).reduce((a, x) => a + x.total, 0),
    all = o.reduce((a, x) => a + x.total, 0),
    tally = {},
    pays = { counter: 0, upi: 0, card: 0 };
  o.forEach((x) => {
    pays[x.pay] = (pays[x.pay] || 0) + 1;
    (x.items || []).forEach((i) => (tally[i.n] = (tally[i.n] || 0) + i.q));
  });
  const top = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
    mx = top.length ? top[0][1] : 1,
    rec = [...o].sort((a, b) => b.ts - a.ts).slice(0, 12);
  return `<h2 style="margin-bottom:12px">Owner dashboard</h2>${pendingBox()}${hoursBox()}<div class="stats"><div class="stat"><b>${inr(rev)}</b><span>Revenue collected</span></div><div class="stat"><b>${o.length}</b><span>Total orders</span></div><div class="stat"><b>${inr(o.length ? Math.round(all / o.length) : 0)}</b><span>Average order</span></div><div class="stat"><b>${o.filter((x) => !["served", "cancelled", "pending"].includes(x.status)).length}</b><span>Open orders</span></div></div>
<div class="two"><div class="box"><h3>Top sellers</h3>${top.map(([n, q]) => `<div class="row" style="font-size:14px"><span>${esc(n)}</span><b>${q}</b></div><div class="bar" style="width:${Math.round((q / mx) * 100)}%"></div>`).join("") || '<p class="empty">No sales yet</p>'}</div>
<div class="box"><h3>Payments</h3>${Object.entries(pays)
    .map(
      ([k, v]) =>
        `<div class="ln"><span>${{ counter: "At counter", upi: "UPI", card: "Card" }[k]}</span><b>${v}</b></div>`,
    )
    .join("")}</div></div>
<div class="box" style="margin-bottom:18px"><h3 style="margin-bottom:8px">Recent orders</h3><div class="tw"><table><tr><th>#</th><th>Guest</th><th>Phone</th><th>Table</th><th>Total</th><th>Payment</th><th>Status</th></tr>${rec.map((x) => `<tr><td>${esc(x.id.slice(-4))}</td><td>${esc(x.name)}</td><td>${esc(x.phone || "—")}</td><td>${esc(x.table)}</td><td>${inr(x.total)}</td><td>${x.paid ? "Paid" : "Due"} · ${esc(x.pay)}${x.pay === "upi" && !x.paid ? ` <button data-act="paid" data-id="${x.id}" style="padding:3px 8px;font-size:12px">✓ Received</button>` : ""}</td><td>${esc(x.status)}${waBtn(x)}</td></tr>`).join("") || '<tr><td colspan="7" class="empty">No orders yet</td></tr>'}</table></div></div>
<div class="box"><div class="row" style="margin-bottom:10px"><h3>Menu manager</h3>${S.menu.length ? "" : '<button data-act="seed">Load starter menu</button>'}</div>${
    S.menu.length
      ? S.menu
          .map(
            (i) =>
              `<div class="mrow"><input data-f="e" data-id="${i.id}" value="${esc(i.e)}"><input data-f="name" data-id="${i.id}" value="${esc(i.name)}"><input type="number" min="0" data-f="price" data-id="${i.id}" value="${i.price}"><select data-f="cat" data-id="${i.id}">${CATS.slice(
                1,
              )
                .map(
                  (c) =>
                    `<option ${c === i.cat ? "selected" : ""}>${c}</option>`,
                )
                .join(
                  "",
                )}</select><button class="ghost" data-act="stock" data-id="${i.id}">${isOut(i) ? "Sold out" : "In stock"}</button><button class="del" data-act="del" data-id="${i.id}">✕</button></div>`,
          )
          .join("")
      : '<p class="empty">Customers currently see a starter menu. Load it here to edit prices and items.</p>'
  }
<h3 style="margin:14px 0 6px;font-size:16px">Add an item</h3><div class="mrow"><input id="ne" placeholder="🍩" maxlength="4"><input id="nn" placeholder="Item name"><input id="np" type="number" min="0" placeholder="₹"><select id="nc">${CATS.slice(
    1,
  )
    .map((c) => `<option>${c}</option>`)
    .join("")}</select><button data-act="add">Add</button></div></div>`;
}
const ss = {
  get: (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set: (k, v) => {
    try {
      sessionStorage.setItem(k, v);
    } catch (e) {}
  },
};
/* staff PINs: change these before opening the cafe */
const PINS = { chef: "1234", owner: "4321" };
/* The owner login also opens the chef page; the chef login opens only the chef page. */
const authed = () => {
  const r = route();
  if (!PINS[r]) return true;
  if (FB) {
    const u = FB.auth.currentUser,
      E = window.STAFF_EMAILS || {};
    return !!u && (u.email === E[r] || u.email === E.owner);
  }
  return (
    ss.get("cafe_auth_" + r) === "1" ||
    (r === "chef" && ss.get("cafe_auth_owner") === "1")
  );
};
const vLock = () =>
  `<div class="box" style="max-width:340px;margin:60px auto;text-align:center"><h2>🔒 ${route() === "chef" ? "Kitchen" : "Owner"} login</h2><p style="color:var(--mut)">${FB ? "Enter your staff password." : "Enter the staff PIN to continue."}</p><input id="pin" type="password" ${FB ? "" : 'inputmode="numeric"'} maxlength="64" placeholder="${FB ? "Password" : "PIN"}" style="text-align:center;margin:10px 0"><button style="width:100%" data-act="unlock">Unlock</button></div>`;
function render() {
  const r = route(),
    a = document.activeElement;
  if (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName) && $("#view").contains(a))
    return;
  const lb = $("#lockbtn");
  if (lb) lb.hidden = !PINS[r] || !authed();
  $("#view").innerHTML = authed()
    ? { customer: vCust, chef: vChef, owner: vOwner }[r]()
    : vLock();
}
/* receipt */
function receipt(o) {
  const pm =
      { counter: "Pay at counter", upi: "UPI", card: "Card" }[o.pay] || o.pay,
    L = (a, b, c = "") =>
      `<div class="ln ${c}"><span>${a}</span><span>${b}</span></div>`;
  $("#modal").innerHTML =
    `<div class="sheet"><div id="receipt"><div style="text-align:center"><h2>☕ Brew & Bite Café</h2><div style="color:var(--mut);font-size:13px">Customer receipt</div></div>${L("Order #" + esc(o.id.slice(-4)), new Date(o.ts).toLocaleString("en-IN"))}<div style="font-size:14px;color:var(--mut)">${esc(o.name)} · ${esc(o.phone || "")} · Table ${esc(o.table)}</div><hr style="border:0;border-top:1px dashed var(--line);margin:10px 0">${(o.items || []).map((x) => L(x.q + " × " + esc(x.n), inr(x.p * x.q))).join("")}${L("Subtotal", inr(o.sub))}${L("GST (5%)", inr(o.gst))}${L("Total", inr(o.total), "tot")}${L("Payment", pm + " · " + (o.paid ? "Paid" : o.pay === "upi" ? "Awaiting confirmation" : "Due at counter"))}<p style="text-align:center;color:var(--mut);font-size:13px;margin:12px 0 0">Thank you for visiting! 💛</p></div><div class="row noprint" style="margin-top:14px"><button class="ghost" data-act="close">Close</button><button data-act="print">🖨️ Print / Save as PDF</button></div></div>`;
  $("#modal").classList.add("open");
}
/* checkout */

function mcart() {
  const sub = cartSub(),
    gst = Math.round(sub * 0.05);
  $("#mcart").innerHTML =
    Object.entries(S.cart)
      .map(([id, q]) => {
        const i = menuList().find((x) => x.id === id);
        return i
          ? `<div class="ln"><span>${esc(i.name)}</span><div class="qty"><button data-act="dec" data-id="${id}">−</button><b>${q}</b><button data-act="inc" data-id="${id}">+</button><span style="min-width:62px;text-align:right">${inr(i.price * q)}</span></div></div>`
          : "";
      })
      .join("") +
    `<div class="ln"><span style="color:var(--mut)">GST (5%)</span><span>${inr(gst)}</span></div><div class="ln tot"><span>Total</span><span>${inr(sub + gst)}</span></div>`;
  const b = $("#pbtn");
  if (b)
    b.textContent =
      S.pay === "upi"
        ? `I’ve paid ${inr(sub + gst)} · Place order`
        : "Place order";
}
const UPI = () =>
  window.UPI && window.UPI.id && !/yourname/i.test(window.UPI.id)
    ? window.UPI
    : null;
const upiLink = (amt) => {
  const u = UPI();
  return u
    ? "upi://pay?pa=" +
        encodeURIComponent(u.id) +
        "&pn=" +
        encodeURIComponent(u.name || "Cafe") +
        "&am=" +
        amt +
        "&cu=INR&tn=" +
        encodeURIComponent("Cafe order")
    : "";
};
function ppanel() {
  const sub = cartSub(),
    amt = sub + Math.round(sub * 0.05),
    u = UPI();
  $("#ppanel").innerHTML =
    S.pay === "counter"
      ? "Pay at the counter when your order is ready. Cash, UPI or card accepted."
      : !u
        ? "UPI is not set up yet. Please choose Pay at counter."
        : `Scan with any UPI app and pay <b>${inr(amt)}</b><div id="upiqr" style="background:#fff;padding:8px;width:fit-content;margin:8px auto;border-radius:8px"></div><div>${esc(u.name || "")} · ${esc(u.id)}</div><a href="${esc(upiLink(amt))}" style="display:inline-block;margin-top:8px;color:var(--acc);font-weight:600">Pay with a UPI app on this phone</a><br><small>After paying, tap “I’ve paid” below. The cafe will confirm your payment.</small>`;
  if (S.pay === "upi" && u && typeof QRCode !== "undefined" && $("#upiqr"))
    new QRCode($("#upiqr"), {
      text: upiLink(amt),
      width: 150,
      height: 150,
      correctLevel: QRCode.CorrectLevel.M,
    });
  document
    .querySelectorAll(".pays button")
    .forEach((b) => b.classList.toggle("on", b.dataset.v === S.pay));
  mcart();
}
function checkout() {
  if (!Object.keys(S.cart).length) return;
  if (!openState().open) return toast("Sorry, we are closed right now.");
  S.pay = "counter";
  $("#modal").innerHTML =
    `<div class="sheet"><div class="row"><h2>Your order</h2><button class="ghost" data-act="close">✕</button></div><div id="mcart"></div><label>Your name</label><input id="cn" placeholder="e.g. Ahesan" maxlength="30"><label>Mobile number</label><input id="cph" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"><label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--ink)"><input id="cwa" type="checkbox" style="width:auto"> Send my thanks and receipt on WhatsApp</label><label>Table number</label><select id="ct">${Array.from({ length: 20 }, (_, i) => `<option>${i + 1}</option>`).join("")}</select><label>Notes for the chef (optional)</label><textarea id="cnote" rows="2" maxlength="140" placeholder="Less sugar, extra spicy…"></textarea><label>Payment</label><div class="pays"><button data-act="pay" data-v="counter">Pay at counter</button><button data-act="pay" data-v="upi">UPI</button></div><div class="panel" id="ppanel"></div><button id="pbtn" style="width:100%;margin-top:14px;padding:14px" data-act="place"></button></div>`;
  $("#modal").classList.add("open");
  ppanel();
  const tb = +new URLSearchParams(location.search).get("table");
  if (tb >= 1 && tb <= 20) $("#ct").value = String(tb);
}
async function place() {
  if (!openState().open) return toast("Sorry, we are closed right now.");
  const name = $("#cn").value.trim();
  if (!name) return toast("Please enter your name");
  const phone = $("#cph").value.replace(/\D/g, "");
  if (!/^\d{10}$/.test(phone))
    return toast("Enter a valid 10-digit mobile number");

  const b = $("#pbtn");
  b.disabled = true;
  b.textContent = "Placing…";
  await sleep(300);
  const sub = cartSub(),
    gst = Math.round(sub * 0.05),
    id =
      "o" +
      (crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : Date.now() + Math.random().toString(36).slice(2)),
    items = Object.entries(S.cart)
      .map(([k, q]) => {
        const i = menuList().find((x) => x.id === k);
        return i ? { n: i.name, p: i.price, q } : null;
      })
      .filter(Boolean);
  const order = {
    name,
    phone,
    waOptIn: !!($("#cwa") && $("#cwa").checked),
    table: $("#ct").value,
    note: $("#cnote").value.trim(),
    pay: S.pay,
    paid: false,
    status: S.pay === "upi" ? "pending" : "new",
    ts: Date.now(),
    sub,
    gst,
    total: sub + gst,
    items,
  };
  try {
    await B.set("orders", id, order);
  } catch (e) {
    b.disabled = false;
    mcart();
    return toast("Could not place the order. Please try again.");
  }
  S.mine = id;
  ls.set("cafe_mine", id);
  S.cart = {};
  startOrders();
  render();
  receipt({ ...order, id });
  toast(
    order.status === "pending"
      ? "Order sent! Waiting for payment confirmation."
      : "Order placed! 🎉",
  );
}
/* events */
document.addEventListener("click", async (e) => {
  if (e.target.id === "modal") return $("#modal").classList.remove("open");
  const t = e.target.closest("[data-act]");
  if (!t) return;
  const a = t.dataset.act,
    id = t.dataset.id,
    m = menuList().find((x) => x.id === id);
  if (a === "cat") {
    S.cat = t.dataset.v;
    render();
  } else if (a === "inc" || a === "dec") {
    const q = Math.max(0, (S.cart[id] || 0) + (a === "inc" ? 1 : -1));
    q ? (S.cart[id] = q) : delete S.cart[id];
    render();
    if ($("#mcart") && $("#modal").classList.contains("open")) {
      Object.keys(S.cart).length
        ? ppanel()
        : $("#modal").classList.remove("open");
    }
  } else if (a === "checkout") checkout();
  else if (a === "close") $("#modal").classList.remove("open");
  else if (a === "pay") {
    S.pay = t.dataset.v;
    ppanel();
  } else if (a === "place") place();
  else if (a === "clear") {
    S.mine = null;
    ls.set("cafe_mine", "");
    render();
  } else if (a === "adv") {
    const o = S.orders.find((x) => x.id === id),
      n = STEPS[STEPS.indexOf(o.status) + 1];
    if (n)
      W(() =>
        B.upd(
          "orders",
          id,
          n === "served" && o.pay === "counter"
            ? { status: n, paid: true }
            : { status: n },
        ),
      );
  } else if (a === "stock" && m)
    W(() => B.set("stock", id, { out: !isOut(m) }));
  else if (a === "seed")
    W(async () => {
      for (const i of ST) await B.set("menu", i.id, i);
    });
  else if (a === "del") W(() => B.del("menu", id));
  else if (a === "add") {
    const n = $("#nn").value.trim(),
      p = Number($("#np").value);
    if (!n || !(p > 0)) return toast("Enter a name and a price");
    const k = "m" + Date.now();
    W(() =>
      B.set("menu", k, {
        name: n,
        price: p,
        cat: $("#nc").value,
        e: $("#ne").value || "🍽️",
        desc: "House special",
      }),
    ).then(() => toast("Item added"));
  }
});
document.addEventListener("change", (e) => {
  const t = e.target,
    f = t.dataset.f;
  if (!f) return;
  const i = S.menu.find((x) => x.id === t.dataset.id);
  if (!i) return;
  const v = f === "price" ? Math.max(0, Number(t.value) || 0) : t.value;
  W(() => B.set("menu", i.id, { ...i, [f]: v })).then(() => {
    toast("Saved");
    t.blur();
    render();
  });
});
/* boot */
/* Firebase (used when firebase-config.js has your config) */
let FB = null,
  unOrd = null,
  lastSt = null;
async function initFB(cfg) {
  const u = "https://www.gstatic.com/firebasejs/10.12.2/",
    [A, F, U] = await Promise.all([
      import(u + "firebase-app.js"),
      import(u + "firebase-firestore.js"),
      import(u + "firebase-auth.js"),
    ]),
    app = A.initializeApp(cfg),
    db = F.getFirestore(app),
    auth = U.getAuth(app);
  FB = { U, auth };
  const un = (c) => c.docs.map((d) => ({ ...d.data(), id: d.id }));
  return {
    mode: "live",
    sub: (c, f, id) =>
      id
        ? F.onSnapshot(
            F.doc(db, c, id),
            (s) => f(s.exists() ? [{ ...s.data(), id: s.id }] : []),
            (e) => console.warn(e),
          )
        : F.onSnapshot(
            F.collection(db, c),
            (s) => f(un(s)),
            (e) => console.warn(e),
          ),
    set: (c, id, d) => F.setDoc(F.doc(db, c, id), d),
    upd: (c, id, p) => F.updateDoc(F.doc(db, c, id), p),
    del: (c, id) => F.deleteDoc(F.doc(db, c, id)),
  };
}
/* alerts: beep + vibration + toast, and a system notification when the tab is in the background */
function notify(title, body, tag) {
  ping();
  toast(title);
  try {
    navigator.vibrate && navigator.vibrate([200, 100, 200]);
  } catch (e) {}
  if (
    !document.hidden ||
    !window.Notification ||
    Notification.permission !== "granted"
  )
    return;
  const o = { body, tag: tag || "cafe", data: { url: location.pathname } },
    fb = () => {
      try {
        new Notification(title, o);
      } catch (e) {}
    };
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistration)
    navigator.serviceWorker
      .getRegistration()
      .then((r) => (r ? r.showNotification(title, o) : fb()))
      .catch(fb);
  else fb();
}
function trackMine(l) {
  if (route() !== "customer") return;
  const m = l.find((o) => o.id === S.mine);
  if (!m) {
    lastSt = null;
    return;
  }
  if (lastSt && lastSt !== m.status) {
    const n = "#" + m.id.slice(-4);
    if (m.status === "ready")
      notify(
        "Your order is ready! ☕",
        "Order " + n + " is on its way to your table.",
        m.id,
      );
    else if (m.status === "new" && lastSt === "pending")
      notify(
        "Payment confirmed ✓",
        "Order " + n + " is now with the kitchen.",
        m.id,
      );
    else if (m.status === "cancelled")
      notify("Payment not confirmed", "Please check with the counter.", m.id);
  }
  lastSt = m.status;
}
const notifBtn = () =>
  window.Notification && Notification.permission === "default"
    ? '<button class="ghost" data-act="notif" style="margin:10px 0">🔔 Turn on notifications</button>'
    : "";
function startOrders() {
  if (unOrd) {
    unOrd();
    unOrd = null;
  }
  seen = null;
  lastSt = null;
  const staff = !!PINS[route()],
    live = B.mode === "live" && FB;
  if (live && staff && !authed()) {
    S.orders = [];
    return;
  }
  if (live && !staff && !S.mine) {
    S.orders = [];
    render();
    return;
  }
  unOrd = B.sub(
    "orders",
    (l) => {
      const want = { chef: "new", owner: "pending" }[route()];
      if (seen && want && l.some((o) => !seen.has(o.id) && o.status === want)) {
        notify(
          want === "pending" ? "UPI payment to confirm" : "New order!",
          "Open the app to see the details.",
          "new-order",
        );
      }
      seen = new Set(l.map((o) => o.id));
      S.orders = l;
      trackMine(l);
      render();
    },
    live && !staff ? S.mine : undefined,
  );
}
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("sw.js").catch(() => {});
(async () => {
  if (window.FIREBASE_CONFIG) {
    try {
      B = await initFB(window.FIREBASE_CONFIG);
    } catch (e) {
      console.warn(e);
      toast("Firebase connect failed. Using demo mode.");
    }
  }
  if (!B) {
    let db = null;
    try {
      if (window.claude)
        db = await Promise.race([
          claude.use("db"),
          sleep(3000).then(() => null),
        ]);
    } catch (e) {}
    B = db ? remote(db) : local();
  }
  $("#mode").textContent = B.mode === "live" ? "● Live orders" : "● Demo mode";
  B.sub("menu", (l) => {
    S.menu = l;
    render();
  });
  B.sub("stock", (l) => {
    S.stock = Object.fromEntries(l.map((x) => [x.id, x]));
    render();
  });
  B.sub("settings", (l) => {
    S.hours = l.find((x) => x.id === "hours") || null;
    render();
  });
  if (FB)
    FB.U.onAuthStateChanged(FB.auth, () => {
      startOrders();
      render();
    });
  else startOrders();
  addEventListener("hashchange", render);
  setInterval(() => {
    if (route() === "chef") render();
    else if (route() === "customer") {
      const o = openState().open;
      if (o !== window._wasOpen) {
        window._wasOpen = o;
        render();
      }
    }
  }, 30000);
})();
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act]");
  if (!t) return;
  const k = "cafe_auth_" + route(),
    r = route();
  if (t.dataset.act === "unlock") {
    const v = $("#pin").value;
    if (FB)
      FB.U.signInWithEmailAndPassword(
        FB.auth,
        (window.STAFF_EMAILS || {})[r] || "",
        v,
      ).catch(() => {
        toast("Wrong password");
        $("#pin").value = "";
      });
    else if (v === PINS[r]) {
      ss.set(k, "1");
      render();
    } else {
      toast("Wrong PIN");
      $("#pin").value = "";
    }
  } else if (t.dataset.act === "lock") {
    if (FB) FB.U.signOut(FB.auth);
    else {
      ss.set(k, "");
      render();
    }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "pin")
    $("[data-act=unlock]").click();
});
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act]");
  if (!t) return;
  if (t.dataset.act === "receipt") {
    const o = S.orders.find((x) => x.id === S.mine);
    if (o) receipt(o);
  } else if (t.dataset.act === "print") window.print();
});
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act=paid]");
  if (t)
    W(() => {
      const o = S.orders.find((x) => x.id === t.dataset.id);
      return B.upd(
        "orders",
        t.dataset.id,
        o && o.status === "pending"
          ? { paid: true, status: "new" }
          : { paid: true },
      );
    }).then(() => toast("Payment marked as received"));
});
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act=payno]");
  if (t)
    W(() => B.upd("orders", t.dataset.id, { status: "cancelled" })).then(() =>
      toast("Order cancelled"),
    );
});
document.addEventListener("click", (e) => {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
  } catch (x) {}
  if (!e.target.closest("[data-act=notif]")) return;
  if (!window.Notification)
    return toast("Notifications are not supported on this device");
  Notification.requestPermission().then((p) => {
    render();
    toast(
      p === "granted"
        ? "Notifications are on 🔔"
        : "Notifications are blocked in your browser settings",
    );
  });
});
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act=wa],[data-act=adv]");
  if (!t) return;
  const o = S.orders.find((x) => x.id === t.dataset.id);
  if (!o || !o.waOptIn) return;
  if (t.dataset.act === "adv" && !(o.status === "ready" && !o.waSent)) return;
  window.open(waLink(o), "_blank", "noopener");
  toast("WhatsApp opened. Tap Send.");
  W(() => B.upd("orders", o.id, { waSent: true }));
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-act=hours]")) return;
  const o = $("#hopen").value,
    c = $("#hclose").value,
    m = $("#hmode").value;
  if (m === "auto" && (!o || !c)) return toast("Please set both times");
  W(() => B.set("settings", "hours", { open: o, close: c, mode: m })).then(() =>
    toast("Café hours saved"),
  );
});
