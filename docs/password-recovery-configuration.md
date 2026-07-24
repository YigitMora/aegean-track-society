# Password recovery configuration

The recovery email must use a token-hash link rather than `{{ .ConfirmationURL }}`.
That keeps the web recovery flow independent from the browser that started the
request and lets the native client verify the recovery token itself.

## Supabase recovery email template

Set the recovery email link to this exact form:

```html
<a href="{{ .RedirectTo }}#token_hash={{ .TokenHash }}&amp;type=recovery">
  Şifrenizi yenileyin
</a>
```

`{{ .RedirectTo }}` must be preserved. Both web and native recovery requests
use `https://www.aegeantracksociety.com/auth/mobile-recovery`. On iOS, the
matching Universal Link opens the native app; a browser without the app shows
a page that requires an explicit user action before verification.

## Redirect URL allowlist

Configure both of these production redirect URLs in Supabase Auth:

```text
https://www.aegeantracksociety.com/auth/confirm
https://www.aegeantracksociety.com/auth/mobile-recovery
```

Do not use temporary Metro, LAN, preview, or custom-scheme URLs in the
production allowlist.

## Security properties

- `token_hash` remains in the URL fragment so it is not sent in the HTTPS
  request, including platform access logs and passive link scanner requests.
- `token_hash` is verified only by the receiving client with recovery scope.
- The native app verifies the hash locally before allowing `updateUser({ password })`.
- `/auth/mobile-recovery` has no server-side verification. Its browser
  fallback verifies only after an explicit user click and removes the fragment
  from the address bar before the password form is shown.
- The email template must not substitute `{{ .SiteURL }}` for
  `{{ .RedirectTo }}`.
- Do not log recovery URLs, hashes, codes, sessions, cookies, emails, or
  passwords.
