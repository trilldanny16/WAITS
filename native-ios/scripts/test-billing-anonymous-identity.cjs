const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const compiled = ts.transpileModule(fs.readFileSync('src/lib/adapty.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText

function harness(initialCustomer = null) {
  let customer = initialCustomer
  let profileError = null
  let logoutError = null
  const calls = []
  const sdk = {
    activate: async () => calls.push('activate'),
    getProfile: async () => { calls.push('profile'); if (profileError) throw profileError; return { customerUserId: customer ?? undefined } },
    logout: async () => {
      calls.push('logout')
      if (logoutError) throw logoutError
      if (!customer) throw Object.assign(new Error('Logout cannot be called for an unidentified user'), { code: 3020 })
      customer = null
    },
    identify: async id => { calls.push(`identify:${id}`); customer = id },
    getFlow: async () => ({ paywalls: [] }), getPaywallProducts: async () => [],
    restorePurchases: async () => ({ accessLevels: {} }),
  }
  const sandbox = { exports: {}, __DEV__: false, console: { info() {}, warn() {} }, process: { env: { EXPO_PUBLIC_ADAPTY_SDK_KEY: 'mock-only' } }, require: () => ({ adapty: sdk }) }
  vm.runInNewContext(compiled, sandbox)
  return { api: sandbox.exports, calls, failProfile: error => { profileError = error }, failLogout: error => { logoutError = error } }
}

;(async () => {
  const anonymous = harness()
  await anonymous.api.identifyAdaptyUser(null)
  await anonymous.api.identifyAdaptyUser(null)
  assert.equal(anonymous.calls.includes('logout'), false, 'initial/repeated anonymous sign-out must not call logout')
  await anonymous.api.identifyAdaptyUser('A')
  assert.equal(anonymous.calls.includes('logout'), false, 'first anonymous identify must not call logout')
  await anonymous.api.loadAdaptyProducts('A')
  const sameAccountLength = anonymous.calls.length
  await anonymous.api.identifyAdaptyUser('A')
  assert.equal(anonymous.calls.length, sameAccountLength, 'same identified customer stays stable')
  await anonymous.api.identifyAdaptyUser('B')
  assert.deepEqual(anonymous.calls.slice(-3), ['profile', 'logout', 'identify:B'])
  await anonymous.api.identifyAdaptyUser(null)
  assert.deepEqual(anonymous.calls.slice(-2), ['profile', 'logout'])
  await assert.rejects(anonymous.api.restoreAdaptyPurchases('B'), /not ready/)
  await anonymous.api.identifyAdaptyUser('B')
  assert.deepEqual(anonymous.calls.slice(-2), ['profile', 'identify:B'], 'returning after sign-out identifies anonymous profile without logout')

  for (const target of ['A', 'B', null]) {
    const restarted = harness('A')
    await restarted.api.identifyAdaptyUser(target)
    assert.deepEqual(restarted.calls.slice(1), target ? ['profile', 'logout', `identify:${target}`] : ['profile', 'logout'], 'persisted startup customer cleared even when memory is empty')
  }

  const profileFailure = harness('A')
  const offline = new Error('profile unavailable')
  profileFailure.failProfile(offline)
  await assert.rejects(profileFailure.api.identifyAdaptyUser('B'), error => error === offline)
  assert.equal(profileFailure.calls.some(call => call.startsWith('identify:')), false)
  await assert.rejects(profileFailure.api.loadAdaptyProducts('B'), /not ready/)
  profileFailure.failProfile(null)
  await profileFailure.api.identifyAdaptyUser('B')
  assert.deepEqual(profileFailure.calls.slice(-3), ['profile', 'logout', 'identify:B'], 'queue recovers after profile failure')

  for (const code of [3020, 3006, 500]) {
    const logoutFailure = harness('A')
    const failure = Object.assign(new Error('logout failed'), { code })
    logoutFailure.failLogout(failure)
    await assert.rejects(logoutFailure.api.identifyAdaptyUser('B'), error => error === failure)
    assert.equal(logoutFailure.calls.some(call => call.startsWith('identify:')), false, 'never identify over failed logout')
    await assert.rejects(logoutFailure.api.restoreAdaptyPurchases('B'), /not ready/)
    logoutFailure.failLogout(null)
    await logoutFailure.api.identifyAdaptyUser('B')
    assert.deepEqual(logoutFailure.calls.slice(-3), ['profile', 'logout', 'identify:B'])
  }
  console.log('Anonymous identity regression mocks passed: anonymous initial/repeated sign-out, first login, returning login, account switch, persisted restart identity, profile failure, and all logout failures preserved. No device purchase tested.')
})().catch(error => { console.error(error); process.exitCode = 1 })
