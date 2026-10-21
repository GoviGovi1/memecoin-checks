(function () {
  var data = null, filter = "all";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function money(n) {
    if (n == null) return "–";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "k";
    return "$" + n.toFixed(0);
  }
  function price(p) {
    if (p == null) return "–";
    if (p >= 1) return "$" + p.toFixed(4);
    var s = p.toPrecision(4);
    if (p < 1e-6) return "$" + p.toExponential(3);
    return "$" + Number(s).toString();
  }
  function pct(n, d) { return n == null ? "–" : n.toFixed(d == null ? 1 : d) + "%"; }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
    var m = Math.floor(s / 60); if (m < 60) return m + " min ago";
    var h = Math.floor(m / 60); if (h < 24) return h + " h ago";
    var d = Math.floor(h / 24); return d + (d === 1 ? " day ago" : " days ago");
  }
  function kv(k, v, cls) { return '<div class="kv"><span class="k">' + k + '</span><span class="v ' + (cls || "") + '">' + v + '</span></div>'; }
  function card(t) {
    var chips = '<span class="chip ' + t.chain + '">' + (t.chain === "bsc" ? "BNB" : "SOL") + "</span>";
    var checks = kv("LP locked", pct(t.lp_locked_pct, 0), t.lp_locked_pct >= 90 ? "good" : "bad") +
                 kv("Top 10", pct(t.top10_pct), t.top10_pct <= 15 ? "good" : "mid");
    if (t.chain === "bsc") {
      var tax = Math.max(t.buy_tax || 0, t.sell_tax || 0);
      checks += kv("Honeypot", t.honeypot ? "YES" : "No", t.honeypot ? "bad" : "good") +
                kv("Tax buy/sell", (t.buy_tax == null ? "–" : t.buy_tax.toFixed(0)) + " / " + (t.sell_tax == null ? "–" : t.sell_tax.toFixed(0)) + "%", tax > 5 ? "mid" : "good");
    } else {
      checks += kv("Insiders", t.insiders == null ? "–" : String(t.insiders), t.insiders ? "bad" : "good") +
                kv("Risk score", t.risk_score == null ? "–" : String(t.risk_score), t.risk_score > 20 ? "mid" : "good");
    }
    var paper = '<span class="paper muted">Not traded</span>';
    if (t.paper) {
      var p = t.paper, cls = p.pnl_pct > 0 ? "good" : p.pnl_pct < 0 ? "bad" : "";
      paper = '<span class="paper ' + cls + '">' + (p.status === "open" ? "Open " : "Closed ") +
              (p.pnl_pct > 0 ? "+" : "") + p.pnl_pct.toFixed(1) + "%</span>";
    }
    return '<article class="tok">' +
      '<div class="row"><span class="sym">' + esc(t.symbol) + "</span>" + chips +
      '<span class="when" title="' + esc(t.ts) + '">' + ago(t.ts) + "</span></div>" +
      '<div class="ca"><code>' + esc(t.address) + '</code><button class="copy" data-ca="' + esc(t.address) + '">Copy</button></div>' +
      '<div class="grid">' + kv("Price at pass", price(t.price)) + kv("Liquidity", money(t.liquidity_usd)) + checks + "</div>" +
      '<div class="bottom">' + paper + '<a class="dex" href="' + esc(t.dex_url) + '" target="_blank" rel="noopener">DexScreener ↗</a></div>' +
      "</article>";
  }
  function render() {
    if (!data) return;
    var r = data.record;
    $("r-wl").textContent = r.wins + " / " + r.losses;
    $("r-pnl").textContent = (r.realized_usd >= 0 ? "+$" : "−$") + Math.abs(r.realized_usd).toFixed(2);
    $("r-pnl").className = "n " + (r.realized_usd >= 0 ? "good" : "bad");
    $("r-open").textContent = r.open;
    var list = data.passes.filter(function (t) { return filter === "all" || t.chain === filter; });
    $("list").innerHTML = list.length ? list.map(card).join("") :
      '<p class="muted">No passes yet' + (filter === "bsc" ? " on BNB Chain" : filter === "solana" ? " on Solana" : "") + ". Most tokens fail the checks.</p>";
    $("updated").textContent = "Updated " + ago(data.generated) + " · paper trades of $" + r.ticket_usd + " each · " + r.closed + " closed";
  }
  function copy(text) {
    var done = function () { var t = $("toast"); t.hidden = false; clearTimeout(copy.t); copy.t = setTimeout(function () { t.hidden = true; }, 1200); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, text.length);
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".copy"); if (b) { copy(b.getAttribute("data-ca")); return; }
    var t = e.target.closest(".tab");
    if (t) { filter = t.getAttribute("data-f"); document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("on", x === t); }); render(); }
  });
  function load() {
    fetch("passes.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (d) { data = d; render(); })
      .catch(function () { if (!data) $("list").innerHTML = '<p class="muted">Could not load data. Pull to refresh.</p>'; });
  }
  load();
  setInterval(load, 60000);
  setInterval(render, 30000);
})();
