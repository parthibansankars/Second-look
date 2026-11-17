# SecondLook

**Is this message a scam? Check it privately.**

SecondLook helps older adults, and the family members who look after them, check a suspicious text, email or chat message. Gemini Nano reads the message **on the device**. Only the organisation name and the website names can go to the cloud, and only after the person approves them. Simple, deterministic rules then give a plain answer: **Likely scam**, **Suspicious** or **No warning signs found**. SecondLook never says "Safe".

Built for **#BuildHybridAI 2026** with the **Firebase AI Logic hybrid inference SDK** (Web, desktop Chrome). It runs entirely on Firebase's **free Spark plan**.

---

## Contents

1. [Quick start: run it in 2 minutes, no keys](#1-quick-start-run-it-in-2-minutes-no-keys)
2. [Full setup: connect Firebase (free, about 15 minutes)](#2-full-setup-connect-firebase-free-about-15-minutes)
3. [See the on-device path (Gemini Nano)](#3-see-the-on-device-path-gemini-nano)
4. [What to try](#4-what-to-try)
5. [Where Firebase AI Logic is used in the code](#5-where-firebase-ai-logic-is-used-in-the-code)
6. [How it works](#6-how-it-works)
7. [Tests](#7-tests)
8. [Troubleshooting](#8-troubleshooting)
9. [Honest limits](#9-honest-limits)

---

## 1. Quick start: run it in 2 minutes, no keys

**You need:** [Node.js 20 or later](https://nodejs.org/) and Google Chrome.

```bash
git clone https://github.com/parthibansankars/Second-look.git
cd Second-look
npm install
npm run dev
```

Open **http://localhost:5173** in Chrome.

Without any keys, the app already works in its **offline mode**:
- the rules that read links, phone numbers and payment words;
- the simple Yes/No questions;
- the verdict and the "What to do now" advice.

The AI steps are switched off until Firebase is connected (section 2).

---

## 2. Full setup: connect Firebase (free, about 15 minutes)

Every service below is **free**. Do not upgrade to the Blaze plan; it is not needed.

### 2.1 Create the configuration file

```bash
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env.local`.

`.env.local` is ignored by git. **Never put keys in `.env.example`**, which is public.

### 2.2 The values you will fill in

| Variable in `.env.local` | What it is | Secret? | Where it comes from |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web config | No (public identifier) | Step B |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web config | No | Step B |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web config | No | Step B |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase web config | No | Step B |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase web config | No | Step B |
| `VITE_FIREBASE_APP_ID` | Firebase web config | No | Step B |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 **site** key for App Check | No | Step C |
| `VITE_APPCHECK_DEBUG_TOKEN` | App Check debug token for `localhost` | **Yes** | Step D |
| `VITE_ENABLE_GROUNDING` | Leave as `false` (Google Search grounding needs the paid plan) | No | — |
| `VITE_CLOUD_MODEL`, `VITE_GROUNDED_MODEL` | Optional model overrides; leave empty | No | — |

Write each value without quotes, for example `VITE_FIREBASE_PROJECT_ID=my-project-123`.

### 2.3 Steps

**Step A: Create a Firebase project and turn on AI Logic**
1. Open https://console.firebase.google.com/ and click **Create a project**. Google Analytics can be off.
2. Open https://console.firebase.google.com/project/_/ailogic and choose your project.
3. Click **Get started**, then choose **Gemini Developer API**, the free option. Firebase manages the Gemini key, so there is nothing to copy.

**Step B: Register a web app and copy six values**
1. Open https://console.firebase.google.com/project/_/settings/general
2. Under **Your apps**, click the Web icon `</>`, name it, and click **Register app**. Leave Hosting unticked.
3. Copy `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` and `appId` into the six `VITE_FIREBASE_…` lines.

**Step C: Create a free reCAPTCHA v3 key**
1. Open https://www.google.com/recaptcha/admin/create
2. Set the type to **Score based (v3)** and add the domain `localhost`.
3. Copy the **site key** into `VITE_RECAPTCHA_SITE_KEY`. Keep the **secret key** for Step D.

**Step D: App Check**
1. Open https://console.firebase.google.com/project/_/appcheck, then go to **Apps** and click your web app.
2. Choose **reCAPTCHA**, paste the **secret key** from Step C, and click **Save**.
3. In `.env.local`, set `VITE_APPCHECK_DEBUG_TOKEN=true`, then run `npm run dev` and open the app.
4. Open Chrome's console (F12). It prints: `App Check debug token: xxxxxxxx-xxxx-…`. Copy that token.
5. Back in App Check, on your app, open **⋮** > **Manage debug tokens** > **Add debug token**, and paste it.
6. In `.env.local`, replace `true` with the token, then restart `npm run dev`.

**Step E: Anonymous sign-in**
- Open https://console.firebase.google.com/project/_/authentication/providers, click **Anonymous**, then **Enable** and **Save**.
- SecondLook uses it only to count online checks per person per day.

**Step F: Firestore**
1. Open https://console.firebase.google.com/project/_/firestore and click **Create database**. Choose any location, in **production mode**.
2. Open the **Rules** tab, paste the contents of [`firestore.rules`](firestore.rules), and click **Publish**.
3. Firestore stores **counts only**, never message text.

**Step G: Run**

```bash
npm run dev
```

Expand **Technical details** at the bottom of the page. It should no longer say "Firebase is not configured".

---

## 3. See the on-device path (Gemini Nano)

The on-device model runs in **desktop Chrome 139 or later**, on machines that meet [Chrome's built-in AI requirements](https://developer.chrome.com/docs/ai/get-started):
- Windows 10/11, macOS 13+ or Linux;
- **at least 22 GB free** on the drive that holds the Chrome profile;
- **either** a GPU with **more than 4 GB** of video memory, **or** 16 GB of RAM and 4 or more CPU cores.

How to check and prepare it:
1. Open `chrome://on-device-internals` to see whether the model is available.
2. In SecondLook, expand **Technical details**. If the status is `downloadable`, click **Prepare on-device model**. The download is a few gigabytes; Chrome requires it to start from a click.

**Tip:** if your system drive is full but another drive has space, start Chrome with a separate profile on that drive:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="D:\ChromeNano" http://localhost:5173
```

**If your machine cannot run Gemini Nano, you can still evaluate everything else:**
- **Real (pasted) messages** never go to the cloud. SecondLook asks four simple Yes/No questions instead. This is deliberate: the privacy promise holds on every device.
- **Example messages** (under "Try an example message") are fictional, so they use `PREFER_ON_DEVICE`. On a machine without Nano, cloud Gemini stands in, and **Technical details > Where each step ran** shows `Cloud (Gemini)`.

---

## 4. What to try

1. Click **Try an example message**, choose **Parcel customs fee (UK)**, then click **Check this message**.
2. On the **Ask Google's Gemini AI for a second opinion?** screen, check exactly what will be sent: the name *Royal Mail* and the website name *royalmail-redelivery-fee.com*. The person's name and the full link are not sent.
3. The result is **Likely scam** with the reason **Lookalike website**, the official website, and "What to do now".
4. Expand **Technical details** to see:
   - the exact data sent to the cloud;
   - **where each step ran**: device (Gemini Nano), device (rules), cloud (Gemini), or person.
5. Try the other examples:
   - "Hi Mum, new number": the rule for a family member asking for money from a new number;
   - Computer virus warning: the remote-access rule; tick the phone number to include it;
   - Ordinary delivery update: "No warning signs found", never "Safe";
   - Paquete retenido: a Spanish message.
6. Click **Larger text** in the top corner.

---

## 5. Where Firebase AI Logic is used in the code

| What | File |
|---|---|
| Firebase, App Check (reCAPTCHA v3 and debug token), and AI Logic with `getAI(app, { backend: new GoogleAIBackend() })` | [`src/services/firebase.ts`](src/services/firebase.ts) |
| Hybrid model instances with `getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE / PREFER_ON_DEVICE, onDeviceParams, inCloudParams })`, the JSON-schema constraint for on-device output, `initializeDeviceModel()` | [`src/ai/models.ts`](src/ai/models.ts) |
| The calls (`generateContent`) and the `inferenceSource` used to show where each step ran | [`src/ai/steps.ts`](src/ai/steps.ts) |
| On-device availability detection (`LanguageModel.availability`) | [`src/ai/capability.ts`](src/ai/capability.ts) |

---

## 6. How it works

| Step | What happens | Where it runs | Inference mode |
|---|---|---|---|
| G0 | Language check (English, Spanish, Japanese, German, French) | Device, rules | — |
| G1 | Links reduced to website names; phone numbers, amounts, gift-card, crypto, code and remote-access words | Device, rules | — |
| S1 | Scam tactics as schema-constrained JSON | **Device** | `ONLY_ON_DEVICE` for real messages; `PREFER_ON_DEVICE` for fictional examples |
| S1-M | Four Yes/No questions when Nano is unavailable | Device, person | — |
| G2 | Builds the only data allowed to leave: organisation name (checked), website names, phone numbers only if ticked | Device, rules | — |
| Approval | The person sees what will be sent and decides | Person | — |
| S2 | Second opinion on that data only, shown as returned | **Cloud** | Separate cloud-only instance |
| G3 | Verdict: hard rules, a built-in list of official websites, lookalike detection | Device, rules | — |
| S3 | Plain-language explanation built from the verdict only | Device, cloud fallback | `PREFER_ON_DEVICE` |

**Why hybrid is essential:** the message holds private details (names, family situations, account fragments), so it can be read only on the device. The larger cloud model knows official websites and scam patterns that the small on-device model does not. And the cloud covers every computer that cannot run Nano.

**Firebase products used:**
- **AI Logic:** hybrid and cloud model instances;
- **App Check:** reCAPTCHA v3, plus a debug token for local development;
- **Authentication:** anonymous sign-in;
- **Firestore:** a daily limit per person and counts of where each step ran;
- **Remote Config:** the list of official organisations (`organisations_json`), the reporting steps (`reporting_json`) and the daily limit (`daily_grounded_cap`), with built-in defaults.

**Optional:** with the paid Blaze plan, set `VITE_ENABLE_GROUNDING=true` to add Google Search grounding to step S2.

---

## 7. Tests

```bash
npm test         # unit tests: language check, extraction, the privacy boundary, the verdict rules
npm run build    # type check and production build
```

The tests check, among other things, that the person's name, the full link and phone numbers that were not ticked never appear in the data sent to the cloud.

---

## 8. Troubleshooting

| What you see | What to do |
|---|---|
| "Firebase is not configured" in Technical details | `.env.local` is missing or incomplete. Fill in the six `VITE_FIREBASE_…` values and restart `npm run dev`. |
| The online check fails, or the console shows `appCheck/…` or 403 errors | Register the debug token (Step D) and check that `VITE_RECAPTCHA_SITE_KEY` is the **site** key, not the secret key. |
| On-device status `unavailable` | The machine does not meet the requirements in section 3. Use the example messages, or a computer that meets them. |
| On-device status `downloadable` | Click **Prepare on-device model** in Technical details and wait for the download. |
| "Today's limit for online checks has been reached" | The free daily limit (default 20 per person) has been reached. It resets the next day, or you can change `daily_grounded_cap` in Remote Config. |
| Changes to `.env.local` have no effect | Restart `npm run dev`. Vite reads `.env.local` only at start-up. |

---

## 9. Honest limits

- SecondLook gives a warning, not a guarantee. "No warning signs found" does not mean a message is safe.
- It targets **impersonation** scams: banks, delivery firms, tax offices, technology support, and family members writing from a "new number". It does not claim to detect investment or romance scams.
- Without Google Search grounding, the cloud second opinion uses Gemini's general knowledge, not a live web search, and is labelled that way. The verdict itself comes from SecondLook's rules and its list of official websites.
- Google Messages offers on-device scam detection for SMS on supported Android phones. SecondLook is different: it works in desktop Chrome for any channel (email, chat or SMS), it lets the person see exactly what is sent, and it explains its verdict with named rules.

## Licence

[Apache 2.0](LICENSE). All dependencies use permissive licences (MIT or Apache 2.0).
