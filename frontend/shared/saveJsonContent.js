export async function saveJsonContent({ json, filename, targetDir, overwrite = false }) {
  const payload = { json, filename, target_dir: targetDir, overwrite };

  let response;
  try {
    response = await fetch('/api/save-json-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (networkError) {
    throw new Error('网络请求失败，请检查连接');
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error('服务器返回了无法解析的响应');
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'JSON 保存失败');
  }

  return data;
}
