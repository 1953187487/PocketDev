import { LOCAL_CANDIDATES, probeModels } from '../local';
import { buildModelsEndpoint } from '../stream';

describe('local 模型直连', () => {
  it('候选列表覆盖三种常见本地服务', () => {
    const labels = LOCAL_CANDIDATES.map((c) => c.label);
    expect(labels).toContain('Ollama');
    expect(labels).toContain('LM Studio');
    expect(labels).toContain('llama.cpp');
  });

  it('probeModels 用带 /v1 的端点请求', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: 'qwen2.5:7b' }, { id: 'llama3:8b' }] }),
    })) as unknown as typeof fetch;
    const models = await probeModels('http://127.0.0.1:11434');
    expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:11434/v1/models', expect.anything());
    expect(models).toEqual(['qwen2.5:7b', 'llama3:8b']);
  });

  it('探测失败返回 null（不抛错）', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    await expect(probeModels('http://127.0.0.1:1234/v1')).resolves.toBeNull();
  });

  it('buildModelsEndpoint 与探测共用同一规范', () => {
    expect(buildModelsEndpoint('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080/v1/models');
  });
});
