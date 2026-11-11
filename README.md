# Objekt: portfolio storefront

**Live:** https://objekt.live

A complete Swedish web shop for a made-up homeware brand, built as a portfolio project. It works like a real shop, except that payments run in Stripe's test mode and the products don't exist.

To try checkout, pay with the test card `4242 4242 4242 4242`, any future date and any CVC. Order emails only reach verified addresses, because the shop's email sending is in test mode.

![Browsing to a product, picking a colour and adding it to the cart](docs/screenshots/demo.gif)

## What it does

- 34 products with colour and size variants, instant search, and filters kept in the URL
- Stripe Checkout with card and Klarna, plus discount codes and gift cards
- Order tracking, self-service returns and refunds, and an email for every step
- Customer accounts with order history, data export and account deletion
- An admin panel for live stock, orders, refunds and review moderation
- A cookie banner with equal accept and decline buttons, so analytics only run after consent

![The shop on a phone: home, product and category pages](docs/screenshots/phone.webp)

## Built with

Next.js 15 (App Router, TypeScript) on AWS Amplify Gen 2, with DynamoDB, Cognito, S3 and CloudFront, SES for email and CloudWatch alarms. Payments go through Stripe Checkout and signed webhooks.

GitHub Actions runs the Vitest unit tests, Playwright end-to-end and visual tests, and Lighthouse CI.

## Run locally

Uses Node 22, the version CI runs.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

All environment variables are optional. Without Stripe keys and an Amplify backend the shop still runs; checkout, accounts, reviews and the admin panel say they aren't configured.
