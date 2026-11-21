import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getService, selectArtifact, filterArtifact, sign, upload, remove, insertArtifact, upsertProfile } = vi.hoisted(() => ({
  getService: vi.fn(),
  selectArtifact: vi.fn(),
  filterArtifact: vi.fn(),
  sign: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  insertArtifact: vi.fn(),
  upsertProfile: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('@/src/core/supabase/service', () => ({ getSupabaseServiceClient: getService }));

import { createArtifactPreviewUrl, saveUploadedArtifact } from '../service.server';

const bettorId = '00000000-0000-4000-8000-000000000001';
const artifactId = '00000000-0000-4000-8000-000000000002';

beforeEach(() => {
  vi.resetAllMocks();
  filterArtifact.mockImplementation(() => ({ eq: filterArtifact, single: selectArtifact }));
  getService.mockReturnValue({
    from: (table: string) => table === 'profiles'
      ? { upsert: upsertProfile }
      : {
          select: () => ({ eq: filterArtifact }),
          insert: () => ({ select: () => ({ single: insertArtifact }) })
        },
    storage: { from: () => ({ createSignedUrl: sign, upload, remove }) }
  });
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ error: null });
});

describe('private screenshot storage', () => {
  it('signs the authenticated owner’s canonical artifact for ten minutes', async () => {
    const path = `${bettorId}/${artifactId}.webp`;
    selectArtifact.mockResolvedValue({ data: { storage_path: path } });
    sign.mockResolvedValue({ data: { signedUrl: 'signed-preview' } });

    await expect(createArtifactPreviewUrl(bettorId, artifactId)).resolves.toBe('signed-preview');
    expect(filterArtifact.mock.calls).toEqual([['artifact_id', artifactId], ['bettor_id', bettorId]]);
    expect(sign).toHaveBeenCalledWith(path, 600);
  });

  it.each([
    `unrelated-folder/${artifactId}.png`,
    `${bettorId}/unrelated-artifact.png`,
    `${bettorId}/${artifactId}.png/extra`
  ])('refuses to sign a path outside the canonical artifact record', async (path) => {
    selectArtifact.mockResolvedValue({ data: { storage_path: path } });

    await expect(createArtifactPreviewUrl(bettorId, artifactId)).rejects.toThrow('Artifact not found.');
    expect(sign).not.toHaveBeenCalled();
  });

  it.each([['23505', true], ['', false]])('handles a failed artifact insert without masking its error', async (code, shouldRemove) => {
    const failure = { code };
    insertArtifact.mockResolvedValue({ error: failure });

    await expect(saveUploadedArtifact({
      bettorId,
      file: new File(['example'], 'screenshot.png', { type: 'image/png' }),
      artifactType: 'slip_screenshot'
    })).rejects.toBe(failure);
    if (shouldRemove) {
      expect(remove).toHaveBeenCalledWith([upload.mock.calls[0]?.[0]]);
    } else {
      expect(remove).not.toHaveBeenCalled();
    }
  });
});
