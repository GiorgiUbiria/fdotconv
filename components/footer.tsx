import Link from 'next/link';

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 z-20 w-full border-t border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between p-4">
        <span className="text-sm text-gray-500 dark:text-gray-400 sm:text-center">
          © 2024{' '}
          <Link href="/" className="hover:underline">
            FDotConv
          </Link>
          . All Rights Reserved.
        </span>
        <ul className="flex flex-wrap items-center text-sm font-medium text-gray-500 dark:text-gray-400">
          <li>
            <Link
              href="/privacy-policy"
              className="me-4 hover:underline md:me-6"
            >
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link
              href="/terms-and-conditions"
              className="me-4 hover:underline md:me-6"
            >
              Terms & Conditions
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
