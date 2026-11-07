"use client";

// Only ever rendered inside the app, once signed in - calls into the main
// process (via the preload bridge declared in AppSignInLink.tsx), which
// clears the saved session and navigates this window back to the
// signed-out homepage itself. Nothing for this component to do after
// triggering it.
export default function AppSignOutButton({ className }: { className?: string }) {
  async function handleClick() {
    await window.spkApp?.logout();
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      Sign out
    </button>
  );
}
