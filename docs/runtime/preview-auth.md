# Preview authentication

Stage itself has no signup or account. This document applies only when AR2 opens ClubHall to capture
an authenticated in-app screen; it must remove manual signup without weakening ClubHall production auth.

The ClubHall pilot uses Better Auth anonymous sessions on a dedicated preview Convex deployment. When `EXPO_PUBLIC_STAGE_MODE=stage`, the client silently signs in anonymously, bootstraps the normal ClubHall identity, seeds deterministic tennis fixtures, and enters the requested Stage route.

## Safety boundary

- Stage mode is accepted only when the build/update environment is `preview` or the app is running in development.
- Production builds ignore all Stage route, scenario, and auth flags.
- No reusable credential is shipped through `EXPO_PUBLIC_*` variables.
- Anonymous users use preview data and preview Convex only.
- Existing authenticated Convex queries continue to receive a real identity.

Do not implement preview mode by returning `isAuthenticated: true` from the session provider. That creates a fake client state while Convex still receives no token.
