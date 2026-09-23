import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { startQueue } from "@/lib/queue/evaluation-queue";
import type { ParsedSubmissionRow } from "@/lib/importers/spreadsheet-parser";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rows, autoStartQueue = true } = body as {
      rows: ParsedSubmissionRow[];
      autoStartQueue?: boolean;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No rows provided for import" },
        { status: 400 }
      );
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      if (row.isDuplicate) {
        skippedCount++;
        continue;
      }

      // Check if project already exists in database (by GitHub URL or leader email + project name)
      const existingSession = await db.evaluationSession.findFirst({
        where: {
          OR: [
            ...(row.githubUrl ? [{ githubUrl: row.githubUrl }] : []),
            ...(row.leaderEmail && row.projectName
              ? [{ leaderEmail: row.leaderEmail, projectName: row.projectName }]
              : []),
          ],
        },
      });

      if (existingSession) {
        // Update existing record
        await db.evaluationSession.update({
          where: { id: existingSession.id },
          data: {
            teamName: row.teamName || existingSession.teamName,
            projectName: row.projectName || existingSession.projectName,
            description: row.description || existingSession.description,
            leaderName: row.leaderName || existingSession.leaderName,
            leaderEmail: row.leaderEmail || existingSession.leaderEmail,
            participationType: row.participationType || existingSession.participationType,
            organization: row.organization || existingSession.organization,
            university: row.organization || existingSession.university,
            members: JSON.stringify(row.members || []),
            githubUrl: row.githubUrl || existingSession.githubUrl,
            demoUrl: row.demoUrl || existingSession.demoUrl,
            pptUrl: row.pptUrl || existingSession.pptUrl,
            spreadsheetRow: row.rowNumber,
            jobStatus: "QUEUED",
            jobAttempts: 0,
            jobError: "",
          },
        });
        importedCount++;
      } else {
        // Create new record
        await db.evaluationSession.create({
          data: {
            teamName: row.teamName || `Team Row ${row.rowNumber}`,
            projectName: row.projectName || row.teamName,
            description: row.description,
            leaderName: row.leaderName || row.teamName,
            leaderEmail: row.leaderEmail,
            participationType: row.participationType || "Team",
            organization: row.organization,
            university: row.organization,
            members: JSON.stringify(row.members || []),
            githubUrl: row.githubUrl,
            demoUrl: row.demoUrl,
            pptUrl: row.pptUrl,
            spreadsheetRow: row.rowNumber,
            jobStatus: "QUEUED",
            evaluationStage: "stage1",
            status: "draft",
            createdById: user.id,
          },
        });
        importedCount++;
      }
    }

    if (autoStartQueue && importedCount > 0) {
      startQueue().catch((err) => console.error("Auto-start queue error:", err));
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "bulk_spreadsheet_imported",
        details: JSON.stringify({
          importedCount,
          skippedCount,
          totalRows: rows.length,
          autoStartQueue,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        importedCount,
        skippedCount,
        totalRows: rows.length,
        queueStarted: autoStartQueue,
      },
    });
  } catch (error) {
    console.error("Bulk import execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to import rows",
      },
      { status: 500 }
    );
  }
}
