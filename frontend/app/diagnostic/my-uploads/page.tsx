"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function DiagnosticMyUploadsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [uploads, setUploads] = useState([]);
    const [loading, setLoading] = useState(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "diagnostic") router.push("/");
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.providerId) {
            fetchUploads();
        }
    }, [session]);

    const fetchUploads = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${backendUrl}/api/diagnostic/my-uploads/${session?.user?.providerId}`);
            const data = await res.json();

            if (data.success) {
                setUploads(data.records || []);
            }
        } catch (error) {
            console.error("Failed to fetch uploads:", error);
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "diagnostic") return null;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white h-screen shadow-md flex flex-col fixed">
                <div className="p-6 border-b">
                    <div className="flex items-center">
                        <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div className="ml-3">
                            <h1 className="text-lg font-bold text-gray-900">MediChain</h1>
                            <p className="text-xs text-gray-600">Diagnostic Portal</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 mt-6">
                    <Link href="/diagnostic" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="ml-3">Dashboard</span>
                    </Link>
                    <Link href="/diagnostic/upload" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="ml-3">Upload Results</span>
                    </Link>
                    <Link href="/diagnostic/my-uploads" className="flex items-center px-6 py-3 bg-gray-100 text-gray-900 border-r-4 border-cyan-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="ml-3">My Uploads</span>
                    </Link>
                    <Link href="/diagnostic/requests" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="ml-3">Request Access</span>
                    </Link>
                    <Link href="/diagnostic/activity" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="ml-3">Activity Log</span>
                    </Link>
                </nav>

                <div className="p-6 border-t">
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                        <p className="text-xs text-gray-600">{session.user.email}</p>
                        <p className="text-xs text-cyan-600 font-mono mt-1">{session.user.providerId}</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">My Uploads</h2>
                        <p className="text-gray-600 mt-1">All test results you've uploaded for patients</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        {uploads.length === 0 ? (
                            <div className="text-center py-16">
                                <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">No uploads yet</h4>
                                <p className="text-gray-600">Upload test results to see them here</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {uploads.map((record: any) => (
                                    <div key={record.id} className="border border-gray-200 rounded-lg p-5">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="text-lg font-semibold text-gray-900">{record.title}</h4>
                                                        <p className="text-base text-gray-600 mt-1">{record.description}</p>
                                                    </div>
                                                </div>

                                                <hr className="border-gray-100 mb-4" />

                                                <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2" title="Record Type">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span className="capitalize bg-gray-50 px-2 py-0.5 rounded text-gray-700 border border-gray-200">{record.type?.replace('_', ' ')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2" title="Patient ID">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        <span className="font-mono text-xs text-gray-500">{record.patientId}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2" title="File Name">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                        </svg>
                                                        <span className="font-mono text-xs text-gray-500 truncate max-w-[150px]">{record.fileName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2" title="Date">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
