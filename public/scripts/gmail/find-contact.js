/**
 * Trouve l'email d'un contact dans Gmail en cherchant son prénom/nom.
 *
 * Usage :
 *   node find-contact.js "nico"
 *   node find-contact.js "nicolas piroux"
 *   node find-contact.js "leo" --limit 5
 *
 * Retourne JSON : [{ name, email, subject, date }]
 *
 * Prérequis : token.json dans D:\Projects\Site famille\tools\google\
 * Si absent : cd D:\Projects\Site famille\tools\google && node auth.js
 *
 * Alternative sans OAuth (Gmail MCP disponible) :
 *   Utiliser mcp__claude_ai_Gmail__search_threads avec query "nico OR nicolas"
 */

const path = require('path');
const GOOGLE_TOOLS = path.join('D:', 'Projects', 'Site famille', 'tools', 'google');

let google, getClient;
try {
  ({ google } = require(path.join('D:', 'Projects', 'Site famille', 'node_modules', 'googleapis')));
  ({ getClient } = require(path.join(GOOGLE_TOOLS, '_client.js')));
} catch {
  console.error('googleapis ou _client.js introuvable. Prérequis : token.json dans tools/google/');
  process.exit(1);
}

async function findContact(query, limit = 10) {
  const auth = getClient();
  const gmail = google.gmail({ version: 'v1', auth });

  // Chercher dans envoyés ET reçus
  const queries = [
    `to:${query}`,
    `from:${query}`,
    `subject:${query}`,
    query,
  ];

  const seen = new Map();

  for (const q of queries) {
    try {
      const { data } = await gmail.users.threads.list({
        userId: 'me',
        q,
        maxResults: 5,
      });

      if (!data.threads?.length) continue;

      for (const thread of data.threads) {
        const { data: t } = await gmail.users.threads.get({
          userId: 'me',
          id: thread.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        for (const msg of t.messages || []) {
          const headers = {};
          for (const h of msg.payload?.headers || []) {
            headers[h.name.toLowerCase()] = h.value;
          }

          // Extraire les adresses email
          const addresses = [headers.from, headers.to]
            .filter(Boolean)
            .join(', ');

          // Parser "Nom Prénom <email@domain.com>"
          const emailRegex = /(?:"?([^"<]+)"?\s*)?<([^>]+)>/g;
          let match;
          while ((match = emailRegex.exec(addresses)) !== null) {
            const name = (match[1] || '').trim();
            const email = match[2].trim().toLowerCase();

            // Filtrer son propre compte
            if (email === 'jarousseau.arthur11@gmail.com') continue;

            // Vérifier si le nom ou l'email correspond à la query
            const q_lower = query.toLowerCase();
            if (
              name.toLowerCase().includes(q_lower) ||
              email.includes(q_lower)
            ) {
              if (!seen.has(email)) {
                seen.set(email, {
                  name: name || email.split('@')[0],
                  email,
                  subject: headers.subject || '(sans objet)',
                  date: headers.date || '',
                });
              }
            }
          }
        }

        if (seen.size >= limit) break;
      }
    } catch (err) {
      if (err.code !== 404) console.warn(`Requête "${q}" échouée :`, err.message);
    }

    if (seen.size >= limit) break;
  }

  return [...seen.values()].slice(0, limit);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('Usage : node find-contact.js "prénom ou nom"');
    process.exit(1);
  }

  const query = args.filter(a => !a.startsWith('--')).join(' ');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 5;

  findContact(query, limit)
    .then(results => {
      if (!results.length) {
        console.log(`Aucun contact trouvé pour "${query}"`);
        return;
      }
      results.forEach(r => {
        console.log(`${r.name} <${r.email}>`);
        console.log(`  Dernier échange : ${r.subject}`);
        console.log(`  Date : ${r.date}`);
        console.log('');
      });
      // Output JSON pour usage en pipe
      process.stderr.write(JSON.stringify(results, null, 2));
    })
    .catch(e => { console.error('Erreur :', e.message); process.exit(1); });
}

module.exports = { findContact };
