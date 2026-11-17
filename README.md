# SecondLook

**Paste any suspicious message. Your device reads it privately, the cloud checks only the organisation name and website names, and a transparent rulebook tells you in plain words whether it is a scam and what to do.**

Built for **#BuildHybridAI 2026** with the **Firebase AI Logic Hybrid Inference SDK** (Web, Chrome desktop, Gemini Nano).

## Why it needs hybrid inference

| Tier | What it does | Why only this tier can do it |
|---|---|---|
| **On-device (Gemini Nano)** | Reads the private message and finds scam tactics | The message contains the person's name, family details and account fragments. It never leaves the device. |
| **Cloud (Gemini)** | Gives a second opinion on the claimed organisation and website names; stands in for Gemini Nano on computers that cannot run it | The larger cloud model knows official websites and scam patterns far better than the small on-device model. With the optional Google Search grounding (Blaze plan), it also checks the live web. |
| **Rules (deterministic code)** | Decides the verdict | The model never sets the verdict alone. "Likely scam" comes only from a hard rule or a lookalike website. The app never says "Safe". |

## Pipeline

| Step | What happens | Where it runs | Inference mode |
|---|---|---|---|
| G0 | Language check (English, Spanish, Japanese, German, French) | Device, code | — |
| G1 | Links reduced to website names, phone numbers, amounts, gift-card / crypto / code / remote-access words | Device, code | — |
| S1 | Scam tactics as JSON (schema-constrained) | Device | `ONLY_ON_DEVICE` for real messages; `PREFER_ON_DEVICE` for bundled fictional samples |
| S1-M | Four yes/no questions when Gemini Nano is unavailable | Device, user | — |
| G2 | Builds the exact payload the cloud may receive; organisation name validated; phone numbers only when ticked | Device, code | — |
| Inspector | The user sees the exact bytes and presses **Check online** | User | — |
| S2 | Second opinion on the payload only, shown as returned | Cloud | Separate cloud-only instance; adds `googleSearch` only when `VITE_ENABLE_GROUNDING=true` |
| G3 | Verdict rules (hard rules, curated official websites, lookalike detection) | Device, code | — |
| S3 | Plain-language explanation from the verdict card only | Device, cloud fallback | `PREFER_ON_DEVICE` |

The cloud answer is **not** parsed, rewritten, stored or forwarded. It is displayed as returned, next to the verdict, (as the Gemini API grounding terms require when grounding is on). The verdict and the "send to a family member" card are built only from on-device facts.

## Firebase products

- **AI Logic**: hybrid model instances (S1, S3) and a cloud-only model instance (S2)
- **App Check**: reCAPTCHA v3 (debug provider for local development)
- **Remote Config**: curated organisation list (`organisations_json`), reporting steps (`reporting_json`), daily cap (`daily_grounded_cap`)
- **Firestore**: per-user daily cap on online checks and routing counters. Counts only, never message text.
- **Authentication**: anonymous sign-in, used only to scope the daily cap
- **Hosting**: the public URL

## Run locally

Requirements: Node.js 20 or later. For the on-device path: desktop Chrome 139 or later on a machine that meets the [Gemini Nano requirements](https://developer.chrome.com/docs/ai/get-started) (at least 22 GB free disk, plus more than 4 GB of video memory or 16 GB of RAM).

```bash
npm install
cp .env.example .env.local   # then fill in the values (see "Setup")
npm run dev                  # http://localhost:5173
npm test                     # unit tests for the rules and the boundary
```

Without `.env.local`, the app still runs: the local rules and manual questions work, and online checks are switched off.

## Setup (Firebase)

1. Create a Firebase project. The free **Spark** plan is enough. (Optional: Google Search grounding needs the Blaze plan; then set `VITE_ENABLE_GROUNDING=true`.)
2. **AI Logic** > Get started > **Gemini Developer API**.
3. **Project settings** > Add app > **Web**. Copy the config values into `.env.local`.
4. Create a free **reCAPTCHA v3** key, register it in **App Check**, and enforce App Check for AI Logic. Put the site key in `.env.local`.
5. For local development, set `VITE_APPCHECK_DEBUG_TOKEN=true`, run the app, copy the debug token printed in the browser console, register it in **App Check > Manage debug tokens**, then paste it into `.env.local`.
6. **Authentication** > enable **Anonymous**.
7. **Firestore** > create database, then deploy `firestore.rules`.
8. Copy `.firebaserc.example` to `.firebaserc` with your project id, then `npm run deploy`.

## Honest limits

- SecondLook gives a warning, not a guarantee. "No warning signs found" does not mean safe.
- It targets impersonation scams (banks, delivery firms, tax offices, technology support, "new number" family messages). It does not claim to detect investment or romance scams.
- Google Messages offers on-device scam detection for SMS on supported Android phones. SecondLook differs in that it works in any desktop Chrome, for any channel (email, chat, SMS), sends only an allow-listed payload that the user inspects, and explains its verdict with named rules.

## Licence

Apache 2.0. All dependencies use permissive licences (MIT or Apache 2.0).
