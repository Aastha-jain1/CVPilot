# Job Discovery setup

Job Discovery uses real postings only. It currently queries Arbeitnow's public job board API, public Greenhouse job boards you configure, and public Lever posting sites you configure. Each card shows its listing source and links to the source's application page. The aggregator cache defaults to ten minutes; set `JOB_CACHE_TTL_MS` to change it (minimum one minute). Source failures are reported independently, so a temporarily unavailable source does not hide the others.

## Optional sources

Copy `.env.example` into your deployment's environment configuration. Do not commit secrets.

- **Adzuna:** register at [developer.adzuna.com](https://developer.adzuna.com/), then set `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, and optionally `ADZUNA_COUNTRY` (`in` by default). Credentials stay on the server. Adzuna's current terms require an Adzuna attribution link on displayed adverts and restrict ongoing commercial/aggregated use without a licence. Confirm that your intended Resumate deployment is covered before enabling it. The dashboard labels and links Adzuna listings.
- **Greenhouse:** set `GREENHOUSE_BOARDS` to comma-separated public board tokens. A token is the board identifier in the company's Greenhouse career-board URL. The public read-only Job Board API is used; applications always go to the company's posting page.
- **Lever:** set `LEVER_SITES` to comma-separated public site names from the company's Lever postings URL. Applications go to the original posting.

## Sources not enabled

Remotive's public API terms prohibit submitting its listings to third-party job websites/aggregators; Resumate's multi-source discovery page would be such a destination. Do not enable that feed without Remotive's private API/partner permission. This source is therefore intentionally omitted, even though it was requested.

There is no company-wide Greenhouse or Lever vacancy directory. The application cannot discover every employer's board token/site name automatically, so only configured companies appear. No listings are generated when sources return no jobs.

## Resume and saved jobs

This project currently has no authentication or database. The extracted resume text and saved/applied job identifiers are stored in that browser's `localStorage`; the text is sent to the server only when requesting job matches and is not written to disk by the server. This avoids another upload on visits from the same browser, but does not synchronize across devices or users. Clear browser storage to remove it.

## Match scores and analytics

Scores are deterministic keyword indicators: up to 85 points for recognized skill coverage plus 15 points when the title signals a candidate role. Cards show matched and missing recognized skills and the formula. This is not a hiring probability. Job statistics and skill demand are calculated from current source results; this app has no durable historical time series.
