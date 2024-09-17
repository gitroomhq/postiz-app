export default function handler(req, res) {
  res.status(200).json({
    "frontendUrl": process.env.FRONTEND_URL,
    "isGeneral": !!process.env.IS_GENERAL,
    "isBillingEnabled": !!process.env.STRIPE_PUBLISHABLE_KEY,
  })
}
