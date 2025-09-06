import { adminDownload } from '@/lib/api/admin';

// Mock createPresetApiClient to control responses
jest.mock('@/lib/api', () => ({
  createPresetApiClient: jest.fn(() => ({
    get: jest.fn((_url: string, _cfg: any) => {
      // Simulate error response with Blob(JSON)
      const data = new Blob([
        JSON.stringify({ code: 'forbidden', message: '操作の権限がありません' })
      ], { type: 'application/json' });
      const error: any = new Error('Request failed');
      error.response = { status: 403, data };
      return Promise.reject(error);
    }),
    post: jest.fn(),
  }))
}));

describe('adminDownload error envelope handling', () => {
  test('parses JSON envelope from Blob and throws ApiError with code/message', async () => {
    await expect(
      adminDownload('/engineers/weekly-reports/export', 'test.csv')
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'forbidden',
      message: '操作の権限がありません',
    });
  });
});

