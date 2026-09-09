"use client";

import { useEffect } from "react";

export function LandingInteractive() {
  useEffect(() => {
    // ----------------------------
    // DATA KOLEKSI
    // ----------------------------
    const collections = [
      {
        name: "AURELIA",
        category: "Modern · Romantis",
        thumbnail: "/demo/aurelia/thumbnail_mobile.webp",
        desktop: "/demo/aurelia/thumbnail_desktop.webp",
        iframe: "/demo/aurelia/index.html",
        fallback: "/demo/aurelia/home.webp",
        fallbackD: "/demo/aurelia/home.webp",
      },
      {
        name: "KALANDRA",
        category: "Editorial · Kontemporer",
        thumbnail: "/demo/kalandra/thumbnail_mobile.webp",
        desktop: "/demo/kalandra/thumbnail_desktop.webp",
        iframe: "/demo/kalandra/index.html",
        fallback: "/demo/kalandra/cover.webp",
        fallbackD: "/demo/kalandra/cover.webp",
      },
      {
        name: "PRAMESWARI",
        category: "Timeless · Budaya",
        thumbnail: "/demo/prameswari/thumbnail_mobile.webp",
        desktop: "/demo/prameswari/thumbnail_desktop.webp",
        iframe: "/demo/prameswari/index.html",
        fallback: "/demo/prameswari/cover.webp",
        fallbackD: "/demo/prameswari/cover.webp",
      },
      {
        name: "BADRIKA",
        category: "Dark · Elegan",
        thumbnail: "/demo/badrika/thumbnail_mobile.webp",
        desktop: "/demo/badrika/thumbnail_desktop.webp",
        iframe: "/demo/badrika/index.html",
        fallback: "/demo/badrika/cover.webp",
        fallbackD: "/demo/badrika/cover.webp",
      },
      {
        name: "ARTISAN",
        category: "Klasik · Hangat",
        thumbnail: "/demo/artisan/thumbnail_mobile.webp",
        desktop: "/demo/artisan/thumbnail_desktop.webp",
        iframe: "/demo/artisan/index.html",
        fallback: "/demo/artisan/thumbnail_mobile.webp",
        fallbackD: "/demo/artisan/home.webp",
      },
      {
        name: "CANDANI",
        category: "Lembut · Floral",
        thumbnail: "/demo/candani/thumbnail_mobile.webp",
        desktop: "/demo/candani/thumbnail_desktop.webp",
        iframe: "/demo/candani/index.html",
        fallback: "/demo/candani/cover.webp",
        fallbackD: "/demo/candani/cover.webp",
      },
    ];

    // ----------------------------
    // 1. NAVBAR SCROLL
    // ----------------------------
    const navbar = document.getElementById("navbar");
    const onScroll = () => {
      if (navbar) {
        navbar.classList.toggle("scrolled", window.scrollY > 60);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ----------------------------
    // 2. MOBILE MENU DRAWER
    // ----------------------------
    const hamburger = document.getElementById("hamburger-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    const closeMenu = document.getElementById("close-menu");

    const openDrawer = () => {
      if (mobileMenu && hamburger) {
        mobileMenu.classList.add("open");
        hamburger.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
      }
    };

    const closeDrawer = () => {
      if (mobileMenu && hamburger) {
        mobileMenu.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    };

    hamburger?.addEventListener("click", openDrawer);
    closeMenu?.addEventListener("click", closeDrawer);
    mobileMenu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeDrawer));

    // ----------------------------
    // 3. HERO PARALLAX (Desktop only)
    // ----------------------------
    const heroEl = document.getElementById("hero");
    const heroBg = document.getElementById("hero-bg");
    const onHeroMove = (e: MouseEvent) => {
      if (!heroEl || !heroBg) return;
      const { clientX, clientY } = e;
      const { width, height } = heroEl.getBoundingClientRect();
      const x = (clientX / width - 0.5) * 20;
      const y = (clientY / height - 0.5) * 12;
      heroBg.style.transform = `translate(${x}px, ${y}px)`;
    };

    if (window.matchMedia("(hover: hover)").matches && heroEl) {
      heroEl.addEventListener("mousemove", onHeroMove as any, { passive: true });
    }

    // ----------------------------
    // 4. CTA MAGNETIC BUTTON
    // ----------------------------
    const ctaBtn = document.getElementById("cta-main-btn");
    const onCtaMove = (e: MouseEvent) => {
      if (!ctaBtn) return;
      const rect = ctaBtn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.35;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.35;
      ctaBtn.style.transform = `translate(${x}px, ${y}px) translateY(-3px)`;
    };
    const onCtaLeave = () => {
      if (ctaBtn) ctaBtn.style.transform = "";
    };

    if (ctaBtn && window.matchMedia("(hover: hover)").matches) {
      ctaBtn.addEventListener("mousemove", onCtaMove as any);
      ctaBtn.addEventListener("mouseleave", onCtaLeave);
    }

    // ----------------------------
    // 5. KOLEKSI SHOWCASE CAROUSEL
    // ----------------------------
    const tabletImg = document.getElementById("tablet-img") as HTMLImageElement | null;
    const phoneImg = document.getElementById("phone-img") as HTMLImageElement | null;
    const nameEl = document.getElementById("carousel-name");
    const catEl = document.getElementById("carousel-category");
    const dotsEl = document.getElementById("carousel-dots");
    const prevBtn = document.getElementById("carousel-prev");
    const nextBtn = document.getElementById("carousel-next");
    const showcase = document.getElementById("koleksi-showcase");

    let current = 0;
    const total = collections.length;

    const renderShowcase = () => {
      const c = collections[current];
      if (!c) return;

      if (tabletImg) {
        tabletImg.style.opacity = "0";
        tabletImg.style.transform = "scale(0.98)";
      }
      if (phoneImg) {
        phoneImg.style.opacity = "0";
        phoneImg.style.transform = "scale(0.96)";
      }

      setTimeout(() => {
        if (tabletImg) {
          tabletImg.src = c.desktop;
          tabletImg.onerror = function () {
            tabletImg.src = c.fallbackD || c.fallback;
          };
          tabletImg.style.opacity = "1";
          tabletImg.style.transform = "scale(1)";
        }
        if (phoneImg) {
          phoneImg.src = c.thumbnail;
          phoneImg.onerror = function () {
            phoneImg.src = c.fallback;
          };
          phoneImg.style.opacity = "1";
          phoneImg.style.transform = "scale(1)";
        }
        if (nameEl) nameEl.textContent = c.name;
        if (catEl) catEl.textContent = c.category;

        if (dotsEl) {
          dotsEl.querySelectorAll(".koleksi-dot").forEach((dot, i) => {
            dot.classList.toggle("active", i === current);
          });
        }
      }, 120);
    };

    const goTo = (idx: number) => {
      current = ((idx % total) + total) % total;
      renderShowcase();
    };

    // Render navigation dots
    if (dotsEl && dotsEl.children.length === 0) {
      for (let i = 0; i < total; i++) {
        const dot = document.createElement("span");
        dot.className = "koleksi-dot" + (i === 0 ? " active" : "");
        dot.setAttribute("role", "button");
        dot.setAttribute("aria-label", `Pilih koleksi ${collections[i].name}`);
        dot.addEventListener("click", () => goTo(i));
        dotsEl.appendChild(dot);
      }
    }

    const onPrev = () => goTo(current - 1);
    const onNext = () => goTo(current + 1);
    prevBtn?.addEventListener("click", onPrev);
    nextBtn?.addEventListener("click", onNext);

    // Touch swipe on showcase
    let dragStartX = 0;
    const onTouchStart = (e: TouchEvent) => {
      dragStartX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const diff = e.changedTouches[0].clientX - dragStartX;
      if (Math.abs(diff) > 40) goTo(diff < 0 ? current + 1 : current - 1);
    };

    showcase?.addEventListener("touchstart", onTouchStart, { passive: true });
    showcase?.addEventListener("touchend", onTouchEnd, { passive: true });

    // Autoplay carousel
    let autoplay = setInterval(() => goTo(current + 1), 5000);
    const pauseAutoplay = () => clearInterval(autoplay);
    const resumeAutoplay = () => {
      clearInterval(autoplay);
      autoplay = setInterval(() => goTo(current + 1), 5000);
    };

    showcase?.addEventListener("mouseenter", pauseAutoplay);
    showcase?.addEventListener("mouseleave", resumeAutoplay);
    renderShowcase();

    // ----------------------------
    // 6. PENGALAMAN (3D IPAD & DOCK)
    // ----------------------------
    const expBtns = document.querySelectorAll<HTMLElement>(".exp-icon-btn");
    const expScreens = document.querySelectorAll<HTMLElement>(".exp-screen-layer");
    const expDockItems = document.querySelectorAll<HTMLElement>(".exp-dock-item");
    const expPhone = document.getElementById("exp-phone");
    const expSection = document.getElementById("pengalaman");

    let activeExp = 2; // Default to QR Check-in Receptionist Kiosk
    const totalExp = expBtns.length;

    const setExp = (idx: number) => {
      if (!totalExp) return;
      activeExp = ((idx % totalExp) + totalExp) % totalExp;
      expBtns.forEach((btn, i) => {
        const isActive = i === activeExp;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });
      expScreens.forEach((screen, i) => {
        screen.classList.toggle("active", i === activeExp);
      });
      expDockItems.forEach((item, i) => {
        item.classList.toggle("active", i === activeExp);
      });
    };

    const expBtnHandlers: Array<{ el: HTMLElement; fn: () => void }> = [];
    expBtns.forEach((btn) => {
      const fn = () => {
        const idx = parseInt(btn.dataset.exp || "", 10);
        if (!isNaN(idx)) setExp(idx);
      };
      btn.addEventListener("click", fn);
      expBtnHandlers.push({ el: btn, fn });
    });

    const expDockHandlers: Array<{ el: HTMLElement; fn: () => void }> = [];
    expDockItems.forEach((item) => {
      const fn = () => {
        const idx = parseInt(item.dataset.dock || "", 10);
        if (!isNaN(idx)) setExp(idx);
      };
      item.addEventListener("click", fn);
      expDockHandlers.push({ el: item, fn });
    });

    let expAutoplay = setInterval(() => setExp(activeExp + 1), 5000);
    const pauseExp = () => clearInterval(expAutoplay);
    const resumeExp = () => {
      clearInterval(expAutoplay);
      expAutoplay = setInterval(() => setExp(activeExp + 1), 5000);
    };

    expSection?.addEventListener("mouseenter", pauseExp);
    expSection?.addEventListener("mouseleave", resumeExp);

    // 3D Parallax on iPad (Desktop Only >= 1024px)
    const onExpMove = (e: MouseEvent) => {
      if (!expSection || !expPhone || window.innerWidth < 1024) return;
      const rect = expSection.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rx = 8 - y * 10;
      const ry = 14 + x * 12;
      expPhone.style.transform = `rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) rotateZ(1deg)`;
    };

    const onExpLeave = () => {
      if (!expPhone) return;
      if (window.innerWidth < 1024) {
        expPhone.style.transform = "";
      } else {
        expPhone.style.transform = "rotateY(14deg) rotateX(8deg) rotateZ(1deg)";
      }
    };

    const onExpResize = () => {
      if (!expPhone) return;
      if (window.innerWidth < 1024) {
        expPhone.style.transform = "";
      } else {
        expPhone.style.transform = "rotateY(14deg) rotateX(8deg) rotateZ(1deg)";
      }
    };

    if (expSection && expPhone && window.matchMedia("(hover: hover)").matches) {
      expSection.addEventListener("mousemove", onExpMove as any, { passive: true });
      expSection.addEventListener("mouseleave", onExpLeave);
      window.addEventListener("resize", onExpResize, { passive: true });
    }

    // Interactive RSVP buttons inside iPad mockup
    const rsvpMockupBtns = document.querySelectorAll<HTMLElement>(".exp-rsvp-btn");
    rsvpMockupBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        rsvpMockupBtns.forEach((b) => {
          b.classList.remove("active");
          b.style.background = "rgba(255,255,255,0.04)";
          b.style.color = "rgba(245,240,232,0.7)";
          b.style.borderColor = "rgba(255,255,255,0.1)";
        });
        btn.classList.add("active");
        btn.style.background = "var(--lux-gold)";
        btn.style.color = "#0b0c0d";
        btn.style.borderColor = "var(--lux-gold)";
      });
    });

    // ----------------------------
    // 7. INTERSECTION OBSERVER (REVEAL)
    // ----------------------------
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    // ----------------------------
    // 8. QR CODE PATTERN CELLS
    // ----------------------------
    const qrGrid = document.getElementById("qr-grid");
    const ipadQrGrid = document.getElementById("ipad-qr-grid");
    const qrPattern = [
      1, 1, 1, 1, 1, 1, 1,
      1, 0, 0, 0, 0, 0, 1,
      1, 0, 1, 0, 1, 0, 1,
      1, 0, 0, 1, 0, 0, 1,
      1, 0, 1, 0, 1, 0, 1,
      1, 0, 0, 0, 0, 0, 1,
      1, 1, 1, 1, 1, 1, 1,
    ];

    [qrGrid, ipadQrGrid].forEach((grid) => {
      if (!grid || grid.children.length > 0) return;
      qrPattern.forEach((v) => {
        const cell = document.createElement("div");
        cell.className = "qr-cell " + (v ? "dark" : "light");
        if (grid === ipadQrGrid) {
          cell.style.background = v ? "rgba(245,240,232,0.85)" : "transparent";
          cell.style.borderRadius = "1px";
          cell.style.aspectRatio = "1";
        }
        grid.appendChild(cell);
      });
    });

    // ----------------------------
    // 9. ANIMATED STATS COUNTER
    // ----------------------------
    function animateCounter(el: HTMLElement, target: number, duration: number) {
      let start = 0;
      const step = target / (duration / 16);
      const timer = setInterval(() => {
        start += step;
        if (start >= target) {
          el.textContent = String(target);
          clearInterval(timer);
          return;
        }
        el.textContent = String(Math.floor(start));
      }, 16);
    }

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const nums = entry.target.querySelectorAll<HTMLElement>(".qr-stat-num");
            if (nums[0]) animateCounter(nums[0], 248, 1200);
            if (nums[1]) animateCounter(nums[1], 183, 1200);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    const qrSection = document.querySelector(".qr-screen");
    if (qrSection) {
      const parentBlock = qrSection.closest(".feat-tab-panel") || qrSection.closest(".feature-block");
      if (parentBlock) counterObserver.observe(parentBlock);
    }

    // ----------------------------
    // CLEANUP ON UNMOUNT
    // ----------------------------
    return () => {
      window.removeEventListener("scroll", onScroll);
      hamburger?.removeEventListener("click", openDrawer);
      closeMenu?.removeEventListener("click", closeDrawer);
      mobileMenu?.querySelectorAll("a").forEach((a) => a.removeEventListener("click", closeDrawer));
      heroEl?.removeEventListener("mousemove", onHeroMove as any);
      ctaBtn?.removeEventListener("mousemove", onCtaMove as any);
      ctaBtn?.removeEventListener("mouseleave", onCtaLeave);
      prevBtn?.removeEventListener("click", onPrev);
      nextBtn?.removeEventListener("click", onNext);
      showcase?.removeEventListener("touchstart", onTouchStart);
      showcase?.removeEventListener("touchend", onTouchEnd);
      showcase?.removeEventListener("mouseenter", pauseAutoplay);
      showcase?.removeEventListener("mouseleave", resumeAutoplay);
      clearInterval(autoplay);

      expBtnHandlers.forEach(({ el, fn }) => el.removeEventListener("click", fn));
      expDockHandlers.forEach(({ el, fn }) => el.removeEventListener("click", fn));
      expSection?.removeEventListener("mouseenter", pauseExp);
      expSection?.removeEventListener("mouseleave", resumeExp);
      clearInterval(expAutoplay);
      expSection?.removeEventListener("mousemove", onExpMove as any);
      expSection?.removeEventListener("mouseleave", onExpLeave);
      window.removeEventListener("resize", onExpResize);

      observer.disconnect();
      counterObserver.disconnect();
    };
  }, []);

  return null;
}
