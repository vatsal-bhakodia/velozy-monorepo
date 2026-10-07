/**
 * overlay-manager.ts
 *
 * Singleton overlay manager for CraftJS editor with 1000+ nodes.
 *
 * Design principles:
 * - Zero per-node listeners (scroll, resize, mutation)
 * - Single ResizeObserver watching only 1-2 active targets at a time
 * - syncOverlays() is debounced via queueMicrotask — 1000 simultaneous
 *   notify() calls collapse into exactly 1 sync
 * - notify() bails out immediately if state hasn't changed (no churn)
 * - activeNodes map only stores hovered/active nodes, never all 1000+
 * - All DOM writes are rAF-batched
 */

type OverlayType = "hover" | "active";

interface OverlayState {
  element: HTMLDivElement | null;
  currentTarget: HTMLElement | null;
  rafId: number | null;
}

interface NodeRecord {
  dom: HTMLElement;
  isHover: boolean;
  isActive: boolean;
  onLabelUpdate: (() => void) | null;
}

class OverlayManager {
  // ─── Only 2 overlay DOM nodes exist total ────────────────────────────────────
  private overlays: Record<OverlayType, OverlayState> = {
    hover: { element: null, currentTarget: null, rafId: null },
    active: { element: null, currentTarget: null, rafId: null },
  };

  // ─── Single ResizeObserver — only watches 0-2 targets ────────────────────────
  private resizeObserver: ResizeObserver | null = null;

  // ─── Scroll — 3 listeners total, rAF-throttled ───────────────────────────────
  private scrollListenersAdded = false;
  private scrollRafId: number | null = null;
  private scrollEndTimer: ReturnType<typeof setTimeout> | null = null;
  private isScrolling = false;

  // ─── Tiny registry — only hovered/active nodes live here (0-2 entries) ───────
  private activeNodes = new Map<string, NodeRecord>();

  // ─── Debounce flag — collapses burst of notify() into one sync ───────────────
  private syncScheduled = false;

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Called by RenderNode on every render where isHover/isActive may change.
   * Inert nodes (neither hovered nor active) are evicted from the map,
   * so this.activeNodes stays tiny regardless of total node count.
   */
  notify(
    id: string,
    dom: HTMLElement,
    isHover: boolean,
    isActive: boolean,
    onLabelUpdate: (() => void) | null,
  ) {
    const existing = this.activeNodes.get(id);

    // Fast-path: nothing changed — do nothing
    if (
      existing &&
      existing.dom === dom &&
      existing.isHover === isHover &&
      existing.isActive === isActive
    ) {
      if (onLabelUpdate) existing.onLabelUpdate = onLabelUpdate;
      return;
    }

    if (!isHover && !isActive) {
      // Inert node — evict entirely
      if (!existing) return; // wasn't registered, nothing to do
      this.activeNodes.delete(id);
    } else {
      this.activeNodes.set(id, { dom, isHover, isActive, onLabelUpdate });
    }

    this.ensureInfrastructure();
    this.scheduleSync();
  }

  /**
   * Called by RenderNode on unmount.
   * No-ops for the 999+ inert nodes that were never registered.
   */
  unregister(id: string) {
    if (!this.activeNodes.has(id)) return;
    this.activeNodes.delete(id);
    this.scheduleSync();
  }

  /** Force-clear active overlay before a deletion animation */
  clearActive() {
    this.setOverlay("active", null);
  }

  // ─── Debounced sync ───────────────────────────────────────────────────────────

  private scheduleSync() {
    if (this.syncScheduled) return;
    this.syncScheduled = true;
    // All synchronous notify() calls in the same task share one sync
    queueMicrotask(() => {
      this.syncScheduled = false;
      this.syncOverlays();
    });
  }

  private syncOverlays() {
    let hoverTarget: HTMLElement | null = null;
    let activeTarget: HTMLElement | null = null;
    let activeLabelCb: (() => void) | null = null;

    // Loop is always O(1) — map has 0-2 entries
    for (const record of Array.from(this.activeNodes.values())) {
      if (record.isHover) hoverTarget = record.dom;
      if (record.isActive) {
        activeTarget = record.dom;
        activeLabelCb = record.onLabelUpdate;
      }
    }

    this.setOverlay("hover", hoverTarget);
    this.setOverlay("active", activeTarget);

    if (activeTarget && activeLabelCb) activeLabelCb();
  }

  // ─── Overlay positioning ─────────────────────────────────────────────────────

  private setOverlay(type: OverlayType, target: HTMLElement | null) {
    const state = this.overlays[type];
    const overlay = this.getOrCreateOverlay(type);

    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }

    if (!target) {
      overlay.style.opacity = "0";
      overlay.style.transform = "scale(0.95)";
      overlay.style.transition = "all 0.1s cubic-bezier(0.4, 0, 0.2, 1)";

      if (state.currentTarget && this.resizeObserver) {
        this.resizeObserver.unobserve(state.currentTarget);
      }
      state.currentTarget = null;
      return;
    }

