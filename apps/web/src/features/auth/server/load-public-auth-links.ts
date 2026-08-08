import "server-only";

export interface PublicAuthLinks {
  loginUrl: string;
  deviceLoginHref: string;
}

export function loadPublicAuthLinks(): PublicAuthLinks {
  return {
    // Keep browser OAuth on the web origin so logout/login behavior and auth
    // cookies are handled consistently even when a public API base URL exists.
    loginUrl: "/api/auth/github/login",
    deviceLoginHref: "/login/code",
  };
}
