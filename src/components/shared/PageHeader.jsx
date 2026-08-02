// Reusable page header — every admin screen (Dashboard, Orders, Products,
// Sales Report, Revenue Report...) renders the same gradient icon + title
// row using this one component, so any fix here fixes every page at once.
const PageHeader = ({ icon, title, actions = null }) => {
  // icon    -> a react-icon element passed in by the calling page
  // title   -> the page heading text, e.g. "Revenue Report"
  // actions -> optional extra JSX (date pickers, buttons, chips) shown
  //            on the right side of the header row

  return (
    // Outer row: icon+title on the left, actions on the right.
    // "flex-wrap" lets the actions block drop to its own line below the
    // title when there isn't enough horizontal room (small phone screens).
    <div className="flex items-center justify-between gap-3 flex-wrap">
      {/* Left side: gradient icon badge + title, grouped together */}
      <div className="flex items-center gap-3">
        {/* Gradient circular icon badge — identical classes to the
            customer-facing "Submit a Complaint" header so the brand look is
            consistent between the customer site and the admin panel. */}
        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
          {/* shrink-0 -> the icon badge never gets squeezed, even if the
              title text next to it is long */}

          {/* The icon itself — passed in via props so each admin page can
              use whichever react-icons icon fits that page (e.g. orders
              cart icon, products box icon, etc.). Always rendered white so
              it pops against the emerald gradient background. */}
          <span className="text-white w-7 h-7 flex items-center justify-center text-lg [&>svg]:w-7 [&>svg]:h-7">
            {icon}
            {/* [&>svg]:w-7 [&>svg]:h-7 -> forces whatever svg icon is
                passed in to render at exactly 28px, regardless of the
                icon library's own default size */}
          </span>
        </div>

        {/* Page title only — no subtitle/description line under it,
            intentionally, per the requirement to skip the helper text shown
            in the reference image. */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {title}
          {/* text-2xl on mobile, text-3xl from the sm breakpoint up ->
              slightly smaller heading on narrow phone screens so it
              doesn't crowd the icon badge next to it */}
        </h1>
      </div>

      {/* Right side: optional action buttons/filters for pages that need
          them (e.g. date pickers + export button + quick-range chips on
          Sales/Revenue Report). Renders nothing when the calling page
          doesn't pass this prop, so it stays fully backward compatible
          with pages that only need a title. */}
      {actions && (
        // ============================================================
        // FIX: this wrapper div used to be just `flex items-center
        // gap-2` with NO width classes of its own. Because it had no
        // width, the browser sized it to "shrink-to-fit" its content.
        // But the actions JSX passed in from SalesReport/RevenueReport
        // has its own inner div set to `w-full` (meant to be "100% of
        // my parent"), and its parent (THIS div) had no real width to
        // give it — so on mobile the whole date-picker block never
        // actually stretched to the true available screen width and
        // ended up looking broken / not responsive.
        //
        // Adding `w-full sm:w-auto` here means: on mobile this wrapper
        // takes the FULL width of the row it wraps onto (so the date
        // inputs inside can correctly compute their own 100% width),
        // and from the `sm` breakpoint up it shrinks back to just the
        // width its content actually needs, sitting neatly on the
        // right side of the title like before.
        // `min-w-0` stops it from ever forcing the page wider than the
        // screen (a common flexbox overflow trap).
        // ============================================================
        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
          {actions}
          {/* renders whatever the calling page passed in — date
              pickers, export button, quick-range chips, etc. */}
        </div>
      )}
    </div>
  );
};

// Export as default so every admin page can import it the same way.
export default PageHeader;
