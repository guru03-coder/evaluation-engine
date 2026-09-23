import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOpenAIClient, getOpenAIModel, isMockMode } from "@/lib/openai";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const mock = await isMockMode();
  if (mock) {
    return NextResponse.json({
      success: true,
      message: "Running in Offline / Simulated Evaluation mode. No external API key required.",
      mockMode: true,
      latencyMs: 15,
    });
  }

  const startTime = Date.now();
  try {
    const client = await getOpenAIClient();
    const model = await getOpenAIModel();

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a test ping." },
        { role: "user", content: "Respond with the single word: OK" },
      ],
      max_tokens: 5,
      temperature: 0.1,
    });

    const latencyMs = Date.now() - startTime;
    const reply = response.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({
      success: true,
      message: `Successfully connected to ${model} in ${latencyMs}ms. Response: "${reply}"`,
      model,
      latencyMs,
      mockMode: false,
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        error: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        latencyMs,
      },
      { status: 400 }
    );
  }
}
