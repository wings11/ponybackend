const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function handleMedia(getToken, file_id, mime_type) {
  const token = await getToken();
  const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${file_id}`;
  const res = await fetch(getFileUrl);
  const data = await res.json();
  if (!data.ok) throw new Error(`Failed to get file path: ${data.description}`);
  const file_path = data.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${token}/${file_path}`;

  const fileRes = await fetch(downloadUrl);
  const buffer = await fileRes.arrayBuffer();

  const extension = mime_type.split('/')[1] || 'file';
  const fileName = `${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(fileName, buffer, { contentType: mime_type });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: publicData } = supabase.storage.from('media').getPublicUrl(fileName);
  return publicData.publicUrl;
}

module.exports = { handleMedia };