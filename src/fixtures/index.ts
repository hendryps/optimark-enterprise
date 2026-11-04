/**
 * Pintu masuk fixture untuk SEMUA test.
 *
 * Di file test cukup:
 *   import { expect, meta, test } from '../../src/fixtures';
 *
 *   test('BILL-01 akses halaman', async ({ billing }) => {   // <- fixture `billing`: halaman sudah terbuka
 *     await expect(billing.viewPlansButton).toBeVisible();
 *   });
 *
 * Fixture dipecah per tema supaya mudah dicari:
 *   sessions.ts       -> app / anon / userB / newUser (tab browser + login) dan trace
 *   pages.ts          -> dashboard, composer, assistant, ... (halaman yang sudah dibuka)
 *   account-state.ts  -> funded, connected, withContent, ... (skip otomatis sesuai kondisi akun)
 *   auth.ts           -> mailbox, registerPage, newAccount, ... (khusus test login/register)
 *   (di bawah)        -> `files`: gambar/PDF contoh untuk test upload
 *
 * Menambah fixture baru? Taruh di file yang temanya paling cocok.
 */
import { expect } from '@playwright/test';
import { meta } from '../utils/case-info';
import { createSampleFiles, type SampleFiles } from '../utils/sample-files';
import { authTest } from './auth';

/** `files` = file contoh (png, jpg, pdf, big, huge) untuk test upload. */
export const test = authTest.extend<{ files: SampleFiles }>({
  files: async ({}, use) => use(createSampleFiles()),
});

export { expect, meta };
