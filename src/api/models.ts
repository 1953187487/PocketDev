import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';

export interface ImportedModelFile {
  uri: string;
  name: string;
  size: number;
}

const MODELS_DIR = FileSystem.documentDirectory + 'models/';

async function ensureDir() {
  if (!(await FileSystem.getInfoAsync(MODELS_DIR)).exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }
}

export async function downloadModelFile(url: string, name: string, onProgress: (p: number) => void): Promise<ImportedModelFile> {
  await ensureDir();
  const dest = `${MODELS_DIR}${name}`;
  const resumable = FileSystem.createDownloadResumable(
    url,
    dest,
    { headers: { 'User-Agent': 'PocketDev' } },
    (p) => {
      if (p.totalBytesExpectedToWrite > 0) onProgress(Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100));
    },
  );
  const result = await resumable.downloadAsync();
  if (!result || result.status !== 200) {
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
    throw new Error(`下载失败（HTTP ${result?.status ?? 'null'}）`);
  }
  const info = await FileSystem.getInfoAsync(dest);
  return { uri: dest, name, size: info.exists && 'size' in info ? info.size ?? 0 : 0 };
}

export async function importModelFile(): Promise<ImportedModelFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  await ensureDir();
  const dest = `${MODELS_DIR}${Date.now()}-${asset.name}`;
  await FileSystem.copyAsync({ from: asset.uri, to: dest });
  return { uri: dest, name: asset.name, size: asset.size ?? 0 };
}

export async function removeModelFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}
