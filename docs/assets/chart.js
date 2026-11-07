/* Plain Earnings — shared interactive Sankey engine.
   Driven by a REPORT object embedded in each report page (window.REPORT).
   Same structure as the approved Microsoft FY27 Q1 prototype: hover/tap traces
   a dollar's full path, click pins a block and updates the explanation panel.
   Do not edit per report — the data model is the only thing that changes. */
(function () {
  var R = window.REPORT;
  if (!R) return;
  var SVGNS = "http://www.w3.org/2000/svg";
  var REV = R.revenueB;
  var NODES = R.nodes, COLS = R.cols, LINKS = R.links, CAPTIONS = R.captions;

  function mix(hex, w) {
    var h = hex.replace("#", ""), r = parseInt(h.substr(0, 2), 16),
        g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    r = Math.round(r + (255 - r) * w); g = Math.round(g + (255 - g) * w); b = Math.round(b + (255 - b) * w);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  window.__peMix = mix; /* available to pages that build links client-side (unused today) */

  /* ---------------- layout ---------------- */
  var COLX = [250, 470, 690, 910, 1210], BARW = 18;
  var TOP = 70, AVAIL = 484, GAPBUDGET = 8;
  var K = (AVAIL - GAPBUDGET) / REV;
  var POS = {};
  COLS.forEach(function (ids) {
    var total = ids.reduce(function (a, id) { return a + NODES[id].value; }, 0);
    var extra = AVAIL - total * K;
    var y = TOP + (ids.length === 1 ? extra / 2 : 0);
    var gap = ids.length > 1 ? extra / (ids.length - 1) : 0;
    ids.forEach(function (id) {
      var h = NODES[id].value * K;
      POS[id] = { y0: y, y1: y + h };
      y += h + gap;
    });
  });
  var colOrder = {};
  COLS.forEach(function (ids) { ids.forEach(function (id, i) { colOrder[id] = i; }); });
  var outOff = {}, inOff = {};
  LINKS.slice().sort(function (a, b) { return colOrder[a.d] - colOrder[b.d]; }).forEach(function (l) {
    l.sy = (outOff[l.s] || 0); outOff[l.s] = l.sy + l.v * K;
  });
  LINKS.slice().sort(function (a, b) { return colOrder[a.s] - colOrder[b.s]; }).forEach(function (l) {
    l.ty = (inOff[l.d] || 0); inOff[l.d] = l.ty + l.v * K;
  });

  /* ---------------- render ---------------- */
  var svg = document.getElementById("chart");
  if (!svg) return;
  function el(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function ribbon(x0, y0, y1, x1, y2, y3) {
    var mx = (x0 + x1) / 2;
    return "M" + x0 + "," + y0 + " C" + mx + "," + y0 + " " + mx + "," + y2 + " " + x1 + "," + y2 +
           " L" + x1 + "," + y3 + " C" + mx + "," + y3 + " " + mx + "," + y1 + " " + x0 + "," + y1 + " Z";
  }
  var flowEls = {}, barEls = {}, lblEls = {};

  LINKS.forEach(function (l) {
    var sp = POS[l.s], dp = POS[l.d];
    var p = el("path", {
      d: ribbon(COLX[NODES[l.s].col] + BARW, sp.y0 + l.sy, sp.y0 + l.sy + l.v * K,
                COLX[NODES[l.d].col], dp.y0 + l.ty, dp.y0 + l.ty + l.v * K),
      fill: l.c, "class": "flow", tabindex: "-1",
      "aria-label": NODES[l.s].name + " to " + NODES[l.d].name + ": " + (l.amt || ("$" + l.v.toFixed(1) + "B"))
    });
    p._link = l;
    svg.appendChild(p);
    flowEls[l.s + ">" + l.d] = p;
  });

  COLS.forEach(function (ids, ci) {
    var cap = el("text", { x: COLX[ci] + BARW / 2, y: 42, "text-anchor": "middle", "class": "cap" });
    cap.textContent = CAPTIONS[ci];
    svg.appendChild(cap);
    ids.forEach(function (id) {
      var n = NODES[id], p = POS[id];
      var r = el("rect", {
        x: COLX[ci], y: p.y0, width: BARW, height: Math.max(p.y1 - p.y0, 2),
        rx: 2, fill: n.color, "class": "nodebar", tabindex: "0", role: "button",
        "aria-label": n.name + ", " + n.amt + ". Activate to pin and read the explanation."
      });
      r._id = id;
      svg.appendChild(r);
      barEls[id] = r;
    });
  });

  /* labels outside the bands */
  var grossOpVal = null;
  LINKS.forEach(function (l) { if (l.s === "gross" && l.d === "op") grossOpVal = l.v; });
  COLS.forEach(function (ids, ci) {
    ids.forEach(function (id) {
      var n = NODES[id], p = POS[id];
      var cy = (p.y0 + p.y1) / 2;
      if (id === "gross" && grossOpVal !== null) cy = p.y0 + grossOpVal * K / 2;
      if (id === "opex" && POS.cost) {
        /* the opex label shares a horizontal band with the Cost of revenue
           label — sit at whichever of center / near-bottom is farther from
           the cost label, so the two never collide (AMZN vs META differ) */
        var costCy = (POS.cost.y0 + POS.cost.y1) / 2;
        var centerCy = (p.y0 + p.y1) / 2, bottomCy = p.y1 - 20;
        cy = Math.abs(bottomCy - costCy) > Math.abs(centerCy - costCy) ? bottomCy : centerCy;
      }
      if (id === "otherin") cy += 6;
      var rightSide = !(ci === 0 || ci === COLS.length - 1 || id === "opex");
      var x = rightSide ? COLX[ci] + BARW + 13 : COLX[ci] - 13;
      var g = el("g", { "class": "lbl" });
      var lines;
      if (n.compactLabel) {
        lines = [{ t: n.compactLabel, cls: "compact", dy: 0 }];
      } else {
        lines = [
          { t: n.name, cls: "lname", dy: n.note ? -20 : -10 },
          { t: n.amt, cls: "lamt", dy: n.note ? 0 : 11 }
        ];
        if (n.note) lines.push({ t: n.note, cls: "lnote", dy: 19 });
      }
      lines.forEach(function (ln) {
        var t = el("text", { x: x, y: cy + ln.dy, "text-anchor": rightSide ? "start" : "end", "class": ln.cls, "dominant-baseline": "middle" });
        t.textContent = ln.t;
        g.appendChild(t);
      });
      svg.appendChild(g);
      lblEls[id] = g;
    });
  });

  /* ---------------- path tracing ---------------- */
  var parents = {}, children = {};
  Object.keys(NODES).forEach(function (id) { parents[id] = []; children[id] = []; });
  LINKS.forEach(function (l) { children[l.s].push(l.d); parents[l.d].push(l.s); });
  function closure(id, graph) {
    var seen = {}, stack = [id];
    while (stack.length) {
      var cur = stack.pop();
      graph[cur].forEach(function (n) { if (!seen[n]) { seen[n] = true; stack.push(n); } });
    }
    return seen;
  }
  function applyKeep(keep) {
    Object.keys(NODES).forEach(function (nid) {
      barEls[nid].classList.toggle("dim-node", !keep[nid]);
      lblEls[nid].classList.toggle("dim-lbl", !keep[nid]);
    });
    LINKS.forEach(function (l) {
      flowEls[l.s + ">" + l.d].classList.toggle("dim-flow", !(keep[l.s] && keep[l.d]));
    });
  }
  function applyHighlight(id) {
    var keep = closure(id, parents); var down = closure(id, children);
    for (var k in down) keep[k] = true; keep[id] = true;
    applyKeep(keep);
  }

  /* ---------------- panel + selection ---------------- */
  var selected = null;
  var pName = document.getElementById("pName"), pAmt = document.getElementById("pAmt"),
      pShare = document.getElementById("pShare"), pPlain = document.getElementById("pPlain"),
      pQuarter = document.getElementById("pQuarter");
  function select(id) {
    selected = id;
    var n = NODES[id];
    Object.keys(barEls).forEach(function (bid) { barEls[bid].classList.toggle("selected", bid === id); });
    if (pName) pName.textContent = n.name;
    if (pAmt) pAmt.textContent = n.amt;
    if (pShare) pShare.textContent = id === "rev" ? "100% of revenue — the whole pie" : Math.round(n.value / REV * 100) + "% of revenue";
    if (pPlain) pPlain.textContent = n.plain || "";
    if (pQuarter) pQuarter.textContent = n.quarter || "";
    applyHighlight(id);
  }

  /* ---------------- tooltip + events ---------------- */
  var box = document.getElementById("chartBox"), tip = document.getElementById("tooltip");
  function showTip(html, evt) {
    if (!box || !tip) return;
    var r = box.getBoundingClientRect();
    var pt = (evt.touches && evt.touches[0]) || evt;
    tip.innerHTML = html;
    tip.style.left = (pt.clientX - r.left) + "px";
    tip.style.top = (pt.clientY - r.top) + "px";
    tip.classList.add("on");
  }
  function hideTip() { if (tip) tip.classList.remove("on"); }

  Object.keys(barEls).forEach(function (id) {
    var b = barEls[id], n = NODES[id];
    b.addEventListener("pointerenter", function (e) {
      applyHighlight(id);
      showTip(n.name + " — <span class='t-amt'>" + n.amt + "</span>", e);
    });
    b.addEventListener("pointermove", function (e) { showTip(n.name + " — <span class='t-amt'>" + n.amt + "</span>", e); });
    b.addEventListener("pointerleave", function () { hideTip(); if (selected) applyHighlight(selected); });
    b.addEventListener("click", function (e) { e.stopPropagation(); select(id); });
    b.addEventListener("focus", function () { applyHighlight(id); });
    b.addEventListener("blur", function () { if (selected) applyHighlight(selected); });
    b.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(id); }
    });
  });
  LINKS.forEach(function (l) {
    var f = flowEls[l.s + ">" + l.d];
    var html = NODES[l.s].name + " → " + NODES[l.d].name + " — <span class='t-amt'>" + (l.amt || ("$" + l.v.toFixed(1) + "B")) + "</span>";
    f.addEventListener("pointerenter", function (e) {
      var keep = closure(l.s, parents); var down = closure(l.d, children);
      for (var k in down) keep[k] = true; keep[l.s] = true; keep[l.d] = true;
      applyKeep(keep);
      showTip(html, e);
    });
    f.addEventListener("pointermove", function (e) { showTip(html, e); });
    f.addEventListener("pointerleave", function () { hideTip(); if (selected) applyHighlight(selected); });
    f.addEventListener("click", function (e) { e.stopPropagation(); select(l.d); });
  });

  svg.addEventListener("click", function () { select("rev"); });
  select("rev");

  /* ---------------- $100 breakdown (shown by default — user preference, Nov 7 2026) ---------------- */
  var btn = document.getElementById("hundredBtn"), body = document.getElementById("hundredBody");
  if (btn && body) {
    var setOpen = function (open) {
      body.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Hide the $100 breakdown" : "Show the $100 breakdown";
      if (open) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            body.querySelectorAll(".hfill").forEach(function (f) { f.style.width = f.getAttribute("data-w") + "%"; });
          });
        });
      } else {
        body.querySelectorAll(".hfill").forEach(function (f) { f.style.width = "0"; });
      }
    };
    btn.addEventListener("click", function () { setOpen(!body.classList.contains("open")); });
    setOpen(true);
  }
})();
