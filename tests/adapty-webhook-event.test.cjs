const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = readFileSync(path.join(__dirname, '../lib/adapty-webhook-event.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const exportsObject = {}
vm.runInNewContext(compiled, { exports: exportsObject })
const parse = exportsObject.parseAdaptyEvent
const id = '11111111-1111-4111-8111-111111111111'
const event = { event_type: 'access_level_updated', customer_user_id: id, profile_id: id,
  event_properties: { access_level_id: 'pro', profile_event_id: id, is_active: true } }
for (const invalid of [null, [], false, 4, 'payload']) assert.equal(parse(invalid, 'pro').kind, 'invalid')
assert.equal(parse({}, 'pro').kind, 'verification')
assert.equal(parse(event, 'pro').kind, 'entitlement')
assert.equal(parse(event, 'other').kind, 'ignored')
assert.equal(parse({ ...event, event_type: 'subscription_renewal_cancelled' }, 'pro').kind, 'ignored')
assert.equal(parse({ ...event, event_properties: null }, 'pro').kind, 'invalid')
assert.equal(parse({ ...event, customer_user_id: 'another-account' }, 'pro').kind, 'invalid')
assert.equal(parse({ ...event, event_properties: { ...event.event_properties, is_active: 'true' } }, 'pro').kind, 'invalid')
assert.equal(parse({ ...event, event_properties: { ...event.event_properties, is_active: false } }, 'pro').isActive, false)
console.log('PASS: 13 Adapty entitlement payload cases; no client-supplied grant and cancellation is not expiry.')
