import { NextResponse } from "next/server";
import { runBenchmark } from "@/lib/evaluation/benchmark-runner";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const savedBenchmark = await db.appSetting.findUnique({
      where: { key: "latest_model_benchmark" },
    });

    if (savedBenchmark?.value) {
      try {
        const parsed = JSON.parse(savedBenchmark.value);
        return NextResponse.json({ success: true, data: parsed, cached: true });
      } catch {
        // Fall through to run benchmark
      }
    }

    // Run benchmark if no cached report exists
    const report = await runBenchmark();

    // Cache latest benchmark
    await db.appSetting.upsert({
      where: { key: "latest_model_benchmark" },
      update: { value: JSON.stringify(report) },
      create: { key: "latest_model_benchmark", value: JSON.stringify(report) },
    });

    return NextResponse.json({ success: true, data: report, cached: false });
  } catch (error) {
    console.error("Benchmark error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const report = await runBenchmark();

    // Cache latest benchmark report in appSetting
    await db.appSetting.upsert({
      where: { key: "latest_model_benchmark" },
      update: { value: JSON.stringify(report) },
      create: { key: "latest_model_benchmark", value: JSON.stringify(report) },
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error("Benchmark execution error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
