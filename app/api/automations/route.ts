import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const type = searchParams.get("type");

    const whereClause: any = {
      userId: session.user.id,
      isActive: true,
    };

    if (platform) {
      whereClause.platform = platform;
    }

    if (type) {
      whereClause.type = type;
    }

    const automations = await prisma.automation.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(automations);
  } catch (error) {
    console.error("Error fetching automations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, type, platform, description, example } = await request.json();

    const automation = await prisma.automation.create({
      data: {
        userId: session.user.id,
        name,
        type,
        platform,
        description,
        example,
      },
    });

    return NextResponse.json(automation);
  } catch (error) {
    console.error("Error creating automation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
