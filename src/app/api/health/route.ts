import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await getDb().execute(sql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return Response.json(
    {
      ok: true,
      service: "Z9 EarthScope",
      version: "1.0.0",
      database: dbOk ? "up" : "degraded",
      dataSource: "NASA POWER (https://power.larc.nasa.gov/)",
      time: new Date().toISOString(),
    },
    { status: 200 }
  );
}
