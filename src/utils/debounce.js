// ============================================================
// debounce - UTILITY FUNCTION
// ============================================================
// Prevents a function (commonly an API call) from being triggered
// on EVERY keystroke while the user is typing. Instead, it waits
// until the user STOPS typing for a specified delay before actually
// running the function. This is critical for performance — without
// it, a search box would fire an API request on every single letter
// typed, overwhelming the backend with unnecessary requests.

const debounce = (func, delay = 500) => {
  // This variable holds a reference to the current pending timer.
  // It's declared OUTSIDE the returned function so it persists
  // across multiple calls (thanks to closures in JavaScript).
  let timer;

  // The actual function that gets returned and used in place of
  // the original function. It accepts any number of arguments
  // via the rest parameter (...args), so it works with functions
  // that take any input (e.g. a search query string).
  return (...args) => {
    // Cancel any previously scheduled timer. This means if the user
    // types another letter before the delay finishes, the PREVIOUS
    // pending call gets cancelled and a fresh timer starts.
    clearTimeout(timer);

    // Start a brand new timer. Only if no further calls happen
    // within "delay" milliseconds will the function actually run.
    timer = setTimeout(() => {
      // Once the delay has passed without interruption, call the
      // original function with whatever arguments were last passed in
      func(...args);
    }, delay);
  };
};

// Exporting this function so it can wrap any function that
// shouldn't run too frequently, e.g.:
// const debouncedSearch = debounce((query) => fetchResults(query), 500);
// <input onChange={(e) => debouncedSearch(e.target.value)} />
export default debounce;
