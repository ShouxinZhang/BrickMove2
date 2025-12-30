export async function saveCsvContent({ content, filename, targetDir, overwrite = false }) {
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('CSV 内容为空');
  }

  let response;
  try {
    response = await fetch('/api/save-csv-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, filename, target_dir: targetDir, overwrite })
    });
  } catch (networkError) {
    throw new Error('网络请求失败，请检查连接');
  }

  let payload;
  try {
    payload = await response.json();
  } catch (parseError) {
    throw new Error('服务器返回了无法解析的响应');
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'CSV 保存失败');
  }

  return payload;
}
