import Link from 'next/link';
import { type ReactNode } from 'react';

interface SocialLink {
  icon: ReactNode;
  href: string;
  label: string;
}

interface FooterLink {
  href: string;
  label: string;
}

interface FooterProps {
  logo: ReactNode;
  brandName: string;
  socialLinks?: SocialLink[];
  mainLinks: FooterLink[];
  legalLinks: FooterLink[];
  copyright: {
    text: string;
    license?: string;
  };
}

export function Footer({
  logo,
  brandName,
  socialLinks,
  mainLinks,
  legalLinks,
  copyright,
}: FooterProps) {
  const hasSocials = socialLinks && socialLinks.length > 0;

  return (
    <footer className="pb-6 pt-8 lg:pb-8 lg:pt-10">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8">
        <div className="md:flex md:items-start md:justify-between">
          <Link
            href="/"
            className="flex items-center gap-x-2 hover:opacity-90 transition-opacity"
            aria-label={brandName}
          >
            {logo}
            <span className="font-semibold text-heading text-fg tracking-[-0.02em]">
              {brandName}
            </span>
          </Link>
          {hasSocials ? (
            <ul className="flex list-none mt-6 md:mt-0 space-x-3">
              {socialLinks!.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={link.label}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-full glass-elevated text-fg hover:bg-white/[0.06] transition-colors duration-150 ease-out"
                  >
                    {link.icon}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="border-t border-borderGlass mt-6 pt-6 md:mt-4 md:pt-8 lg:grid lg:grid-cols-10 lg:gap-x-6">
          <nav className="lg:mt-0 lg:col-[4/11]">
            <ul className="list-none flex flex-wrap -my-1 -mx-2 lg:justify-end">
              {mainLinks.map((link) => (
                <li key={link.href} className="my-1 mx-2 shrink-0">
                  <Link
                    href={link.href}
                    className="text-body-sm text-fg underline-offset-4 hover:underline transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 lg:mt-0 lg:col-[4/11]">
            <ul className="list-none flex flex-wrap -my-1 -mx-3 lg:justify-end">
              {legalLinks.map((link) => (
                <li key={link.href} className="my-1 mx-3 shrink-0">
                  <Link
                    href={link.href}
                    className="text-body-sm text-fgSubtle underline-offset-4 hover:underline transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 text-body-sm leading-6 text-fgSubtle whitespace-nowrap lg:mt-0 lg:row-[1/3] lg:col-[1/4]">
            <div>{copyright.text}</div>
            {copyright.license ? <div>{copyright.license}</div> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
