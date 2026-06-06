require('dotenv').config();
const store = require('../lib/store');

async function main() {
  const mode = store.getDbMode();
  console.log('DB mode:', mode);
  console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? 'set' : 'not set');
  console.log('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'set' : 'not set');

  if (process.env.TURSO_AUTH_TOKEN && process.env.TURSO_AUTH_TOKEN.startsWith('libsql://')) {
    console.error('\nERROR: TURSO_AUTH_TOKEN looks like a URL, not a token.');
    console.error('Run: turso db tokens create <your-db-name>');
    console.error('Then paste the JWT token (starts with eyJ...) into TURSO_AUTH_TOKEN.');
    process.exit(1);
  }

  try {
    const data = await store.getUsersPayload();
    console.log('\nConnected OK — users:', data.users.length);
  } catch (err) {
    console.error('\nConnection failed:', err.message);
    process.exit(1);
  }
}

main();
