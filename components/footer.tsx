import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 fixed bottom-0 left-0 w-full z-20 border-t border-gray-200 dark:border-gray-600">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">
          © 2024{" "}
          <Link href="/" className="hover:underline">
            FDotConv
          </Link>
          . All Rights Reserved.
        </span>
        <ul className="flex flex-wrap items-center text-sm font-medium text-gray-500 dark:text-gray-400">
          <li>
            <Link href="/privacy-policy" className="hover:underline me-4 md:me-6">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="/terms-and-conditions" className="hover:underline me-4 md:me-6">
              Terms & Conditions
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
