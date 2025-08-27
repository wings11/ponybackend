#!/usr/bin/env node
import supabase from '../supabaseClient.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v15.0';

async function main(){
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageToken) {
    console.error('Missing FB_PAGE_ACCESS_TOKEN in environment. Set it before running.');
    process.exit(1);
  }

  // fetch rows missing name
  const { data: rows, error } = await supabase
    .from('pony_messages')
    .select('id, platform_user_id, sender')
    .eq('platform', 'facebook')
    .is('name', null)
    .limit(500);

  if (error) {
    console.error('Error fetching rows:', error);
    process.exit(1);
  }

  console.log(`Found ${rows.length} rows to backfill (max 500)`);

  for (const r of rows) {
    const psid = r.platform_user_id || r.sender;
    if (!psid) continue;
    try {
      const url = `${GRAPH_API_BASE}/${encodeURIComponent(psid)}?fields=first_name,last_name,name,profile_pic&access_token=${encodeURIComponent(pageToken)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        console.error('Profile fetch failed for', psid, text);
        continue;
      }
      const profile = await res.json();
      const update = {
        name: profile.name || null,
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
        profile_pic: profile.profile_pic || null,
        platform_data: profile
      };
      const { error: upErr } = await supabase.from('pony_messages').update(update).eq('id', r.id);
      if (upErr) console.error('Update error for', r.id, upErr);
      else console.log('Updated', r.id, '->', profile.name || '<no name>');
    } catch (err) {
      console.error('Unexpected error for', psid, err);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
