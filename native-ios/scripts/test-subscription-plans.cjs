const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const source = fs.readFileSync('src/lib/subscription-plans.ts', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const sandbox = { exports: {} }
vm.runInNewContext(compiled, sandbox)
const { annualSavings, validPlanProduct, priceMismatch, PRO_PLANS } = sandbox.exports
const product = (index, amount, currencyCode = 'USD') => ({ vendorProductId: PRO_PLANS[index].id,
  regionCode: 'US', price: { amount, currencyCode, localizedString: `$${amount}` },
  subscription: { subscriptionPeriod: { unit: PRO_PLANS[index].period, numberOfUnits: 1 } } })
const monthly = product(0, 9.99)
const annual = product(1, 99.99)
assert.equal(validPlanProduct(monthly, 0), true)
assert.equal(validPlanProduct(annual, 1), true)
assert.equal(validPlanProduct(annual, 0), false)
assert.equal(validPlanProduct({ ...monthly, price: undefined }, 0), false)
assert.equal(validPlanProduct({ ...monthly, price: { amount: NaN, localizedString: '$9.99' } }, 0), false)
assert.equal(validPlanProduct({ ...monthly, subscription: { subscriptionPeriod: { unit: 'month', numberOfUnits: 3 } } }, 0), false)
assert.equal(annualSavings(monthly, annual), 16.6)
assert.equal(annualSavings(monthly, product(1, 99.99, 'EUR')), null)
assert.equal(annualSavings(monthly, product(1, 150)), null)
assert.equal(annualSavings(undefined, annual), null)
assert.equal(priceMismatch(monthly, 0), false)
assert.equal(priceMismatch(product(0, 11.99), 0), true)
assert.equal(priceMismatch({ ...product(0, 11.99), regionCode: 'CA' }, 0), false)
console.log('13 subscription plan validation tests passed. No StoreKit transaction was performed.')
