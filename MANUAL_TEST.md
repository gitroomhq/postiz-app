# Civic Desk manual test

1. Set the normal Postiz settings and connect a **test Facebook Page** through the existing Page integration. Do not use a production Page for the first run.
2. Review and run: `pnpm prisma migrate dev --schema libraries/nestjs-libraries/src/database/prisma/schema.prisma --name civic_desk`.
3. Start Postiz, sign in, and open `/civic-desk`.
4. Enter a neutral theme, artwork place label, official URL, helpline, legal payer, authorizer, and keep **FICTIONAL DEMO** enabled. Generate the package and review the asset before approval.
5. Enter the approver name and approve. Confirm the caption contains its disclosure footer and ISO approval time.
6. Copy the approved caption into the normal Postiz composer, select the connected test Facebook Page, and publish using the existing provider.
7. Paste the resulting Postiz post ID into Civic Desk and link it. Confirm the receipt has the Facebook platform post ID and permalink.
8. Click **Open Ads Manager** only to open Meta's website. Confirm no Marketing API write request was made.

Expected result: one neutral organic Page post is published and linked. Civic Desk stores the receipt and handoff timestamp; it does not create an advertisement.
