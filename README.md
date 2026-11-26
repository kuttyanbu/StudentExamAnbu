# SmartExam

A static, framework-free exam shell (HTML, CSS, vanilla JS) that embeds a Google Form in a fullscreen interface with a countdown timer and violation tracking. Works on any static server and on GitHub Pages.

## Files
```
SmartExam/
├── index.html   student registration
├── exam.html    instructions, fullscreen exam, warning modal, ended screen
├── admin.html   exam settings
├── style.css    shared styles
├── script.js    shared helpers + registration logic
├── admin.js     admin logic
├── exam.js      exam logic
└── README.md
```

## Use
1. Open `admin.html`, set the exam name, instructions, Google Form URL, duration, common exam password, window and security options, then press **Save settings**.
2. Press **Copy settings for deployment** and paste the result over `const DEFAULTS = {...};` in `script.js`, then publish the updated files to GitHub Pages. This makes the same exam setup and shared password available from any device.
3. Students open `index.html`, enter their email and the shared password, then read the instructions and start the exam.
4. If a student leaves the exam screen they have the configured grace period (default 15 s) to click **Return to examination**, or the exam closes.
5. When the form is submitted, the exam closes automatically and the student sees the final page.

Local test: `python3 -m http.server 8000` then open http://localhost:8000/admin.html

## Important limits
- **Settings are stored in LocalStorage**, so they exist only in the browser where you saved them. Other computers see the defaults in `script.js`. To use the same settings everywhere, edit `DEFAULTS` in `script.js` before deploying.
- The common exam password is checked in the browser and is visible in `script.js` to anyone who views the source. Do not use it as a private or high-stakes credential. Each email is marked complete only in that browser's LocalStorage.
- For a one-response limit that follows students across devices, run `configure_exam_form.gs` on the linked Google Form. It collects the signed-in Google account email and limits one response per Google account. Students must sign in to Google; this is account-based and does not verify that each Google account maps to a unique roll number.
- GitHub Pages is public static hosting. The shared password copied into `script.js` is readable by anyone, and the local per-email completion check can be reset. For a strict one-attempt-per-student rule, configure the Google Form's one-response-per-account setting or use an authenticated server and shared database.
- Submission detection is a heuristic: it ends the exam when the form iframe navigates a second time. Disable it for multi-section or sign-in forms. Google Forms remains the record of truth.
- Timer, violations and student data live in LocalStorage, so a student who clears site data can reset them. A refresh does not reset them; reloading mid-exam counts as a violation.
- A web page cannot block Alt+Tab, the Windows key, ESC, closing the browser, developer tools, screenshots or screen recording. SmartExam only detects fullscreen exit, tab visibility changes and window focus loss, and applies your policy.
- Closing the interface does **not** submit Google Forms. A response is saved only if the student submitted it.
- The iframe is cross-origin and never inspected. The form URL can still be found by anyone using browser tools.
- The exam shell blocks common copy, cut, select-all, print, save, and context-menu actions on the parent page. Google Forms runs in a separate cross-origin iframe, so its content and copy behavior cannot be controlled by this app. Browser developer tools and source inspection cannot be disabled by a website.
- A one-minute dialog and persistent reminder tell students to press Google Forms' **Submit** button manually. The app cannot verify that submission or read the form's confirmation page; Google Forms is the system of record for submitted responses. Check responses in Google Forms before validating an exam.
- Removing the admin link from the student page only hides the shortcut. Anyone can still open `admin.html` directly, inspect the downloaded JavaScript, or edit LocalStorage. Real admin-only access, shared exam configuration, and trusted submission/violation records require a server with authentication and database-backed validation. This static version must not be used for high-stakes enforcement.
- Fullscreen cannot survive page navigation, so the Start button is on `exam.html` (after registration).
- Set the form to accept one response per person or collect emails if you need to match responses to students.

## Deploy to GitHub Pages
```bash
cd SmartExam
git init
git add .
git commit -m "Add SmartExam"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
Then on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main, folder / (root) → Save**. After a minute the site is at `https://<your-username>.github.io/<repo-name>/`. Share `.../index.html` with students.
