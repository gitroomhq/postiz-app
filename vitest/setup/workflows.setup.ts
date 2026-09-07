import 'reflect-metadata';

process.env.TZ = 'UTC';
process.env.NODE_ENV = 'test';

// TestWorkflowEnvironment.createTimeSkipping() downloads a native test-server
// binary on first use. Pointing it at a stable directory lets CI cache it.
process.env.TEMPORAL_TEST_SERVER_DOWNLOAD_DIR ??= '.cache/temporal-test-server';
