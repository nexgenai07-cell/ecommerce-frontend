import { createContext, useContext } from "react";
// createContext — creates the Context object itself
// useContext    — the hook that lets any component read the current value

// Created with a default of `null` — this forces any component that calls
// useFlyToIcon() outside of <FlyToIconProvider> to fail loudly instead of
// silently doing nothing.
const FlyToIconContext = createContext(null);

const useFlyToIcon = () => {
  const context = useContext(FlyToIconContext);

  if (!context) {
    throw new Error(
      "useFlyToIcon must be used within a <FlyToIconProvider>. " +
        "Make sure FlyToIconProvider wraps the app in App.jsx.",
    );
  }

  return context;
};

export { FlyToIconContext };
export default useFlyToIcon;
