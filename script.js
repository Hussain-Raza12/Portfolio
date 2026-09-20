(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const smooth = (n) => n * n * (3 - 2 * n);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement,
    header = $(".site-header"),
    nav = $("#main-navigation"),
    menu = $(".menu-toggle");
  const story = $(".hero-story"),
    hero = $(".hero-face"),
    about = $(".about-face"),
    contact = $("#contact"),
    timeline = $(".timeline");
  const revealItems = $$(".reveal");
  const decks = $$(".scroll-deck").map((el) => ({
    el,
    name: el.dataset.deck,
    stage: $(".deck-stage", el),
    panels: $$(".deck-panel", el),
    buttons: $$("[data-step]", el),
    counter: $(".current-number", el),
    index: -1,
    start: 0,
    step: 0,
    travel: 0,
  }));
  let height = innerHeight,
    enabled = false,
    storyEnabled = false,
    storyStart = 0,
    storyTravel = 1,
    frame = 0,
    resizeTimer;
  let codeTimer,
    contactTimer,
    contactTyped = false;
  const typing = new Map(),
    code = $("#hero-code"),
    fullCode = code.textContent,
    contactCode = $("[data-contact-type]"),
    fullContact = contactCode.textContent;
  function closeMenu() {
    menu.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  }
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      closeMenu();
      menu.focus({ preventScroll: true });
    }
  });
  document.addEventListener("click", (e) => {
    if (!header.contains(e.target)) closeMenu();
  });
  function paintCode(text) {
    const fragment = document.createDocumentFragment();
    text.split(/(<\/?[\w-]+|\/?>)/g).forEach((part, i) => {
      if (i % 2) {
        const span = document.createElement("span");
        span.className = "syntax-tag";
        span.textContent = part;
        fragment.append(span);
      } else fragment.append(document.createTextNode(part));
    });
    code.replaceChildren(fragment);
  }
  function typeText(el, text, interval, delay = 0) {
    if (reduced.matches) {
      if (el === code) paintCode(text);
      else el.textContent = text;
      return null;
    }
    let index = 0;
    el.textContent = "";
    const timer = setInterval(() => {
      if (delay > 0) {
        delay -= interval;
        return;
      }
      index += 1;
      if (el === code) paintCode(text.slice(0, index));
      else el.textContent = text.slice(0, index);
      if (index >= text.length) clearInterval(timer);
    }, interval);
    return timer;
  }
  // Keep semantic text, line breaks and the original gold emphasis.
  $$(".type-heading").forEach((heading) => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT),
      nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      [...node.textContent].forEach((char) => {
        const span = document.createElement("span");
        span.className = "heading-char";
        span.textContent = char;
        span.setAttribute("aria-hidden", "true");
        fragment.append(span);
      });
      node.replaceWith(fragment);
    });
    heading.setAttribute("aria-label", heading.dataset.type);
  });
  function startHeading(panel) {
    const heading = $(".type-heading", panel);
    if (!heading) return;
    const chars = $$(".heading-char", heading);
    if (panel.dataset.headingComplete === "true" || typing.has(heading)) return;
    if (reduced.matches || !enabled) {
      chars.forEach((c) => c.classList.remove("hidden-char"));
      return;
    }
    panel.classList.add("heading-started");
    chars.forEach((c) => c.classList.add("hidden-char"));
    delete panel.dataset.contentStarted;
    typing.set(heading, {
      start: performance.now(),
      chars,
      shown: -1,
      panel,
    });
    schedule();
  }
  function updateIndicators(deck) {
    const current = deck.buttons[deck.index];
    if (!current) return;
    if (deck.name === "help") {
      const line = $(".help-tab-line", deck.el);
      line.style.width = current.offsetWidth + "px";
      line.style.transform = `translateX(${current.offsetLeft}px)`;
    }
    if (deck.name === "work") {
      const marker = $(".index-marker", deck.el);
      if (innerWidth <= 760) {
        marker.style.top = "auto";
        marker.style.width = current.offsetWidth + "px";
        marker.style.transform = `translateX(${current.offsetLeft}px)`;
      } else {
        marker.style.top = current.offsetTop + current.offsetHeight / 2 + "px";
        marker.style.width = "18px";
        marker.style.transform = "";
      }
    }
  }
  function activate(deck, index) {
    if (deck.index === index) return;
    deck.index = index;
    deck.panels.forEach((panel, i) => {
      const active = i === index;
      panel.classList.toggle("active", active);
      panel.inert = !active;
      panel.setAttribute("aria-hidden", String(!active));
      if (Math.abs(i - index) <= 1)
        $$("img", panel).forEach((img) => (img.loading = "eager"));
      if (active) {
        panel.dataset.entered = String(performance.now());
        panel.classList.remove("heading-started");
        panel.classList.remove("content-ready");
        delete panel.dataset.contentStarted;
        delete panel.dataset.headingComplete;
        if (deck.inView) startHeading(panel);
      }
    });
    deck.buttons.forEach((button) => {
      const active = Number(button.dataset.step) === index;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    if (deck.counter) {
      deck.counter.textContent = String(index + 1).padStart(2, "0");
      deck.counter.classList.remove("count-shift");
      void deck.counter.offsetWidth;
      deck.counter.classList.add("count-shift");
    }
    if (deck.name === "work")
      $(".work-category", deck.el).textContent =
        index < 5 ? "Web Development" : "Social Media Marketing";
    updateIndicators(deck);
  }
  function measure() {
    height = innerHeight;
    const hh = header.offsetHeight;
    root.style.setProperty("--header", hh + "px");
    enabled = !reduced.matches && height >= 660;
    storyEnabled = enabled && innerWidth > 760;
    root.classList.toggle("motion", enabled);
    root.classList.toggle("story-motion", storyEnabled);
    storyTravel = height * 1.8;
    story.style.height = storyEnabled ? height + storyTravel + "px" : "";
    decks.forEach((deck) => {
      deck.step =
        height *
        (deck.name === "work" ? 1.8 : deck.name === "help" ? 1.9 : 1.9);
      deck.travel = deck.step * (deck.panels.length - 0.38);
      deck.el.style.height = enabled ? height - hh + deck.travel + "px" : "";
      if (!enabled) {
        deck.panels.forEach((panel) => {
          panel.removeAttribute("style");
          panel.inert = false;
          panel.removeAttribute("aria-hidden");
          panel.classList.remove("neighbor");
          $$(".heading-char", panel).forEach((c) =>
            c.classList.remove("hidden-char"),
          );
          $$(
            ".text-build,.skill-art img,.fast-heading,.project-copy,.help-art",
            panel,
          ).forEach((el) => el.removeAttribute("style"));
        });
      } else deck.index = -1;
    });
    if (!storyEnabled) {
      about.removeAttribute("style");
      about.inert = false;
      about.removeAttribute("aria-hidden");
      hero.inert = false;
      hero.removeAttribute("aria-hidden");
      $$(
        ".hero-rest,.portrait-layer,.code-layer,.about-grid>div,.about-disciplines",
      ).forEach((el) => el.removeAttribute("style"));
    }
    storyStart = story.offsetTop;
    decks.forEach((deck) => {
      deck.start = deck.el.getBoundingClientRect().top + scrollY - hh;
      updateIndicators(deck);
    });
    schedule();
  }
  function renderStory(y) {
    if (!storyEnabled) return;
    const p = clamp((y - storyStart) / storyTravel),
      t = smooth(clamp((p - 0.09) / 0.7)),
      ct = smooth(clamp((p - 0.05) / 0.7)),
      pt = smooth(clamp((p - 0.13) / 0.7));
    $$(".hero-rest").forEach((el) => {
      el.style.transform = `rotateY(${-180 * t}deg) translateZ(${-80 * Math.sin(t * Math.PI)}px)`;
      el.style.opacity = "1";
    });
    $(".code-layer").style.transform =
      `perspective(1200px) rotateY(${180 * ct}deg) translateZ(${-110 * Math.sin(ct * Math.PI)}px)`;
    $(".code-layer").style.opacity = "1";
    $(".portrait-layer").style.transform =
      `perspective(1400px) rotateY(${-180 * pt}deg) translateZ(${-130 * Math.sin(pt * Math.PI)}px)`;
    $(".portrait-layer").style.opacity = "1";
    about.style.visibility = p > 0.1 ? "visible" : "hidden";
    about.style.transform = `rotateY(${180 * (1 - t)}deg)`;
    about.style.opacity = "1";
    $$(".about-grid>div,.about-disciplines").forEach((el, i) => {
      const a = clamp((p - 0.37 - i * 0.025) / 0.27);
      el.style.translate = `0 ${(1 - a) * 24}px`;
      el.style.opacity = String(a);
    });
    const active = p > 0.64;
    about.inert = !active;
    about.setAttribute("aria-hidden", String(!active));
    hero.inert = active;
    hero.setAttribute("aria-hidden", String(active));
  }
  function renderDeck(deck, y, now) {
    if (!enabled) return;
    const raw = clamp(
        (y - deck.start) / deck.step,
        0,
        deck.panels.length - 0.001,
      ),
      base = Math.floor(raw),
      t =
        base === deck.panels.length - 1
          ? 0
          : smooth(clamp((raw - base - 0.05) / 0.95));
    const activeThreshold = deck.name === "work" ? 0.55 : 0.01;
    const active = clamp(
      base + (t > activeThreshold ? 1 : 0),
      0,
      deck.panels.length - 1,
    );
    activate(deck, active);
    const inView =
      y > deck.start - height * 0.45 &&
      y < deck.start + deck.travel + height * 0.4;
    if (inView && !deck.inView) {
      deck.panels[active].dataset.entered = String(now);
      startHeading(deck.panels[active]);
    }
    deck.inView = inView;
    deck.panels.forEach((panel, i) => {
      const isBase = i === base,
        isNext = i === base + 1 && t > 0;
      panel.classList.toggle("neighbor", isBase || isNext);
      if (!isBase && !isNext) {
        panel.style.visibility = "hidden";
        return;
      }
      panel.style.visibility = "visible";
      panel.style.zIndex = isNext ? "3" : "2";
      if (isNext && i !== active) {
        const incomingText = $(".text-build", panel),
          incomingFast = $(".fast-heading", panel),
          incomingProject = $(".project-copy", panel);
        if (incomingText) incomingText.style.clipPath = "inset(0 100% 0 0)";
        if (incomingFast) incomingFast.style.clipPath = "inset(0 100% 0 0)";
        if (incomingProject) {
          incomingProject.style.translate = "0 18px";
          incomingProject.style.opacity = "0.3";
        }
      }
      if (deck.name === "skills") {
        panel.style.transform = isBase
          ? `translateZ(${-180 * t}px) scale(${1 - 0.08 * t})`
          : `translateY(${110 * (1 - t)}%) translateZ(0)`;
        panel.style.opacity = isBase ? String(1 - 0.88 * t) : "1";
      } else if (deck.name === "work") {
        panel.style.transform = isBase
          ? `translateZ(${-190 * t}px) translateX(${-5 * t}%) scale(${1 - 0.06 * t})`
          : `translateX(${110 * (1 - t)}%)`;
        panel.style.opacity = isBase ? String(1 - 0.85 * t) : "1";
      } else {
        panel.style.transform = isBase
          ? `translateY(${-85 * t}%)`
          : `translateY(${105 * (1 - t)}%)`;
        panel.style.opacity = isBase ? String(1 - t) : String(clamp(t * 1.7));
      }
    });
    const panel = deck.panels[active],
      contentStarted = Number(
        panel.dataset.contentStarted || panel.dataset.entered || now,
      ),
      age = clamp((now - contentStarted) / 1800),
      text = $(".text-build", panel);
    if (
      text &&
      !(deck.name === "skills" && panel.classList.contains("content-ready"))
    )
      text.style.clipPath = `inset(0 ${(1 - smooth(age)) * 100}% 0 0)`;
    const art = $(".skill-art img", panel);
    if (art) {
      const arrival = active === base + 1 ? t : 1;
      art.style.transform = $(".desk-art", panel)
        ? `perspective(1000px) translateY(${(1 - arrival) * 120}px) rotateX(${(1 - arrival) * 42}deg)`
        : `perspective(1200px) translateY(${(1 - arrival) * 28}px) rotateY(${(1 - arrival) * -8}deg)`;
    }
    const fast = $(".fast-heading", panel);
    if (fast) fast.style.clipPath = `inset(0 ${(1 - smooth(age)) * 100}% 0 0)`;
    const projectCopy = $(".project-copy", panel);
    if (projectCopy) {
      projectCopy.style.translate = `0 ${(1 - smooth(age)) * 18}px`;
      projectCopy.style.opacity = String(0.3 + 0.7 * age);
    }
    if (
      age < 1 &&
      deck.name !== "skills" &&
      y > deck.start - height &&
      y < deck.start + deck.travel + height
    )
      schedule();
  }
  function renderTyping(now) {
    for (const [heading, data] of typing) {
      if (!enabled || reduced.matches) {
        data.chars.forEach((c) => c.classList.remove("hidden-char"));
        typing.delete(heading);
        continue;
      }
      const count = clamp(
        Math.floor((now - data.start) / 50),
        0,
        data.chars.length,
      );
      if (count !== data.shown) {
        data.chars.forEach((c, i) =>
          c.classList.toggle("hidden-char", i >= count),
        );
        const caret = $(".heading-caret", heading),
          last = data.chars[Math.max(0, count - 1)],
          box = heading.getBoundingClientRect(),
          letter = last.getBoundingClientRect();
        caret.style.position = "absolute";
        caret.style.left =
          (count ? letter.right - box.left : letter.left - box.left) + "px";
        caret.style.top = letter.top - box.top + letter.height * 0.1 + "px";
        data.shown = count;
      }
      if (count === data.chars.length) {
        data.panel.dataset.contentStarted = String(now);
        data.panel.classList.add("content-ready");
        data.panel.dataset.headingComplete = "true";
        const content = $(".text-build", data.panel);
        if (content) content.style.clipPath = "";
        typing.delete(heading);
        schedule();
      }
    }
    if (typing.size) schedule();
  }
  function render(now) {
    frame = 0;
    const y = scrollY;
    renderStory(y);
    decks.forEach((deck) => renderDeck(deck, y, now));
    const lineRect = timeline.getBoundingClientRect(),
      progress = clamp((height * 0.75 - lineRect.top) / lineRect.height);
    timeline.style.setProperty(
      "--progress",
      reduced.matches ? "1" : String(progress),
    );
    $$(".experience-row").forEach((row) =>
      row.classList.toggle(
        "passed",
        row.getBoundingClientRect().top < height * 0.75,
      ),
    );
    revealItems.forEach((el) => {
      if (reduced.matches) {
        el.style.opacity = "1";
        el.style.transform = "none";
        return;
      }
      const p = clamp(
        (height * 0.94 - el.getBoundingClientRect().top) / (height * 0.5),
      );
      el.style.opacity = String(p);
      el.style.transform = `translateY(${(1 - p) * 35}px)`;
    });
    const rect = contact.getBoundingClientRect(),
      c = smooth(clamp((height - rect.top) / (height * 1.05)));
    if (enabled) {
      $(".contact-content").style.transform =
        `perspective(1400px) rotateX(${(1 - c) * 10}deg) translateY(${(1 - c) * 45}px)`;
      $(".contact-content").style.opacity = String(clamp(c * 1.5));
      $(".contact-aperture").style.opacity = String(Math.sin(c * Math.PI));
      $(".contact-content").style.clipPath =
        `inset(${(1 - c) * 20}% 0 round ${(1 - c) * 60}px)`;
    } else $(".contact-content").removeAttribute("style");
    if (rect.top < height * 0.65 && !contactTyped) {
      contactTyped = true;
      contactTimer = typeText(contactCode, fullContact, 64, 100);
    }
    if (rect.top > height * 1.3 && contactTyped && !reduced.matches) {
      contactTyped = false;
      clearInterval(contactTimer);
      contactCode.textContent = fullContact;
    }
    let section = "start";
    if (
      storyEnabled
        ? y > storyStart + storyTravel * 0.64
        : about.getBoundingClientRect().top < height * 0.5
    )
      section = "about";
    for (const id of ["experience", "skills", "work", "help", "contact"])
      if (
        $("#" + id).getBoundingClientRect().top <
        header.offsetHeight + height * 0.35
      )
        section = id;
    $$('#main-navigation a[href^="#"]').forEach((a) =>
      a.classList.toggle("active", a.hash === "#" + section),
    );
    renderTyping(now);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function goTo(target, behavior = "smooth") {
    let top;
    if (target === "#start") top = 0;
    else if (target === "#about" && storyEnabled)
      top = storyStart + storyTravel * 0.94;
    else {
      const el = $(target);
      if (!el) return;
      top = el.getBoundingClientRect().top + scrollY - header.offsetHeight;
    }
    scrollTo({ top, behavior: reduced.matches ? "auto" : behavior });
  }
  document.addEventListener("click", (e) => {
    const button = e.target.closest("[data-deck-target]");
    if (button) {
      const deck = decks.find((d) => d.name === button.dataset.deckTarget),
        index = Number(button.dataset.step);
      if (enabled)
        scrollTo({
          top: deck.start + deck.step * (index + 0.08),
          behavior: reduced.matches ? "auto" : "smooth",
        });
      else
        deck.panels[index].scrollIntoView({
          behavior: reduced.matches ? "auto" : "smooth",
          block: "start",
        });
      return;
    }
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor || anchor.classList.contains("skip-link")) return;
    e.preventDefault();
    closeMenu();
    goTo(anchor.hash);
    history.replaceState(null, "", anchor.hash);
  });
  $$("[data-deck-target]").forEach((button) =>
    button.addEventListener("keydown", (e) => {
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      const deck = decks.find((d) => d.name === button.dataset.deckTarget);
      let i = Number(button.dataset.step);
      i =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? deck.panels.length - 1
            : clamp(
                i + (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : -1),
                0,
                deck.panels.length - 1,
              );
      deck.buttons[i].focus({ preventScroll: true });
      deck.buttons[i].click();
    }),
  );
  const key = $(".enter-key");
  key.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") key.classList.add("key-pressed");
    if (e.key === " ") e.preventDefault();
  });
  key.addEventListener("keyup", (e) => {
    key.classList.remove("key-pressed");
    if (e.key === " ") {
      e.preventDefault();
      key.click();
    }
  });
  key.addEventListener("blur", () => key.classList.remove("key-pressed"));
  addEventListener("scroll", schedule, { passive: true });
  addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 140);
    },
    { passive: true },
  );
  reduced.addEventListener("change", () => {
    clearInterval(codeTimer);
    clearInterval(contactTimer);
    code.textContent = fullCode;
    contactCode.textContent = fullContact;
    typing.clear();
    measure();
  });
  addEventListener("pagehide", () => {
    clearInterval(codeTimer);
    clearInterval(contactTimer);
    if (frame) cancelAnimationFrame(frame);
  });
  root.classList.add("js-ready");
  measure();
  codeTimer = typeText(code, fullCode, 28, 400);
  document.fonts.ready.then(() => {
    measure();
    if (location.hash && $(location.hash)) goTo(location.hash, "auto");
  });
  addEventListener("load", measure, { once: true });
})();
