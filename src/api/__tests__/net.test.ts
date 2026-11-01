import { describeNetworkError } from '@/api/net';

describe('describeNetworkError', () => {
  it('recognizes timeout and abort errors', () => {
    expect(describeNetworkError(new Error('The operation was aborted'))).toContain('超时');
    expect(describeNetworkError(new Error('AbortError'))).toContain('超时');
    expect(describeNetworkError(new TypeError('Aborted'))).toContain('超时');
  });

  it('recognizes network failure messages', () => {
    expect(describeNetworkError(new TypeError('Network request failed'))).toContain('网络');
    expect(describeNetworkError(new TypeError('Failed to fetch'))).toContain('网络');
  });

  it('passes through other messages', () => {
    expect(describeNetworkError(new Error('401 Unauthorized'))).toBe('401 Unauthorized');
    expect(describeNetworkError('custom')).toBe('custom');
    expect(describeNetworkError(undefined)).toContain('请求失败');
  });
});