    // Swap ResizeObserver target if changed
    if (state.currentTarget !== target) {
      if (state.currentTarget && this.resizeObserver) {
        this.resizeObserver.unobserve(state.currentTarget);
      }
      this.resizeObserver?.observe(target);
      state.currentTarget = target;
    }

    this.positionOverlay(type, target, this.isScrolling);
  }

  private positionOverlay(
    type: OverlayType,
    target: HTMLElement,
    instant: boolean,
  ) {
    const state = this.overlays[type];
    const overlay = this.getOrCreateOverlay(type);

    if (state.rafId) cancelAnimationFrame(state.rafId);

    state.rafId = requestAnimationFrame(() => {
      state.rafId = null;

      const iframe = document.getElementById(
        "canvas",
      ) as HTMLIFrameElement | null;
      const container = document.getElementById(
        "page-container-inner",
      ) as HTMLElement | null;
      if (!iframe || !container) return;

      const iframeRect = iframe.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const top =
        iframeRect.top +
        targetRect.top -
        containerRect.top +
        container.scrollTop;
      const left =
        iframeRect.left +
        targetRect.left -
        containerRect.left +
        container.scrollLeft;

      overlay.style.transition = instant
        ? "none"
        : "all 0.1s cubic-bezier(0.4, 0, 0.2, 1)";
      overlay.style.top = `${top}px`;
      overlay.style.left = `${left}px`;
      overlay.style.width = `${targetRect.width}px`;
      overlay.style.height = `${targetRect.height}px`;
      overlay.style.opacity = "1";
      overlay.style.transform = "scale(1)";
    });
  }

  // ─── Scroll handler ───────────────────────────────────────────────────────────

  private handleScroll = () => {
    // rAF throttle — one reposition per frame regardless of scroll event rate
    if (this.scrollRafId) return;

    this.isScrolling = true;
    if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);

    this.scrollRafId = requestAnimationFrame(() => {
      this.scrollRafId = null;

      for (const type of ["hover", "active"] as OverlayType[]) {
        const { currentTarget } = this.overlays[type];
        if (currentTarget) this.positionOverlay(type, currentTarget, true);
      }

      this.activeNodes.forEach((record) => {
        if (record.isActive) record.onLabelUpdate?.();
      });

      this.scrollEndTimer = setTimeout(() => {
        this.isScrolling = false;
        for (const type of ["hover", "active"] as OverlayType[]) {
          const { currentTarget } = this.overlays[type];
          if (currentTarget) this.positionOverlay(type, currentTarget, false);
        }
      }, 100);
    });
  };

  // ─── Infrastructure (lazy, created once) ─────────────────────────────────────

  private ensureInfrastructure() {
    this.ensureScrollListeners();
    this.ensureResizeObserver();
  }

  private ensureScrollListeners() {
    if (this.scrollListenersAdded) return;

    const iframe = document.getElementById(
      "canvas",
    ) as HTMLIFrameElement | null;
    const container = document.getElementById(
      "page-container-inner",
    ) as HTMLElement | null;
    if (!iframe || !container) return;

    const opts: AddEventListenerOptions = { passive: true };
    iframe.contentWindow?.addEventListener("scroll", this.handleScroll, opts);
    container.addEventListener("scroll", this.handleScroll, opts);
    window.addEventListener("scroll", this.handleScroll, opts);

    this.scrollListenersAdded = true;
  }

  private ensureResizeObserver() {
    if (this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;

        for (const type of ["hover", "active"] as OverlayType[]) {
          if (this.overlays[type].currentTarget === target) {
            this.positionOverlay(type, target, this.isScrolling);
          }
        }

        this.activeNodes.forEach((record) => {
          if (record.isActive && record.dom === target) {
            record.onLabelUpdate?.();
          }
        });
      }
    });

    // Watch the editor container for panel/viewport resizes
    const container = document.getElementById("page-container");
    if (container) this.resizeObserver.observe(container);
  }

  private getOrCreateOverlay(type: OverlayType): HTMLDivElement {
    if (this.overlays[type].element) return this.overlays[type].element!;

    const el = document.createElement("div");
    el.className = `craft-${type}-overlay`;
    el.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: ${type === "active" ? 50 : 48};
      border-radius: 4px;
      transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: scale(0.95);
      ${
        type === "hover"
          ? "border: 2px dashed #3b82f6; background-color: rgba(59,130,246,0.05);"
          : "border: 2px solid #3b82f6; background-color: rgba(59,130,246,0.05);"
      }
    `;

    const container =
      document.getElementById("page-container-inner") || document.body;
    container.appendChild(el);
    this.overlays[type].element = el;
    return el;
  }
}

export const overlayManager = new OverlayManager();
