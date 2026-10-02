// Query options that keep every audit log view current without a manual
// page refresh.
//
// The application-wide defaults treat data as fresh for several minutes and
// never refetch on window focus. That suits product and category data, but an
// audit trail is written by the server whenever any admin, the AI assistant
// or an automated process does something, so a cached copy goes out of date
// quickly. These options make an audit view:
// - load the latest entries every time it is opened,
// - reload when the browser tab regains focus.
export const AUDIT_LOG_REFRESH_OPTIONS = {
  staleTime: 0,
  refetchOnMount: "always",
  refetchOnWindowFocus: true,
};
