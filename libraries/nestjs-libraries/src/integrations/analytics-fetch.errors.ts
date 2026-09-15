/**
 * Analytics callers used to swallow every provider failure as `[]`, so a
 * revoked token and a quiet week were the same empty pane. Auth, missing
 * scope and token errors must reconnect; an invalid-metric Graph body must
 * not.
 */
export function analyticsFetchNeedsReconnect(opts: {
  json: string;
  httpStatus?: number;
  handleErrorType?: string;
  graphError?: { code?: number; type?: string; message?: string | number };
}): boolean {
  const { json, httpStatus, handleErrorType, graphError } = opts;
  const graphCode =
    typeof graphError?.code === 'number' ? graphError.code : undefined;
  const graphType =
    typeof graphError?.type === 'string' ? graphError.type : '';
  const graphMessage = String(graphError?.message || '');

  return (
    httpStatus === 401 ||
    httpStatus === 403 ||
    handleErrorType === 'refresh-token' ||
    graphCode === 190 ||
    graphCode === 102 ||
    graphCode === 401 ||
    graphCode === 403 ||
    (graphType === 'OAuthException' &&
      /access token|session|oauth|permission/i.test(graphMessage)) ||
    /invalid_grant|UNAUTHENTICATED|Unsupported Authentication|Invalid or expired token|token has been revoked/i.test(
      json
    )
  );
}
