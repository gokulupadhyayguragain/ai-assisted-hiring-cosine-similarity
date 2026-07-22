"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@/lib/auth";

type Props = {
  children: ReactNode;
  roles?: UserRole[];
  fallback?: ReactNode;
};

export function ProtectedRoute({ children, roles, fallback }: Props) {
  const router = useRouter();
  const { user, loading, initialized, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue" />
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (fallback) return <>{fallback}</>;
    // Simple redirect — using useEffect to avoid render-time redirect issues
    return <AuthRedirect />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center max-w-md">
          <div className="rounded-full bg-amber-50 h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-2">
            You don&apos;t have permission to view this page. Your current role is &ldquo;{user.role}&rdquo;.
          </p>
          <button
            onClick={() => router.push(user.role === "admin" ? "/admin" : user.role === "recruiter" ? "/hr" : "/candidate")}
            className="primary-btn mt-4"
          >
            Go to my workspace
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue" />
        <p className="text-sm text-gray-500">Redirecting to login...</p>
      </div>
    </div>
  );
}
