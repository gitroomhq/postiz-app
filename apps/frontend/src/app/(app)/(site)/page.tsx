export default function RootPage() {
  // This page will never actually render because middleware
  // redirects to /launches or /analytics before it can load
  // But having it here prevents Next.js from showing 404
  return null;
}
