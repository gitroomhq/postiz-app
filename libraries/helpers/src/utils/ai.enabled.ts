/**
 * Whether this installation has Copilot / OpenAI-backed AI configured.
 *
 * An empty or missing OPENAI_API_KEY makes `/copilot/chat` return a plain 503
 * JSON body. CopilotKit's GraphQL client treats that as a Network CombinedError
 * and Next's canary overlay surfaces it on every authenticated page. Gating the
 * provider on this flag keeps the rest of the app usable without a key.
 */
export const isAiEnabled = () => !!process.env.OPENAI_API_KEY;
