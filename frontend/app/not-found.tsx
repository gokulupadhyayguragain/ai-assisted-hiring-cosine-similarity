import Link from "next/link";
import { Brain } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-light via-white to-red-light/30 p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue to-red text-white shadow-lg">
            <Brain className="h-8 w-8" />
          </span>
        </div>
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="text-xl font-semibold text-gray-700 mt-2">Page not found</p>
        <p className="text-sm text-gray-500 mt-2">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Link href="/" className="primary-btn">Go Home</Link>
          <Link href="/login" className="ghost-btn text-sm">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
