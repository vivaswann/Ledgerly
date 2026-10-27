import { sameOrigin } from "@/lib/services/request-security";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mutate, remove, AccessError } from "@/lib/services/mutations";
import { schemas, type Entity } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { z } from "zod";
export const runtime = "nodejs";
function failure(e: unknown) {
  if (e instanceof AccessError)
    return NextResponse.json({ error: e.message }, { status: 404 });
  if (e instanceof z.ZodError)
    return NextResponse.json(
      {
        error: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json(
      {
        error:
          e.code === "P2002"
            ? "This name is already in use."
            : "Unable to save this record.",
      },
      { status: e.code === "P2002" ? 409 : 400 },
    );
  }
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Unable to save." },
    { status: 400 },
  );
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 401 },
    );
  try {
    const { entity } = await params;
    if (!Object.hasOwn(schemas, entity))
      return NextResponse.json(
        { error: "Unknown operation." },
        { status: 404 },
      );
    const body = await req.json();
    const id = z.string().uuid().optional().parse(body.id);
    await mutate(db, session.user.id, entity as Entity, body, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 401 },
    );
  try {
    const { entity } = await params;
    const { id } = z.object({ id: z.string().uuid() }).parse(await req.json());
    await remove(db, session.user.id, entity, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
