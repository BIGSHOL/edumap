/**
 * SSE (Server-Sent Events) 스트리밍 유틸리티
 *
 * 서버: createSSEStream()으로 스트림 생성 → progress() / complete() / error()
 * 클라이언트: useSSE() 훅으로 실시간 진행도 수신
 */

export interface SSEProgress {
  /** 0~100 진행률 */
  progress: number;
  /** 현재 단계 메시지 */
  step: string;
  /** 완료 여부 */
  done: boolean;
  /** 최종 데이터 (done=true일 때) */
  data?: unknown;
  /** 에러 메시지 */
  error?: string;
}

/**
 * SSE 스트림 생성 (서버용)
 * Next.js App Router에서 ReadableStream + Response로 반환
 */
export function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      controller = null;
    },
  });

  function send(event: SSEProgress) {
    if (!controller) return;
    try {
      const data = JSON.stringify(event);
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    } catch {
      // 스트림 종료 시 무시
    }
  }

  return {
    stream,
    /** 진행 상황 전송 */
    progress(percent: number, step: string) {
      send({ progress: percent, step, done: false });
    },
    /** 완료 데이터 전송 + 스트림 종료 */
    complete(data: unknown) {
      send({ progress: 100, step: "완료", done: true, data });
      try { controller?.close(); } catch { /* ignore */ }
    },
    /** 에러 전송 + 스트림 종료 */
    error(message: string) {
      send({ progress: 0, step: message, done: false, error: message });
      try { controller?.close(); } catch { /* ignore */ }
    },
    /** SSE Response 생성 */
    toResponse() {
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    },
  };
}
