# Password recovery configuration

The recovery email must use a token-hash link rather than `{{ .ConfirmationURL }}`.
That keeps the web recovery flow independent from the browser that started the
request and lets the native client verify the recovery token itself.

## Supabase recovery email template

Set the recovery email link to this exact form:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">
  Şifrenizi yenileyin
</a>
```

`{{ .RedirectTo }}` must be preserved. The web client supplies the canonical
`https://www.aegeantracksociety.com/auth/confirm` route, while the native
client supplies `aegeantracksociety://update-password`.

## Redirect URL allowlist

Configure both of these production redirect URLs in Supabase Auth:

```text
https://www.aegeantracksociety.com/auth/confirm
aegeantracksociety://update-password
```

The native scheme may be represented by the equivalent documented wildcard
entry `aegeantracksociety://**`. Do not use temporary Metro, LAN, or preview
URLs in the production allowlist.

## Security properties

- `token_hash` is verified by the receiving client with recovery scope.
- Web recovery verifies through `/auth/confirm`; the native app verifies the
  hash locally before allowing `updateUser({ password })`.
- The email template must not substitute `{{ .SiteURL }}` for
  `{{ .RedirectTo }}`.
- Do not log recovery URLs, hashes, codes, sessions, cookies, emails, or
  passwords.
