# Operations

## Deployment

1. Review the branch and its changes before merging or deploying.
2. Confirm the Vercel project is connected to the intended repository and deployment branch.
3. Configure `OPENAI_API_KEY` in Vercel's environment settings. Configure the PHP host's `DB_HOST`, `DB_USER`, `DB_PASS`, and `DB_NAME` separately if the standalone PHP handler is deployed.
4. Deploy through the existing Vercel project workflow and verify the homepage, gallery, chatbot fallback, and form error states.
5. Confirm upstream Google Apps Script and Formspree services are still controlled and configured by the owner.

Do not treat a successful static deployment as confirmation that third-party forms or the PHP registration handler are operational.

## Rollback

- In Vercel, promote the previous known-good deployment using the project's deployment controls.
- Alternatively, revert the relevant change with `git revert <commit>` and deploy the reviewed revert.
- Do not rewrite shared history or force-push during incident response.

## Data locations and backup responsibilities

- Homepage contact and membership submissions go to the configured Formspree account.
- The shared header membership form and ministry enrollment use Google Apps Script. The owner must confirm the destination spreadsheet/account and its retention and backup settings.
- `register_member.php` writes member records to the configured MySQL database if it is deployed. The database host, schema, backup schedule, and restore procedure are owner to confirm.
- RSVP entries and chatbot history remain in browser local storage. Library borrow and suggestion requests are not transmitted while their endpoint constants are `null`.
- The gallery reads image listings from the GitHub repository; source images are stored in the repository.

The owner must confirm backup ownership, frequency, retention, access controls, and a tested restore procedure for Formspree, Google Apps Script/Sheets, and any MySQL database. These are currently unknown.

## Key rotation

### OpenAI

1. Revoke the previously exposed key in the OpenAI account immediately.
2. Create a replacement key and store it only in the Vercel environment settings as `OPENAI_API_KEY`.
3. Redeploy, verify `/api/chat` works with a mock/safe prompt, and confirm the client contains no key.
4. Review usage and billing for unexpected activity. Ask the repository owner whether historical secret removal is required; any history rewrite must be an owner-led operation.

### Database

1. Rotate the database password at the database provider.
2. Update `DB_HOST`, `DB_USER`, `DB_PASS`, and `DB_NAME` on the PHP host.
3. Restart or redeploy the PHP application and verify a controlled registration test using non-production data.
4. Review database access logs and confirm the old credential no longer authenticates.
