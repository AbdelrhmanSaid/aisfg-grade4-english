/* ===== Al-Azhar English — interactive study companion ===== */
(function () {
  "use strict";

  const UNITS = Array.isArray(window.UNITS) ? window.UNITS : [];
  const STORE_KEY = "english-exam-progress-v2";

  // ---- progress ----
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { progress = {}; }
  const saveProgress = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) {} };
  function unitProgress(u) {
    const done = progress[u.id] || {};
    const total = (u.questions || []).length;
    const correct = Object.values(done).filter((v) => v === "correct").length;
    const answered = Object.keys(done).length;
    return { correct, answered, total, complete: total > 0 && correct === total };
  }

  // ---- helpers ----
  const byId = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?]+$/, "");
  const LETTERS = "ABCDEFGH";

  let activeUnitId = null;
  let activeTab = "explain";

  // ---- mobile nav drawer ----
  const sidebar = byId("sidebar"), scrim = byId("scrim"), menuBtn = byId("menuBtn"),
        drawerClose = byId("drawerClose"), topbarTitle = byId("topbarTitle");
  let scrimTimer = null;
  function openNav() {
    clearTimeout(scrimTimer);
    sidebar.classList.add("open");
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add("show"));
    document.body.classList.add("nav-open");
    menuBtn.setAttribute("aria-expanded", "true");
  }
  function closeNav() {
    sidebar.classList.remove("open");
    scrim.classList.remove("show");
    document.body.classList.remove("nav-open");
    menuBtn.setAttribute("aria-expanded", "false");
    scrimTimer = setTimeout(() => { if (!sidebar.classList.contains("open")) scrim.hidden = true; }, 280);
  }
  if (menuBtn) menuBtn.onclick = openNav;
  if (scrim) scrim.onclick = closeNav;
  if (drawerClose) drawerClose.onclick = closeNav;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });

  // ---- sidebar nav ----
  function renderNav() {
    const nav = byId("nav");
    nav.innerHTML = "";
    const order = [], byCat = {};
    UNITS.forEach((u) => { if (!byCat[u.category]) { byCat[u.category] = []; order.push(u.category); } byCat[u.category].push(u); });
    order.forEach((cat) => {
      const g = el("div", "nav-group");
      g.appendChild(el("div", "group-title ar", esc(cat)));
      byCat[cat].forEach((u, i) => {
        const p = unitProgress(u);
        const item = el("div", "nav-item" + (u.id === activeUnitId ? " active" : "") + (p.complete ? " done" : ""));
        item.innerHTML =
          `<span class="idx">${i + 1}</span>` +
          `<span class="label" dir="auto">${esc(u.title)}</span>` +
          `<span class="tick">✓</span>`;
        item.onclick = () => selectUnit(u.id);
        g.appendChild(item);
      });
      nav.appendChild(g);
    });
    renderOverall();
  }

  function renderOverall() {
    let correct = 0, total = 0;
    UNITS.forEach((u) => { const p = unitProgress(u); correct += p.correct; total += p.total; });
    const pct = total ? Math.round((correct / total) * 100) : 0;
    byId("overallBar").style.width = pct + "%";
    byId("pctNum").textContent = pct;
    byId("overallText").textContent = `أجبت صح على ${correct} من ${total} سؤال`;
  }

  // ---- unit ----
  function selectUnit(id) {
    activeUnitId = id;
    activeTab = "explain";
    renderNav();
    renderUnit();
    closeNav();
    document.querySelector(".main").scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function unitNumber(u) {
    const same = UNITS.filter((x) => x.category === u.category);
    return same.indexOf(u) + 1;
  }

  function renderUnit() {
    const unit = UNITS.find((u) => u.id === activeUnitId);
    const c = byId("content");
    c.innerHTML = "";
    if (!unit) { c.appendChild(el("div", "empty", "اختار درس من القائمة عشان نبدأ")); return; }

    if (topbarTitle) topbarTitle.textContent = unit.title;

    // hero
    const hero = el("div", "hero");
    hero.innerHTML =
      `<div class="eyebrow ar"><span class="dot"></span>${esc(unit.category)} · الدرس ${unitNumber(unit)}</div>` +
      `<h2 dir="auto">${esc(unit.title)}</h2>` +
      `<p class="ar-title" dir="rtl">${esc(unit.titleArabic || "")}</p>` +
      `<div class="meta-row">` +
        `<div class="meta ar"><b>${(unit.vocabulary || []).length}</b> كلمة جديدة</div>` +
        `<div class="meta ar"><b>${(unit.questions || []).length}</b> سؤال تفاعلي</div>` +
      `</div>`;
    c.appendChild(hero);

    // tabs
    const tabs = el("div", "tabs");
    const defs = [
      ["explain", "الشرح", ""],
      ["vocab", "الكلمات", (unit.vocabulary || []).length],
      ["practice", "تدريبات", (unit.questions || []).length],
    ];
    defs.forEach(([key, label, count]) => {
      const t = el("button", "tab" + (key === activeTab ? " active" : ""));
      t.innerHTML = `${label}${count !== "" ? ` <span class="count">${count}</span>` : ""}`;
      t.onclick = () => { activeTab = key; renderUnit(); };
      tabs.appendChild(t);
    });
    c.appendChild(tabs);

    // view
    const view = el("div", "view");
    if (activeTab === "explain") view.appendChild(renderExplain(unit));
    else if (activeTab === "vocab") view.appendChild(renderVocab(unit));
    else view.appendChild(renderPractice(unit));
    c.appendChild(view);
  }

  function renderExplain(unit) {
    const wrap = el("div", "lesson");
    wrap.setAttribute("dir", "rtl");
    if (unit.intro) wrap.appendChild(el("div", "intro", unit.intro)); // trusted generated HTML
    const body = el("div", "lesson-body");
    body.innerHTML = unit.explanation || "<p>—</p>";
    wrap.appendChild(body);
    return wrap;
  }

  function renderVocab(unit) {
    const wrap = el("div");
    const list = el("div", "vocab-list");
    (unit.vocabulary || []).forEach((v) => {
      const row = el("div", "vrow");
      row.innerHTML =
        `<div class="term" dir="auto">${esc(v.term)}<span class="ar-mean" dir="rtl">${esc(v.arabic)}</span></div>` +
        `<div class="def" dir="auto">${esc(v.english)}` +
        (v.example ? `<span class="ex">“${esc(v.example)}”</span>` : "") + `</div>`;
      list.appendChild(row);
    });
    if (!list.children.length) return el("div", "empty", "مفيش كلمات في الدرس ده.");
    wrap.appendChild(list);
    return wrap;
  }

  // ---- practice ----
  function renderPractice(unit) {
    const wrap = el("div", "practice");
    const p = unitProgress(unit);

    const bar = el("div", "practice-bar");
    bar.innerHTML =
      `<div class="ar">جاوب وهتشوف على طول صح ولا غلط، مع شرح بالعامية ليه.</div>` +
      `<div style="display:flex;align-items:center;gap:12px">` +
        `<span class="score">${p.correct} / ${p.total}</span>` +
        `<button class="btn-reset ar" id="resetBtn">إعادة المحاولة</button>` +
      `</div>`;
    wrap.appendChild(bar);

    (unit.questions || []).forEach((q, i) => wrap.appendChild(renderQuestion(unit, q, i)));
    if (!(unit.questions || []).length) return el("div", "empty", "مفيش تدريبات في الدرس ده.");

    setTimeout(() => {
      const btn = byId("resetBtn");
      if (btn) btn.onclick = () => { delete progress[unit.id]; saveProgress(); renderNav(); renderUnit(); };
    }, 0);
    return wrap;
  }

  function markAnswer(unit, idx, status) {
    if (!progress[unit.id]) progress[unit.id] = {};
    progress[unit.id][idx] = status;
    saveProgress();
    renderNav();
    const score = document.querySelector(".practice-bar .score");
    if (score) { const p = unitProgress(unit); score.textContent = `${p.correct} / ${p.total}`; }
  }

  function showRationale(node, ok, rationale) {
    node.className = "rationale show " + (ok ? "ok" : "no");
    node.setAttribute("dir", "rtl");
    node.innerHTML = `<span class="verdict">${ok ? "✓ إجابة صحيحة" : "✗ إجابة غير صحيحة"}</span>` +
      String(rationale || "").replace(/\n/g, "<br>"); // trusted generated HTML
  }

  function renderQuestion(unit, q, idx) {
    const card = el("div", "q");
    const badge = q.type === "mcq" ? "اختيار من متعدد" : q.type === "truefalse" ? "صح أو خطأ" : "أكمل الفراغ";
    card.appendChild(el("div", "q-top", `<span class="q-num">Q${idx + 1}</span><span class="q-badge ar">${badge}</span>`));

    const prompt = el("div", "q-prompt");
    prompt.setAttribute("dir", "auto");
    prompt.innerHTML = esc(q.prompt).replace(/_{2,}/g, '<span class="blank">_____</span>');
    card.appendChild(prompt);

    const rationale = el("div", "rationale");

    if (q.type === "fillblank") {
      let input;
      if (q.wordbank && q.wordbank.length) {
        const bank = el("div", "wordbank");
        q.wordbank.forEach((w) => {
          const chip = el("span", "chip", esc(w));
          chip.onclick = () => { if (input && !input.disabled) input.value = w; };
          bank.appendChild(chip);
        });
        card.appendChild(bank);
      }
      const row = el("div", "fill");
      input = el("input");
      input.type = "text";
      input.placeholder = "اكتب الكلمة المناسبة…";
      const btn = el("button", "btn", "تأكيد");
      const check = () => {
        if (input.disabled) return;
        const ans = norm(input.value);
        if (!ans) { input.focus(); return; }
        const accepted = [norm(q.correctText)].concat((q.acceptable || []).map(norm));
        const ok = accepted.includes(ans);
        input.disabled = true; btn.disabled = true;
        input.classList.add(ok ? "correct" : "wrong");
        if (!ok) input.value = input.value + "  →  " + q.correctText;
        showRationale(rationale, ok, q.rationale);
        markAnswer(unit, idx, ok ? "correct" : "wrong");
      };
      btn.onclick = check;
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
      row.appendChild(input); row.appendChild(btn);
      card.appendChild(row);
    } else {
      const choices = el("div", "choices");
      (q.choices || []).forEach((ch, ci) => {
        const b = el("button", "choice");
        b.setAttribute("dir", "auto");
        b.innerHTML = `<span class="key">${LETTERS[ci] || ci + 1}</span><span>${esc(ch)}</span>`;
        b.onclick = () => {
          if (b.disabled) return;
          const ok = ci === q.correctIndex;
          Array.from(choices.children).forEach((cn, k) => { cn.disabled = true; if (k === q.correctIndex) cn.classList.add("correct"); });
          if (!ok) b.classList.add("wrong");
          showRationale(rationale, ok, q.rationale);
          markAnswer(unit, idx, ok ? "correct" : "wrong");
        };
        choices.appendChild(b);
      });
      card.appendChild(choices);
    }

    card.appendChild(rationale);
    return card;
  }

  // ---- boot ----
  (function boot() {
    if (!UNITS.length) {
      byId("content").innerHTML = '<div class="empty">لم يتم تحميل المحتوى (data.js).</div>';
      return;
    }
    renderNav();
    selectUnit(UNITS[0].id);
  })();
})();
