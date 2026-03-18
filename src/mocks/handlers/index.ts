import type { RequestHandler } from "msw";

// 각 모듈의 핸들러를 여기에 import하여 통합합니다.
// import { schoolInfoHandlers } from "./schoolinfo";
// import { neisHandlers } from "./neis";
// import { claudeHandlers } from "./claude";

export const handlers: RequestHandler[] = [
  // ...schoolInfoHandlers,
  // ...neisHandlers,
  // ...claudeHandlers,
];
