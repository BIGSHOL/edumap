/**
 * ApiCache 유틸리티
 *
 * DB의 ApiCache 테이블을 활용한 공공 API 응답 캐싱
 * TTL: 24시간 (공공 API 데이터는 일 단위로 갱신)
 */

import { prisma, isDbConnected } from "@/lib/db/prisma";

const DEFAULT_TTL_HOURS = 24;

/**
 * 캐시된 API 응답 조회
 * @returns 캐시 히트 시 파싱된 데이터, 미스 시 null
 */
export async function getCached<T>(
  apiSource: string,
  requestKey: string
): Promise<T | null> {
  if (!(await isDbConnected())) return null;
  try {
    const cached = await prisma.apiCache.findUnique({
      where: {
        idx_api_cache_key: { apiSource, requestKey },
      },
    });

    if (!cached) return null;

    // 만료 확인
    if (new Date() > cached.expiresAt) {
      // 만료된 캐시 삭제 (비동기)
      prisma.apiCache
        .delete({ where: { id: cached.id } })
        .catch(() => {});
      return null;
    }

    return cached.responseData as T;
  } catch {
    return null;
  }
}

/**
 * API 응답을 캐시에 저장
 */
export async function setCache(
  apiSource: string,
  requestKey: string,
  responseData: unknown,
  ttlHours: number = DEFAULT_TTL_HOURS
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    await prisma.apiCache.upsert({
      where: {
        idx_api_cache_key: { apiSource, requestKey },
      },
      update: {
        responseData: responseData as object,
        cachedAt: new Date(),
        expiresAt,
      },
      create: {
        apiSource,
        requestKey,
        responseData: responseData as object,
        expiresAt,
      },
    });
  } catch {
    // 캐싱 실패는 무시 — API 호출은 계속 진행
  }
}
