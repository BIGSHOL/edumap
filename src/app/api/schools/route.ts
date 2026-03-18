import { getSchoolList } from "@/lib/services/school-data";
import { sourceLabel } from "@/lib/services/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const region = searchParams.get("region") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const district = searchParams.get("district") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const { data, total, source } = await getSchoolList({ region, type, search, district, page, limit });

  return Response.json({
    data,
    meta: { source: sourceLabel(source), page, total },
  });
}
