/* ==========================================================================
   آزمون شایستگی‌های عمومی کارکنان
   ========================================================================== */
(() => {
  "use strict";

  /* ---------- تنظیمات ---------- */
  const CONFIG = {
    secondsPerQuestion: 20,
    advanceDelay: 300,   // میلی‌ثانیه تا نمایش سؤال بعد از انتخاب پاسخ
    urgentAt: 3          // ثانیه‌ای که تایمر قرمز می‌شود
  };

  const LETTERS = ["الف", "ب", "پ", "ت"];

  /* ---------- بانک سؤالات ---------- */
  const QUESTIONS = [
    {
      cat: "رفتار و شایستگی فردی", level: "مقدماتی",
      q: "در پایان روز متوجه می‌شوید کاری که مسئول انجام آن بوده‌اید، به دلیل اشتباه خودتان ناقص مانده است. بهترین اقدام چیست؟",
      opts: ["موضوع را مطرح نکنم مگر اینکه کسی متوجه شود", "مسئولیت را بپذیرم، موضوع را اطلاع بدهم و برای اصلاح اقدام کنم", "اشتباه را به حجم کار واحد نسبت بدهم", "کار را به همکار دیگری واگذار کنم بدون توضیح"],
      ans: 1,
      why: "پذیرش مسئولیت، اطلاع‌رسانی به‌موقع و اقدام اصلاحی نشانه پاسخ‌گویی حرفه‌ای است."
    },
    {
      cat: "رفتار و شایستگی فردی", level: "مقدماتی",
      q: "وقتی چند وظیفه هم‌زمان به شما محول می‌شود، کدام روش معمولاً اثربخش‌تر است؟",
      opts: ["شروع کاری که ساده‌تر است، بدون توجه به اولویت", "انجام همه کارها به‌صورت هم‌زمان", "مشخص‌کردن فوریت و اهمیت، سپس برنامه‌ریزی و اطلاع‌رسانی درباره زمان انجام", "انتظار برای اینکه مدیر دوباره اولویت‌ها را اعلام کند"],
      ans: 2,
      why: "اولویت‌بندی بر اساس فوریت و اهمیت، همراه با شفاف‌سازی ظرفیت و زمان، از آشفتگی و تأخیر جلوگیری می‌کند."
    },
    {
      cat: "رفتار و شایستگی فردی", level: "متوسط",
      q: "همکارتان در حضور دیگران از عملکرد شما انتقاد می‌کند و بخشی از انتقاد را نادرست می‌دانید. واکنش حرفه‌ای‌تر چیست؟",
      opts: ["با صدای بلند از خود دفاع کنم", "در همان لحظه انتقاد او را با حمله متقابل پاسخ بدهم", "موضوع را نادیده بگیرم و همکاری را قطع کنم", "آرام بمانم، بخش‌های قابل بررسی را بشنوم و درباره اختلاف به‌صورت محترمانه و مستند گفتگو کنم"],
      ans: 3,
      why: "خودکنترلی، شنیدن بازخورد و گفتگوی محترمانه امکان حل اختلاف را افزایش می‌دهد؛ حتی وقتی با تمام انتقاد موافق نیستید."
    },
    {
      cat: "رفتار و شایستگی فردی", level: "متوسط",
      q: "به اطلاعاتی درباره اشتباه احتمالی یکی از همکاران دسترسی پیدا می‌کنید. هنوز از صحت آن مطمئن نیستید. چه می‌کنید؟",
      opts: ["موضوع را در جمع کارکنان مطرح می‌کنم", "بدون قضاوت، اطلاعات را بررسی و از مسیر مسئول مربوط پیگیری می‌کنم", "برای جلوگیری از دردسر، موضوع را به همه اطلاع می‌دهم", "آن را در شبکه‌های اجتماعی یا گروه‌های غیررسمی مطرح می‌کنم"],
      ans: 1,
      why: "راستی‌آزمایی، رعایت محرمانگی و استفاده از مسیر رسمی مانع شایعه‌سازی و آسیب به اعتبار افراد می‌شود."
    },
    {
      cat: "روان‌شناسی محیط کار", level: "مقدماتی",
      q: "در ساعات پرترافیک کاری، چند درخواست هم‌زمان دریافت می‌کنید و احساس فشار دارید. مناسب‌ترین واکنش چیست؟",
      opts: ["با عجله همه کارها را بدون بررسی انجام دهم", "با مشتری یا همکار تند صحبت کنم تا درخواست‌ها کمتر شوند", "چند لحظه وضعیت را مرور کنم، اولویت‌ها را مشخص کنم و در صورت نیاز کمک یا زمان بیشتر درخواست کنم", "کار را رها کنم تا فشار کمتر شود"],
      ans: 2,
      why: "مدیریت فشار با مکث کوتاه، اولویت‌بندی و درخواست کمک به‌موقع، احتمال خطا و تنش را کاهش می‌دهد."
    },
    {
      cat: "روان‌شناسی محیط کار", level: "متوسط",
      q: "روش انجام یک کار در شرکت تغییر کرده است و شما به روش قبلی عادت دارید. بهترین رویکرد چیست؟",
      opts: ["دلیل تغییر و روش جدید را یاد بگیرم، ابهام‌ها را بپرسم و پس از اجرا بازخورد مستند بدهم", "تا زمانی که مدیر حضور ندارد همان روش قبلی را ادامه دهم", "از همکاران بخواهم تغییر را نادیده بگیرند", "بدون مطالعه، روش جدید را رد کنم"],
      ans: 0,
      why: "سازگاری حرفه‌ای به معنای یادگیری تغییر، پرسشگری و ارائه بازخورد مبتنی بر تجربه است."
    },
    {
      cat: "روان‌شناسی محیط کار", level: "پیشرفته",
      q: "پس از چند هفته حجم کار بالا، تمرکز شما کاهش یافته و احتمال خطا بیشتر شده است. کدام اقدام پایدارتر و حرفه‌ای‌تر است؟",
      opts: ["پنهان‌کردن مشکل و ادامه همان روند", "افزایش سرعت کار بدون تغییر روش", "سرزنش همکاران برای کاهش فشار", "شناسایی عوامل فشار، گفت‌وگو با سرپرست درباره اولویت و ظرفیت، و استفاده از وقفه‌های کوتاه و برنامه‌ریزی‌شده"],
      ans: 3,
      why: "بررسی عوامل فشار و مذاکره درباره اولویت‌ها و ظرفیت کاری، از راهکارهای عملی برای کاهش خطا و فرسودگی است."
    },
    {
      cat: "روابط سازمانی", level: "مقدماتی",
      q: "برای انجام یک کار مشترک، همکارتان اطلاعات موردنیاز را به‌موقع ارسال نمی‌کند. بهترین اقدام اولیه چیست؟",
      opts: ["کار او را در جمع سرزنش کنم", "نیاز، مهلت و اثر تأخیر را محترمانه و روشن با او مطرح کنم", "بدون اطلاع او کار را متوقف کنم", "اطلاعات ناقص را حدس بزنم و ادامه دهم"],
      ans: 1,
      why: "درخواست روشن و محترمانه، همراه با بیان زمان و اثر وابستگی کاری، معمولاً بهترین گام اولیه است."
    },
    {
      cat: "روابط سازمانی", level: "متوسط",
      q: "در یک جلسه، دو همکار درباره روش انجام کار اختلاف جدی دارند و هر دو از شما نظر می‌خواهند. نقش سازنده‌تر شما چیست؟",
      opts: ["طرف فردی را بگیرم که با او صمیمی‌تر هستم", "بحث را به موضوعات شخصی بکشانم", "به معیارها و هدف مشترک برگردم، دیدگاه‌ها را بشنوم و به توافق عملی کمک کنم", "برای پایان جلسه، بدون بررسی یکی از نظرها را تأیید کنم"],
      ans: 2,
      why: "تمرکز بر هدف، معیارهای قابل سنجش و شنیدن منصفانه دیدگاه‌ها به حل مسئله کمک می‌کند."
    },
    {
      cat: "ارتباط با مشتری", level: "مقدماتی",
      q: "مشتری ناراضی با لحن تند شکایت خود را بیان می‌کند. بهترین واکنش اولیه چیست؟",
      opts: ["بدون قطع‌کردن صحبت، با آرامش گوش بدهم و مسئله را برای اطمینان بازگو کنم", "بلافاصله توضیح بدهم که شرکت مقصر نیست", "با همان لحن پاسخ بدهم", "قبل از شنیدن کامل موضوع، گفتگو را خاتمه بدهم"],
      ans: 0,
      why: "شنیدن فعال و بازگویی مسئله نشان می‌دهد درخواست مشتری فهمیده شده و از سوءبرداشت جلوگیری می‌کند."
    },
    {
      cat: "ارتباط با مشتری", level: "متوسط",
      q: "مشتری درخواستی دارد که خارج از اختیار شماست و نمی‌توانید همان لحظه آن را تأیید کنید. چه پاسخی حرفه‌ای‌تر است؟",
      opts: ["قول قطعی بدهم تا مشتری ناراحت نشود", "بدون توضیح بگویم امکان ندارد", "درخواست را نادیده بگیرم", "محدودیت اختیار را شفاف توضیح دهم، مسیر پیگیری را مشخص کنم و زمان پاسخ واقع‌بینانه بدهم"],
      ans: 3,
      why: "شفافیت درباره اختیار و تعهد به پیگیری واقع‌بینانه، اعتماد مشتری را بهتر حفظ می‌کند."
    },
    {
      cat: "ارتباط با مشتری", level: "پیشرفته",
      q: "مشتری عصبانی است، اما اطلاعاتی که ارائه می‌کند با سوابق ثبت‌شده تفاوت دارد. مناسب‌ترین روش چیست؟",
      opts: ["اصرار کنم که اطلاعات شرکت حتماً درست است", "احساس و نگرانی او را به رسمیت بشناسم، مدارک دو طرف را بررسی و نتیجه را بدون قضاوت اعلام کنم", "برای راضی‌کردن او فوراً هر خواسته‌ای را بپذیرم", "مسئولیت بررسی را به مشتری واگذار کنم"],
      ans: 1,
      why: "همدلی بدون پذیرش بی‌بررسی ادعا، همراه با تطبیق مستندات، تعادل بین تجربه مشتری و صحت تصمیم را حفظ می‌کند."
    },
    {
      cat: "مهارت Excel", level: "مقدماتی",
      q: "در Excel، اگر بخواهید مجموع مقادیر سلول‌های B2 تا B20 را محاسبه کنید، کدام تابع مناسب است؟",
      opts: ["=COUNT(B2:B20)", "=AVERAGE(B2:B20)", "=SUM(B2:B20)", "=MAX(B2:B20)"],
      ans: 2,
      why: "تابع SUM مجموع عددی مقادیر محدوده را محاسبه می‌کند."
    },
    {
      cat: "مهارت Excel", level: "متوسط",
      q: "در سلول C2 تعداد فروش و در سلول D2 حد نصاب ۱۰ قرار دارد. می‌خواهید اگر مقدار C2 حداقل ۱۰ بود عبارت «مجاز» و در غیر این صورت «غیرمجاز» نمایش داده شود. کدام فرمول درست است؟",
      opts: ["=SUM(C2,D2)", "=COUNTIF(C2,10)", "=AVERAGE(C2,D2)", "=IF(C2>=D2,\"مجاز\",\"غیرمجاز\")"],
      ans: 3,
      why: "تابع IF یک شرط را ارزیابی می‌کند و بر اساس درست یا نادرست بودن آن یکی از دو نتیجه را برمی‌گرداند."
    },
    {
      cat: "مهارت Excel", level: "متوسط",
      q: "در محدوده A2:A100 نام واحدها ثبت شده است. برای شمارش تعداد سلول‌هایی که دقیقاً شامل «انبار» هستند، کدام تابع مناسب‌تر است؟",
      opts: ["=COUNTIF(A2:A100,\"انبار\")", "=SUM(A2:A100)", "=MAX(A2:A100)", "=AVERAGE(A2:A100)"],
      ans: 0,
      why: "COUNTIF تعداد سلول‌هایی را می‌شمارد که یک شرط مشخص را در محدوده برآورده می‌کنند."
    }
  ];

  /* ---------- ابزارها ---------- */
  const $ = (id) => document.getElementById(id);
  const toFa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const toEn = (s) => s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------- وضعیت ---------- */
  const state = {
    index: 0,
    remaining: CONFIG.secondsPerQuestion,
    timerId: null,
    locked: false,
    answers: [],
    name: "",
    dept: ""
  };

  const total = QUESTIONS.length;
  const views = ["intro", "exam", "results"];

  function showView(id) {
    views.forEach((v) => $(v).classList.toggle("hidden", v !== id));
  }

  function stopTimer() {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  /* ---------- شروع ---------- */
  function showError(message, field) {
    const box = $("formError");
    box.textContent = message;
    box.hidden = false;
    $("person").classList.toggle("invalid", field === "person");
    $("department").classList.toggle("invalid", field === "department");
    $(field).focus();
  }

  function clearError() {
    $("formError").hidden = true;
    $("person").classList.remove("invalid");
    $("department").classList.remove("invalid");
  }

  function start(event) {
    event.preventDefault();
    const name = $("person").value.trim();
    const dept = $("department").value;

    if (!name) return showError("نام و نام خانوادگی را وارد کنید.", "person");
    if (!dept) return showError("واحد سازمانی را انتخاب کنید.", "department");

    clearError();
    state.name = name;
    state.dept = dept;
    state.index = 0;
    state.answers = Array(total).fill(null);

    $("personline").textContent = `${name} | ${dept}`;
    showView("exam");
    drawQuestion();
  }

  /* ---------- نمایش سؤال ---------- */
  function updateTimer() {
    const ring = $("timer");
    ring.textContent = toFa(state.remaining);
    ring.style.setProperty("--p", `${(state.remaining / CONFIG.secondsPerQuestion) * 100}%`);
    $("timerbox").classList.toggle("urgent", state.remaining <= CONFIG.urgentAt);
  }

  function drawQuestion() {
    stopTimer();
    state.locked = false;
    state.remaining = CONFIG.secondsPerQuestion;

    const q = QUESTIONS[state.index];
    const done = state.answers.filter((a) => a !== null).length;
    const percent = Math.round((state.index / total) * 100);

    $("cat").textContent = `${q.cat} | سطح ${q.level}`;
    $("progress").textContent = `سؤال ${toFa(state.index + 1)} از ${toFa(total)}`;
    $("answered").textContent = `پاسخ داده‌شده: ${toFa(done)}`;
    $("fill").style.width = `${percent}%`;
    $("track").setAttribute("aria-valuenow", percent);
    $("question").textContent = q.q;
    $("status").textContent = "یک گزینه انتخاب کنید.";
    $("skipBtn").disabled = false;

    const list = $("options");
    list.replaceChildren(
      ...q.opts.map((text, i) => {
        const btn = el("button", "option");
        btn.type = "button";
        btn.dataset.index = i;
        btn.append(el("span", "letter", LETTERS[i]), el("span", "", text));
        return btn;
      })
    );

    updateTimer();
    state.timerId = setInterval(() => {
      state.remaining--;
      updateTimer();
      if (state.remaining <= 0) advance();
    }, 1000);
  }

  /* ---------- پاسخ و پیمایش ---------- */
  function choose(value) {
    if (state.locked) return;
    state.locked = true;
    stopTimer();
    state.answers[state.index] = value;

    [...$("options").children].forEach((btn, i) => {
      btn.disabled = true;
      btn.classList.toggle("selected", i === value);
    });
    $("status").textContent = "پاسخ ثبت شد.";
    $("skipBtn").disabled = true;

    setTimeout(advance, CONFIG.advanceDelay);
  }

  function advance() {
    state.locked = true;
    stopTimer();
    if (state.index < total - 1) {
      state.index++;
      drawQuestion();
    } else {
      finish();
    }
  }

  function skip() {
    if (state.locked) return;
    state.answers[state.index] = null;
    advance();
  }

  function onKeydown(event) {
    if ($("exam").classList.contains("hidden") || state.locked) return;
    const n = parseInt(toEn(event.key), 10);
    if (n >= 1 && n <= QUESTIONS[state.index].opts.length) choose(n - 1);
  }

  /* ---------- نتیجه ---------- */
  function gradeText(pct) {
    if (pct >= 90) return "عملکرد بسیار خوب در این نمونه آزمون";
    if (pct >= 75) return "عملکرد خوب؛ با فرصت‌هایی برای بهبود";
    if (pct >= 60) return "نتیجه متوسط؛ نیازمند تقویت برخی حوزه‌ها";
    return "نیازمند آموزش و ارزیابی تکمیلی";
  }

  function renderCategories() {
    const cats = [...new Set(QUESTIONS.map((q) => q.cat))];
    $("categoryResults").replaceChildren(
      ...cats.map((cat) => {
        const ids = QUESTIONS.map((q, i) => (q.cat === cat ? i : -1)).filter((i) => i >= 0);
        const right = ids.filter((i) => state.answers[i] === QUESTIONS[i].ans).length;
        const box = el("div", "levelbox");
        box.append(el("strong", "", `${toFa(right)} از ${toFa(ids.length)}`), el("small", "", cat));
        return box;
      })
    );
  }

  function renderReview() {
    $("review").replaceChildren(
      ...QUESTIONS.map((q, i) => {
        const given = state.answers[i];
        const ok = given === q.ans;
        const card = el("div", "result");

        card.append(el("h3", "", `${toFa(i + 1)}. ${q.q}`));
        card.append(
          el("div", `answer ${ok ? "good" : "bad"}`,
            "پاسخ شما: " + (given === null ? "بدون پاسخ" : `${LETTERS[given]} ـ ${q.opts[given]}`))
        );
        card.append(el("div", "answer good", `پاسخ پیشنهادی: ${LETTERS[q.ans]} ـ ${q.opts[q.ans]}`));
        card.append(el("div", "why", `دلیل: ${q.why}`));
        return card;
      })
    );
  }

  function finish() {
    stopTimer();
    showView("results");

    const right = state.answers.reduce((sum, a, i) => sum + (a === QUESTIONS[i].ans ? 1 : 0), 0);
    const blank = state.answers.filter((a) => a === null).length;
    const wrong = total - right - blank;
    const pct = Math.round((right / total) * 100);

    $("who").textContent = `${state.name} | واحد: ${state.dept}`;
    $("score").textContent = `${toFa(right)} از ${toFa(total)}`;
    $("correct").textContent = toFa(right);
    $("wrong").textContent = toFa(wrong);
    $("blank").textContent = toFa(blank);
    $("grade").textContent = `درصد پاسخ صحیح: ${toFa(pct)}٪ | ${gradeText(pct)}`;

    renderCategories();
    renderReview();
    scrollTop();
    $("resultTitle").focus({ preventScroll: true });
  }

  function restart() {
    stopTimer();
    $("startForm").reset();
    clearError();
    showView("intro");
    scrollTop();
    $("introTitle").focus({ preventScroll: true });
  }

  /* ---------- رویدادها ---------- */
  $("startForm").addEventListener("submit", start);
  $("person").addEventListener("input", clearError);
  $("department").addEventListener("change", clearError);
  $("options").addEventListener("click", (e) => {
    const btn = e.target.closest(".option");
    if (btn) choose(Number(btn.dataset.index));
  });
  $("skipBtn").addEventListener("click", skip);
  $("printBtn").addEventListener("click", () => window.print());
  $("restartBtn").addEventListener("click", restart);
  document.addEventListener("keydown", onKeydown);
})();
