// Local browser verification. Start Vite on 8080 and a disposable headless
// Chrome with --remote-debugging-port=9222 before running this script.
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const targets = await fetch("http://127.0.0.1:9222/json").then(r => r.json());
const target = targets.find(t => t.type === "page" && t.url === "about:blank") || targets.find(t => t.type === "page" && t.url.startsWith("http://127.0.0.1:8080"));
assert(target, "Open a disposable Chrome page first");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const waiting = new Map();
const errors = [];
const requests = [];
const networkFailures = [];
let metadata = {};
const user = () => ({ id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "preview@example.com", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: metadata, created_at: "2026-10-24T00:00:00Z" });
const profile = { id: user().id, first_name: "Preview", last_name: "Learner", user_mode: "student", degree: "Computer Science", academic_year: "2nd year", subscription_status: "expired" };
const jwt = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: user().id, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), role: "authenticated", aud: "authenticated" })).toString("base64url"), "preview-only"].join(".");
function send(method, params = {}) {
  return new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000); waiting.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params })); });
}
ws.addEventListener("message", async event => {
  const packet = JSON.parse(event.data);
  if (packet.id) { const pending = waiting.get(packet.id); if (pending) { clearTimeout(pending.timer); waiting.delete(packet.id); packet.error ? pending.reject(new Error(packet.error.message)) : pending.resolve(packet.result); } }
  if (packet.method === "Runtime.exceptionThrown") errors.push(packet.params.exceptionDetails.text + ": " + (packet.params.exceptionDetails.exception?.description || ""));
  if (packet.method === "Network.loadingFailed") networkFailures.push(packet.params);
  if (packet.method === "Fetch.requestPaused") {
    const { requestId, request } = packet.params;
    const url = new URL(request.url);
    requests.push({ path: url.pathname, method: request.method });
    let body = {};
    if (url.pathname.includes("/auth/v1/signup") || url.pathname.includes("/auth/v1/token")) body = { access_token: jwt, refresh_token: "preview-refresh-token", token_type: "bearer", expires_in: 3600, user: user() };
    else if (url.pathname.includes("/auth/v1/user")) {
      if (request.method === "PUT") metadata = { ...metadata, ...JSON.parse(request.postData || "{}").data };
      body = user();
    } else if (url.pathname.includes("/rest/v1/profiles")) {
      if (request.method === "PATCH") Object.assign(profile, JSON.parse(request.postData || "{}"));
      const accept = Object.entries(request.headers).find(([key]) => key.toLowerCase() === "accept")?.[1] || "";
      body = accept.includes("object") ? profile : [profile];
    } else body = [];
    await send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: "*" }, { name: "Access-Control-Allow-Headers", value: "*" }, { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" }], body: Buffer.from(JSON.stringify(body)).toString("base64") });
  }
});
const evaluate = async expression => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result?.value;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression) { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); } throw new Error(`Timed out: ${expression}`); }
async function click(text) { await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!button)throw Error('Missing button: '+${JSON.stringify(text)});button.click()})()`); await pause(150); }
async function input(selector, value) { await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw Error('Missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))})()`); }
async function choose(id, value) {
  await evaluate(`document.getElementById(${JSON.stringify(id)}).dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}))`);
  await until(`!![...document.querySelectorAll('[role=option]')].find(n=>n.textContent.trim()===${JSON.stringify(value)})`);
  await evaluate(`[...document.querySelectorAll('[role=option]')].find(n=>n.textContent.trim()===${JSON.stringify(value)}).click()`);
  await pause(120);
}
await mkdir(".preview/screenshots", { recursive: true });
async function screenshot(name) {
  await evaluate("document.fonts.ready");
  await until("[...document.images].every(i=>i.complete)");
  await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
  await pause(300);
  const broken = await evaluate("[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)");
  assert.deepEqual(broken, [], `Broken images on ${name}`);
  assert(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `Horizontal overflow on ${name}`);
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`.preview/screenshots/${name}.png`, Buffer.from(result.data, "base64"));
  console.log(`Verified ${name}`);
}
try {
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  // Intercept every backend endpoint: browser verification never creates a
  // real account or writes to the connected Supabase project.
  await send("Fetch.enable", { patterns: ["*/auth/v1/*", "*/rest/v1/*", "*/functions/v1/*"].map(urlPattern => ({ urlPattern, requestStage: "Request" })) });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "localStorage.clear();localStorage.setItem('cookie_consent_choice','rejected');localStorage.setItem('cookie_consent_analytics','false');" });
  await send("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  await send("Page.navigate", { url: "http://127.0.0.1:8080/onboarding" });
  await until("document.body.textContent.includes('Build Skills.')");
  await screenshot("01-welcome");
  await click("Get Started"); await screenshot("02-role");
  await click("Continue"); await screenshot("03a-student");
  await input('#onboarding-degree-course', 'Computer Science');
  await input('#onboarding-college-university', 'Test College');
  await choose('onboarding-current-year-of-study', '2nd year');
  await choose('onboarding-expected-graduation-year', '2028');
  await click('Continue'); await screenshot('04-authentication');
  await input('input[name=name]', 'Preview Learner');
  await input('input[name=email]', 'preview@example.com');
  await input('input[name=password]', 'preview-password-123');
  await click('Create Account');
  await until("document.body.textContent.includes(\"You're All Set!\")");
  assert.equal(metadata.onboarding?.institution, 'Test College');
  await screenshot('05-completion');
  await evaluate("history.pushState({},'', '/profile');dispatchEvent(new PopStateEvent('popstate'))");
  await until("document.body.textContent.includes('Profile & Settings')");
  await screenshot('06-profile');
  await click('Edit Profile');
  await until("!!document.querySelector('input[value=\"Test College\"]')");
  await evaluate("document.querySelector('button.absolute.top-4.right-4')?.click()");
  await click('Change PasswordUpdate your password');
  await input('input[aria-label="New password"]', 'new-preview-password');
  await input('input[aria-label="Confirm password"]', 'different-password');
  await click('Update password');
  assert(await evaluate("document.body.textContent.includes('Your passwords do not match.')"));
  await input('input[aria-label="Confirm password"]', 'new-preview-password');
  await click('Update password');
  await until("!document.querySelector('[role=dialog]')");
  await click('NotificationsManage your notifications');
  await until("!!document.getElementById('remindersEnabled')");
  await evaluate("document.getElementById('remindersEnabled').click()");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('skillful_notification_settings')).remindersEnabled"), false);
  await evaluate("document.querySelector('[role=dialog] button.absolute.right-4.top-4')?.click()");
  await evaluate("history.pushState({},'', '/onboarding');dispatchEvent(new PopStateEvent('popstate'))");
  await until("document.body.textContent.includes('Build Skills.')");
  await click('Get Started');
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes(\"I'm a Professional\")).click()");
  await click('Continue'); await screenshot('03b-professional');
  for (const [width, height] of [[320,640],[390,844],[768,1024],[1440,900]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await screenshot(`responsive-${width}`);
  }
  await input('#onboarding-current-job-title', 'Software Developer');
  await choose('onboarding-industry', 'Technology');
  await choose('onboarding-work-experience', '1–3 years');
  await input('#onboarding-career-goal', 'Grow into a leadership role');
  await click('Continue');
  await until("document.body.textContent.includes(\"You're All Set!\")");
  assert.equal(metadata.onboarding?.jobTitle, 'Software Developer');
  assert.equal(metadata.onboarding?.mode, 'professional');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('All seven screens, local signup persistence, profile editing, assets and responsive widths verified.');
  await writeFile('.preview/browser-results.json', JSON.stringify({ screenshots: 11, errors, backendRequestsIntercepted: requests.length }, null, 2));
} finally { await writeFile('.preview/browser-debug.json', JSON.stringify({ requests, errors, networkFailures }, null, 2)); ws.close(); }
