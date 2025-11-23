import Link from "next/link";
import { signOut } from "next-auth/react";

interface PatientSidebarProps {
    currentPath: string;
    userName: string;
    userEmail: string;
    patientId: string;
}

export default function PatientSidebar({ currentPath, userName, userEmail, patientId }: PatientSidebarProps) {
    const isActive = (href: string) => {
        if (href === "/patient") {
            return currentPath === "/patient";
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
                        <p className="text-xs text-gray-600">Patient Portal</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 mt-6">
                <Link
                    href="/patient"
                    className={`flex items-center px-6 py-3 ${isActive("/patient") && currentPath === "/patient"
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
                    href="/patient/records"
                    className={`flex items-center px-6 py-3 ${isActive("/patient/records")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="ml-3">Medical Records</span>
                </Link>

                <Link
                    href="/patient/access"
                    className={`flex items-center px-6 py-3 ${isActive("/patient/access")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="ml-3">Access Control</span>
                </Link>

                <Link
                    href="/patient/requests"
                    className={`flex items-center px-6 py-3 ${isActive("/patient/requests")
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
                    href="/patient/ai"
                    className={`flex items-center px-6 py-3 ${isActive("/patient/ai")
                            ? "bg-gray-100 text-gray-900 border-r-4 border-cyan-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="ml-3">AI Assistant</span>
                </Link>

                <Link
                    href="/patient/activity"
                    className={`flex items-center px-6 py-3 ${isActive("/patient/activity")
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
                    <p className="text-xs text-cyan-600 font-mono mt-1">{patientId}</p>
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
