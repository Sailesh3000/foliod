/* global CONFIG */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);

  const STROKE_ATTRS =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const FILL_ATTRS = 'viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"';

  const ICONS = {
    github: `<svg ${FILL_ATTRS}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
    linkedin: `<svg ${FILL_ATTRS}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    medium: `<svg ${FILL_ATTRS}><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75S24 8.83 24 12z"/></svg>`,
    leetcode: `<svg ${STROKE_ATTRS}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    mail: `<svg ${STROKE_ATTRS}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    phone: `<svg ${STROKE_ATTRS}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    pin: `<svg ${STROKE_ATTRS}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    calendar: `<svg ${STROKE_ATTRS}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    zap: `<svg ${FILL_ATTRS} style="color:inherit"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    external: `<svg ${STROKE_ATTRS}><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`,
    search: `<svg ${STROKE_ATTRS}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    activity: `<svg ${STROKE_ATTRS}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    type: `<svg ${STROKE_ATTRS}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
    book: `<svg ${STROKE_ATTRS}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    box: `<svg ${STROKE_ATTRS}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    paper: `<svg ${STROKE_ATTRS}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    sparkle: `<svg ${STROKE_ATTRS}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg>`,
  };

  const PROJECT_ICONS = {
    detective: "search",
    evaluation: "activity",
    font: "type",
    shelf: "book",
  };

  const icon = (name) => ICONS[name] || ICONS.sparkle;

  function applyMeta(cfg) {
    if (cfg.meta?.title) {
      document.title = cfg.meta.title;
      $('meta[property="og:title"]')?.setAttribute("content", cfg.meta.title);
    }
    if (cfg.meta?.description) {
      $('meta[name="description"]')?.setAttribute("content", cfg.meta.description);
      $('meta[property="og:description"]')?.setAttribute("content", cfg.meta.description);
    }
    if (cfg.meta?.keywords) {
      $('meta[name="keywords"]')?.setAttribute("content", cfg.meta.keywords);
    }
  }

  function initNav(sections) {
    const nav = $("#nav");
    const list = $("#nav-links");
    const toggle = $("#nav-toggle");

    list.innerHTML = sections
      .map(
        ({ id, label }) =>
          `<li><a class="nav__link" href="#${id}" data-nav="${id}">${esc(label)}</a></li>`
      )
      .join("");

    const closePanel = () => {
      list.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const open = list.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    list.addEventListener("click", (e) => {
      if (e.target.closest("a")) closePanel();
    });

    const onScroll = () => nav.classList.toggle("nav--scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const byId = new Map(sections.map((s) => [s.id, s]));
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || !byId.has(entry.target.id)) return;
          list.querySelectorAll(".nav__link").forEach((a) => {
            a.classList.toggle("is-active", a.dataset.nav === entry.target.id);
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  function renderHero(cfg) {
    const hero = cfg.hero;
    $(".hero__name").innerHTML = esc(hero.name);
    $(".hero__subtitle").textContent = hero.subtitle;
    $(".hero__bio").textContent = hero.bio;

    $("#hero-cta").innerHTML = `
      <a class="btn btn--primary" href="#contact">Get in touch</a>
      <a class="btn btn--ghost" href="#projects">View my work</a>
    `;

    $("#hero-socials").innerHTML = (hero.socials || [])
      .map(
        (s) => `
        <li>
          <a class="social-btn" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.label)}" title="${esc(s.label)}">
            ${icon(s.icon)}
          </a>
        </li>`
      )
      .join("");
  }

  function renderExperience(cfg) {
    const section = $("#experience");
    $(".section__index", section).textContent = "01";
    $(".section__title", section).textContent = cfg.experience?.heading || "Experience";
    $(".section__desc", section).textContent = "";

    $("#experience-list").innerHTML = (cfg.experience || [])
      .map(
        (job) => `
        <li class="timeline__item ${job.current ? "is-current" : ""}">
          <span class="timeline__dot"></span>
          <article class="timeline__card glass">
            <div class="timeline__top">
              <h3 class="timeline__role">${esc(job.role)}</h3>
              ${job.current ? '<span class="badge-current">Current</span>' : ""}
            </div>
            <p class="timeline__company" style="color:var(--section-accent)">${esc(job.company)}</p>
            <p class="timeline__meta">
              <span>${ICONS.calendar.replace("<svg ", '<svg width="13" height="13" ')}${esc(job.period)}</span>
              <span>${ICONS.pin.replace("<svg ", '<svg width="13" height="13" ')}${esc(job.location)}</span>
            </p>
            <ul class="timeline__highlights">
              ${(job.highlights || []).map((h) => `<li>${esc(h)}</li>`).join("")}
            </ul>
          </article>
        </li>`
      )
      .join("");
  }

  function projectCard(p, kind) {
    const iconName = PROJECT_ICONS[p.icon] || p.icon;
    const tech = (p.tech || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
    const link = p.link
      ? `<a class="card__link" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(p.name)}">${ICONS.external}</a>`
      : "";
    const venue = kind === "paper" ? `<span class="card__venue">${esc(p.venue)} · ${esc(p.date)}</span>` : "";
    return `
      <article class="card glass${kind === "paper" ? " card--paper" : ""}" style="--accent:${esc(p.accentColor || "#a78bfa")}" data-group="${esc(p.filterGroup || "")}">
        <div class="card__top">
          <span class="card__icon">${kind === "paper" ? ICONS.paper : icon(iconName)}</span>
          ${link}
        </div>
        ${venue}
        <div>
          <p class="card__category">${esc(p.category || (kind === "paper" ? "Research" : "Project"))}</p>
          <h3 class="card__name">${esc(p.name)}</h3>
        </div>
        <p class="card__desc clamped">${esc(p.description || p.abstract || "")}</p>
        <button class="card__expand" type="button" hidden data-more="Read more" data-less="Show less">Read more</button>
        ${
          p.highlight
            ? `<p class="card__highlight">${ICONS.zap}<span>${esc(p.highlight)}</span></p>`
            : ""
        }
        ${tech ? `<div class="card__tech">${tech}</div>` : ""}
      </article>`;
  }

  function wireCardExtras(scope) {
    scope.querySelectorAll(".card").forEach((card) => {
      const desc = $(".card__desc", card);
      const btn = $(".card__expand", card);
      if (!desc || !btn) return;
      if (desc.scrollHeight > desc.clientHeight + 2) {
        btn.hidden = false;
        btn.textContent = btn.dataset.more;
        btn.addEventListener("click", () => {
          const nowClamped = desc.classList.toggle("clamped");
          btn.textContent = nowClamped ? btn.dataset.more : btn.dataset.less;
        });
      } else {
        desc.classList.remove("clamped");
        btn.remove();
      }
    });
  }

  function renderProjects(cfg) {
    const section = $("#projects");
    const projects = cfg.projects || [];
    $(".section__index", section).textContent = "02";
    $(".section__title", section).textContent = cfg.projectsHeading || "Projects";
    $(".section__desc", section).textContent =
      cfg.projectsDescription || "Things I have designed, built, and shipped.";

    const groups = [...new Set(projects.map((p) => p.filterGroup).filter(Boolean))];
    const LABELS = { ai: "AI / ML", systems: "Systems", web: "Web", research: "Research" };
    const tabs = [
      { id: "all", label: "All", count: projects.length },
      ...groups.map((g) => ({
        id: g,
        label: LABELS[g] || g.charAt(0).toUpperCase() + g.slice(1),
        count: projects.filter((p) => p.filterGroup === g).length,
      })),
    ];

    $("#project-filters").innerHTML = tabs
      .map(
        (t, i) =>
          `<button class="filter-tab${i === 0 ? " is-active" : ""}" type="button" aria-pressed="${i === 0}" data-filter="${esc(t.id)}">${esc(t.label)}<span class="filter-count">${t.count}</span></button>`
      )
      .join("");

    const grid = $("#projects-grid");
    const filters = $("#project-filters");
    grid.innerHTML = projects.map((p) => projectCard(p, "project")).join("");

    filters.addEventListener("click", (e) => {
      const tab = e.target.closest(".filter-tab");
      if (!tab) return;
      filters.querySelectorAll(".filter-tab").forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-pressed", String(t === tab));
      });
      const group = tab.dataset.filter;
      grid.querySelectorAll(".card").forEach((card) => {
        const show = group === "all" || card.dataset.group === group;
        card.hidden = !show;
        if (show) {
          card.classList.add("is-filtering");
          requestAnimationFrame(() =>
            requestAnimationFrame(() => card.classList.remove("is-filtering"))
          );
        }
      });
    });

    wireCardExtras(grid);
  }

  function renderResearch(cfg) {
    const section = $("#research");
    const papers = cfg.research?.papers || [];
    if (!papers.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    $(".section__index", section).textContent = "03";
    $(".section__title", section).textContent = cfg.research.heading || "Research";
    $(".section__desc", section).textContent = cfg.research.description || "";
    const grid = $("#research-grid");
    grid.innerHTML = papers.map((paper) => projectCard({ ...paper }, "paper")).join("");
    wireCardExtras(grid);
  }

  function renderWriting(cfg, startIndex) {
    const section = $("#writing");
    const w = cfg.writing || {};
    $(".section__index", section).textContent = String(startIndex).padStart(2, "0");
    $(".section__title", section).textContent = w.heading || "Writing";
    $(".section__desc", section).textContent = w.description || "";

    $("#writing-list").innerHTML = (w.featured || [])
      .map(
        (post) => `
        <li>
          <a class="writing-row" href="${esc(post.url)}" target="_blank" rel="noopener noreferrer">
            <span class="writing-row__date mono">${esc(post.date)}</span>
            <span class="writing-row__title">${esc(post.title)}</span>
            <span class="writing-row__arrow">${ICONS.external}</span>
          </a>
        </li>`
      )
      .join("");

    const link = $("#writing-link");
    link.href = w.blogUrl || "#";
    link.innerHTML = `${ICONS.book.replace("<svg ", '<svg width="17" height="17" ')} ${esc(w.blogLabel || "Read more")}`;
  }

  function renderContact(cfg) {
    const c = cfg.hero.contact || {};
    const cards = [];
    if (c.email) {
      cards.push(`
        <button class="contact-card glass" type="button" id="copy-email" data-value="${esc(c.email)}">
          <span class="contact-card__icon">${ICONS.mail}</span>
          <span>
            <span class="contact-card__label">Email — click to copy</span>
            <span class="contact-card__value">${esc(c.email)}</span>
          </span>
        </button>`);
    }
    if (c.phone) {
      cards.push(`
        <a class="contact-card glass" href="tel:${esc(c.phone.replace(/[^+\d]/g, ""))}">
          <span class="contact-card__icon">${ICONS.phone}</span>
          <span>
            <span class="contact-card__label">Phone</span>
            <span class="contact-card__value">${esc(c.phone)}</span>
          </span>
        </a>`);
    }
    $("#contact-cards").innerHTML = cards.join("");

    const copyBtn = $("#copy-email");
    if (copyBtn) {
      const label = $(".contact-card__label", copyBtn);
      const original = label.textContent;
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(copyBtn.dataset.value);
          label.textContent = "Copied to clipboard";
        } catch {
          label.textContent = copyBtn.dataset.value;
        }
        setTimeout(() => (label.textContent = original), 1600);
      });
    }
  }

  function initReveals() {
    if (reducedMotion) {
      document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("revealed"));
      return;
    }
    const groups = new Map();
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const parent = el.parentElement;
      const idx = groups.get(parent) || 0;
      el.style.setProperty("--reveal-delay", `${Math.min(idx * 80, 400)}ms`);
      groups.set(parent, idx + 1);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
  }

  function initNeuralCanvas() {
    const canvas = $("#neural-bg");
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const LINK_DIST = 150;
    const AREA_PER_NODE = 22000;
    let nodes = [];
    let raf = null;
    let running = true;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(90, Math.max(28, Math.round((innerWidth * innerHeight) / AREA_PER_NODE)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 1.6,
        hue: Math.random(),
      }));
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const md = Math.hypot(dx, dy);
        if (md < 130 && md > 0.01) {
          n.x += (dx / md) * 0.35;
          n.y += (dy / md) * 0.35;
        }
        if (n.x < -20) n.x = innerWidth + 20;
        if (n.x > innerWidth + 20) n.x = -20;
        if (n.y < -20) n.y = innerHeight + 20;
        if (n.y > innerHeight + 20) n.y = -20;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.22;
            ctx.strokeStyle = `rgba(139, 148, 250, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const mix = n.hue;
        const cr = Math.round(167 + (34 - 167) * mix);
        const cg = Math.round(139 + (211 - 139) * mix);
        const cb = Math.round(250 + (238 - 250) * mix);
        const twinkle = 0.55 + 0.45 * Math.sin(t / 900 + n.x);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${(0.5 * twinkle).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener(
      "pointermove",
      (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      },
      { passive: true }
    );
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running && raf === null) raf = requestAnimationFrame(frame);
      if (!running && raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });

    resize();
    raf = requestAnimationFrame(frame);
  }

  function boot() {
    if (typeof CONFIG === "undefined") {
      console.error("CONFIG missing — run: node scripts/generate-config.js");
      return;
    }
    applyMeta(CONFIG);

    renderHero(CONFIG);
    renderExperience(CONFIG);
    renderProjects(CONFIG);
    renderResearch(CONFIG);
    const researchVisible = !$("#research").hidden;

    const navSections = [{ id: "experience", label: "Experience" }, { id: "projects", label: "Projects" }];
    if (researchVisible) navSections.push({ id: "research", label: "Research" });
    navSections.push({ id: "writing", label: "Writing" }, { id: "contact", label: "Contact" });
    initNav(navSections);

    renderWriting(CONFIG, researchVisible ? 4 : 3);
    renderContact(CONFIG);

    $("#footer-text").textContent = CONFIG.footer?.text || "";

    initReveals();
    initNeuralCanvas();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
