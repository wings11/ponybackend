import supabase from '../supabaseClient.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v15.0';

async function _getConnection(adminEmail) {
	const q = supabase.from('pony_platform_connections').select('*').eq('platform', 'facebook');
	if (adminEmail) q.eq('admin_email', adminEmail);
	// attempt to get a single connection
	const { data, error } = await q.limit(1).maybeSingle();
	if (error) return null;
	return data;
}

export default {
	async processIncoming(body) {
	if (!body || body.object !== 'page') return;
	// get a page access token if available (used to fetch sender profile)
	const connForProfile = await _getConnection();
	const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || (connForProfile && connForProfile.access_token) || null;
		const entries = body.entry || [];
		for (const entry of entries) {
			const pageId = entry.id;
			const messaging = entry.messaging || [];
			for (const ev of messaging) {
				try {
					const senderId = ev.sender?.id;
					const recipientId = ev.recipient?.id || pageId;
					const timestamp = ev.timestamp;
					let text = null;
					let message_type = 'text';
					let media_url = null;

					if (ev.message) {
						if (ev.message.text) text = ev.message.text;
						if (ev.message.attachments && ev.message.attachments.length) {
							message_type = ev.message.attachments[0].type || 'media';
							media_url = ev.message.attachments[0].payload?.url || null;
						}
					} else if (ev.postback) {
						text = ev.postback.payload || ev.postback.title;
						message_type = 'postback';
					}

					const insert = {
						platform: 'facebook',
						sender: senderId,
						recipient: recipientId,
						platform_user_id: senderId,
						// name fields will be filled below if we can fetch the profile
						name: null,
						first_name: null,
						last_name: null,
						profile_pic: null,
						message: text,
						message_type,
						media_url,
						created_at: new Date(timestamp || Date.now()).toISOString(),
						admin_read: false
					};

					// attempt to fetch sender profile (name, first_name, last_name, profile_pic)
					if (senderId && pageAccessToken) {
						try {
							const profileUrl = `${GRAPH_API_BASE}/${encodeURIComponent(senderId)}?fields=first_name,last_name,name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`;
							const res = await fetch(profileUrl);
							if (res.ok) {
								const profile = await res.json();
								insert.name = profile.name || insert.name;
								insert.first_name = profile.first_name || insert.first_name;
								insert.last_name = profile.last_name || insert.last_name;
								insert.profile_pic = profile.profile_pic || insert.profile_pic;
								// store raw profile data for debugging if needed
								insert.platform_data = profile;
							} else {
								// non-fatal
								// console.debug('facebook: profile fetch non-ok', await res.text());
							}
						} catch (pfErr) {
							console.error('facebook: error fetching profile', pfErr);
						}
					}

					const { error } = await supabase.from('pony_messages').insert([insert]);
					if (error) console.error('facebook: insert message error', error);
				} catch (err) {
					console.error('facebook: processIncoming event error', err);
				}
			}
		}
	},

	async sendMessage({ recipient, message, message_type, media_url, adminEmail } = {}) {
		const conn = await _getConnection(adminEmail);
		let access_token = process.env.FB_PAGE_ACCESS_TOKEN || (conn && conn.access_token);
		let platform_bot_id = (conn && conn.platform_bot_id) || process.env.FB_PAGE_ID || null;
		if (!access_token) throw new Error('no facebook page access token available');

		const url = `${GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(access_token)}`;
		const payload = { recipient: { id: recipient } };
		if (message_type === 'image' && media_url) {
			payload.message = { attachment: { type: 'image', payload: { url: media_url, is_reusable: false } } };
		} else {
			payload.message = { text: message };
		}

		const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		const respJson = await resp.json();
		if (!resp.ok) {
			throw new Error(respJson.error?.message || 'facebook send failed');
		}

		// Insert outgoing message into DB
		const outgoing = {
			platform: 'facebook',
			sender: platform_bot_id || 'page',
			recipient,
			platform_user_id: recipient,
			message: message || null,
			message_type: message_type || 'text',
			media_url: media_url || null,
			created_at: new Date().toISOString(),
			admin_read: true
		};
		const { error } = await supabase.from('pony_messages').insert([outgoing]);
		if (error) console.error('facebook: insert outgoing error', error);

		return respJson;
	}
};
