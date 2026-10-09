const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const compiled = ts.transpileModule(fs.readFileSync('src/lib/adapty.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText

async function scenario(failingPhase) {
  const records = []
  const originalError = Object.assign(new Error('secret receipt and account must not be logged'), { code: 1000, token: 'private-token' })
  const products = [{ vendorProductId: 'mock-only-product', receipt: 'private-receipt' }]
  const flow = { paywalls: [{ productIdentifiers: [{ vendorProductId: 'mock-only-product' }], webPurchaseUrl: 'private-url' }], customerId: 'private-customer' }
  const mocked = {
    activate: async () => undefined, getProfile: async () => ({}), logout: async () => undefined, identify: async () => undefined,
    getFlow: async () => { if (failingPhase === 'getFlow') throw originalError; return flow },
    getPaywallProducts: async () => { if (failingPhase === 'getPaywallProducts') throw originalError; return products },
  }
  const sandbox = { exports: {}, __DEV__: false, console: { info: (...args) => records.push(args), warn: (...args) => records.push(args) }, process: { env: { EXPO_PUBLIC_ADAPTY_SDK_KEY: 'private-key' } }, require: () => ({ adapty: mocked }) }
  vm.runInNewContext(compiled, sandbox)
  await sandbox.exports.identifyAdaptyUser('private-customer')
  if (failingPhase) await assert.rejects(sandbox.exports.loadAdaptyProducts('private-customer'), error => error === originalError)
  else assert.equal(await sandbox.exports.loadAdaptyProducts('private-customer'), products)
  const last = records.at(-1)[1]
  assert.equal(last.phase, failingPhase || 'getPaywallProducts')
  assert.equal(last.status, failingPhase ? 'failure' : 'success')
  if (failingPhase) assert.equal(last.code, 1000)
  else assert.equal(last.productCount, 1)
  if (failingPhase !== 'getFlow') {
    assert.equal(records[0][1].paywallCount, 1)
    assert.equal(records[0][1].configuredProductCount, 1)
  }
  assert.doesNotMatch(JSON.stringify(records), /private-|secret|receipt|token|customer|vendorProductId|webPurchaseUrl/)
}

;(async () => {
  await scenario('getFlow')
  await scenario('getPaywallProducts')
  await scenario(null)
  console.log('Billing diagnostic mock tests passed: distinct failure phases, safe counts, original errors preserved, no customer/key/receipt/payload logging. No StoreKit transaction tested.')
})().catch(error => { console.error(error); process.exitCode = 1 })
