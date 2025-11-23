import Link from "next/link";
import { signOut } from "next-auth/react";

interface InsurerSidebarProps {
    currentPath: string;
    userName: string;
    userEmail: string;
    insurerId: string;
}

export default function InsurerSidebar({ currentPath, userName, userEmail, insurerId }: InsurerSidebarProps) {
    const isActive = (href: string) => {
        if (href === "/insurer") {
            return currentPath === "/insurer";
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
                        <p className="text-xs text-gray-600">Insurer Portal</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 mt-6">
                <Link
                    href="/insurer"
                    className={`flex items-center px-6 py-3 ${isActive("/insurer") && currentPath === "/insurer"
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
                    href="/insurer/requests"
                    className={`flex items-center px-6 py-3 ${isActive("/insurer/requests")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="ml-3">Access Requests</span>
                </Link>

                <Link
                    href="/insurer/records"
                    className={`flex items-center px-6 py-3 ${isActive("/insurer/records")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="ml-3">Patient Records</span>
                </Link>

                <Link
                    href="/insurer/claims"
                    className={`flex items-center px-6 py-3 ${isActive("/insurer/claims")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span className="ml-3">Claims</span>
                </Link>

                <Link
                    href="/insurer/activity"
                    className={`flex items-center px-6 py-3 ${isActive("/insurer/activity")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="ml-3">Activity Log</span>
                </Link>
            </nav>

            <div className="p-6 border-t">
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-600">{userEmail}</p>
                    <p className="text-xs text-cyan-600 font-mono mt-1">{insurerId}</p>
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
