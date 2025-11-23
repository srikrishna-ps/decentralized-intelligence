import Link from "next/link";
import { signOut } from "next-auth/react";

interface AdminSidebarProps {
    currentPath: string;
    userName: string;
    userEmail: string;
    adminId: string;
}

export default function AdminSidebar({ currentPath, userName, userEmail, adminId }: AdminSidebarProps) {
    const isActive = (href: string) => {
        if (href === "/admin") {
            return currentPath === "/admin";
        }
        return currentPath.startsWith(href);
    };

    return (
        <aside className="w-64 bg-white h-screen shadow-md flex flex-col fixed">
            <div className="p-6 border-b">
                <div className="flex items-center">
                    <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div className="ml-3">
                        <h1 className="text-lg font-bold text-gray-900">MediChain</h1>
                        <p className="text-xs text-gray-600">Admin Portal</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 mt-6">
                <Link
                    href="/admin"
                    className={`flex items-center px-6 py-3 ${isActive("/admin") && currentPath === "/admin"
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="ml-3">Dashboard</span>
                </Link>

                <Link
                    href="/admin/users"
                    className={`flex items-center px-6 py-3 ${isActive("/admin/users")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="ml-3">User Management</span>
                </Link>

                <Link
                    href="/admin/records"
                    className={`flex items-center px-6 py-3 ${isActive("/admin/records")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="ml-3">Records Overview</span>
                </Link>

                <Link
                    href="/admin/activity"
                    className={`flex items-center px-6 py-3 ${isActive("/admin/activity")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="ml-3">Audit Trail</span>
                </Link>
            </nav>

            <div className="p-6 border-t">
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-600">{userEmail}</p>
                    <p className="text-xs text-cyan-600 font-mono mt-1">{adminId}</p>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}
