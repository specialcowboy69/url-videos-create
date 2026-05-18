export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    { ok: true, service: "hyperframes-render-studio" },
    { status: 200 }
  );
}
