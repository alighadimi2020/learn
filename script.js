/* ============================================================
   آریو تجارت — رفتارها و ابزارهای تعاملی
   وابستگی خارجی: ندارد | ذخیرهسازی: localStorage مرورگر
   ============================================================ */
(() => {
  'use strict';

  /* ---------- ابزارهای پایه ---------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const KEY = 'ario-tejarat-v1';

  const state = {
    theme: null,
    checks: {},
    quizzes: {},
    ledger: [],
    concessions: [],
    batna: { target: '', floor: '', alt: '' },
    certName: '',
    hideSearchBtn: false,
    reading: { y: 0, pct: 0, section: '' }
  };

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    Object.assign(state, saved);
    state.checks = saved.checks || {};
    state.quizzes = saved.quizzes || {};
    state.ledger = saved.ledger || [];
    state.concessions = saved.concessions || [];
    state.batna = saved.batna || { target: '', floor: '', alt: '' };
    state.hideSearchBtn = !!saved.hideSearchBtn;
    state.reading = (saved.reading && typeof saved.reading === 'object') ? saved.reading : { y: 0, pct: 0, section: '' };
  } catch (e) { /* storage خالی یا خراب */ }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  const PERSIAN = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  const toFa = (v) => String(v).replace(/[0-9]/g, d => PERSIAN[+d]);
  const nf = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });
  const fmt = (n) => nf.format(Math.round(Number(n) || 0));
  const fmtD = (n) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(Number(n) || 0);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  function normalDigits(v) {
    return String(v ?? '')
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
  }
  function parseNum(v) {
    let s = normalDigits(v).replace(/[٬,٫\s\u200c\u00a0]/g, '').replace(/[^\d.\-]/g, '');
    if (/^-?\d+\.\d{1,2}$/.test(s)) return parseFloat(s);
    const sign = s.trim().startsWith('-') ? -1 : 1;
    const n = parseInt(s.replace(/[.\-]/g, ''), 10);
    return isNaN(n) ? 0 : sign * n;
  }
  const val = (id) => parseNum($(id)?.value);
  const text = (id) => ($(id)?.value || '').trim();
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const todayFa = () => new Intl.DateTimeFormat('fa-IR', { year:'numeric', month:'long', day:'numeric' }).format(new Date());

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('#toastWrap').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(() => t.remove(), 3000);
  }

  /* ---------- تم ---------- */
  function setTheme(mode, announce) {
    document.documentElement.dataset.theme = mode;
    state.theme = mode; save();
    if (announce) toast(mode === 'dark' ? 'حالت تیره روشن شد 🌙' : 'حالت روشن روشن شد ☀️');
  }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(state.theme || (prefersDark ? 'dark' : 'light'), false);
  $('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));

  /* ---------- منوی موبایل ---------- */
  const sidebar = $('#sidebar'), overlay = $('#overlay'), menuBtn = $('#menuBtn');
  function closeMenu() { sidebar.classList.remove('is-open'); overlay.hidden = true; menuBtn.setAttribute('aria-expanded','false'); }
  function openMenu() { sidebar.classList.add('is-open'); overlay.hidden = false; menuBtn.setAttribute('aria-expanded','true'); }
  menuBtn.addEventListener('click', () => sidebar.classList.contains('is-open') ? closeMenu() : openMenu());
  overlay.addEventListener('click', closeMenu);
  $$('.side-link').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- نوار پیشرفت، ناوبری فعال و ذخیره محل مطالعه ---------- */
  const sections = $$('main section[id]');
  const links = $$('.side-link[data-target]');
  const SECTION_NAMES = {
    'module-1':'فصل ۱ · انبار منظم', 'module-2':'فصل ۲ · پشت کانتر',
    'module-3':'فصل ۳ · قرارداد عمده', 'module-4':'فصل ۴ · حساب پاک',
    toolkit:'برگه تقلب', final:'جمع بندی و آزمون'
  };
  let activeSection = '';
  let suppressReadingSave = true;   // تا پایان بازگردانی، چیزی ذخیره نشود
  let saveTimer = null;

  function currentPct() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    return max > 0 ? Math.round((h.scrollTop / max) * 100) : 0;
  }
  function onScroll() {
    const pct = currentPct();
    $('#scrollProgress').style.width = pct + '%';
    let active = '';
    sections.forEach(s => { if (s.getBoundingClientRect().top <= 150) active = s.id; });
    activeSection = active;
    links.forEach(a => a.classList.toggle('is-active', a.dataset.target === active));
    scheduleReadingSave(pct);
  }
  function scheduleReadingSave(pct) {
    if (suppressReadingSave) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveReading(pct), 350);
  }
  function saveReading(pct) {
    if (suppressReadingSave) return;
    const y = Math.max(0, Math.round(window.scrollY || document.documentElement.scrollTop || 0));
    state.reading = {
      y,
      pct: typeof pct === 'number' ? pct : currentPct(),
      section: SECTION_NAMES[activeSection] || 'بالای صفحه'
    };
    save();
    updateResumeChip();
  }
  function updateResumeChip() {
    const chip = $('#resumeChip'), r = state.reading;
    if (!chip) return;
    const has = !!(r && r.y > 300);
    chip.hidden = !has;
    if (has) $('#resumeLabel').textContent = `${r.section || 'آموزش'} · ${toFa(r.pct || 0)}٪ خوانده شده`;
  }
  function restoreReading() {
    const r = state.reading;
    if (r && r.y > 300) {
      const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      window.scrollTo(0, Math.min(r.y, Math.max(0, max)));
      onScroll();
      setTimeout(() => toast(`📌 به آخرین محل مطالعتان برگشتید: ${r.section || ''}`), 900);
    }
    suppressReadingSave = false;
    updateResumeChip();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('beforeunload', () => saveReading());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveReading(); });
  onScroll();

  /* ---------- نمایش تدریجی (کاملاً تزئینی) ---------- */
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealables = $$('.card, .path-card, .option-card, .cheat-grid article, .s5-grid article, .glossary-grid > div');
    revealables.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
    }, { threshold: .08 });
    revealables.forEach(el => io.observe(el));
  }

  /* ---------- تبها ---------- */
  $$('.tabs').forEach(group => {
    const tabs = $$('.tab', group), panels = $$('.tab-panel', group);
    tabs.forEach(btn => btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.toggle('is-active', b === btn));
      panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === btn.dataset.tab));
    }));
  });

  /* ---------- کپی متن ---------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const src = $(btn.dataset.copy);
    if (!src) return;
    const value = (src.textContent || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = value; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }
    toast('کپی شد ✓');
  }));

  /* ---------- چاپ ---------- */
  const doPrint = () => window.print();
  $('#printBtn').addEventListener('click', doPrint);
  $('#printBtn2').addEventListener('click', doPrint);
  $('#certPrint').addEventListener('click', () => { toast('گواهی در همان صفحه چاپ قرار گرفت 🖨'); setTimeout(doPrint, 250); });

  /* ============================================================
     آزمونها
     ============================================================ */
  const QUIZ = {
    m1: [
      { q:'کدام معیار، بهترین مبنا برای قرار گرفتن یک قطعه در «منطقه A» است؟',
        o:['تعداد دفعات فروش در ۹۰ روز اخیر','قیمت خرید قطعه','نام شرکت سازنده','اندازه جعبه'], a:0,
        e:'منطقهبندی ABC بر اساس گردش واقعی است، نه قیمت یا برند. پرگردشها نزدیک کانتر و در ارتفاع دسترس قرار میگیرند.' },
      { q:'در آدرس B-04-R07-L3-B02، کدام بخش نشاندهنده «طبقه سوم» است؟',
        o:['B-04','R07','L3','B02'], a:2,
        e:'ترتیب: منطقه-راهرو-قفسه-طبقه-خانه. L یعنی Level (طبقه) و B یعنی Bin (خانه).' },
      { q:'«نصب عکس وضعیت مطلوب بالای هر راهرو + چک لیست ثابت» مربوط به کدام S است؟',
        o:['جداسازی','پاکیزگی','استانداردسازی','انضباط'], a:2,
        e:'سِیکِتسو یعنی تبدیل کار خوب به استاندارد قابل تکرار؛ عکس، رنگ، چک لیست و مسئول مشخص.' }
    ],
    m2: [
      { q:'مشتری گفت «گرونه!» اولین حرکت درست چیست؟',
        o:['همینجا ۵٪ تخفیف بدهیم','گوش بدهیم و بپرسیم «با چه گزینهای مقایسه میکنید؟»','توضیح دهیم قیمت ما عادلانه است','پیشنهاد ارزانترین برند'], a:1,
        e:'الگوی LAER: گوش، همدلی، پرسش، پاسخ. اعتراض قیمت معمولاً یعنی ارزش هنوز منتقل نشده یا مقایسه نامشخص است.' },
      { q:'بهای تمامشده ۸۰ و حداقل حاشیه سود ناخالص ۲۰٪ است. کف قیمت چقدر است؟',
        o:['۹۶','۱۰۰','۱۰۴','۱۲۰'], a:1,
        e:'کف = تمامشده ÷ (۱ − حاشیه) = ۸۰ ÷ ۰٫۸ = ۱۰۰. دقت کنید ۲۰٪ روی قیمت فروش حساب میشود، نه روی بهای خرید.' },
      { q:'قاعده «بده-بگیر» یعنی چه؟',
        o:['همیشه تخفیف بده تا مشتری برگردد','هر امتیاز در ازای یک عوض مشخص داده شود','فقط به مشتریهای دائمی تخفیف بده','قیمت را بالا ببر بعد تخفیف بده'], a:1,
        e:'تخفیف در ازای پرداخت نقد، خرید همراه، تعهد حجم یا کاهش ریسک مرجوعی. تخفیف بیعوض، فشار دفعه بعد را بیشتر میکند.' }
    ],
    m3: [
      { q:'BATNA در مذاکره یعنی چه؟',
        o:['پایینترین قیمتی که اعلام میکنیم','بهترین جایگزین واقعی در صورت عدم توافق','حداکثر تخفیف مجاز','سقف اعتبار مشتری'], a:1,
        e:'وقتی جایگزین واقعی داشته باشید، مجبور به پذیرش هر شرایطی نیستید. قبل از جلسه آن را بنویسید.' },
      { q:'کدام مورد «قیمت مؤثر» یک پیشنهاد عمده را بالا میبرد؟',
        o:['تسویه نقدی','اعتبار ۶۰ روزه','ریبیت پایان دوره','نرخ مرجوعی پایینتر'], a:1,
        e:'اعتبار طولانی یعنی هزینه سرمایه؛ هرچند روی فاکتور دیده نمیشود، در دفتر هزینه است.' },
      { q:'چرا تخفیف حجمی را پلکانی و مشروط میکنیم؟',
        o:['چون محاسبهاش سادهتر است','چون امتیاز را به حجم و تسویه وصل میکند و قیمت لیست حفظ میشود','چون مشتری انتظارش را دارد','چون قانون آن را الزامی کرده'], a:1,
        e:'تخفیف یکجا از سفارش اول، تبدیل به «قیمت جدید» میشود؛ پلکان مشروط، رفتار مطلوب مشتری را میخرد.' }
    ],
    m4: [
      { q:'یک فروش نسیه ۱۰۰ واحدی چه اثری دارد؟',
        o:['سود و نقد هر دو افزایش مییابد','فقط نقد افزایش مییابد','سود ثبت میشود ولی نقد افزایش نمییابد','هیچ اثری تا وصول ندارد'], a:2,
        e:'درآمد و مطالبات ثبت میشود؛ پول بعداً میرسد. اینجا همان جایی است که «سود ≠ نقد» معنا پیدا میکند.' },
      { q:'فرمول درست بهای کالای فروشرفته (COGS) کدام است؟',
        o:['کل خریدهای ماه','موجودی اول + خرید − موجودی آخر','فروش − هزینهها','قیمت فروش × تعداد'], a:1,
        e:'فقط بهای قطعههایی که فروخته شدند، هزینه دوره است؛ بقیه همچنان «موجودی کالا» و داراییاند.' },
      { q:'خرید ۵۰۰ واحد کالا به صورت نقدی، در لحظه چه ثبتی دارد؟',
        o:['هزینه ۵۰۰ و کاهش سود','موجودی کالا +۵۰۰ و نقد −۵۰۰','درآمد ۵۰۰','بدهی ۵۰۰'], a:1,
        e:'جابهجایی بین دو دارایی است. تا وقتی نفروشید، هزینهای ثبت نمیشود.' }
    ],
    final: [
      { q:'زنجیره درست این دوره کدام است؟',
        o:['مذاکره ← انبار ← دفتر ← عدد','انبار منظم ← عدد دقیق ← مذاکره آرام ← دفتر تمیز','دفتر ← قیمت ← انبار ← مشتری','تخفیف ← حجم ← اعتبار ← سود'], a:1,
        e:'نظم انبار، عدد قابل اتکا میدهد؛ عدد، مذاکره را آرام میکند؛ توافق سالم، دفتر را تمیز نگه میدارد.' },
      { q:'دو پیشنهاد عمده داری: ۱۲٪ تخفیف با ۶۰ روز اعتبار، و ۷٪ نقدی. معیار تصمیم چیست؟',
        o:['درصد تخفیف بالاتر','قیمت مؤثر شامل هزینه سرمایه، حمل و ریسک مرجوعی','حرف خریدار','قیمت لیست'], a:1,
        e:'تخفیف اسمی، بخشی از واقعیت است. هزینه پول خوابیده و مرجوعی هم عدد دارند.' },
      { q:'FEFO (تاریخ انقضای نزدیکتر، اول خارج شود) بیشتر برای کدام گروه است؟',
        o:['دیسک ترمز و کلاچ','روغن، ضدیخ، چسب، باتری و قطعات لاستیکی','پیچ و مهره','قفسه فلزی'], a:1,
        e:'هر کالایی که تاریخ تولید/انقضا یا افت کیفیت در انبار دارد، باید FEFO و لیبل تاریخ ورود داشته باشد.' },
      { q:'جمله «اگر حجم به ۱۵۰ عدد برسد و تسویه ۱۵ روزه شود، آنگاه پلکان ۸٪ فعال میشود» چه تکنیکی است؟',
        o:['مشروطسازی / بده-بگیر','لنگر انداختن','سکوت','تخفیف بیقید'], a:0,
        e:'هر امتیاز را به یک تعهد مشخص وصل میکند؛ هم قیمت لیست حفظ میشود و هم رفتار مطلوب خریدار ساخته میشود.' },
      { q:'نقطه سربهسر با هزینه ثابت ۴۵ و حاشیه سود ناخالص ۳۰٪ چقدر است؟',
        o:['۱۳٫۵','۹۰','۱۵۰','۴۵۰'], a:2,
        e:'۴۵ ÷ ۰٫۳ = ۱۵۰. یعنی تا ۱۵۰ فروش، فقط هزینهها پوشش داده میشود؛ بعد از آن سود خالص شروع میشود.' },
      { q:'کدام عادت، مشترک فصل انبار و فصل حسابداری است؟',
        o:['فقط شمارش ماهانه','۱۰ دقیقه آخر روز: ثبت، چک لیست و مغایرتگیری','تخفیف دادن آخر هفته','چیدن ویترین'], a:1,
        e:'نظم نتیجه یک عادت کوچک و تکرارشونده است؛ هم برای قفسهها، هم برای صندوق و دفتر.' }
    ]
  };

  function renderQuiz(key) {
    const box = $(`.quiz[data-quiz="${key}"]`);
    if (!box) return;
    const answers = state.quizzes[key] || (state.quizzes[key] = {});
    box.innerHTML = QUIZ[key].map((item, i) => `
      <div class="q-item" data-qi="${i}">
        <div class="q-head"><span class="q-num">${toFa(i + 1)}</span><div class="q-text">${esc(item.q)}</div></div>
        <div class="q-options">${item.o.map((o, j) => `<button class="q-opt" data-oi="${j}">${esc(o)}</button>`).join('')}</div>
        <div class="q-feedback" hidden></div>
      </div>`).join('') + `<div class="q-score" hidden></div>`;

    function paintItem(i, chosen) {
      const item = QUIZ[key][i], el = $(`.q-item[data-qi="${i}"]`, box);
      const opts = $$('.q-opt', el), fb = $('.q-feedback', el);
      opts.forEach((b, j) => {
        b.disabled = chosen !== null;
        b.classList.remove('correct', 'wrong');
        if (chosen !== null) {
          if (j === item.a) b.classList.add('correct');
          else if (j === chosen) b.classList.add('wrong');
        }
      });
      fb.hidden = chosen === null;
      if (chosen !== null) {
        const ok = chosen === item.a;
        fb.className = 'q-feedback ' + (ok ? 'ok' : 'no');
        fb.innerHTML = (ok ? '✓ درست! ' : '✗ نه دقیقاً. ') + esc(item.e) +
          (ok ? '' : ` <button class="btn btn-sm btn-ghost q-retry" style="margin-right:8px">دوباره امتحان کن</button>`);
        const retry = $('.q-retry', fb);
        if (retry) retry.addEventListener('click', () => { delete answers[i]; save(); paintItem(i, null); updateScore(); updateProgress(); });
      }
      updateScore();
    }
    function updateScore() {
      const done = Object.keys(answers).length;
      const correct = QUIZ[key].reduce((n, it, i) => n + (answers[i] === it.a ? 1 : 0), 0);
      const el = $('.q-score', box);
      el.hidden = false;
      el.textContent = `امتیاز: ${toFa(correct)} از ${toFa(QUIZ[key].length)} · ${toFa(done)} سؤال پاسخ داده شده`;
    }

    $$('.q-item', box).forEach((el, i) => {
      $$('.q-opt', el).forEach(btn => btn.addEventListener('click', () => {
        const chosen = +btn.dataset.oi;
        answers[i] = chosen; save();
        paintItem(i, chosen);
        updateProgress();
        if (chosen === QUIZ[key][i].a) toast('آفرین، درست بود ✓');
      }));
      paintItem(i, answers[i] ?? null);
    });
    updateScore();
  }
  Object.keys(QUIZ).forEach(renderQuiz);

  /* ============================================================
     پیشرفت، چک لیستها و گواهی
     ============================================================ */
  const allChecks = $$('[data-check]');
  allChecks.forEach(cb => {
    cb.checked = !!state.checks[cb.dataset.check];
    cb.addEventListener('change', () => {
      state.checks[cb.dataset.check] = cb.checked; save(); updateProgress();
      if (cb.checked) toast('تیک ثبت شد ✓');
    });
  });

  function quizCorrect(group) {
    const a = state.quizzes[group] || {}, qs = QUIZ[group] || [];
    return qs.reduce((n, q, i) => n + (a[i] === q.a ? 1 : 0), 0);
  }
  function updateProgress() {
    const checksDone = allChecks.filter(cb => cb.checked).length;
    const quizTotal = Object.values(QUIZ).reduce((n, arr) => n + arr.length, 0);
    const quizDone = Object.keys(QUIZ).reduce((n, k) => n + quizCorrect(k), 0);
    const total = allChecks.length + quizTotal;
    const done = checksDone + quizDone;
    const pct = total ? Math.round((done / total) * 100) : 0;

    $('#progressPercent').textContent = toFa(pct) + '٪';
    $('#ringFg').style.strokeDashoffset = String(314.16 - (314.16 * pct / 100));
    $('#progressHint').textContent = pct === 100
      ? 'همه چکلیستها و تمرینها کامل شد. حالا برید سراغ اجرا واقعی 👏'
      : `${toFa(done)} مورد از ${toFa(total)} انجام شده. تیکها، امتیازها و محل مطالعه هم ذخیره میشود.`;

    ['m1','m2','m3','m4'].forEach(g => {
      const list = $$(`[data-check^="${g}-"]`);
      const c = list.filter(x => x.checked).length;
      const t = list.length + (QUIZ[g] ? QUIZ[g].length : 0);
      const d = c + quizCorrect(g);
      const bar = $(`[data-bar="${g}"]`);
      if (bar) bar.style.width = (t ? (d / t) * 100 : 0) + '%';
    });

    const lock = $('#certLock'), unlocked = pct >= 80;
    lock.classList.toggle('unlocked', unlocked);
    lock.textContent = unlocked
      ? `گواهی فعال شد ✦ پیشرفت شما ${toFa(pct)}٪ است. نامتان را بنویسید و چاپ کنید.`
      : `برای فعال شدن گواهی، ۸۰٪ چکلیستها و تمرینها را کامل کنید (اکنون ${toFa(pct)}٪).`;
  }

  /* ---------- گواهی ---------- */
  $('#certDate').textContent = todayFa();
  const certName = $('#certName');
  certName.value = state.certName || '';
  certName.addEventListener('input', () => { state.certName = certName.value; save(); });

  /* ============================================================
     ابزار ۱ · آدرسساز
     ============================================================ */
  const pad = n => String(n).padStart(2, '0');
  function fillSelect(id, values) {
    const el = $(id); if (!el) return;
    el.innerHTML = values.map(v => `<option value="${esc(v.v)}">${esc(v.t)}</option>`).join('');
  }
  fillSelect('#adAisle', Array.from({length:12}, (_,i)=>({v:pad(i+1),t:`راهرو ${toFa(i+1)}`})));
  fillSelect('#adRack',  Array.from({length:20}, (_,i)=>({v:pad(i+1),t:`قفسه R${pad(i+1)}`})));
  fillSelect('#adLevel', Array.from({length:5},  (_,i)=>({v:String(i+1),t:`طبقه L${i+1}`})));
  fillSelect('#adBin',   Array.from({length:12}, (_,i)=>({v:pad(i+1),t:`خانه B${pad(i+1)}`})));

  function updateAddress() {
    const z = $('#adZone').value, a = $('#adAisle').value, r = $('#adRack').value,
          l = $('#adLevel').value, b = $('#adBin').value;
    const code = `${z}-${a}-R${r}-L${l}-B${b}`;
    $('#addressCode').textContent = code;
    const zoneText = { A:'منطقه A = پرگردش؛ نزدیک کانتر', B:'منطقه B = گردش متوسط', C:'منطقه C = کندگردش / سفارشی', Q:'منطقه Q = قرنطینه؛ قابل فروش نیست' }[z];
    const levelNote = (+l <= 3) ? `طبقه L${l} در محدوده دسترس راحت (بین کمر و شانه) است.` : `طبقه L${l} بالاتر از محدوده طلایی است؛ مناسب کالای کندگردش.`;
    $('#addressHint').textContent = `${zoneText}. ${levelNote} این کد را هم روی برچسب قفسه و هم جلوی کد فنی در سیستم/دفتر بنویسید.`;
  }
  $$('#addressTool select').forEach(s => s.addEventListener('change', updateAddress));
  updateAddress();

  /* ============================================================
     ابزار ۲ · ممیزی 5S
     ============================================================ */
  const s5Inputs = $$('[data-5s]');
  function update5S() {
    let total = 0, min = { name:'', v: 21 };
    s5Inputs.forEach(inp => {
      const v = +inp.value;
      total += v;
      inp.closest('label').querySelector('output').textContent = toFa(v);
      if (v < min.v) min = { name: inp.dataset.s5 || '', v };
    });
    $('#fiveSScore').textContent = `${toFa(total)} / ۱۰۰`;
    let band = total >= 85 ? 'عالی؛ فقط تداومش را با ممیزی ماهانه نگه دارید.'
      : total >= 70 ? 'خوب؛ یک S ضعیف دارید که بقیه را به عقب میکشد.'
      : total >= 50 ? 'متوسط؛ به جای همه چیز، فقط روی یک مورد تمرکز کنید.'
      : 'نیاز به شروع دوباره از جداسازی و تعیین مسئول هر راهرو دارید.';
    $('#fiveSAdvice').textContent = `کمترین نمره: «${min.name}» (${toFa(min.v)} از ۲۰). ${band}`;
  }
  s5Inputs.forEach(inp => inp.addEventListener('input', update5S));
  update5S();

  /* ============================================================
     ابزار ۳ · کف قیمت و نردبان تخفیف خرده
     ============================================================ */
  function updateRetail() {
    const cost = val('#rCost'), minM = clamp(val('#rMargin'), 0, 95), tgtM = clamp(val('#rTarget'), 0, 95);
    const part = text('#rPart') || 'این قطعه';
    const bundle = text('#rBundle') || 'تطبیق کد فنی و گارانتی';
    const competitor = val('#rCompetitor');
    if (cost <= 0) {
      ['#rOpen','#rFloor','#rRoom'].forEach(id => $(id).textContent = '—');
      $('#rLadder').innerHTML = ''; $('#rScript').textContent = 'بهای تمامشده را وارد کنید.'; $('#rWarning').textContent = '';
      return;
    }
    const marginOk = tgtM > minM ? tgtM : Math.min(95, minM + 5);
    const floor = cost / (1 - minM / 100);
    const open = cost / (1 - marginOk / 100);
    const room = Math.max(0, open - floor);
    const step2 = open - room * .4;
    const step3 = open - room * .8;

    $('#rOpen').textContent = fmt(open);
    $('#rFloor').textContent = fmt(floor);
    $('#rRoom').textContent = fmt(room);

    $('#rLadder').innerHTML = `
      <div class="ladder-row"><b>پیشنهاد اول</b><strong>${fmt(open)}</strong><span>بدون قید و شرط، همراه ارزش و گارانتی</span></div>
      <div class="ladder-row"><b>امتیاز دوم</b><strong>${fmt(step2)}</strong><span>در ازای پرداخت نقد / خرید همراه</span></div>
      <div class="ladder-row"><b>آخرین حد مجاز</b><strong>${fmt(step3)}</strong><span>فقط با عوض روشن و مشخص</span></div>
      <div class="ladder-row stop"><b>خط قرمز</b><strong>${fmt(floor)}</strong><span>پایینتر از این نفروشید</span></div>`;

    let warn = '';
    if (tgtM <= minM) warn = '⚠ حاشیه هدف باید بزرگتر از حداقل حاشیه باشد؛ موقتاً ۵ واحد بالاتر در نظر گرفته شد.';
    if (competitor > 0) {
      if (competitor < floor) warn += (warn ? ' ' : '') + '⚠ قیمت رقیب زیر کف شماست؛ وارد جنگ قیمت نشوید. روی تطبیق، اصالت، گارانتی و تحویل تمرکز کنید.';
      else if (competitor < open) warn += (warn ? ' ' : '') + 'ℹ قیمت رقیب داخل محدوده مجاز شماست؛ حتماً کد فنی و برندش را قبل از مقایسه تطبیق دهید.';
      else warn += (warn ? ' ' : '') + 'ℹ پیشنهاد شما پایینتر از رقیب است؛ دلیلش را شفاف بگویید و تخفیف اضافه ندهید.';
    }
    if (!warn) warn = 'همه مبالغ با همان واحد پولی است که وارد کردهاید؛ مالیات و هزینههای جانبی را جداگانه و شفاف اعلام کنید.';
    $('#rWarning').textContent = warn;

    $('#rScript').textContent =
      `برای «${part}» کد فنی را تطبیق دادم. گزینه پیشنهادی من ${fmt(open)} است که شامل ${bundle} میشود؛ یعنی خیالتان از بابت جا افتادن و گارانتی راحت است. ` +
      `اگر همان لحظه نقد تسویه کنید یا قطعه همراهش را هم بگیرید، تا ${fmt(step2)} همراهتان هستم. ` +
      `پایینتر از ${fmt(floor)} نمیتوانم برم، چون آنجا دیگر کیفیت و خدمات بعد از فروش را نمیتوانم تضمین کنم. براتون بسته کنم؟`;
  }
  $$('#retailTool input').forEach(i => i.addEventListener('input', updateRetail));
  updateRetail();

  /* ============================================================
     ابزار ۴ · شبیهساز گفتگو + کارت اعتراض
     ============================================================ */
  const FLOW = [
    { tag:'گام ۱ · ورود', title:'خوشامد و مجوز صحبت', say:'«خوش اومدید. بفرمایید مشکل ماشین چیه؟ من اول دقیق متوجه بشم، بعد سریع کمکتون کنم.»', ask:'بپرس: «خودتون تشریف آوردید یا تعمیرکار فرستادتون؟»' },
    { tag:'گام ۲ · کشف', title:'شش سؤال، قبل از هر قیمت', say:'«مدل، سال، کد موتور، علائم، کی نصب میکنه، و کد روی قطعهای که درآوردید.»', ask:'بپرس: «عجله دارید یا کی براتون مناسبه؟» — عجله، ارزش تحویل فوری را بالا میبرد.' },
    { tag:'گام ۳ · تطبیق', title:'اعتماد فنی بسازید', say:'«کد قدیمی رو با کاتالوگ مقایسه کردم؛ این یکی دقیقاً همونه. گارانتیش ۶ ماهه و شرایط مرجوعیش هم روی فاکتور مینویسم.»', ask:'بپرس: «میخواید عکسش رو هم بفرستم براتون قبل از تحویل؟»' },
    { tag:'گام ۴ · ارزش', title:'سه گزینه، نه یک عدد', say:'«اقتصادی، پیشنهادی و اصلی داریم. پیشنهاد من وسطیه: هم گارانتی داره، هم همراهش گریس و پیچ نو میدم.»', ask:'بپرس: «کیفیت براتون مهمتره یا فقط تا سرویس بعدی میخواید کار کنه؟»' },
    { tag:'گام ۵ · اعتراض', title:'LAER و بده-بگیر', say:'«حق میدم، عدد مهمیه. فقط بپرسم با کدوم گزینه مقایسش میکنید؟ اگه همون کد و برنده، براتون بررسی میکنم.»', ask:'بپرس: «اگه نقد حساب کنید، میتونم تا این حد همراهتون باشم.» — همیشه عوض بگیر.' },
    { tag:'گام ۶ · بستن', title:'خلاصه، سؤال بستن، پیگیری', say:'«پس لنت پیشنهادی + گریس و پیچ، امروز ساعت ۴ آمادست. براتون بسته کنم؟»', ask:'بپرس: «شمارتون رو داشته باشم فردا بعد نصب بپرسم راضی بودید؟»' }
  ];
  let flowStep = 0;
  function renderFlow() {
    const s = FLOW[flowStep];
    $('#flowCount').textContent = `${toFa(flowStep + 1)} / ${toFa(FLOW.length)}`;
    $('#flowBody').innerHTML = `<div class="step-card"><span class="step-tag">${s.tag}</span><h5>${s.title}</h5><div class="step-say"><b>بگویید:</b> ${s.say}</div><div class="step-ask"><b>بپرسید / یادداشت:</b> ${s.ask}</div></div>`;
    $('#flowPrev').disabled = flowStep === 0;
    $('#flowNext').textContent = flowStep === FLOW.length - 1 ? 'شروع دوباره ↺' : 'گام بعد ←';
  }
  $('#flowPrev').addEventListener('click', () => { if (flowStep > 0) { flowStep--; renderFlow(); } });
  $('#flowNext').addEventListener('click', () => { flowStep = (flowStep + 1) % FLOW.length; renderFlow(); });
  renderFlow();

  const OBJECTIONS = [
    { q:'«خیلی گرونه!»', a:'<b>گوش + پرسش:</b> «حق میدم، با چه گزینهای مقایسش میکنید؟» بعد تفاوت را به گارانتی، طول عمر و تطبیق ترجمه کنید. اگر واقعاً بودجه محدود است، گزینه اقتصادی را <i>صادقانه</i> معرفی کنید، نه اینکه بیدلیل تخفیف بدهید.' },
    { q:'«فلان مغازه ارزونتر داده!»', a:'<b>تطبیق قبل از واکنش:</b> «حتماً، فقط بپرسم همون کد فنی و همون برنده؟ گارانتی و حملش چطور؟» اغلب تفاوت از برند، بستهبندی یا خدمات همراه است. اگر دقیقاً همان کالا ارزانتر بود، زیر کف خودتان نروید؛ بگویید «من روی این گزینه نمیتونم اون عدد رو با گارانتی بدم».' },
    { q:'«مطمئنی جا میفته؟»', a:'<b>سند نشان بده:</b> کد روی قطعه قدیمی، کاتالوگ، عکس یا VIN. بگویید «با این کد تطبیق دادم؛ اگه چیزی نامشخص بمونه، همینجا میگم بررسی میکنم.» صداقت در شک، از قاطعیت دروغین ارزشمندتر است.' },
    { q:'«همین الان لازم دارم!»', a:'<b>زمان را دقیق بگویید:</b> «الان موجوده، تا ۲۰ دقیقه دیگه آماده تحویله؛ اگه بخواید بفرستم، ساعت ۴ به دستتون میرسه.» قولی ندهید که انبار و پیک انجام نمیدهند — فصل ۱ دقیقاً برای همین است.' },
    { q:'«یه تخفیف بده دیگه، مشتری قدیمیم!»', a:'<b>قدردانی + عوض:</b> «ممنون که همیشه پیش ما میاید، برام مهمه. اگه امروز نقد تسویه کنید / قطعه همراهش رو هم بگیرید، میتونم تا این حد همراهتون باشم.» رابطه خوب را حفظ کنید، ولی قانون بده-بگیر را نشکنید.' },
    { q:'«گارانتیش چیه؟ اگه خراب شد چی؟»', a:'<b>شفاف و مکتوب:</b> مدت، پوشش، موارد خارج از گارانتی (نصب اشتباه، کد نامطمئن)، و مسیر دقیق مرجوعی. ابهام در گارانتی، همان اعتراضی است که فصل بعد در قرارداد عمده تبدیل به اختلاف میشود.' },
    { q:'«خودم آنلاین پیدا کردم، فقط قیمت بگو!»', a:'<b>ارزش خدماتتان را یادآوری کنید:</b> «حتماً، قیمت ما اینه. تفاوتش اینه که اینجا کد رو براتون تطبیق میدم، همین الان تحویل میگیرید و اگه مشکلی بود یک آدرس دارید برگردید.» بعد سؤال بستن بپرسید.' },
    { q:'«بذار فکر کنم، بعداً برمیگردم.»', a:'<b>کمک به تصمیم، نه فشار:</b> «حتماً. فقط دو چیز بنویسم براتون: کد فنی دقیق و اینکه تا آخر هفته موجودیه. اگه خواستید عکسش رو هم میفرستم.» با اجازه، شماره بگیرید و فردا پیگیری کوتاه کنید.' }
  ];
  let objIndex = -1;
  function nextObjection() {
    objIndex = (objIndex + 1 + Math.floor(Math.random() * (OBJECTIONS.length - 1))) % OBJECTIONS.length;
    $('#objectionText').textContent = OBJECTIONS[objIndex].q;
    $('#objectionAnswer').innerHTML = OBJECTIONS[objIndex].a;
    $('#objectionAnswer').hidden = true;
    $('#objectionReveal').textContent = 'نمایش پاسخ پیشنهادی';
  }
  $('#objectionNext').addEventListener('click', nextObjection);
  $('#objectionReveal').addEventListener('click', () => {
    const a = $('#objectionAnswer');
    a.hidden = !a.hidden;
    $('#objectionReveal').textContent = a.hidden ? 'نمایش پاسخ پیشنهادی' : 'پنهان کردن پاسخ';
  });
  nextObjection();

  /* ============================================================
     ابزار ۵ · برگه BATNA
     ============================================================ */
  const batnaMap = { '#batnaTarget':'target', '#batnaFloor':'floor', '#batnaAlt':'alt' };
  Object.entries(batnaMap).forEach(([sel, key]) => {
    const el = $(sel); el.value = state.batna[key] || '';
    el.addEventListener('input', () => {
      state.batna[key] = el.value; save();
      $('#batnaStatus').textContent = '✓ ذخیره شد. همین برگه را قبل از جلسه یکبار بخوانید.';
    });
  });

  /* ============================================================
     ابزار ۶ · مقایسه قیمت مؤثر عمده
     ============================================================ */
  function readDeal(n) {
    const card = $(`.deal-card[data-deal="${n}"]`);
    const g = cls => parseNum($('.' + cls, card).value);
    return { list:g('w-list'), disc:g('w-disc'), days:g('w-days'), freight:g('w-freight'), ret:g('w-ret'), rebate:g('w-rebate') };
  }
  function updateWholesale() {
    const rate = clamp(val('#wRate'), 0, 200);
    const res = [1,2].map(n => {
      const d = readDeal(n);
      const base = d.list * (1 - clamp(d.disc, 0, 100) / 100);
      const capital = base * (Math.max(0, d.days) / 365) * (rate / 100);
      const risk = base * (clamp(d.ret, 0, 100) / 100) * .5;
      const rebate = base * (clamp(d.rebate, 0, 100) / 100);
      const eff = base + d.freight + capital + risk - rebate;
      return { eff, base, capital, risk, rebate, freight:d.freight };
    });
    $('#wOut1').textContent = fmt(res[0].eff);
    $('#wOut2').textContent = fmt(res[1].eff);
    const br = r => `پایه ${fmt(r.base)} + حمل ${fmt(r.freight)} + سرمایه ${fmt(r.capital)} + ریسک مرجوعی ${fmt(r.risk)} − ریبیت ${fmt(r.rebate)}`;
    $('#wBr1').textContent = br(res[0]);
    $('#wBr2').textContent = br(res[1]);
    const diff = Math.abs(res[0].eff - res[1].eff);
    if (diff < res[0].eff * .002) {
      $('#wWinner').textContent = 'تقریباً برابر';
      $('#wDiff').textContent = 'عددها نزدیکاند؛ سراغ مهرههای غیرقیمتی بروید: زمان تحویل، نرخ پرکردن سفارش، RMA و ثبات قیمت.';
    } else {
      const win = res[0].eff < res[1].eff ? 'الف' : 'ب';
      $('#wWinner').textContent = `پیشنهاد ${win} به صرفهتر`;
      $('#wDiff').textContent = `اختلاف ${fmt(diff)} در هر واحد است؛ در حجم ماهانه ضربش کنید تا اندازه واقعی تصمیم معلوم شود.`;
    }
  }
  $$('#wholesaleTool input').forEach(i => i.addEventListener('input', updateWholesale));
  updateWholesale();

  /* ============================================================
     ابزار ۷ · دفتر بده/بگیر
     ============================================================ */
  function renderConcessions() {
    const body = $('#cTable tbody');
    body.innerHTML = state.concessions.length
      ? state.concessions.map((c, i) => `<tr><td>${esc(c.give)}</td><td>${esc(c.get)}</td><td><button class="del-btn" data-del="${i}" aria-label="حذف ردیف">×</button></td></tr>`).join('')
      : `<tr><td colspan="3" style="color:var(--muted)">هنوز ردیفی ثبت نشده است.</td></tr>`;
    $$('[data-del]', body).forEach(b => b.addEventListener('click', () => {
      state.concessions.splice(+b.dataset.del, 1); save(); renderConcessions();
    }));
    const missing = state.concessions.filter(c => !c.get.trim()).length;
    $('#cBalance').textContent = state.concessions.length === 0
      ? 'قاعده طلایی: هیچ امتیازی بدون عوض. هرچه دادید را همینجا بنویسید.'
      : missing === 0
        ? `✓ ${toFa(state.concessions.length)} امتیاز ثبت شد و برای همهشان عوضی گرفتهاید. مذاکره متعادل است.`
        : `⚠ ${toFa(missing)} ردیف بدون عوض مانده است؛ قبل از ادامه، برایشان چیزی بگیرید (تسویه زودتر، MOQ بالاتر، تعهد حجم).`;
  }
  $('#cAdd').addEventListener('click', () => {
    const give = text('#cGive');
    if (!give) { toast('اول بنویسید چه امتیازی دادهاید'); return; }
    state.concessions.push({ give, get: text('#cGet') });
    $('#cGive').value = ''; $('#cGet').value = '';
    save(); renderConcessions(); toast('ردیف ثبت شد ✓');
  });
  $('#cGet').addEventListener('keydown', e => { if (e.key === 'Enter') $('#cAdd').click(); });
  renderConcessions();

  /* ============================================================
     ابزار ۸ · دفترچه روزانه + نقطه سربهسر
     ============================================================ */
  const TYPE_LABEL = {
    sale_cash:'فروش نقدی', sale_credit:'فروش نسیه', cogs:'بهای کالای فروشرفته',
    purchase:'خرید کالا', expense:'هزینه عملیاتی', collect:'وصول مطالبات', pay:'پرداخت بدهی'
  };
  $('#lDate').value = todayFa();

  function renderLedger() {
    const body = $('#lTable tbody');
    body.innerHTML = state.ledger.length
      ? state.ledger.map((e, i) => `<tr><td>${esc(e.date)}</td><td>${esc(e.desc)}</td><td>${esc(TYPE_LABEL[e.type] || e.type)}</td><td>${fmt(e.amount)}</td><td><button class="del-btn" data-l-del="${i}" aria-label="حذف رویداد">×</button></td></tr>`).join('')
      : `<tr><td colspan="5" style="color:var(--muted)">دفتر خالی است. چند رویداد ساده اضافه کنید و تفاوت سود و نقد را ببینید.</td></tr>`;
    $$('[data-l-del]', body).forEach(b => b.addEventListener('click', () => {
      state.ledger.splice(+b.dataset.lDel, 1); save(); renderLedger();
    }));

    const sum = type => state.ledger.filter(e => e.type === type).reduce((n, e) => n + e.amount, 0);
    const revenue = sum('sale_cash') + sum('sale_credit');
    const cogs = sum('cogs');
    const gross = revenue - cogs;
    const expenses = sum('expense');
    const net = gross - expenses;
    const cash = sum('sale_cash') + sum('collect') - sum('purchase') - sum('expense') - sum('pay');
    const receivables = sum('sale_credit') - sum('collect');
    const inventory = sum('purchase') - cogs;

    const cell = (label, v, risky) => `<div><small>${label}</small><strong class="${risky && v < 0 ? 'neg' : ''}">${fmt(v)}</strong></div>`;
    let insight = 'نکته: اعداد بالا آموزشیاند و جایگزین دفتر رسمی و نظر حسابدار نیستند.';
    if (state.ledger.length && net > 0 && cash < 0) insight = '🔎 سود دارید ولی نقد منفی است: دقیقاً همان «سود ≠ نقد». سراغ وصول مطالبات و زمانبندی پرداخت به تأمینکننده بروید.';
    else if (state.ledger.length && receivables > 0) insight = `🔎 ${fmt(receivables)} طلب دارید. همین عدد فردا روی تصمیم خرید و تخفیف اثر میگذارد.`;
    else if (state.ledger.length) insight = '🔎 ترتیب ثبت را دست نزنید: فاکتور شمارهدار ← دفتر ← شمارش صندوق ← مغایرتگیری همان روز.';

    $('#lSummary').innerHTML =
      cell('فروش', revenue) + cell('بهای کالای فروشرفته', cogs) +
      cell('سود ناخالص', gross, true) + cell('هزینههای عملیاتی', expenses) +
      cell('سود خالص', net, true) + cell('وجه نقد', cash, true) +
      cell('مطالبات', receivables, true) + cell('موجودی تقریبی', inventory, true) +
      `<p class="fine" style="grid-column:1/-1">${insight}</p>`;
  }
  $('#lAdd').addEventListener('click', () => {
    const amount = val('#lAmount');
    if (amount <= 0) { toast('مبلغ را وارد کنید'); return; }
    state.ledger.push({
      date: text('#lDate') || todayFa(),
      desc: text('#lDesc') || TYPE_LABEL[$('#lType').value],
      type: $('#lType').value,
      amount
    });
    $('#lDesc').value = ''; $('#lAmount').value = '';
    save(); renderLedger(); toast('رویداد ثبت شد ✓');
  });
  $('#lAmount').addEventListener('keydown', e => { if (e.key === 'Enter') $('#lAdd').click(); });
  $('#lClear').addEventListener('click', () => {
    if (!state.ledger.length) return;
    if (confirm('همه رویدادهای این دفترچه تمرینی پاک شود؟')) { state.ledger = []; save(); renderLedger(); toast('دفتر پاک شد'); }
  });
  renderLedger();

  function updateBreakEven() {
    const fixed = val('#beFixed'), margin = clamp(val('#beMargin'), 1, 99), daily = val('#beDaily');
    const rev = fixed / (margin / 100);
    $('#beRevenue').textContent = fmt(rev);
    const days = daily > 0 ? Math.ceil(rev / daily) : 0;
    $('#beDays').textContent = daily > 0
      ? `با میانگین فروش روزانه ${fmt(daily)}، حدود ${toFa(days)} روز کاری (تقریباً روز ${toFa(days)}ام ماه) به سربهسر میرسید؛ از آنجا به بعد هر فروش، سود خالص میسازد.`
      : 'میانگین فروش روزانه را وارد کنید تا تعداد روزها هم محاسبه شود.';
  }
  $$('#beFixed, #beMargin, #beDaily').forEach(i => i.addEventListener('input', updateBreakEven));
  updateBreakEven();

  /* ============================================================
     جستجو
     ============================================================ */
  const index = [];
  let idCounter = 0;
  $$('main h2, main h3, main h4').forEach(h => {
    if (!h.id) h.id = 'sec-' + (++idCounter);
    const sec = h.closest('section');
    const sectionTitle = (sec && sec.querySelector('h2')) ? sec.querySelector('h2').textContent.trim().replace(/\s+/g,' ') : '';
    const parentText = (h.closest('.card, .soft-panel, .script-box, .rules, .callout')?.textContent || '').replace(/\s+/g,' ').slice(0, 260);
    index.push({ title: h.textContent.trim().replace(/\s+/g,' '), sub: sectionTitle, text: (sectionTitle + ' ' + parentText).toLowerCase(), el: h });
  });
  const ALIASES = [
    { title:'کف قیمت و نردبان تخفیف', target:'m2-value', kw:'قیمت تخفیف حاشیه سود مارجین خط قرمز' },
    { title:'آدرسدهی و ساختار کد قفسه', target:'m1-address', kw:'آدرس بارکد کد فنی rack bin آدرس ساز' },
    { title:'فایو اس و ممیزی', target:'m1-5s', kw:'5s سیری سیتون سیسو سیکتسو شیتسوکه نظم' },
    { title:'قیمت مؤثر عمده', target:'m3-price', kw:'قیمت موثر اعتبار هزینه سرمایه ریبیت مرجوعی' },
    { title:'BATNA، هدف و کف مذاکره', target:'m3-prep', kw:'باتنا zopa walk away هدف کف جایگزین' },
    { title:'سود ناخالص و COGS', target:'m4-basics', kw:'سود ناخالص بهای تمام شده COGS حسابداری' },
    { title:'نقطه سربهسر', target:'m4-entry', kw:'سربه سر هزینه ثابت حاشیه فرمول' },
    { title:'چک لیست قبل از مذاکره', target:'toolkit', kw:'چک لیست تقلب خلاصه پرینت چاپ' },
    { title:'اعتراض «گرونه» و پاسخها', target:'m2-value', kw:'اعتراض گرونه لا LAER تخفیف' }
  ];
  ALIASES.forEach(a => {
    const el = document.getElementById(a.target);
    if (el) index.push({ title:a.title, sub:'میانبر موضوعی', text:(a.title + ' ' + a.kw).toLowerCase(), el });
  });

  function norm(s) { return String(s || '').toLowerCase().replace(/[\u064b-\u0652\u0640]/g,'').replace(/\s+/g,' ').trim(); }
  function search(q) {
    const n = norm(q);
    if (!n) return [];
    return index.filter(i => norm(i.title).includes(n) || norm(i.text).includes(n) || norm(i.sub).includes(n)).slice(0, 12);
  }
  function goTo(el) {
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block:'start' });
    el.classList.remove('highlight'); void el.offsetWidth; el.classList.add('highlight');
  }
  const modal = $('#searchModal'), searchInput = $('#searchInput');
  function renderResults(q, container, big) {
    const res = search(q);
    container.innerHTML = res.length
      ? res.map((r, i) => `<a href="#${r.el.id}" class="${i === 0 ? 'is-first' : ''}" data-id="${r.el.id}"><b>${esc(r.title)}</b>${big ? `<small>${esc(r.sub)}</small>` : ''}</a>`).join('')
      : `<div class="empty">${q ? 'نتیجهای پیدا نشد؛ کلمه کوتاهتری امتحان کنید.' : 'یک موضوع بنویسید…'}</div>`;
    $$('a[data-id]', container).forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const el = document.getElementById(a.dataset.id);
      closeSearch(); goTo(el);
    }));
    return res;
  }
  function openSearch() { modal.hidden = false; searchInput.value = ''; renderResults('', $('#searchResults'), true); setTimeout(() => searchInput.focus(), 40); }
  function closeSearch() { modal.hidden = true; }
  function applySearchVisibility() {
    $('#searchTrigger').classList.toggle('is-hidden', !!state.hideSearchBtn);
    $('#hideSearchBtn').checked = !!state.hideSearchBtn;
  }
  $('#searchTrigger').addEventListener('click', openSearch);
  $('#footerSearch').addEventListener('click', openSearch);
  $('#hideSearchBtn').addEventListener('change', e => {
    state.hideSearchBtn = e.target.checked;
    save(); applySearchVisibility();
    toast(state.hideSearchBtn ? 'دکمه جستجو پنهان شد؛ همیشه با Ctrl+K در دسترس است' : 'دکمه جستجو برگشت ✓');
  });
  searchInput.addEventListener('input', () => renderResults(searchInput.value, $('#searchResults'), true));
  modal.addEventListener('click', e => { if (e.target === modal) closeSearch(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); modal.hidden ? openSearch() : closeSearch(); }
    if (e.key === 'Escape') { closeSearch(); closeMenu(); }
    if (e.key === 'Enter' && !modal.hidden) {
      const first = $('#searchResults a.is-first');
      if (first) { e.preventDefault(); first.click(); }
    }
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
  applySearchVisibility();

  /* ---------- ادامه مطالعه / پاک کردن محل ذخیرهشده ---------- */
  $('#resumeBtn').addEventListener('click', () => {
    const r = state.reading;
    if (!r || r.y <= 0) return;
    window.scrollTo({ top: r.y, behavior: reduceMotion ? 'auto' : 'smooth' });
    toast('به محل ذخیرهشده برگشتید 📌');
  });
  $('#resumeClear').addEventListener('click', () => {
    state.reading = { y: 0, pct: 0, section: '' };
    save(); updateResumeChip(); toast('محل ذخیرهشده پاک شد');
  });

  /* ============================================================
     دانلود خلاصه و بازنشانی
     ============================================================ */
  $('#exportBtn').addEventListener('click', () => {
    const lines = [
      '# خلاصه من · آریو تجارت',
      `تاریخ: ${todayFa()}`,
      `پیشرفت: ${$('#progressPercent').textContent}`,
      '', '## چکلیستهای انجامشده'
    ];
    $$('[data-check]').forEach(cb => {
      if (cb.checked) lines.push('- [x] ' + cb.closest('label').querySelector('span').textContent.trim());
    });
    lines.push('', '## برگه قبل از مذاکره (BATNA)');
    lines.push(`هدف: ${state.batna.target || '—'}`);
    lines.push(`کف / خط قرمز: ${state.batna.floor || '—'}`);
    lines.push(`جایگزین واقعی: ${state.batna.alt || '—'}`);
    lines.push('', '## دفتر بده / بگیر');
    state.concessions.forEach(c => lines.push(`- دادم: ${c.give} | گرفتم: ${c.get || '— (عوضی ثبت نشده!)'}`));
    lines.push('', '## امتیاز آزمونها');
    Object.keys(QUIZ).forEach(k => lines.push(`- ${k}: ${quizCorrect(k)} از ${QUIZ[k].length}`));
    lines.push('', '## خلاصه دفترچه تمرینی');
    state.ledger.forEach(e => lines.push(`- ${e.date} | ${TYPE_LABEL[e.type]} | ${e.desc} | ${fmt(e.amount)}`));
    lines.push('', '---', 'آریو تجارت · آموزش داخلی؛ تصمیمهای مالی و حقوقی را با متخصص مربوطه نهایی کنید.');

    const blob = new Blob([lines.join('\n')], { type:'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kholase-ario-tejarat.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('خلاصه دانلود شد ✓');
  });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('تمام تیکها، پاسخها و دفترچهها پاک شود؟ این کار برگشتپذیر نیست.')) return;
    state.checks = {}; state.quizzes = {}; state.ledger = []; state.concessions = {};
    state.batna = { target:'', floor:'', alt:'' }; state.certName = '';
    state.reading = { y:0, pct:0, section:'' };
    save(); location.reload();
  });

  /* ---------- راهاندازی نهایی ---------- */
  updateProgress();
  onScroll();
  setTimeout(() => {
    const hadSavedPlace = !!(state.reading && state.reading.y > 300);
    restoreReading();
    if (!hadSavedPlace) toast('خوش آمدید 🌿 پیشرفت و محل مطالعتان خودکار ذخیره میشود');
  }, 320);
})();
