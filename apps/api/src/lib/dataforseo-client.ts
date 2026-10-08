export type DataForSeoEnvironment = {
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
};

export async function postDataForSeo(
  environment: DataForSeoEnvironment,
  path: string,
  payload: unknown,
) {
  const login = environment.DATAFORSEO_LOGIN?.trim();
  const password = environment.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password)
    throw new Error("Paid SEO research is not configured");
  const response = await fetch(`https://api.dataforseo.com/v3/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json().catch(() => null)) as any;
  if (
    !response.ok ||
    !body ||
    body.status_code < 20000 ||
    body.status_code >= 30000
  )
    throw new Error("SEO data provider could not complete the request");
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  if (
    !tasks.length ||
    tasks.some(
      (task: any) =>
        !task || task.status_code < 20000 || task.status_code >= 30000,
    )
  )
    throw new Error("SEO data provider returned no valid result");
  const costs = tasks.map((task: any) => {
    const value = task.cost == null ? null : Number(task.cost);
    return value !== null && Number.isFinite(value) && value >= 0
      ? value
      : null;
  });
  const cost = costs.every((value: number | null) => value !== null)
    ? costs.reduce(
        (total: number, value: number | null) => total + (value || 0),
        0,
      )
    : null;
  return { body, tasks, cost };
}
