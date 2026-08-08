import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function source(path) {
  return readFile(new URL(path, new URL("../", import.meta.url)), "utf8");
}

test("login flow keeps page layout, UI and auth state in their owning layers", async () => {
  const [
    homePage,
    loginCodePage,
    loginEntry,
    redeemForm,
    issueCard,
    redeemHook,
    issueHook,
    dashboardLoader,
    publicAuthLinks,
    githubLoginRoute,
    logoutRoute,
  ] = await Promise.all([
    source("src/app/page.tsx"),
    source("src/app/login/code/page.tsx"),
    source("src/components/organisms/unauthenticated-home.tsx"),
    source("src/components/organisms/device-code-login-form.tsx"),
    source("src/components/organisms/one-time-login-code-card.tsx"),
    source("src/features/auth/hooks/use-login-code-redeem.ts"),
    source("src/features/auth/hooks/use-login-code-issue.ts"),
    source("src/features/dashboard/server/load-dashboard-page.ts"),
    source("src/features/auth/server/load-public-auth-links.ts"),
    source("src/app/api/auth/github/login/route.ts"),
    source("src/app/api/auth/logout/route.ts"),
  ]);

  assert.match(homePage, /components\/templates\/public-page-shell/);
  assert.match(homePage, /components\/organisms\/unauthenticated-home/);
  assert.equal(loginEntry.includes("PublicPageShell"), false);

  assert.match(loginCodePage, /AuthSplitPage/);
  assert.match(loginCodePage, /LoginCodeIntro/);
  assert.match(loginCodePage, /DeviceCodeLoginForm/);
  assert.equal(redeemForm.includes("PublicPageShell"), false);
  assert.match(redeemForm, /useLoginCodeRedeem/);
  assert.match(issueCard, /useLoginCodeIssue/);

  assert.match(redeemHook, /LOGIN_CODE_REDEEM_ENDPOINT/);
  assert.match(redeemHook, /apiRequest/);
  assert.match(issueHook, /LOGIN_CODE_ISSUE_ENDPOINT/);
  assert.match(issueHook, /apiRequest/);

  assert.match(dashboardLoader, /loadPublicAuthLinks/);
  assert.equal(dashboardLoader.includes("auth\/github\/login"), false);
  assert.match(publicAuthLinks, /loginUrl:\s*"\/api\/auth\/github\/login"/);

  assert.match(githubLoginRoute, /prompt/);
  assert.match(githubLoginRoute, /select_account/);
  assert.match(githubLoginRoute, /getSetCookie/);

  for (const cookieName of [
    "tasks_dash_session",
    "tasks_dash_oauth_state",
    "tasks_dash_invitation",
    "discord_username",
  ]) {
    assert.match(logoutRoute, new RegExp(cookieName));
  }
});
