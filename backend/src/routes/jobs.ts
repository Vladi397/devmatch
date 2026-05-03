import { Router, Response } from "express";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

// 15-minute in-memory cache
const cache = new Map<string, { data: any; expiresAt: number }>();
function getCached(key: string) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}
function setCached(key: string, data: any, ttlMs = 15 * 60 * 1000) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export type NormalizedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: string;
  url: string;
  postedAt: string;
  source: "adzuna" | "remotive";
  tags: string[];
  description?: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

const VALID_COUNTRIES = ["gb", "de", "nl", "fr", "be", "at", "it", "pl"];

async function fetchAdzuna(query: string, country: string, page: number): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const safeCountry = VALID_COUNTRIES.includes(country) ? country : "gb";
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${safeCountry}/search/${page}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "15");
  url.searchParams.set("what", query || "developer");
  url.searchParams.set("content-type", "application/json");

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data: any = await res.json();

  return (data.results || []).map((job: any) => ({
    id: `adzuna-${job.id}`,
    title: job.title,
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name ?? safeCountry.toUpperCase(),
    remote: /remote/i.test(job.title),
    salary:
      job.salary_min && job.salary_max
        ? `€${Math.round(job.salary_min).toLocaleString()} – €${Math.round(job.salary_max).toLocaleString()}`
        : undefined,
    url: job.redirect_url,
    postedAt: job.created,
    source: "adzuna" as const,
    tags: job.category?.label ? [job.category.label] : [],
    description: job.description ? stripHtml(job.description) : undefined,
  }));
}

async function fetchRemotive(query: string): Promise<NormalizedJob[]> {
  const url = new URL("https://remotive.com/api/remote-jobs");
  if (query) url.searchParams.set("search", query);
  url.searchParams.set("limit", "10");

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data: any = await res.json();

  return (data.jobs || []).map((job: any) => ({
    id: `remotive-${job.id}`,
    title: job.title,
    company: job.company_name,
    location: "Remote — Europe",
    remote: true,
    salary: job.salary || undefined,
    url: job.url,
    postedAt: job.publication_date,
    source: "remotive" as const,
    tags: (job.tags || []).slice(0, 4),
    description: job.description ? stripHtml(job.description) : undefined,
  }));
}

router.get("/", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const query = ((req.query.q as string) || "developer").trim();
    const country = (req.query.country as string) || "gb";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);

    const cacheKey = `${query}:${country}:${page}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const [adzunaResult, remotiveResult] = await Promise.allSettled([
      fetchAdzuna(query, country, page),
      page === 1 ? fetchRemotive(query) : Promise.resolve<NormalizedJob[]>([]),
    ]);

    const adzunaJobs = adzunaResult.status === "fulfilled" ? adzunaResult.value : [];
    const remotiveJobs = remotiveResult.status === "fulfilled" ? remotiveResult.value : [];

    // Interleave: every 3 Adzuna jobs add 1 Remotive job
    const jobs: NormalizedJob[] = [];
    let ri = 0;
    for (let i = 0; i < adzunaJobs.length; i++) {
      jobs.push(adzunaJobs[i]);
      if ((i + 1) % 3 === 0 && ri < remotiveJobs.length) {
        jobs.push(remotiveJobs[ri++]);
      }
    }
    while (ri < remotiveJobs.length) jobs.push(remotiveJobs[ri++]);

    const result = { jobs, count: jobs.length };
    setCached(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error("Jobs fetch error:", error);
    res.status(500).json({ message: "Failed to fetch jobs", detail: error?.message });
  }
});

export default router;
