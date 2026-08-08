import "server-only";

export interface PublicAuthLinks {
  loginUrl: string;
  deviceLoginHref: string;
}

export function loadPublicAuthLinks(): PublicAuthLinks {
  const browserApi =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.TASKS_DASH_API_BASE_URL ||
    "/api";

  return {
    loginUrl: `${browserApi.replace(/\/$/, "")}/auth/github/login`,
    deviceLoginHref: "/login/code",
  };
}
