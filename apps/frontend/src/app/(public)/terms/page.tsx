import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — D3 Analytics',
  description:
    'D3 Analytics Terms of Service: the rules and conditions for using our social media analytics platform.',
};

const sectionTitle = 'text-[20px] md:text-[22px] font-bold text-white mt-[40px] mb-[16px]';
const subTitle = 'text-[16px] md:text-[17px] font-semibold text-white mt-[24px] mb-[8px]';
const paragraph = 'text-[15px] leading-[1.7] text-[#c8c8c8] mb-[12px]';
const bullet = 'text-[15px] leading-[1.7] text-[#c8c8c8] mb-[6px] pl-[8px]';
const linkBlue = 'text-[#1D4ED8] hover:underline';

export default function TermsPage() {
  return (
    <article>
      <header className="mb-[40px] pb-[24px] border-b border-[#252525]">
        <p className="text-[13px] uppercase tracking-[2px] text-[#1D4ED8] font-semibold mb-[12px]">
          Legal
        </p>
        <h1 className="text-[36px] md:text-[44px] font-bold text-white leading-[1.15] mb-[16px]">
          Terms of Service
        </h1>
        <p className="text-[14px] text-[#9c9c9c]">
          Effective Date: 1 January 2025 &middot; Last Updated: 1 January 2025
        </p>
      </header>

      <p className={paragraph}>
        These Terms of Service (&ldquo;<strong className="text-white">Terms</strong>&rdquo;) form
        a binding agreement between you (&ldquo;you&rdquo; or &ldquo;User&rdquo;) and{' '}
        <strong className="text-white">D3 Analytics</strong> (&ldquo;D3 Analytics&rdquo;,
        &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) governing your access to and use
        of the D3 Analytics website at{' '}
        <a className={linkBlue} href="https://d3analytics.vercel.app">
          d3analytics.vercel.app
        </a>{' '}
        and our related social media analytics services (collectively, the &ldquo;Service&rdquo;).
      </p>
      <p className={paragraph}>
        Please read these Terms carefully. By creating an account, accessing, or using the Service,
        you confirm that you have read, understood, and agree to be bound by these Terms and by
        our{' '}
        <a className={linkBlue} href="/privacy">
          Privacy Policy
        </a>
        . If you do not agree, you must not use the Service.
      </p>

      <h2 className={sectionTitle}>1. Acceptance of Terms</h2>
      <p className={paragraph}>
        By accessing or using the Service, you represent that:
      </p>
      <ul className="list-disc pl-[24px] mb-[12px]">
        <li className={bullet}>You are at least 16 years old, or have reached the age of majority
          in your jurisdiction, whichever is higher.</li>
        <li className={bullet}>You have the legal capacity to enter into a binding agreement.</li>
        <li className={bullet}>If you are using the Service on behalf of an organization, you have
          the authority to bind that organization to these Terms.</li>
        <li className={bullet}>Your use of the Service complies with all applicable laws and
          regulations.</li>
      </ul>

      <h2 className={sectionTitle}>2. Description of the Service</h2>
      <p className={paragraph}>
        D3 Analytics is a self-serve social media analytics platform that allows you to connect
        your own social media accounts and view your analytics in a single dashboard. The Service
        currently supports analytics for Instagram, Facebook, TikTok, Douyin, and Xiaohongshu
        (RedNote). We may add or remove supported platforms from time to time.
      </p>

      <h2 className={sectionTitle}>3. User Accounts and Registration</h2>
      <h3 className={subTitle}>3.1 Account Creation</h3>
      <p className={paragraph}>
        To use most features of the Service, you must register for an account. You agree to provide
        accurate, current, and complete information during registration and to keep your account
        information up to date.
      </p>

      <h3 className={subTitle}>3.2 Account Security</h3>
      <p className={paragraph}>
        You are responsible for safeguarding your password and for all activity that occurs under
        your account. You agree to notify us immediately of any unauthorized access or suspected
        security breach. We are not liable for any loss or damage arising from your failure to
        protect your account credentials.
      </p>

      <h3 className={subTitle}>3.3 One Account Per Person</h3>
      <p className={paragraph}>
        You may not create multiple accounts to circumvent restrictions, abuse free-tier limits, or
        impersonate another person. We reserve the right to suspend duplicate accounts.
      </p>

      <h2 className={sectionTitle}>4. Acceptable Use Policy</h2>
      <p className={paragraph}>
        You agree that you will <strong className="text-white">not</strong>:
      </p>
      <ul className="list-disc pl-[24px] mb-[12px]">
        <li className={bullet}>Use the Service for any unlawful purpose, or in violation of any
          local, national, or international law.</li>
        <li className={bullet}>Connect or analyze social media accounts that you do not own or are
          not authorized to access.</li>
        <li className={bullet}>Attempt to gain unauthorized access to any part of the Service, its
          systems, or its data.</li>
        <li className={bullet}>Interfere with or disrupt the Service, including by introducing
          malware, conducting denial-of-service attacks, or excessive automated requests.</li>
        <li className={bullet}>Reverse engineer, decompile, or disassemble any part of the
          Service, except where permitted by law.</li>
        <li className={bullet}>Resell, sublicense, or commercially exploit the Service without our
          prior written consent.</li>
        <li className={bullet}>Use the Service to harass, defame, or harm any other person or
          entity.</li>
        <li className={bullet}>Scrape, harvest, or otherwise collect data from the Service except
          through features we expressly provide for that purpose.</li>
        <li className={bullet}>Violate the terms of service of any connected social media platform
          (such as Meta or TikTok) through your use of the Service.</li>
      </ul>

      <h2 className={sectionTitle}>5. Social Media Account Connections</h2>
      <h3 className={subTitle}>5.1 Your Own Accounts</h3>
      <p className={paragraph}>
        The Service is designed for you to connect <strong className="text-white">your own</strong>{' '}
        social media accounts. You represent and warrant that you own, or have explicit written
        permission to access and analyze, every social media account you connect to the Service.
      </p>

      <h3 className={subTitle}>5.2 OAuth Connections (Instagram, Facebook, TikTok)</h3>
      <p className={paragraph}>
        For OAuth-supported platforms, you connect your account by logging in through the
        platform&rsquo;s official authorization flow. You may revoke our access at any time from
        within your D3 Analytics dashboard or directly from the social platform&rsquo;s settings.
        Your continued use of these connections is also subject to each platform&rsquo;s own terms
        and policies (for example, the{' '}
        <a className={linkBlue} href="https://developers.facebook.com/terms/" target="_blank" rel="noopener noreferrer">
          Meta Platform Terms
        </a>{' '}
        and the{' '}
        <a className={linkBlue} href="https://developers.tiktok.com/terms-of-service" target="_blank" rel="noopener noreferrer">
          TikTok Developer Terms of Service
        </a>
        ).
      </p>

      <h3 className={subTitle}>5.3 URL-Based Connections (Douyin and Xiaohongshu)</h3>
      <p className={paragraph}>
        For Douyin and Xiaohongshu (RedNote), you may submit a public profile URL. The Service will
        display <strong className="text-white">publicly available data only</strong>; private
        insights are not available for these platforms. You must have the right to share and analyze
        the data accessible at any URL you submit.
      </p>

      <h2 className={sectionTitle}>6. Analytics Data</h2>
      <p className={paragraph}>
        The Service displays analytics data obtained through (a) the official APIs of social media
        platforms for which you have granted authorization, and (b) publicly available data sourced
        through trusted third-party providers. We do not guarantee:
      </p>
      <ul className="list-disc pl-[24px] mb-[12px]">
        <li className={bullet}>The accuracy, completeness, or timeliness of any analytics data
          displayed.</li>
        <li className={bullet}>The continued availability of any platform integration, which may
          change or be removed if the underlying platform changes its API.</li>
        <li className={bullet}>That historical data will be retained indefinitely.</li>
      </ul>
      <p className={paragraph}>
        Analytics data is provided for informational purposes only and should not be the sole basis
        for business or financial decisions.
      </p>

      <h2 className={sectionTitle}>7. Intellectual Property</h2>
      <h3 className={subTitle}>7.1 Our Rights</h3>
      <p className={paragraph}>
        The Service, including its software, design, branding (such as the &ldquo;D3 Analytics&rdquo;
        name and logo), and content (excluding User Content), is owned by us or our licensors and
        is protected by copyright, trademark, and other intellectual property laws.
      </p>

      <h3 className={subTitle}>7.2 Your Rights</h3>
      <p className={paragraph}>
        Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
        non-transferable, revocable licence to access and use the Service for your personal or
        internal business purposes.
      </p>

      <h3 className={subTitle}>7.3 Your Content</h3>
      <p className={paragraph}>
        You retain all rights to the social media data you connect to the Service. By using the
        Service, you grant us a limited licence to process and display that data solely for the
        purpose of providing the Service to you.
      </p>

      <h2 className={sectionTitle}>8. Third-Party Services</h2>
      <p className={paragraph}>
        The Service integrates with third-party services including Meta (Facebook and Instagram),
        TikTok, Apify, Supabase, and Vercel. Your use of these third-party services is governed by
        their own terms and privacy policies. We are not responsible for the practices,
        availability, or content of any third party.
      </p>

      <h2 className={sectionTitle}>9. No Guarantee of Uptime or Availability</h2>
      <p className={paragraph}>
        We strive to keep the Service available, but we do not guarantee that the Service will be
        uninterrupted, error-free, secure, or available at any particular time or location. The
        Service may be temporarily unavailable due to maintenance, upgrades, or events outside our
        reasonable control (including outages of third-party APIs and hosting providers).
      </p>
      <p className={paragraph}>
        We are not liable for any downtime, data loss, or inconvenience caused by such
        unavailability.
      </p>

      <h2 className={sectionTitle}>10. Disclaimer of Warranties</h2>
      <p className={paragraph}>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED ON AN
        &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND,
        WHETHER EXPRESS, IMPLIED, OR STATUTORY. WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED
        WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND
        TITLE.
      </p>
      <p className={paragraph}>
        We make no warranty that the Service will meet your requirements, be free of errors, or
        produce any specific result. Any reliance on the analytics data or other materials provided
        through the Service is at your sole risk.
      </p>

      <h2 className={sectionTitle}>11. Limitation of Liability</h2>
      <p className={paragraph}>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL D3 ANALYTICS, ITS
        OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS
        OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN
        CONNECTION WITH YOUR USE OF, OR INABILITY TO USE, THE SERVICE.
      </p>
      <p className={paragraph}>
        IN ALL CASES, OUR AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE
        SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE
        EVENT GIVING RISE TO THE LIABILITY, OR ONE HUNDRED MALAYSIAN RINGGIT (MYR 100), WHICHEVER
        IS GREATER. WHERE YOU USE THE SERVICE WITHOUT PAYMENT, OUR AGGREGATE LIABILITY IS CAPPED
        AT MYR 100.
      </p>

      <h2 className={sectionTitle}>12. Indemnification</h2>
      <p className={paragraph}>
        You agree to indemnify, defend, and hold harmless D3 Analytics and its affiliates, officers,
        agents, and employees from and against any claims, liabilities, damages, losses, and
        expenses (including reasonable legal fees) arising out of or in any way connected with:
      </p>
      <ul className="list-disc pl-[24px] mb-[12px]">
        <li className={bullet}>Your use of, or inability to use, the Service.</li>
        <li className={bullet}>Your violation of these Terms.</li>
        <li className={bullet}>Your violation of any third-party right, including the terms of any
          social media platform you connect.</li>
        <li className={bullet}>Any content or data you submit to the Service.</li>
      </ul>

      <h2 className={sectionTitle}>13. Termination</h2>
      <h3 className={subTitle}>13.1 Termination by You</h3>
      <p className={paragraph}>
        You may stop using the Service and delete your account at any time from your account
        settings. Upon deletion, we will process your data in accordance with our{' '}
        <a className={linkBlue} href="/privacy">
          Privacy Policy
        </a>
        .
      </p>

      <h3 className={subTitle}>13.2 Termination by Us</h3>
      <p className={paragraph}>
        We may suspend or terminate your access to the Service immediately, without prior notice or
        liability, for any reason, including if you breach these Terms, engage in fraudulent or
        abusive behaviour, or if we discontinue the Service.
      </p>

      <h3 className={subTitle}>13.3 Effect of Termination</h3>
      <p className={paragraph}>
        Upon termination, your right to use the Service ceases immediately. Sections that by their
        nature should survive termination (including intellectual property, disclaimers,
        limitation of liability, indemnification, and governing law) will continue to apply.
      </p>

      <h2 className={sectionTitle}>14. Changes to the Service and These Terms</h2>
      <p className={paragraph}>
        We may modify or discontinue any part of the Service at any time. We may also revise these
        Terms from time to time. When we make material changes, we will update the &ldquo;Last
        Updated&rdquo; date and, where appropriate, provide a more prominent notice. Your
        continued use of the Service after the changes take effect constitutes acceptance of the
        revised Terms. If you do not agree to the updated Terms, you must stop using the Service.
      </p>

      <h2 className={sectionTitle}>15. Governing Law and Dispute Resolution</h2>
      <p className={paragraph}>
        These Terms and any dispute arising out of or in connection with them shall be governed by
        and construed in accordance with the laws of <strong className="text-white">Malaysia</strong>,
        without regard to its conflict of laws principles.
      </p>
      <p className={paragraph}>
        You and D3 Analytics agree that the courts of Malaysia shall have exclusive jurisdiction
        to settle any dispute arising out of or in connection with these Terms or the Service,
        except where such exclusive jurisdiction would deprive you of mandatory consumer
        protections available to you under the law of your country of residence.
      </p>

      <h2 className={sectionTitle}>16. Miscellaneous</h2>
      <h3 className={subTitle}>16.1 Entire Agreement</h3>
      <p className={paragraph}>
        These Terms, together with the Privacy Policy, constitute the entire agreement between you
        and D3 Analytics regarding the Service and supersede any prior agreements.
      </p>

      <h3 className={subTitle}>16.2 Severability</h3>
      <p className={paragraph}>
        If any provision of these Terms is found to be unenforceable or invalid, that provision
        shall be limited or eliminated to the minimum extent necessary so that these Terms shall
        otherwise remain in full force and effect.
      </p>

      <h3 className={subTitle}>16.3 No Waiver</h3>
      <p className={paragraph}>
        Our failure to enforce any right or provision of these Terms will not be considered a
        waiver of that right or provision.
      </p>

      <h3 className={subTitle}>16.4 Assignment</h3>
      <p className={paragraph}>
        You may not assign or transfer these Terms without our prior written consent. We may assign
        these Terms freely, including in connection with a merger, acquisition, or sale of assets.
      </p>

      <h2 className={sectionTitle}>17. Contact Us</h2>
      <p className={paragraph}>
        If you have any questions about these Terms, please contact us at:
      </p>
      <div className="mt-[12px] mb-[24px] p-[20px] bg-[#1a1919] border border-[#252525] rounded-[8px]">
        <p className="text-[14px] text-[#c8c8c8] mb-[4px]">
          <strong className="text-white">D3 Analytics</strong>
        </p>
        <p className="text-[14px] text-[#c8c8c8]">
          Email:{' '}
          <a className={linkBlue} href="mailto:legal@d3analytics.vercel.app">
            legal@d3analytics.vercel.app
          </a>
        </p>
      </div>

      <div className="mt-[40px] pt-[20px] border-t border-[#252525]">
        <p className="text-[12px] text-[#696868] italic leading-[1.6]">
          These Terms of Service are provided as a general informational template and do not
          constitute legal advice. You are responsible for ensuring compliance with all laws
          applicable to your specific operations. We strongly recommend consulting a qualified
          legal professional in Malaysia before relying on these terms for production use.
        </p>
      </div>
    </article>
  );
}
