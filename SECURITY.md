# Security Policy

## Introduction

The Postiz app is committed to ensuring the security and integrity of our users' data. This security policy outlines our procedures for handling security vulnerabilities and our disclosure policy.

## Scope

We, at Postiz (gitroomhq), cover the following scopes for vulnerability disclosures:

- The core repository for `postiz-app` (github.com/gitroomhq/postiz-app)
- All `gitroomhq` repositories that are official components, tooling, or integrations of Postiz
- Official Postiz container images published under `gitroomhq` on GHCR
- Official Postiz CLI tools and NPM packages (NPM org: @postiz)
- Postiz-Cloud related infrastructure & services. (API, Frontend, Configurations etc.)
- Plugins for Postiz maintained within the `gitroomhq` organization

Vulnerabilities in third-party dependencies or user-hosted infrastructure are outside of this scope.

## Supported Versions

This project currently only supports the latest release. We recommend that users always use the latest version of the Postiz app to ensure they have the latest security patches.
*CVE IDs will only be assigned to vulnerabilities affecting currently supported versions.*

## Reporting Security Vulnerabilities

If you discover a security vulnerability in the Postiz app, please report it through the [GitHub Security Advisory system](https://github.com/gitroomhq/postiz-app/security/advisories/new).

When reporting a security vulnerability, please provide as much detail as possible, including:

- A clear description of the vulnerability
- Proof of concept (PoC), where possible
- Steps to reproduce the vulnerability
- Any relevant code or configuration files

If the report has immediate urgency, please contact one (or more) of the maintainers via email:

- @egelhaus ([E-Mail](mailto:egelhaus@ennogelhaus.de))

### AI Reports

Reports that appear to be LLM-generated without meaningful human analysis — typically lacking a working proof of concept, reproducible steps, or accurate impact assessment — will be closed without detailed response.

Reports that include AI-assisted analysis are welcome provided they have been validated by the reporter and include a proof of concept, reproduction steps, and impact assessment.

## Disclosure Guidelines

We follow a private disclosure policy. If you discover a security vulnerability, please report it to us privately via GitHub Security Advisories, and if immediate urgency, via email as listed above. We will respond promptly to reports of vulnerabilities and work to resolve them as quickly as possible.

We will not publicly disclose security vulnerabilities until a patch or fix is available to prevent malicious actors from exploiting the vulnerability before a fix is released.

## Security Vulnerability Response Process

We take security vulnerabilities seriously and will respond promptly to reports of vulnerabilities. Our response process includes:

- Investigating the report and verifying the vulnerability.
- Developing a patch or fix for the vulnerability.
- Releasing the patch or fix as soon as possible.
- Notifying users of the vulnerability and the patch or fix.

## Response Timelines

We aim to follow these timelines:

- **Initial Acknowledgment:** Within 72 hours of initial report.
- **Completed Triage / Verification:** Within 7 days of initial acknowledgment.
- **Critical Issue Remediation:** Within 90 days of completed triage.
- **Non-Critical Issue Remediation:** Within 180 days of completed triage.
- **CVE Publication:** Within 24 hours of remediation release.