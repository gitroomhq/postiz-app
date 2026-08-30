<!-- Remember to first apply via [the contribution form](https://contribute.postiz.com/p/postiz) and sign the [CLA](https://contribute.postiz.com/p/postiz/cla) before submitting a PR. -->

# What kind of change does this PR introduce?

<!--
Name the actual change, not just a category - "Bug fix." on its own is not enough.
Give the type, the area it touches (backend, frontend, orchestrator, a specific
provider or screen), and in one to three sentences what concretely changed and
where (the key function, endpoint, file or field), plus what deliberately stayed
the same. A reader should understand the change from this section alone, without
opening the diff. Replace this whole comment.

Example of what it should look like:

Bug fix (frontend, post modal). Adds the missing `repeater` field to `initialState`
in the new-launch store, so the modal's unmount `reset()` actually clears the repeat
interval. Without it the selected interval leaked into the next modal open and was
silently attached to the saved post. No other store field or save path changed.
-->

# Why was this change needed?

Please link to related issues when possible, and explain WHY you changed things, not WHAT you changed.

# Other information:

eg: Did you discuss this change with anybody before working on it (not required, but can be a good idea for bigger changes). Any plans for the future, etc?

# QA

<!--
Write the steps here, replacing this whole comment. Leaving it as is, or writing
"N/A" / "TBD" / a bare empty checkbox as the whole section, counts as no QA at all.

Write real steps a reviewer can follow without asking you anything: setup, action,
expected result. Keep them as numbered checkboxes so a reviewer can tick them off -
the numbering is what the review board extracts, the checkbox is for the reviewer.
Steps inside a fenced code block are ignored, so keep them as plain lines.

Example of what it should look like:

1. [ ] Link a webhook endpoint pointing at http://localhost:9999 (nothing listening)
2. [ ] Approve an application to trigger a delivery
3. [ ] Delivery should show 4 attempts, roughly 1m / 5m / 30m apart, then stop
-->

# Checklist:

Put a "X" in the boxes below to indicate you have followed the checklist;

- [ ] I have read the [CONTRIBUTING](https://github.com/gitroomhq/postiz-app/blob/main/CONTRIBUTING.md) guide.
- [ ] I have signed the [Contributor License Agreement (CLA)](https://contribute.postiz.com/p/postiz/cla) ([ICLA](https://github.com/gitroomhq/postiz-app/blob/main/ICLA.md) for individuals, [CCLA](https://github.com/gitroomhq/postiz-app/blob/main/CCLA.md) for entities).
- [ ] I confirm I have not used AI to submit this PR or generate code for it.
- [ ] I checked that there were no similar issues or PRs already open for this.
- [ ] This PR fixes just ONE issue
- [ ] I have filled in the QA section above with real steps to verify this change.
