import { adapty } from 'react-native-adapty'

let activation: Promise<void> | null = null

export function activateAdapty() {
  if (activation) return activation
  const publicKey = process.env.EXPO_PUBLIC_ADAPTY_SDK_KEY
  if (!publicKey) {
    console.warn('Adapty mobile public SDK key is not configured yet.')
    activation = Promise.resolve()
    return activation
  }

  activation = adapty.activate(publicKey, {
    ios: { idfaCollectionDisabled: true },
    android: { adIdCollectionDisabled: true },
    __ignoreActivationOnFastRefresh: __DEV__,
  })
  return activation
}

export async function identifyAdaptyUser(userId: string) {
  await activateAdapty()
  if (process.env.EXPO_PUBLIC_ADAPTY_SDK_KEY) await adapty.identify(userId)
}

