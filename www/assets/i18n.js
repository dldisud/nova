(function () {
  var SUPPORTED = ["ko", "en"];
  var DEFAULT_LOCALE = "ko";
  var STORAGE_KEY = "inkroad-lang";

  var stored = localStorage.getItem(STORAGE_KEY);
  var browser = (navigator.language || "").slice(0, 2).toLowerCase();
  var locale = stored || (SUPPORTED.indexOf(browser) >= 0 ? browser : DEFAULT_LOCALE);

  var dict = {};
  var ready = false;
  var readyResolve = null;
  var whenReady = new Promise(function (resolve) { readyResolve = resolve; });

  /* ── t(key, params) ── */

  function t(key, params) {
    var parts = key.split(".");
    var val = dict;
    for (var i = 0; i < parts.length; i++) {
      if (val && typeof val === "object") val = val[parts[i]];
      else { val = undefined; break; }
    }
    if (typeof val !== "string") {
      if (ready) console.warn("[i18n] missing key:", key);
      return key;
    }
    if (params) {
      Object.keys(params).forEach(function (k) {
        val = val.replace(new RegExp("\\{\\{" + k + "\\}\\}", "g"), String(params[k]));
      });
    }
    return val;
  }

  /* ── DOM scan ── */

  function applyDOM() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.title = t(el.getAttribute("data-i18n-title"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    document.documentElement.lang = locale;
    updatePickerDisplay();
  }

  /* ── Load dictionary ── */

  function loadDictSync(lang) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "assets/i18n/" + lang + ".json", false);
      xhr.send();
      if (xhr.status === 200) {
        dict = JSON.parse(xhr.responseText);
      } else {
        console.error("[i18n] sync load failed for " + lang + ".json: HTTP " + xhr.status);
        dict = {};
      }
    } catch (e) {
      console.error("[i18n] sync load error for " + lang + ".json:", e);
      dict = {};
    }
  }

  async function loadDict(lang) {
    try {
      var resp = await fetch("assets/i18n/" + lang + ".json", { cache: "no-cache" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      dict = await resp.json();
    } catch (e) {
      console.error("[i18n] failed to load " + lang + ".json:", e);
      dict = {};
    }
  }

  /* ── Set locale ── */

  async function setLocale(lang) {
    if (SUPPORTED.indexOf(lang) < 0) return;
    locale = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    await loadDict(lang);
    applyDOM();
    window.dispatchEvent(new Event("inkroad-locale-change"));
  }

  /* ── Language picker ── */

  function updatePickerDisplay() {
    document.querySelectorAll("[data-lang-current]").forEach(function (el) {
      el.textContent = locale.toUpperCase();
    });
    document.querySelectorAll("[data-lang-compact]").forEach(function (el) {
      el.textContent = locale.toUpperCase();
    });
  }

  function renderPicker() {
    var containers = document.querySelectorAll("[data-lang-picker]");
    if (!containers.length) return;

    var isMobile = document.body.classList.contains("mobile-app");

    containers.forEach(function (container) {
      if (isMobile) {
        container.innerHTML =
          "<button class='lang-picker-compact' type='button' data-lang-compact>" +
            locale.toUpperCase() +
          "</button>";
        container.querySelector("[data-lang-compact]").addEventListener("click", function () {
          var idx = SUPPORTED.indexOf(locale);
          var next = SUPPORTED[(idx + 1) % SUPPORTED.length];
          setLocale(next);
        });
      } else {
        container.innerHTML =
          "<div class='lang-picker'>" +
            "<button class='lang-picker-toggle' type='button'>" +
              "<span class='material-symbols-outlined'>language</span> " +
              "<span data-lang-current>" + locale.toUpperCase() + "</span>" +
            "</button>" +
            "<div class='lang-picker-dropdown' hidden>" +
              SUPPORTED.map(function (lang) {
                var label = lang === "ko" ? "한국어" : "English";
                return "<button type='button' data-lang-option='" + lang + "'>" + label + "</button>";
              }).join("") +
            "</div>" +
          "</div>";

        var toggle = container.querySelector(".lang-picker-toggle");
        var dropdown = container.querySelector(".lang-picker-dropdown");

        toggle.addEventListener("click", function (e) {
          e.stopPropagation();
          dropdown.hidden = !dropdown.hidden;
        });
        container.querySelectorAll("[data-lang-option]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            setLocale(btn.dataset.langOption);
            dropdown.hidden = true;
          });
        });
        document.addEventListener("click", function () {
          dropdown.hidden = true;
        });
      }
    });
  }

  /* ── Init (synchronous for first load) ── */

  loadDictSync(locale);
  ready = true;
  if (readyResolve) readyResolve();

  function initDOM() {
    applyDOM();
    renderPicker();
  }

  /* ── Public API ── */

  window.inkroadI18n = {
    get locale() { return locale; },
    get dict() { return dict; },
    t: t,
    applyDOM: applyDOM,
    setLocale: setLocale,
    getLocale: function () { return locale; },
    whenReady: whenReady,
    SUPPORTED: SUPPORTED
  };

  window.t = t;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDOM);
  } else {
    initDOM();
  }
})();
