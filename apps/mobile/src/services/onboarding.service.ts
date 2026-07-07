import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = 'postiz.mobile.onboarding.complete';

export async function getOnboardingComplete() {
  return (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) === 'true';
}

export async function saveOnboardingComplete() {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}

export async function resetOnboardingComplete() {
  await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}
