/**
 * Minimal Chrome extension API types for externally_connectable messaging.
 * Web pages listed in an extension's externally_connectable can use
 * chrome.runtime.sendMessage to communicate with the extension.
 */
declare namespace chrome {
  namespace runtime {
    const lastError: { message?: string } | undefined;
    function sendMessage(
      extensionId: string,
      message: any,
      callback: (response: any) => void
    ): void;
  }
}
