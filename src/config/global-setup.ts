/**
 * Dijalankan SEKALI di awal setiap run, sebelum test pertama.
 *
 * - Menghapus status akun dummy (auth/new-account.json) supaya setiap run memakai akun baru.
 */
import { NewAccount } from '../utils/new-account';

export default async function globalSetup(): Promise<void> {
  NewAccount.reset();
}
