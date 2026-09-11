# LMS portal archive

The former `/portal`, `/portal/login`, `/portal/calendar`, and
`/portal/courses` pages are stored under `app/portal/` in this archive. The
event LMS bridge redirect is stored under `app/admin/events/[id]/lms-bridge/`.

These files intentionally live outside `src/app`, so Next.js does not compile
or publish them as routes. They depended on archived LMS endpoints such as
`/api/public/my-courses`, `/api/public/courses/{id}/calendar`, and
`/api/public/orgs/{org}/lms-branding`.

The active MCP server also intentionally omits LMS tools. If the LMS is ever
restored, restore the backend routers first, then move these routes back under
`src/app` and add protocol tests for the MCP tools before advertising them.
