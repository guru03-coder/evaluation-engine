import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resetOpenAIClient } from "@/lib/openai";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const settings = await db.appSetting.findMany();
  const settingsMap: Record<string, string> = {};

  for (const s of settings) {
    // Never expose actual API key to client
    if (s.key === "openai_api_key") {
      settingsMap[s.key] = s.value ? "sk-...configured" : "";
    } else {
      settingsMap[s.key] = s.value;
    }
  }

  // Include env-based values
  const mockSetting = await db.appSetting.findUnique({ where: { key: "mock_mode" } });
  settingsMap["mock_mode"] = mockSetting?.value || process.env.MOCK_AI || "false";
  const baseUrlSetting = await db.appSetting.findUnique({ where: { key: "openai_base_url" } });
  settingsMap["openai_base_url"] = baseUrlSetting?.value || process.env.OPENAI_BASE_URL || "";

  if (!settingsMap["openai_model"]) {
    settingsMap["openai_model"] = process.env.OPENAI_MODEL || "gpt-4o";
  }
  if (!settingsMap["openai_api_key"] && process.env.OPENAI_API_KEY) {
    settingsMap["openai_api_key"] = "sk-...configured (env)";
  }

  return NextResponse.json({ success: true, data: settingsMap });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, value } = body as { key: string; value: string };

    if (!key) {
      return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
    }

    // Allowed settings
    const allowedKeys = [
      "openai_api_key",
      "openai_model",
      "openai_base_url",
      "mock_mode",
      "judge_weight",
      "code_weight",
      "evaluation_stage",
    ];
    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ success: false, error: "Invalid setting key" }, { status: 400 });
    }

    await db.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    // Reset OpenAI client if key, model, or URL changed
    if (key === "openai_api_key" || key === "openai_base_url" || key === "openai_model") {
      resetOpenAIClient();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
