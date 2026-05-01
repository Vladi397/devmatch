import type { Job } from "@/components/JobCard";

export const MOCK_JOBS: Job[] = [
  {
    id: "1",
    title: "Junior Frontend Developer",
    company: "ASML",
    location: "Eindhoven, Netherlands",
    remote: false,
    salary: "€45,000 – €55,000",
    url: "https://www.asml.com/en/careers",
    postedAt: new Date(Date.now() - 86400000).toISOString(),
    source: "adzuna",
    tags: ["React", "TypeScript", "CSS"],
  },
  {
    id: "2",
    title: "Junior Fullstack Developer",
    company: "Philips",
    location: "Eindhoven, Netherlands",
    remote: false,
    url: "https://www.philips.com/a-w/about/careers.html",
    postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    source: "adzuna",
    tags: ["Node.js", "React", "PostgreSQL"],
  },
  {
    id: "3",
    title: "Remote React Developer",
    company: "Fontys",
    location: "Remote — Europe",
    remote: true,
    salary: "€40,000 – €50,000",
    url: "https://fontys.nl/en",
    postedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    source: "remotive",
    tags: ["React", "JavaScript"],
  },
];
