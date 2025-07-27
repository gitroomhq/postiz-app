// Sentry configuration for Next.js - client side initialization  
import * as Sentry from '@sentry/react';
import React from 'react';

export function initializeSentryClient() {
  // Only run on client side
  if (typeof window === 'undefined') return;

  // Get config from server-injected variables
  const enabled = (window as any).__SENTRY_ENABLED__;
  const dsn = (window as any).__SENTRY_DSN__;
  const environment = (window as any).__SENTRY_ENVIRONMENT__ || 'development';
  const debug = (window as any).__SENTRY_DEBUG__ === 'true';
  const tracesSampleRate = parseFloat((window as any).__SENTRY_TRACES_SAMPLE_RATE__ || '0.1');
  const replaysSessionSampleRate = parseFloat((window as any).__SENTRY_REPLAYS_SESSION_SAMPLE_RATE__ || '0.1');
  const replaysOnErrorSampleRate = parseFloat((window as any).__SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE__ || '1.0');

  if (!enabled || !dsn) {
    console.log('[Frontend] Sentry is disabled');
    return;
  }

  console.log(`[Frontend] Initializing Sentry with Replays enabled`);
  console.log(`[Frontend] Session Sample Rate: ${replaysSessionSampleRate}, Error Sample Rate: ${replaysOnErrorSampleRate}`);

  Sentry.init({
    dsn,
    environment,
    debug,
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    
    // Performance Monitoring
    tracesSampleRate,
    
    // Session Replay Configuration
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Capture interactions, navigation, and page loads
      }),
      
      // Session replay integration with optimized settings
      Sentry.replayIntegration({
        // Only mask sensitive inputs, not all text
        maskAllText: false,
        maskAllInputs: true,
        
        // Don't block media to capture full user experience
        blockAllMedia: false,
        
        // Mask specific selectors (add your own sensitive selectors)
        mask: ['.sensitive-data', '[data-sensitive]'],
        
        // Capture network activity for better debugging
        networkDetailAllowUrls: [
          window.location.origin,
          /\/api\//,
        ],
      }),
      
      // Enhanced breadcrumbs for better context
      Sentry.breadcrumbsIntegration({
        console: false, // Don't log all console messages as breadcrumbs
        dom: true,      // Capture DOM interactions 
        fetch: true,    // Capture fetch requests
        history: true,  // Capture navigation
        sentry: true,   // Capture Sentry events
        xhr: true,      // Capture XHR requests
      }),
    ],
    
    // Enhanced beforeSend filter
    beforeSend(event, hint) {
      // Filter out known non-critical errors that shouldn't trigger replays
      if (event.exception) {
        const error = hint.originalException;
        
        // Skip network errors that are likely user-related
        if (error && error instanceof TypeError) {
          const message = error.message || '';
          if (message.includes('NetworkError') || 
              message.includes('Failed to fetch') ||
              message.includes('Load failed') ||
              message.includes('ERR_NETWORK') ||
              message.includes('ERR_INTERNET_DISCONNECTED')) {
            return null;
          }
        }
        
        // Skip ResizeObserver errors (common browser quirk)
        if (error && typeof error === 'object' && 'message' in error && 
            typeof error.message === 'string' && error.message.includes('ResizeObserver')) {
          return null;
        }
        
        // Skip AbortError (user navigation)
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
          return null;
        }

        // Skip script loading errors from ad blockers
        if (error && typeof error === 'object' && 'message' in error && 
            typeof error.message === 'string' && (
              error.message.includes('Script error') ||
              error.message.includes('Non-Error promise rejection')
            )) {
          return null;
        }
      }
      
      return event;
    },
    
    // Set initial scope with useful tags
    initialScope: {
      tags: {
        service: 'frontend',
        component: 'nextjs',
        replaysEnabled: 'true',
      },
      contexts: {
        app: {
          name: 'Postiz Frontend',
          version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        },
      },
    },
  });

  // Set up enhanced global error handlers
  window.addEventListener('error', (event) => {
    console.error('[Frontend] Global Error:', event.error);
    
    // Add context to help with replay analysis
    Sentry.addBreadcrumb({
      message: 'Global error occurred',
      category: 'error',
      level: 'error',
      data: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Frontend] Unhandled Promise Rejection:', event.reason);
    
    // Add context for promise rejections
    Sentry.addBreadcrumb({
      message: 'Unhandled promise rejection',
      category: 'error', 
      level: 'error',
      data: {
        reason: event.reason,
      },
    });
  });

  // Add a breadcrumb when Sentry initializes
  Sentry.addBreadcrumb({
    message: 'Sentry client initialized with Replays',
    category: 'sentry',
    level: 'info',
    data: {
      replaysSessionSampleRate,
      replaysOnErrorSampleRate,
      environment,
    },
  });
}
