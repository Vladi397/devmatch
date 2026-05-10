import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "user_preferences";

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}
async function setItem(key: string, value: string) {
  if (Platform.OS === "web") localStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

export type Preferences = {
  roles: string[];
  techStack: string[];
  onboardingDone: boolean;
};

export async function getPreferences(): Promise<Preferences> {
  try {
    const raw = await getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { roles: [], techStack: [], onboardingDone: false };
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await setItem(KEY, JSON.stringify(prefs));
}

const ROLE_KEYWORDS: Record<string, string[]> = {
  "Frontend Developer": ["frontend", "front-end", "react", "vue", "angular", "ui", "css", "html"],
  "Backend Developer": ["backend", "back-end", "node", "python", "java", "api", "server", "database"],
  "Full Stack": ["full stack", "fullstack", "full-stack"],
  "Cloud Engineer": ["cloud", "aws", "azure", "gcp", "infrastructure", "terraform"],
  "DevOps": ["devops", "kubernetes", "docker", "ci/cd", "pipelines"],
  "Mobile Developer": ["mobile", "ios", "android", "react native", "flutter"],
  "Data Engineer": ["data", "analytics", "sql", "spark", "pipeline"],
  "Tech Support": ["support", "helpdesk", "it support", "service desk"],
  "AI / Machine Learning": ["ai", "ml", "machine learning", "deep learning", "nlp", "llm"],
};

export function computeMatchScore(
  jobTags: string[],
  jobTitle: string,
  prefs: Preferences
): number {
  if (!prefs.roles.length && !prefs.techStack.length) return 0;

  const jobTagsLower = jobTags.map((t) => t.toLowerCase());
  const titleLower = jobTitle.toLowerCase();

  // Tech stack match (60% weight)
  let techMatches = 0;
  for (const tech of prefs.techStack) {
    const tl = tech.toLowerCase();
    if (jobTagsLower.some((jt) => jt.includes(tl) || tl.includes(jt))) {
      techMatches++;
    }
  }
  const denominator = Math.max(prefs.techStack.length, 4);
  const techScore = prefs.techStack.length ? (techMatches / denominator) * 100 : 0;

  // Role match (40% weight)
  let roleScore = 0;
  for (const role of prefs.roles) {
    const keywords = ROLE_KEYWORDS[role] ?? [role.toLowerCase().split(" ")[0]];
    if (keywords.some((kw) => titleLower.includes(kw))) {
      roleScore = 100;
      break;
    }
  }

  return Math.min(99, Math.max(12, Math.round(techScore * 0.6 + roleScore * 0.4)));
}
