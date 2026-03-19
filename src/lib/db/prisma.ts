import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __prismaConnected: boolean | null; // null = 미확인, true = 연결됨, false = 실패
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// DB 연결 상태 캐시 (한 번 실패하면 60초간 재시도 안 함)
let _dbCheckPromise: Promise<boolean> | null = null;
let _dbFailedAt = 0;
const DB_RETRY_INTERVAL = 60_000; // 60초

/**
 * DB 연결 가능 여부를 빠르게 반환.
 * - 최초 호출 시 연결 테스트 (SELECT 1)
 * - 성공하면 이후 항상 true
 * - 실패하면 60초간 false 반환 (재시도 없음)
 */
export async function isDbConnected(): Promise<boolean> {
  // 이미 연결 확인됨
  if (globalForPrisma.__prismaConnected === true) return true;

  // 최근 실패 → 즉시 false
  if (globalForPrisma.__prismaConnected === false) {
    if (Date.now() - _dbFailedAt < DB_RETRY_INTERVAL) return false;
    // 리트라이 시간 지남 → 다시 체크
    globalForPrisma.__prismaConnected = null;
  }

  // 동시 요청 방지 (하나의 프로미스만 실행)
  if (!_dbCheckPromise) {
    _dbCheckPromise = prisma.$queryRaw`SELECT 1`
      .then(() => {
        globalForPrisma.__prismaConnected = true;
        _dbCheckPromise = null;
        return true;
      })
      .catch(() => {
        globalForPrisma.__prismaConnected = false;
        _dbFailedAt = Date.now();
        _dbCheckPromise = null;
        return false;
      });
  }

  return _dbCheckPromise;
}
