import type { Job } from "@/components/JobCard";

let _job: Job | null = null;

export function setSelectedJob(job: Job) {
  _job = job;
}

export function getSelectedJob(): Job | null {
  return _job;
}
