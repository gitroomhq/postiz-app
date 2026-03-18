import '../setup';
import { TiktokProvider } from '@gitroom/nestjs-libraries/integrations/social/tiktok.provider';

describe('TiktokProvider', () => {
  let provider: TiktokProvider;

  beforeEach(() => {
    provider = new TiktokProvider();
  });

  describe('Metadata', () => {
    it('should have identifier "tiktok"', () => {
      expect(provider.identifier).toBe('tiktok');
    });

    it('should have name "Tiktok"', () => {
      expect(provider.name).toBe('Tiktok');
    });

    it('should have maxLength of 2000', () => {
      expect(provider.maxLength()).toBe(2000);
    });

    it('should have convertToJPEG enabled', () => {
      expect(provider.convertToJPEG).toBe(true);
    });

    it('should have maxConcurrentJob of 300', () => {
      expect(provider.maxConcurrentJob).toBe(300);
    });

    it('should have normal editor', () => {
      expect(provider.editor).toBe('normal');
    });

    it('should have 6 scopes', () => {
      expect(provider.scopes).toHaveLength(6);
      expect(provider.scopes).toContain('video.publish');
      expect(provider.scopes).toContain('video.upload');
    });
  });

  describe('handleErrors()', () => {
    const authErrors = [
      {
        input: 'access_token_invalid',
        expectedType: 'refresh-token',
        expectedMsg:
          'Access token invalid, please re-authenticate your TikTok account',
      },
    ];

    const badBodyErrors = [
      {
        input: 'scope_not_authorized',
        expectedMsg:
          'Missing required permissions, please re-authenticate with all scopes',
      },
      {
        input: 'scope_permission_missed',
        expectedMsg:
          'Additional permissions required, please re-authenticate',
      },
      {
        input: 'rate_limit_exceeded',
        expectedMsg: 'TikTok API rate limit exceeded, please try again later',
      },
      {
        input: 'file_format_check_failed',
        expectedMsg:
          'File format is invalid, please check video specifications',
      },
      {
        input: 'app_version_check_failed',
        expectedMsg:
          'In order to use the TikTok upload feature, you have to update your app to the latest version',
      },
      {
        input: 'duration_check_failed',
        expectedMsg:
          'Video duration is invalid, please check video specifications',
      },
      {
        input: 'frame_rate_check_failed',
        expectedMsg:
          'Video frame rate is invalid, please check video specifications',
      },
      {
        input: 'video_pull_failed',
        expectedMsg: 'Failed to pull video from URL, please check the URL',
      },
      {
        input: 'photo_pull_failed',
        expectedMsg: 'Failed to pull photo from URL, please check the URL',
      },
      {
        input: 'spam_risk_user_banned_from_posting',
        expectedMsg:
          'Account banned from posting, please check TikTok account status',
      },
      {
        input: 'spam_risk_text content detected',
        expectedMsg: 'TikTok detected potential spam in the post text',
      },
      {
        input: 'spam_risk_too_many_posts limit',
        expectedMsg:
          'TikTok says your daily post limit reached, please try again tomorrow',
      },
      {
        input: 'spam_risk_too_many_pending_share limit',
        expectedMsg:
          'TikTok limit the maximum of pending posts to 5, please check your TikTok inbox at your TikTok mobile app',
      },
      {
        input: 'spam_risk generic',
        expectedMsg: 'TikTok detected potential spam',
      },
      {
        input: 'reached_active_user_cap',
        expectedMsg:
          'Daily active user quota reached, please try again later',
      },
      {
        input: 'unaudited_client_can_only_post_to_private_accounts',
        expectedMsg: 'App not approved for public posting, contact support',
      },
      {
        input: 'url_ownership_unverified',
        expectedMsg:
          'URL ownership not verified, please verify domain ownership',
      },
      {
        input: 'privacy_level_option_mismatch',
        expectedMsg:
          'Privacy level mismatch, please check privacy settings',
      },
      {
        input: 'invalid_file_upload',
        expectedMsg: 'Invalid file format or specifications not met',
      },
      {
        input: 'invalid_params',
        expectedMsg:
          'Invalid request parameters, please check content format',
      },
      {
        input: 'internal server error',
        expectedMsg:
          'There is a problem with TikTok servers, please try again later',
      },
      {
        input: 'picture_size_check_failed',
        expectedMsg:
          'Picture / Video size is invalid, must be at least 720p',
      },
      {
        input: 'TikTok API error occurred',
        expectedMsg: 'TikTok API error, please try again',
      },
    ];

    it.each(authErrors)(
      'should return refresh-token for "$input"',
      ({ input, expectedType, expectedMsg }) => {
        const result = provider.handleErrors(input);
        expect(result).toBeDefined();
        expect(result!.type).toBe(expectedType);
        expect(result!.value).toBe(expectedMsg);
      }
    );

    it.each(badBodyErrors)(
      'should return bad-body for "$input"',
      ({ input, expectedMsg }) => {
        const result = provider.handleErrors(input);
        expect(result).toBeDefined();
        expect(result!.type).toBe('bad-body');
        expect(result!.value).toBe(expectedMsg);
      }
    );

    it('should return undefined for unknown errors', () => {
      expect(
        provider.handleErrors('completely unknown error string')
      ).toBeUndefined();
    });

    // Test ordering: spam_risk_text should match before generic spam_risk
    it('should match specific spam errors before generic spam_risk', () => {
      const textResult = provider.handleErrors('spam_risk_text detected');
      expect(textResult!.value).toContain('spam in the post text');

      const genericResult = provider.handleErrors(
        'spam_risk some other reason'
      );
      expect(genericResult!.value).toBe('TikTok detected potential spam');
    });
  });
});
