import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getQueueStatus,
  startQueue,
  pauseQueue,
  retryFailedJobs,
  triggerStage2ForShortlisted,
} from "@/lib/queue/evaluation-queue";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const status = await getQueueStatus();
  return NextResponse.json({ success: true, data: status });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body as {
      action: "start" | "pause" | "retry-failed" | "stage2-shortlisted";
    };

    if (action === "start") {
      await startQueue();
      const status = await getQueueStatus();
      return NextResponse.json({ success: true, message: "Queue started", data: status });
    }

    if (action === "pause") {
      pauseQueue();
      const status = await getQueueStatus();
      return NextResponse.json({ success: true, message: "Queue paused", data: status });
    }

    if (action === "retry-failed") {
      await retryFailedJobs();
      const status = await getQueueStatus();
      return NextResponse.json({ success: true, message: "Retrying failed evaluations", data: status });
    }

    if (action === "stage2-shortlisted") {
      const res = await triggerStage2ForShortlisted();
      const status = await getQueueStatus();
      return NextResponse.json({
        success: true,
        message: `Queued ${res.count} shortlisted projects for Stage 2 Deep Evaluation`,
        data: status,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Queue control error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Queue action failed" },
      { status: 500 }
    );
  }
}
