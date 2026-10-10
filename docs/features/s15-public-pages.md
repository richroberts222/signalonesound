# S15 Public Pages: Landing, Services, About, FAQ and Contact

**Status: APPROVED by the owner on 2026-10-10 ("maybe we should have an about page, a services page, a landing page with appetizing example data, a contact page with a form and contact@signalonesound.com, and a frequently asked questions page"; wording to be drafted from the requirements, which are the authority).** Source: `/docs/product/product-plan.md` (mission, vision, scripture, the problem, Phase 1 features, the church portal, revenue direction "adoption before profit"). All pages are on the web.

## Purpose

Give a stranger a clear, honest reason to try Signal One Sound in ten seconds, say what is free and what is coming, answer common questions, and give people a safe way to reach us, without inventing claims.

## Scope (in)

* **Landing page:** a headline, one place search that opens the real search, three "how it works" steps, example events clearly labeled "Example", short "for people looking" and "for churches" sections.
* **Services page:** what is free for members and for churches (from the plan), what is planned and labeled "coming", and pricing read from the admin Billing console (only active plans).
* **About page:** the plan's mission, vision, scripture and the problem it solves.
* **FAQ page:** plain-language questions and answers, each collapsible, true to what the app does today.
* **Contact page:** the published address `contact@signalonesound.com` and a form (topic, name, optional reply email, message). Submissions are stored and read in a new admin **Messages** inbox. The form is **off by default** (`CONTACT_FORM_ENABLED`) and shown only when switched on, because it collects personal information and the legal gates in `/docs/risk-and-legal.md` are not yet met; when off, the page shows the address only.
* Footer links to every public page; the old mock Discover address sends visitors to the real search (reference application only).

## Out of scope

Real testimonials, user counts or ratings (none exist), blog or news, a live chat, email notification of new messages (needs the email provider), any tracking or analytics, translation, premium features themselves.

## Acceptance criteria

* **AC1** The landing page has one place search whose submit opens the real search (`/events`) with the typed place, and its main button opens the real search, not the mock.
* **AC2** Example events on the landing page are labeled "Example" and are static; the page makes no claim about numbers of users, churches, events or ratings.
* **AC3** The landing page shows three "how it works" steps and a section for people and one for churches, using only features the plan lists as free.
* **AC4** The Services page lists the free features for members and churches and labels planned features "coming"; pricing shows only active plans, and with none active says "Free during early access"; it never shows an inactive plan.
* **AC5** The About page states the plan's mission, vision and scripture and the problem it solves.
* **AC6** The FAQ has at least 12 questions, each with a non-empty answer in a collapsible item, and no answer promises something the app does not do today.
* **AC7** The Contact page always shows the published address as a mail link; the form shows only when `CONTACT_FORM_ENABLED` is on.
* **AC8** A contact submission is validated (topic, name 1 to 80, optional valid reply email, message 10 to 2000, plain text only), a filled hidden "website" field is silently dropped, one person is limited to 3 messages a day, a closed form refuses with "not found", and the reply never echoes what was sent.
* **AC9** The admin Messages inbox lists messages newest first, marks one done, and deletes one; every other caller gets "not found" (401 signed out).
* **AC10** Every public page is linked from the footer; the mock `/discover` address redirects to `/events` in the reference application.
* **AC11** No new page adds a tracking script, and pages are readable without JavaScript.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Landing place box and search button | `home-place-input`, `home-search-button` | Enter, submit | Opens `/events` with the place |
| Landing main button | `home-discover-button` | Click | Opens `/events` |
| Footer links (Services, FAQ added) | `footer-services`, `footer-faq`, `footer-about`, `footer-contact` | Click | Opens the page |
| FAQ items | `faq-item-N` | Click | Opens or closes the answer |
| Contact email link | `contact-email` | Click | Opens a mail message |
| Contact form fields (topic, name, reply email, message) | `contact-topic`, `contact-name`, `contact-reply`, `contact-message` | Enter | Validation |
| Contact send | `contact-send` | Click | Message stored; thanks shown |
| Admin Messages: list, done, delete | `messages-list`, `message-done-N`, `message-delete-N` | View, act | Updates the inbox |

## Owner decisions still open

Turning the contact form on in production (after the privacy wording is reviewed); who reads the Messages inbox (the owner, as admin); a personal "why we started" story (the About page uses the plan's mission until one is supplied).

## Done checklist

Each acceptance criterion and control above is ticked off with its test in the pull request that finishes the slice.
