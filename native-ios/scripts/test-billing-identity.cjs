const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const compiled = ts.transpileModule(fs.readFileSync('src/lib/adapty.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const calls = []
let purchaseRelease
let productsRelease
let holdProducts = false
let failActivation = true
let sdkUserId = null
const mocked = {
  activate: async () => { calls.push('activate'); if (failActivation) { failActivation = false; throw new Error('offline') } },
  getProfile: async () => ({ customerUserId: sdkUserId ?? undefined }),
  logout: async () => { calls.push('logout'); sdkUserId = null }, identify: async id => { calls.push(`identify:${id}`); sdkUserId = id },
  getFlow: async () => ({}), getPaywallProducts: async () => holdProducts
    ? new Promise(resolve => { productsRelease = resolve }) : [],
  makePurchase: async () => { calls.push('purchase'); return new Promise(resolve => { purchaseRelease = resolve }) },
  restorePurchases: async () => ({ accessLevels: {} }),
}
const sandbox = { exports: {}, __DEV__: false, console, process: { env: { EXPO_PUBLIC_ADAPTY_SDK_KEY: 'mock-only' } }, require: () => ({ adapty: mocked }) }
vm.runInNewContext(compiled, sandbox)
const api = sandbox.exports
;(async () => {
  await assert.rejects(api.identifyAdaptyUser('A'), /offline/)
  await api.identifyAdaptyUser('A')
  assert.equal(calls.filter(item => item === 'activate').length, 2, 'activation is retryable')
  await assert.rejects(api.loadAdaptyProducts('B'), /not ready/)
  const purchased = api.purchaseAdaptyProduct({}, 'A')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls.at(-1), 'purchase')
  const switching = api.identifyAdaptyUser('B')
  purchaseRelease({ type: 'success', profile: { accessLevels: {} } })
  await assert.rejects(purchased, /account changed/)
  await switching
  assert.equal(calls.at(-1), 'identify:B')
  await assert.rejects(api.restoreAdaptyPurchases('A'), /not ready/)
  await api.identifyAdaptyUser(null)
  assert.equal(calls.at(-1), 'logout')
  await assert.rejects(api.loadAdaptyProducts('B'), /not ready/)
  assert.equal(api.hasProAccess({ accessLevels: { premium: { isActive: false } } }), false)
  assert.equal(api.hasProAccess({ accessLevels: { premium: { isActive: true } } }), true)
  await api.identifyAdaptyUser('A')
  holdProducts = true
  const oldProducts = api.loadAdaptyProducts('A')
  await new Promise(resolve => setImmediate(resolve))
  const newAccount = api.identifyAdaptyUser('B')
  productsRelease([{ vendorProductId: 'personalized-A-offer' }])
  await assert.rejects(oldProducts, /account changed/, 'old account products are rejected on account switch')
  await newAccount
  holdProducts = false
  assert.equal((await api.loadAdaptyProducts('B')).length, 0)
  console.log('Billing identity mock tests passed: retry, serialized account switch, stale purchase and product rejection, sign-out, fail-closed restore. No real transaction performed.')
})().catch(error => { console.error(error); process.exitCode = 1 })
