# DRAFT – requires owner/legal review

This draft describes the apparent data flows in the current website. It is not a published privacy notice and must not be used as a substitute for an owner-approved policy.

## Personal data that may be collected

- Member forms may collect a person's name, student/institute identifier, email address, phone number, year/class, ministry interests, testimony, and consent.
- Contact forms may collect a name, reply email address, subject, and message, including prayer requests.
- Ministry enrollment collects a name, registration number, phone number, and selected ministry.
- The library borrowing form asks for a book title, admission number, mobile number, and requested return date. While no verified endpoint is configured, these details are not sent by the site.
- The book suggestion form accepts free-text suggestions. While no verified endpoint is configured, suggestions are not sent by the site.
- Chatbot prompts are sent to the server-side AI proxy when configured. Recent chat messages are also stored in browser local storage.
- RSVP selections are stored in browser local storage unless a verified endpoint is configured.

## Destinations and storage

- Homepage contact and membership submissions are configured for Formspree.
- The shared header membership form and ministry enrollment use Google Apps Script. The owner must confirm the precise destination and access controls.
- The standalone PHP handler stores member records in the MySQL database identified by its environment configuration, if that handler is deployed. Its active deployment status is unconfirmed.
- Chat history and RSVP selections remain on the visitor's device in local storage.
- The gallery uses the public GitHub contents API to list repository images.
- Analytics is disabled until a real measurement ID is supplied.

## Suggested retention for owner review

As a starting proposal only, review contact and ministry inquiries after 12 months and delete them when no longer needed. Review membership records at the end of membership and retain only records required for legitimate administrative or legal needs. Define separate retention periods for backups and operational logs. The owner and legal counsel must approve actual periods, deletion processes, and any statutory exceptions before publication.

## Review required

The owner should confirm every processor and storage location, the lawful basis for processing, consent language, international transfers, security controls, access roles, retention/deletion procedures, and a contact for privacy requests. Do not publish this draft until those details have been verified and reviewed by qualified counsel.
