import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  parseSpreadsheetBuffer,
  fetchAndParseGoogleSheet,
} from "@/lib/importers/spreadsheet-parser";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "Please select a CSV or Excel file to upload" },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const preview = parseSpreadsheetBuffer(buffer);

      return NextResponse.json({ success: true, data: preview });
    }

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { googleSheetUrl } = body as { googleSheetUrl?: string };

      if (!googleSheetUrl || !googleSheetUrl.trim()) {
        return NextResponse.json(
          { success: false, error: "Please provide a valid Google Sheets URL" },
          { status: 400 }
        );
      }

      const preview = await fetchAndParseGoogleSheet(googleSheetUrl);
      return NextResponse.json({ success: true, data: preview });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported content type. Send multipart file or JSON with googleSheetUrl" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Preview import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse spreadsheet",
      },
      { status: 400 }
    );
  }
}
