const bcrypt = require('bcryptjs');

async function generateHashes() {
  const passwords = {
    admin: 'admin123',
    staff: 'staff123'
  };

  console.log('Generating password hashes...\n');

  for (const [user, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`${user} (${password}): ${hash}`);
  }

  console.log('\nCopy these hashes to your seed.sql file.');
}

generateHashes().catch(console.error); 