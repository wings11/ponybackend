const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  db: { schema: 'pony' } // Explicitly set default schema to pony
});

async function handleMedia(getToken, file_id, mime_type) {
  const token = await getToken();
  const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${file_id}`;
  console.log('Fetching file from Telegram:', getFileUrl);
  const res = await fetch(getFileUrl);
  const data = await res.json();
  if (!data.ok) {
    console.error('File fetch error:', JSON.stringify(data, null, 2));
    throw new Error(`Failed to get file path: ${data.description}`);
  }
  const file_path = data.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${token}/${file_path}`;
  console.log('Downloading file:', downloadUrl);

  const fileRes = await fetch(downloadUrl);
  const buffer = await fileRes.arrayBuffer();

  const extension = mime_type.split('/')[1] || 'file';
  const fileName = `${Date.now()}.${extension}`;
  console.log('Uploading to Supabase Storage:', fileName);
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(fileName, buffer, { contentType: mime_type });
  if (uploadError) {
    console.error('Storage upload error:', JSON.stringify(uploadError, null, 2));
    throw new Error(`Storage upload failed: ${JSON.stringify(uploadError)}`);
  }

  const { data: publicData } = supabase.storage.from('media').getPublicUrl(fileName);
  console.log('Media uploaded, public URL:', publicData.publicUrl);
  return publicData.publicUrl;
}

module.exports = { handleMedia };