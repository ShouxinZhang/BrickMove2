export async function listSavedFiles(dir, exts = '.json,.md,.csv') {
  const params = new URLSearchParams();
  if (dir) params.set('dir', dir);
  if (exts) params.set('exts', exts);
  const res = await fetch(`/api/list-files?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || '无法列出历史文件');
  }
  return data.items || [];
}

export async function readSavedFile(path) {
  const params = new URLSearchParams({ path });
  const res = await fetch(`/api/read-file?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || '读取文件失败');
  }
  return data;
}
