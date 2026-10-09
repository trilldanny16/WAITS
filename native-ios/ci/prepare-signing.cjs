const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const signing = JSON.parse(Buffer.from(process.env.WAITS_SIGNING_B64 || '', 'base64').toString());
const envText = Buffer.from(process.env.WAITS_PRODUCTION_B64 || '', 'base64').toString();
function mask(value) { if (value) console.log(`::add-mask::${String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`); }
for (const value of Object.values(signing)) mask(value);
mask(Buffer.from(signing.appleKey).toString('base64'));
for (const line of envText.split(/\r?\n/)) { const split = line.indexOf('='); if (split > 0) mask(line.slice(split + 1).replace(/^['"]|['"]$/g, '')); }
const allowed = new Set(['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'EXPO_PUBLIC_ADAPTY_SDK_KEY', 'EXPO_PUBLIC_ADAPTY_PLACEMENT_ID', 'EXPO_PUBLIC_ADAPTY_ACCESS_LEVEL_ID']);
const names = envText.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#')).map(line => line.split('=', 1)[0]);
if (names.some(name => !allowed.has(name)) || !names.includes('EXPO_PUBLIC_SUPABASE_URL') || !names.includes('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || !names.includes('EXPO_PUBLIC_ADAPTY_SDK_KEY')) throw new Error('Invalid production configuration key set');
fs.mkdirSync('.eas-runtime/ios-certs', { recursive: true });
fs.writeFileSync('.eas-runtime/ios-certs/distribution.p12', Buffer.from(signing.certificate, 'base64'), { mode: 0o600 });
fs.writeFileSync('.eas-runtime/ios-certs/profile.mobileprovision', Buffer.from(signing.profile, 'base64'), { mode: 0o600 });
fs.writeFileSync('credentials.json', JSON.stringify({ ios: { provisioningProfilePath: '.eas-runtime/ios-certs/profile.mobileprovision', distributionCertificate: { path: '.eas-runtime/ios-certs/distribution.p12', password: signing.password } } }), { mode: 0o600 });
fs.writeFileSync('.env', envText, { mode: 0o600 });
const keyDir = path.join(os.homedir(), '.appstoreconnect/private_keys');
fs.mkdirSync(keyDir, { recursive: true });
fs.writeFileSync(path.join(keyDir, 'AuthKey_UV655VNMLL.p8'), signing.appleKey, { mode: 0o600 });
const app = JSON.parse(fs.readFileSync('app.json'));
if (app.expo.ios.bundleIdentifier !== 'com.waitsapp.waits') throw new Error('Wrong iOS bundle identifier');
app.expo.ios.buildNumber = '69';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
const eas = JSON.parse(fs.readFileSync('eas.json'));
eas.cli.appVersionSource = 'local';
eas.build['github-local'] = { extends: 'production', autoIncrement: false, credentialsSource: 'local' };
fs.writeFileSync('eas.json', JSON.stringify(eas, null, 2));
console.log('Existing production environment and signing files restored privately. Local Mac build 69; no cloud build quota used.');
