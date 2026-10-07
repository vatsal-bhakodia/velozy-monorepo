"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type TrackingSettings = { enabled: boolean };
type GrowthEvent = {
  id: string;
  name: string;
  path: string;
  occurredAt: string;
  properties: Record<string, string | number | boolean | null>;
};
const pendingEvents: Array<{
  name: string;
  properties: Record<string, string | number | boolean | null>;
  stableKey?: string;
}> = [];

declare global {
  interface Window {
    velozyTrack?: (
      name: string,
      properties?: Record<string, string | number | boolean | null>,
      stableKey?: string,
    ) => void;
  }
}

async function eventId(stableKey: string) {
  try {
    const digest = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(stableKey),
      ),
    );
    const bytes = Array.from(digest.slice(0, 16));
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return crypto.randomUUID();
  }
}

async function submitEvents(events: GrowthEvent[]) {
  try {
    await fetch("/api/growth/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    /* Collection must never interrupt storefront actions. */
  }
}

export function trackGrowthEvent(
  name: string,
  properties: Record<string, string | number | boolean | null> = {},
  stableKey?: string,
) {
  if (typeof window === "undefined") return;
  if (window.velozyTrack) window.velozyTrack(name, properties, stableKey);
}

export function GrowthTracker({
  assignments: initialAssignments = [],
  targetType,
  targetId,
}: {
  assignments?: Array<{
    experimentId: string;
    variantId: string;
    experience?: Record<string, unknown>;
  }>;
  targetType?: "page" | "product" | "cart" | "checkout";
  targetId?: string | null;
}) {
  const pathname = usePathname() || "/";
  const [settings, setSettings] = useState<TrackingSettings | null>(null);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [assignmentReady, setAssignmentReady] = useState(
    !targetType || initialAssignments.length > 0,
  );
  const trackingEnabled = useRef(false);
  const assignmentReadyRef = useRef(
    !targetType || initialAssignments.length > 0,
  );

  useEffect(() => {
    setAssignments(initialAssignments);
    const ready = !targetType || initialAssignments.length > 0;
    assignmentReadyRef.current = ready;
    setAssignmentReady(ready);
  }, [initialAssignments, targetType]);

  useEffect(() => {
    let active = true;
    fetch("/api/growth/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => {
        if (active && value) {
          trackingEnabled.current = Boolean(value.enabled);
          setSettings(value);
        }
      })
      .catch(() => undefined);
    window.velozyTrack = (name, properties = {}, stableKey) => {
      if (!trackingEnabled.current) return;
      if (!/^[a-z][a-z0-9_.-]{0,99}$/.test(name)) return;
      if (!assignmentReadyRef.current) {
        pendingEvents.push({ name, properties, stableKey });
        return;
      }
      const experiment = assignments[0];
      const eventProperties = experiment
        ? {
            ...properties,
            growth_experiment_id: experiment.experimentId,
            growth_variant_id: experiment.variantId,
          }
        : properties;
      void (async () => {
        const id = stableKey
          ? await eventId(`${window.location.host}:${stableKey}`)
          : crypto.randomUUID();
        const event = {
          id,
          name,
          path: window.location.pathname,
          occurredAt: new Date().toISOString(),
          properties: eventProperties,
        };
        await submitEvents([event]);
      })();
    };
    return () => {
      active = false;
      delete window.velozyTrack;
    };
  }, [assignments, assignmentReady]);

  useEffect(() => {
    if (!settings?.enabled) return;
    if (!targetType || assignments.length) {
      assignmentReadyRef.current = true;
      setAssignmentReady(true);
      return;
    }
    let active = true;
    fetch("/api/growth/experiments/assignment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType, targetId: targetId || null }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => {
        if (active && Array.isArray(value?.assignments))
          setAssignments(value.assignments);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          assignmentReadyRef.current = true;
          setAssignmentReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [
    settings?.enabled,
    targetType,
    targetId,
    assignments.length,
  ]);

  useEffect(() => {
    if (!assignmentReady || !trackingEnabled.current || !window.velozyTrack)
      return;
    pendingEvents
      .splice(0)
      .forEach((event) =>
        window.velozyTrack?.(event.name, event.properties, event.stableKey),
      );
  }, [assignmentReady, assignments, settings?.enabled]);

  useEffect(() => {
    const experience = assignments.find(
      (item) => item.experience && typeof item.experience === "object",
    )?.experience;
    if (!experience) return;
    const main = document.querySelector("main");
    if (!main) return;
    const heading = main.querySelector("h1");
    if (
      heading &&
      typeof experience.headline === "string" &&
      experience.headline.trim()
    ) {
      if (!heading.hasAttribute("data-growth-control-copy"))
        heading.setAttribute(
          "data-growth-control-copy",
          heading.textContent || "",
        );
      heading.textContent = experience.headline;
    }
    const button = main.querySelector<HTMLElement>(
      "[data-growth-variant-button]",
    );
    if (
      button &&
      typeof experience.buttonText === "string" &&
      experience.buttonText.trim()
    ) {
      if (!button.hasAttribute("data-growth-control-copy"))
        button.setAttribute(
          "data-growth-control-copy",
          button.textContent || "",
        );
      button.textContent = experience.buttonText;
    }
  }, [assignments, pathname]);

  useEffect(() => {
    if (!settings?.enabled || !assignmentReady) return;
    window.velozyTrack?.("page_view");
  }, [pathname, settings?.enabled, assignmentReady]);

  return null;
}
