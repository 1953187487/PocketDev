import {
  buildEndpoint,
  buildModelsEndpoint,
  describeHttpError,
  extractAnthropicDelta,
  extractOpenAiDelta,
  isLocalBaseUrl,
} from '../stream';

describe('extractOpenAiDelta', () => {
  it('解析 choices[0].delta.content 增量', () => {
    const r = extractOpenAiDelta('data: {"choices":[{"delta":{"content":"你好"}}]}');
    expect(r).toEqual({ text: '你好' });
  });
  it('解析非流式 choices[0].text 兼容', () => {
    const r = extractOpenAiDelta('data: {"choices":[{"text":"Hi"}]}');
    expect(r).toEqual({ text: 'Hi' });
  });
  it('忽略非 data 前缀行', () => {
    expect(extractOpenAiDelta('event: message')).toBeNull();
  });
  it('识别 [DONE]', () => {
    expect(extractOpenAiDelta('data: [DONE]')).toEqual({ done: true });
  });
  it('解析失败返回 null', () => {
    expect(extractOpenAiDelta('data: not-json')).toBeNull();
  });
});

describe('extractAnthropicDelta', () => {
  it('解析 content_block_delta.text', () => {
    const r = extractAnthropicDelta('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}');
    expect(r).toEqual({ text: 'Hi' });
  });
  it('识别 message_stop', () => {
    expect(extractAnthropicDelta('data: {"type":"message_stop"}')).toEqual({ done: true });
  });
});

describe('buildEndpoint', () => {
  it('OpenAI 兼容：无 /v1 时自动补全', () => {
    expect(buildEndpoint('https://api.deepseek.com', 'openai_chat')).toBe('https://api.deepseek.com/v1/chat/completions');
  });
  it('OpenAI 兼容：已带 /v1 不重复', () => {
    expect(buildEndpoint('https://api.deepseek.com/v1/', 'openai_chat')).toBe('https://api.deepseek.com/v1/chat/completions');
  });
  it('Anthropic：补 /v1 并拼 /messages', () => {
    expect(buildEndpoint('https://api.anthropic.com', 'anthropic')).toBe('https://api.anthropic.com/v1/messages');
  });
  it('Anthropic：已带 /v1 不重复', () => {
    expect(buildEndpoint('https://api.anthropic.com/v1', 'anthropic')).toBe('https://api.anthropic.com/v1/messages');
  });
});

describe('buildModelsEndpoint', () => {
  it('本地 Ollama 直连自动补 /v1', () => {
    expect(buildModelsEndpoint('http://127.0.0.1:11434')).toBe('http://127.0.0.1:11434/v1/models');
  });
  it('已带 /v1 不重复', () => {
    expect(buildModelsEndpoint('http://127.0.0.1:11434/v1')).toBe('http://127.0.0.1:11434/v1/models');
  });
});

describe('isLocalBaseUrl', () => {
  it('识别本地地址', () => {
    expect(isLocalBaseUrl('http://127.0.0.1:11434/v1')).toBe(true);
    expect(isLocalBaseUrl('http://localhost:1234/v1')).toBe(true);
    expect(isLocalBaseUrl('http://10.0.2.2:8080/v1')).toBe(true);
  });
  it('不误判公网地址', () => {
    expect(isLocalBaseUrl('https://api.deepseek.com/v1')).toBe(false);
    expect(isLocalBaseUrl('http://192.168.1.10:11434/v1')).toBe(false);
  });
});

describe('describeHttpError', () => {
  it('401/403 提示 Key 无效', () => {
    expect(describeHttpError(401, '{"error":{"message":"bad key"}}')).toContain('API Key');
  });
  it('404 提示 /v1 格式', () => {
    expect(describeHttpError(404, '')).toContain('/v1');
  });
  it('解析 error.message', () => {
    expect(describeHttpError(500, '{"error":{"message":"内部错误"}}')).toBe('内部错误');
  });
  it('未知状态回退', () => {
    expect(describeHttpError(503, '')).toBe('请求失败（503）');
  });
});
