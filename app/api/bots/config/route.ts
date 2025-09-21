import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { validateBotConfiguration } from "@/lib/recall";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validation = validateBotConfiguration();

    return NextResponse.json({
      success: true,
      botConfiguration: validation,
      environmentVariables: {
        RECALL_API_KEY: process.env.RECALL_API_KEY ? "✅ Set" : "❌ Missing",
      },
    });
  } catch (error) {
    console.error("Error checking bot configuration:", error);
    return NextResponse.json(
      { error: "Failed to check bot configuration" },
      { status: 500 }
    );
  }
}
