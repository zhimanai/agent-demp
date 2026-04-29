import appEnv from '../config/env';

export interface ChatMessageBlock {
  type: 'tool' | 'text';
  content: string;
  toolId?: string;
  toolSource?: 'mcp';
  toolIcon?: string;
}

export interface ChatCompletionRequest {
  conversationId?: string;
  message: string;
  metadata: {
    enableIntentClassification: boolean;
    model: string;
    mcpAppIds: string[];
  };
  messageBlocks: string;
}

export type ChatStreamEventType =
  | 'ConversationStarted'
  | 'PlanningStarted'
  | 'PlanContent'
  | 'PlanningCompleted'
  | 'ToolExecutionStarted'
  | 'ToolExecutionCompleted'
  | 'ContentChunk'
  | 'ConversationCompleted'
  | 'Error';

export interface ChatStreamEvent<T = Record<string, unknown>> {
  type: ChatStreamEventType;
  data: T;
}

export interface ChatStreamCallbacks {
  onEvent?: (event: ChatStreamEvent) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

const useMockChat = import.meta.env.VITE_CHAT_USE_MOCK === 'true';
const defaultModel = import.meta.env.VITE_CHAT_MODEL_ID || '315f5c4a-428b-4d3a-910a-072a86a5926f';
const defaultMcpAppIds = (import.meta.env.VITE_CHAT_MCP_APP_IDS || '019be987-fb87-7e12-8c01-834d4c9cdbf5')
  .split(',')
  .map((item: string) => item.trim())
  .filter(Boolean);

function splitIntoChunks(content: string) {
  return content
    .split(/(?<=[，。；：！？])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    if (!signal) return;

    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function createChatMockEvents(payload: ChatCompletionRequest): ChatStreamEvent[] {
  const prompt = payload.message.trim();
  const now = Date.now();
  const conversationId = payload.conversationId || `019dd7f7-${String(now).slice(-4)}-mock-conversation`;
  const planId = `019dd7f7-${String(now + 1).slice(-4)}-mock-plan`;
  const stationTool = payload.metadata.mcpAppIds[0] || '019be987-fb87-7e12-8c01-834d4c9cdbf5';

  if (prompt.includes('票') || prompt.includes('12306') || prompt.includes('上海') || prompt.includes('沈丘')) {
    const replyChunks = splitIntoChunks(
      '我先帮你看了一下当前查询链路。上海侧已经识别到可用站点代码 SHH，但沈丘没有直接命中城市编码，因此暂时还不能继续查询余票。你可以把目的地改成“沈丘站”再试一次，或者换成“周口东”“郑州东”等中转站点，我可以继续帮你模拟后续查询结果。',
    );

    return [
      {
        type: 'ConversationStarted',
        data: {
          conversation_id: conversationId,
          message_id: `019dd7f7-${String(now + 2).slice(-4)}-mock-message`,
        },
      },
      {
        type: 'PlanningStarted',
        data: {
          execution_plan_id: planId,
          plan_type: 'iterative',
        },
      },
      {
        type: 'PlanContent',
        data: {
          content: '需要先获取上海和沈丘两个城市的代表车站代码，才能查询车票。',
          is_final: true,
        },
      },
      {
        type: 'PlanningCompleted',
        data: {
          execution_plan_id: planId,
          status: 'completed',
        },
      },
      {
        type: 'ToolExecutionStarted',
        data: {
          execution_id: `019dd7f7-${String(now + 3).slice(-4)}-tool-1`,
          tool_name: '12306.get-station-code-of-citys',
          execution_plan_id: planId,
          tool_id: stationTool,
        },
      },
      {
        type: 'ToolExecutionCompleted',
        data: {
          execution_id: `019dd7f7-${String(now + 4).slice(-4)}-tool-1`,
          tool_name: '12306.get-station-code-of-citys',
          result: {
            output: '{"上海":{"station_code":"SHH","station_name":"上海"},"沈丘":{"error":"未检索到城市。"}}',
            metadata: {},
            executionTimeMs: 293,
          },
          execution_time_ms: 293,
        },
      },
      {
        type: 'PlanningStarted',
        data: {
          execution_plan_id: planId,
          plan_type: 'iterative',
        },
      },
      {
        type: 'PlanContent',
        data: {
          content: '之前调用 get-station-code-of-citys 未检索到沈丘市，说明沈丘可能不是标准城市名，需改用 get-stations-code-in-city 进一步确认站点。',
          is_final: true,
        },
      },
      {
        type: 'PlanningCompleted',
        data: {
          execution_plan_id: planId,
          status: 'completed',
        },
      },
      {
        type: 'ToolExecutionStarted',
        data: {
          execution_id: `019dd7f7-${String(now + 5).slice(-4)}-tool-2`,
          tool_name: '12306.get-stations-code-in-city',
          execution_plan_id: planId,
          tool_id: stationTool,
        },
      },
      {
        type: 'ToolExecutionCompleted',
        data: {
          execution_id: `019dd7f7-${String(now + 6).slice(-4)}-tool-2`,
          tool_name: '12306.get-stations-code-in-city',
          result: {
            output: '"Error: City not found. "',
            metadata: {},
            executionTimeMs: 317,
          },
          execution_time_ms: 317,
        },
      },
      ...replyChunks.map((content, index) => ({
        type: 'ContentChunk' as const,
        data: {
          content,
          is_final: index === replyChunks.length - 1,
        },
      })),
      {
        type: 'ConversationCompleted',
        data: {
          conversation_id: conversationId,
          status: 'completed',
        },
      },
    ];
  }

  const generalReplyChunks = splitIntoChunks(
    `我已经收到你的请求“${prompt}”。当前这轮会先走本地模拟流，用来验证规划、工具调用和流式回复的展示效果。等真实接口恢复后，这套交互可以直接切换到正式模型链路。`,
  );

  return [
    {
      type: 'ConversationStarted',
      data: {
        conversation_id: conversationId,
        message_id: `019dd7f7-${String(now + 2).slice(-4)}-mock-message`,
      },
    },
    {
      type: 'PlanningStarted',
      data: {
        execution_plan_id: planId,
        plan_type: 'iterative',
      },
    },
    {
      type: 'PlanContent',
      data: {
        content: `正在根据请求“${prompt}”选择合适的 Agent 工具链路。`,
        is_final: true,
      },
    },
    {
      type: 'PlanningCompleted',
      data: {
        execution_plan_id: planId,
        status: 'completed',
      },
    },
    ...generalReplyChunks.map((content, index) => ({
      type: 'ContentChunk' as const,
      data: {
        content,
        is_final: index === generalReplyChunks.length - 1,
      },
    })),
    {
      type: 'ConversationCompleted',
      data: {
        conversation_id: conversationId,
        status: 'completed',
      },
    },
  ];
}

export function createChatRequest(message: string, conversationId?: string): ChatCompletionRequest {
  const messageBlocks: ChatMessageBlock[] = [
    {
      type: 'tool',
      content: '12306',
      toolId: defaultMcpAppIds[0],
      toolSource: 'mcp',
      toolIcon: '/assets/tools/12306.png',
    },
    {
      type: 'text',
      content: ` ${message}`,
    },
  ];

  return {
    conversationId,
    message,
    metadata: {
      enableIntentClassification: true,
      model: defaultModel,
      mcpAppIds: defaultMcpAppIds,
    },
    messageBlocks: JSON.stringify(messageBlocks),
  };
}

export async function streamChatCompletion(
  payload: ChatCompletionRequest,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal,
) {
  const { onEvent, onDone, onError } = callbacks;

  if (useMockChat) {
    try {
      const events = createChatMockEvents(payload);
      for (const event of events) {
        await wait(260, signal);
        onEvent?.(event);
      }
      onDone?.();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      const normalized = error instanceof Error ? error : new Error('本地模拟流执行失败');
      onError?.(normalized);
      throw normalized;
    }
  }

  const response = await fetch(`${appEnv.apiBaseUrl}/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    const error = new Error(`接口请求失败: ${response.status}`);
    onError?.(error);
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const flush = () => {
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const dataLine = part
        .split('\n')
        .find((line) => line.startsWith('data:'))
        ?.slice(5)
        .trim();

      if (!dataLine) continue;

      const event = JSON.parse(dataLine) as ChatStreamEvent;
      onEvent?.(event);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      flush();
    }

    if (buffer.trim()) {
      flush();
    }

    onDone?.();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    const normalized = error instanceof Error ? error : new Error('流式响应解析失败');
    onError?.(normalized);
    throw normalized;
  } finally {
    reader.cancel().catch(() => undefined);
  }
}
