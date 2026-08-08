import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function source(path) {
  return readFile(new URL(path, new URL("../", import.meta.url)), "utf8");
}

test("login flow keeps page layout, UI and auth state in their owning layers", async () => {
  const [
    homePage,
    rootLayout,
    loginCodePage,
    loginEntry,
    githubAccountConfirmation,
    redeemForm,
    issueCard,
    redeemHook,
    issueHook,
    dashboardLoader,
    publicAuthLinks,
    authConstants,
    githubLoginRoute,
    githubConfirmRoute,
    logoutRoute,
  ] = await Promise.all([
    source("src/app/page.tsx"),
    source("src/app/layout.tsx"),
    source("src/app/login/code/page.tsx"),
    source("src/components/organisms/unauthenticated-home.tsx"),
    source("src/components/organisms/github-account-confirmation.tsx"),
    source("src/components/organisms/device-code-login-form.tsx"),
    source("src/components/organisms/one-time-login-code-card.tsx"),
    source("src/features/auth/hooks/use-login-code-redeem.ts"),
    source("src/features/auth/hooks/use-login-code-issue.ts"),
    source("src/features/dashboard/server/load-dashboard-page.ts"),
    source("src/features/auth/server/load-public-auth-links.ts"),
    source("src/features/auth/constants.ts"),
    source("src/app/api/auth/github/login/route.ts"),
    source("src/app/api/auth/github/confirm-account/route.ts"),
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

  assert.match(authConstants, /tasks_dash_github_account_pending/);
  assert.match(githubLoginRoute, /prompt/);
  assert.match(githubLoginRoute, /select_account/);
  assert.match(githubLoginRoute, /getSetCookie/);
  assert.match(githubLoginRoute, /GITHUB_ACCOUNT_CONFIRMATION_COOKIE/);
  assert.match(githubLoginRoute, /!request\.nextUrl\.searchParams\.has\("invite"\)/);

  assert.match(rootLayout, /GITHUB_ACCOUNT_CONFIRMATION_COOKIE/);
  assert.match(rootLayout, /requiresGithubAccountConfirmation/);
  assert.match(rootLayout, /GithubAccountConfirmation/);
  assert.match(
    rootLayout,
    /session && requiresGithubAccountConfirmation/,
    "a GitHub OAuth callback must be gated before the app shell renders",
  );

  assert.match(githubAccountConfirmation, /\/api\/auth\/github\/confirm-account/);
  assert.match(githubAccountConfirmation, /\/api\/auth\/logout/);
  assert.match(githubAccountConfirmation, /\/api\/auth\/github\/login\?switch=1/);
  assert.match(githubAccountConfirmation, /Chọn account khác/);
  assert.match(githubAccountConfirmation, /Tiếp tục với @/);

  assert.match(githubConfirmRoute, /GITHUB_ACCOUNT_CONFIRMATION_COOKIE/);
  assert.match(githubConfirmRoute, /maxAge:\s*0/);

  const revokeIndex = logoutRoute.indexOf('"/auth/github/revoke"');
  const localLogoutIndex = logoutRoute.indexOf('"/auth/logout"');
  assert.ok(revokeIndex >= 0, "logout must revoke the GitHub authorization grant");
  assert.ok(
    localLogoutIndex > revokeIndex,
    "GitHub grant must be revoked before the local session is cleared",
  );

  for (const cookieName of [
    "tasks_dash_session",
    "tasks_dash_oauth_state",
    "tasks_dash_invitation",
    "discord_username",
    "GITHUB_ACCOUNT_CONFIRMATION_COOKIE",
  ]) {
    assert.match(logoutRoute, new RegExp(cookieName));
  }
});
