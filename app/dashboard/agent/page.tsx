import fs from "fs";
import path from "path";
import AgentView from "@/components/agent/AgentView";

export const dynamic = "force-dynamic";

const AGENT_DIR = "/root/.openclaw/workspace/wa-bot-arasya/data/agent";

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(AGENT_DIR, name), "utf8"));
  } catch {
    return fallback;
  }
}

export default function AgentPage() {
  const decisions = readJson<any[]>("decision-log.json", []).slice(0, 50);
  const lessons = readJson<any[]>("agent-lessons.json", []).slice(0, 50);
  const drivers = readJson<any[]>("driver-aliases.learned.json", []).slice(0, 100);
  const areas = readJson<any[]>("area-aliases.learned.json", []).slice(0, 100);
  const cars = readJson<any[]>("car-aliases.learned.json", []).slice(0, 100);
  const orderLessons = readJson<any[]>("order-parser-lessons.json", []).slice(0, 50);
  const reportLessons = readJson<any[]>("report-parser-lessons.json", []).slice(0, 50);

  return (
    <AgentView
      decisions={decisions}
      lessons={lessons}
      drivers={drivers}
      areas={areas}
      cars={cars}
      orderLessons={orderLessons}
      reportLessons={reportLessons}
    />
  );
}
