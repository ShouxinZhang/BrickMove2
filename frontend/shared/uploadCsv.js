export async function uploadCsvFile(file, targetDir) {
  if (!(file instanceof File)) {
    throw new Error('无效的文件对象');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (targetDir) {
    formData.append('target_dir', targetDir);
  }

  let response;
  try {
    response = await fetch('/api/upload-csv', {
      method: 'POST',
      body: formData
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
