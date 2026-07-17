import { Buffer } from "node:buffer";

const bearerTokenMaxLength = 8192;

export type MobileAuthErrorCode =
  | "MOBILE_AUTH_MISSING_TOKEN"
  | "MOBILE_AUTH_INVALID_FORMAT"
  | "MOBILE_AUTH_INVALID_TOKEN"
  | "MOBILE_AUTH_EXPIRED_TOKEN"
  | "MOBILE_AUTH_EMAIL_UNVERIFIED"
  | "MOBILE_AUTH_ACCOUNT_SUSPENDED"
  | "MOBILE_AUTH_ACCOUNT_UNAVAILABLE"
  | "MOBILE_AUTH_CONFIGURATION_ERROR"
  | "MOBILE_AUTH_BACKEND_UNAVAILABLE"
  | "MOBILE_AUTH_PROVISIONING_FAILED"
  | "MOBILE_AUTH_INTERNAL_ERROR";

type MobileAuthErrorDefinition = {
  status: number;
  message: string;
};

const mobileAuthErrors = {
  MOBILE_AUTH_MISSING_TOKEN: {
    status: 401,
    message: "Oturum bilgisi eksik. Lütfen tekrar giriş yapın.",
  },
  MOBILE_AUTH_INVALID_FORMAT: {
    status: 401,
    message: "Oturum bilgisi geçerli değil. Lütfen tekrar giriş yapın.",
  },
  MOBILE_AUTH_INVALID_TOKEN: {
    status: 401,
    message: "Oturum doğrulanamadı. Lütfen tekrar giriş yapın.",
  },
  MOBILE_AUTH_EXPIRED_TOKEN: {
    status: 401,
    message: "Oturum süreniz doldu. Lütfen tekrar giriş yapın.",
  },
  MOBILE_AUTH_EMAIL_UNVERIFIED: {
    status: 403,
    message: "Devam etmek için e-posta adresinizi doğrulamanız gerekir.",
  },
  MOBILE_AUTH_ACCOUNT_SUSPENDED: {
    status: 403,
    message: "Üyelik hesabınız şu anda bu işlem için uygun değil.",
  },
  MOBILE_AUTH_ACCOUNT_UNAVAILABLE: {
    status: 403,
    message: "Üyelik hesabınız bu işlem için uygun değil.",
  },
  MOBILE_AUTH_CONFIGURATION_ERROR: {
    status: 503,
    message: "Üyelik girişi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
  },
  MOBILE_AUTH_BACKEND_UNAVAILABLE: {
    status: 503,
    message: "Üyelik girişi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
  },
  MOBILE_AUTH_PROVISIONING_FAILED: {
    status: 500,
    message: "Üyelik hesabınız hazırlanamadı. Lütfen daha sonra tekrar deneyin.",
  },
  MOBILE_AUTH_INTERNAL_ERROR: {
    status: 500,
    message: "İstek şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin.",
  },
} satisfies Record<MobileAuthErrorCode, MobileAuthErrorDefinition>;

export class MobileAuthError extends Error {
  readonly status: number;

  constructor(readonly code: MobileAuthErrorCode, message?: string) {
    const definition = mobileAuthErrors[code];
    super(message ?? definition.message);
    this.name = "MobileAuthError";
    this.status = definition.status;
  }
}

export function getBearerTokenFromAuthorizationHeader(authorization: string | null) {
  if (!authorization?.trim()) {
    throw new MobileAuthError("MOBILE_AUTH_MISSING_TOKEN");
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token ||
    extra ||
    token.length > bearerTokenMaxLength
  ) {
    throw new MobileAuthError("MOBILE_AUTH_INVALID_FORMAT");
  }

  return token;
}

export function isAccessTokenExpired(accessToken: string, nowMs = Date.now()) {
  const payload = parseJwtPayload(accessToken);
  const exp = payload?.exp;

  return typeof exp === "number" && exp * 1000 <= nowMs;
}

export function mobileAuthErrorEnvelope(error: MobileAuthError) {
  const definition = mobileAuthErrors[error.code];

  return {
    error: {
      code: error.code,
      message: definition.message,
    },
  };
}

function parseJwtPayload(accessToken: string) {
  const [, payload] = accessToken.split(".");

  if (!payload) {
    return null;
  }

  try {
    const json = Buffer.from(base64UrlToBase64(payload), "base64").toString("utf8");
    const parsed = JSON.parse(json);

    return parsed && typeof parsed === "object" ? (parsed as { exp?: unknown }) : null;
  } catch {
    return null;
  }
}

function base64UrlToBase64(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;

  return padding ? `${base64}${"=".repeat(4 - padding)}` : base64;
}
