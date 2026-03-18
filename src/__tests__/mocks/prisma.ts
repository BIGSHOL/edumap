import { vi } from "vitest";

// Prisma Client mock — 테스트에서 DB 연결 없이 동작
export const prismaMock = {
  school: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  region: {
    findMany: vi.fn(),
  },
  teacherStats: {
    findMany: vi.fn(),
  },
  financeStats: {
    findMany: vi.fn(),
  },
  afterSchoolProgram: {
    findMany: vi.fn(),
  },
  riskScore: {
    findMany: vi.fn(),
  },
  reportCache: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));
