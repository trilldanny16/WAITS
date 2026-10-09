const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
for (const file of ['credentials.json', '.env', '.eas-runtime/ios-certs/distribution.p12', '.eas-runtime/ios-certs/profile.mobileprovision', path.join(os.homedir(), '.appstoreconnect/private_keys/AuthKey_UV655VNMLL.p8')]) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
console.log('Temporary private signing material removed.');
