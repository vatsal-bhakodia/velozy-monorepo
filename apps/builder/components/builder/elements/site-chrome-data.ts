"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SITE_CHROME,
  DEFAULT_SITE_NAVIGATION,
  SITE_CHROME_TAILWIND_CLASSES,
  isValidSiteChrome,
  resolveSiteNavigation,
  type SiteChromeConfig,
  type SiteNavigation,
} from "@velozy/site-chrome";
import { primeTailwindWithClasses } from "@/components/builder/canvas";

type ChromeData = {
  navigation: SiteNavigation;
  siteChrome: SiteChromeConfig;
  projectLogo: string;
};

const initialData: ChromeData = {
  navigation: DEFAULT_SITE_NAVIGATION,
  siteChrome: DEFAULT_SITE_CHROME,
  projectLogo: "",
};
const requestCache = new Map<string, Promise<ChromeData>>();

async function loadChrome(projectId: string): Promise<ChromeData> {
  const projectResponse = await fetch(
    `/api/admin/projects?projectId=${encodeURIComponent(projectId)}`,
  );
  const projectData = projectResponse.ok ? await projectResponse.json() : {};
  const project = projectData.project || {};
  const preference = project.designPreference || {};
  const siteChrome = isValidSiteChrome(preference.siteChrome)
    ? preference.siteChrome
    : DEFAULT_SITE_CHROME;
  let navigation = resolveSiteNavigation(preference.navigation);
  const navigationResponse = await fetch(
    `/api/admin/navigation?projectId=${encodeURIComponent(projectId)}`,
  );
  if (navigationResponse.ok) {
    const navigationData = await navigationResponse.json();
    navigation = resolveSiteNavigation(navigationData.navigation || preference.navigation);
  }
  await primeTailwindWithClasses([
    SITE_CHROME_TAILWIND_CLASSES,
    ...Object.entries(siteChrome.navbar)
      .filter((entry): entry is [string, string] => entry[0].endsWith("ClassName") && typeof entry[1] === "string")
      .map(([, value]) => value),
    ...Object.entries(siteChrome.footer)
      .filter((entry): entry is [string, string] => entry[0].endsWith("ClassName") && typeof entry[1] === "string")
      .map(([, value]) => value),
  ]);
  return {
    navigation,
    siteChrome,
    projectLogo: typeof project.logo === "string" ? project.logo : "",
  };
}

export function useSiteChromeData(projectId: string) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    let active = true;
    const load = async () => {
      let id = projectId || sessionStorage.getItem("projectId") || "";
      if (!id) {
        const response = await fetch("/api/admin/projects");
        const result = response.ok ? await response.json() : {};
        id = result.projects?.[0]?.id || "";
      }
      if (!id) return;
      let request = requestCache.get(id);
      if (!request) {
        request = loadChrome(id);
        requestCache.set(id, request);
      }
      const result = await request;
      if (active) setData(result);
    };
    load().catch((error) => console.warn("Could not load site navigation:", error));
    return () => { active = false; };
  }, [projectId]);

  return data;
}
