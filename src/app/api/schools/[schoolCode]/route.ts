import { getSchoolDetail } from "@/lib/services/school-data";
import { sourceLabel } from "@/lib/services/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ schoolCode: string }> }
) {
  const { schoolCode } = await params;
  const { data, source } = await getSchoolDetail(schoolCode);

  if (!data) {
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: `학교 코드 '${schoolCode}'에 해당하는 학교를 찾을 수 없습니다.`,
        },
      },
      { status: 404 }
    );
  }

  return Response.json({
    data,
    meta: { source: sourceLabel(source) },
  });
}
