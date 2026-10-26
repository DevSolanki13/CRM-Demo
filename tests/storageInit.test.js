import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockStorage = vi.hoisted(() => ({
  getBucket: vi.fn(),
  createBucket: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ storage: mockStorage }),
}));

import { initializeAttachmentStorage } from '../backend/services/attachmentService.js';

describe('initializeAttachmentStorage service', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    mockStorage.getBucket.mockReset();
    mockStorage.createBucket.mockReset();
    mockStorage.from.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('fails with 503 if credentials are not configured', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    await expect(initializeAttachmentStorage()).rejects.toMatchObject({
      statusCode: 503,
      message: 'Attachment storage is not configured on the server.',
    });
  });

  it('rejects a public bucket with 409', async () => {
    mockStorage.getBucket.mockResolvedValueOnce({
      data: { name: 'crm-attachments', public: true },
      error: null,
    });

    await expect(initializeAttachmentStorage()).rejects.toMatchObject({
      statusCode: 409,
      message: 'The attachment bucket must be private. Choose a separate private bucket.',
    });
  });

  it('creates the bucket with private flag and restrictions if it does not exist', async () => {
    // 1st getBucket in initializeAttachmentStorage (inspect)
    mockStorage.getBucket.mockResolvedValueOnce({
      data: null,
      error: { statusCode: 404, message: 'Not found' },
    });
    mockStorage.createBucket.mockResolvedValueOnce({
      data: { name: 'crm-attachments' },
      error: null,
    });
    // 2nd getBucket in privateBucket() (confirm)
    mockStorage.getBucket.mockResolvedValueOnce({
      data: { name: 'crm-attachments', public: false },
      error: null,
    });
    mockStorage.from.mockReturnValueOnce({
      upload: vi.fn(),
    });

    const result = await initializeAttachmentStorage();
    expect(result).toEqual({ bucket: 'crm-attachments', private: true });
    expect(mockStorage.createBucket).toHaveBeenCalledWith('crm-attachments', {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: expect.arrayContaining(['application/pdf', 'image/png', 'text/plain']),
    });
  });

  it('returns successfully if a private bucket already exists', async () => {
    // 1st getBucket in initializeAttachmentStorage
    mockStorage.getBucket.mockResolvedValueOnce({
      data: { name: 'crm-attachments', public: false },
      error: null,
    });
    // 2nd getBucket in privateBucket()
    mockStorage.getBucket.mockResolvedValueOnce({
      data: { name: 'crm-attachments', public: false },
      error: null,
    });
    mockStorage.from.mockReturnValueOnce({});

    const result = await initializeAttachmentStorage();
    expect(result).toEqual({ bucket: 'crm-attachments', private: true });
    expect(mockStorage.createBucket).not.toHaveBeenCalled();
  });
});
