import { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const usePaymentAction = () => {
  const { stripeClient } = useVariables();

  return useCallback(
    // Consuming the PaymentIntent client_secret with the publishable key is
    // Stripe's intended flow: https://docs.stripe.com/api/payment_intents/object#payment_intent_object-client_secret
    async (clientSecret: string) => {
      try {
        const stripe = await loadStripe(stripeClient);
        const { error } = await stripe!.handleNextAction({ clientSecret });
        return { error: error?.message };
      } catch (err: any) {
        // Stripe.js rejects when it fails to load or when the intent is no
        // longer in requires_action, the caller only reads `error`
        return { error: err?.message || 'Payment failed' };
      }
    },
    [stripeClient]
  );
};
