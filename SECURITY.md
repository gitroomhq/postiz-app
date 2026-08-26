# Security Policy

## Introduction

The Postiz app is committed to ensuring the security and integrity of our users' data. This security policy outlines our procedures for handling security vulnerabilities and our disclosure policy.

## Scope

We, at Postiz (gitroomhq), cover the following scopes for vulnerability disclosures:

- The core repository for `postiz-app` (github.com/gitroomhq/postiz-app)
- All `gitroomhq` repositories that are official components, tooling, or integrations of Postiz
- Official Postiz container images published under `gitroomhq` on GHCR
- Official Postiz CLI tools and NPM packages (NPM org: @postiz)
- Postiz-Cloud related infrastructure & services (API, Frontend, Configurations etc.)
- Plugins for Postiz maintained within the `gitroomhq` organization

Vulnerabilities in third-party dependencies or user-hosted infrastructure are outside of this scope.

## Supported Versions

This project currently only supports the latest release. We recommend that users always use the latest version of the Postiz app to ensure they have the latest security patches.
*CVE IDs will only be assigned to vulnerabilities affecting currently supported versions.*

## What We Consider a Vulnerability

We consider an issue a vulnerability when it is a weakness in an in-scope, supported product that can be exploited to impact the confidentiality, integrity, or availability of the product or its users' data, or that violates the product's security policy.

**In scope:**

- A demonstrable security impact, privilege escalation, data exposure, integrity violation, or loss of availability, in a supported product.
- Insecure default configurations shipped by Postiz.

**Not a vulnerability:**

- Reports with no demonstrable security impact, or theoretical issues with no working proof of concept.
- Misconfiguration or non-default changes on a self-hosted instance (exposed database, missing TLS, weak operator-set secrets); these fall outside [Scope](#scope).
- Third-party dependency issues, unless Postiz's own use of the dependency is independently exploitable. Updating a dependency is not itself a vulnerability.
- Denial-of-service, brute-force, or resource-exhaustion attacks absent a missing common defense.
- Issues requiring physical or local access to a machine the user already controls.
- Social engineering, phishing, or self-inflicted issues (e.g., self-XSS).
- Missing hardening (security headers, cookie flags) with no demonstrated exploitable impact.
- Reports affecting only end-of-life or unsupported versions (see [Supported Versions](#supported-versions)).

## Contacting Us

All security correspondence goes through [GAdvisory](https://postiz.gadvisory.org/request), our security advisory platform. The form routes four types of request:

- **Report a vulnerability.** See [Reporting Security Vulnerabilities](#reporting-security-vulnerabilities).
- **Dispute a CVE or Advisory.** Challenge the validity of a record we published. Disputes and their resolution are public and permanent. Our CVE Record Dispute Policy is linked from this flow.
- **Suggest a change to a CVE or Advisory.** Corrections to an existing record (affected versions, CWE, references, credits) where the finding itself is not in question.
- **Other.** Scope questions and anything that does not fit the above.

If you are unsure which project a request concerns, or it is not about a single project, choose the general option on the project picker.

Private vulnerability reporting on GitHub is disabled for our repositories. GitHub Security Advisories are a publishing mirror only.

## Reporting Security Vulnerabilities

If you discover a security vulnerability in the Postiz app, report it through [GAdvisory](https://postiz.gadvisory.org/request). Please provide as much detail as possible, including:

- A clear description of the vulnerability
- Proof of concept (PoC), where possible
- Steps to reproduce the vulnerability
- Any relevant code or configuration files

If the report has immediate urgency, please also contact one (or more) of the maintainers via email:

- @egelhaus ([E-Mail](mailto:egelhaus@ennogelhaus.de))

### AI Reports

Reports that appear to be LLM-generated without meaningful human analysis, typically lacking a working proof of concept, reproducible steps, or accurate impact assessment, will be closed without detailed response.

Reports that include AI-assisted analysis are welcome provided they have been validated by the reporter and include a proof of concept, reproduction steps, and impact assessment.

## Coordinated Disclosure

We follow a coordinated (private) disclosure model and will not publicly disclose a vulnerability until a fix or mitigation is available, to prevent exploitation before a patch is released. We ask reporters to operate the same way:

- Report privately through the channels above and do not publicly disclose, share, or discuss the issue, including partial details or proof-of-concept, until we have released a fix and published the corresponding advisory.
- Allow a reasonable remediation window per the timelines below, and coordinate the public disclosure date with us.
- Avoid harming users, degrading service, or accessing or modifying data that is not your own while researching or demonstrating the issue.
- Validate any AI-assisted analysis before submitting (see [AI Reports](#ai-reports)).

During the embargo we will not confirm, deny, or discuss specifics of an unpatched vulnerability publicly. Reporters who follow this process are credited in the published advisory and in the CVE Record's credits section, unless they request otherwise.

## Response Process and Timelines

For every report we investigate and verify the issue, develop a fix or mitigation, release it as soon as possible, and notify users through a published advisory. We aim to follow these timelines:

- **Initial Acknowledgment:** Within 72 hours of initial report.
- **Completed Triage / Verification:** Within 7 days of initial acknowledgment.
- **Critical Issue Remediation:** Within 90 days of completed triage.
- **Non-Critical Issue Remediation:** Within 180 days of completed triage.
- **CVE Publication:** Within 24 hours of remediation release.

## CVE Identifiers

Postiz operates as a CVE Numbering Authority (CNA) for the products listed under [Scope](#scope). For any report confirmed to be an in-scope vulnerability, we manage the full CVE lifecycle:

- **Reservation:** We reserve a CVE ID once a report is confirmed as a genuine in-scope vulnerability. Reservation is internal; the ID is not published or otherwise exposed at this stage.
- **Assignment to reporter:** We provide the reserved CVE ID to the reporter so it can be referenced during coordinated disclosure.
- **Publication:** The CVE Record is published to the CVE List together with the public advisory at [postiz.gadvisory.org/advisories](https://postiz.gadvisory.org/advisories) and the fixed release, never before a fix or mitigation is available. We aim to publish within 24 hours of the remediation release.

CVE IDs are assigned only to vulnerabilities affecting currently supported versions (see [Supported Versions](#supported-versions)).
