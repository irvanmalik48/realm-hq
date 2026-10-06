export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{ viewTransitionName: "site-footer" }}
      className="mt-auto border-t border-border/60 px-3 py-4 sm:px-4 md:px-6 lg:px-8 text-center text-xs text-muted-foreground"
    >
      <p>&copy; {currentYear} Realm. All rights reserved.</p>
    </footer>
  );
}
