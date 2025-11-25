"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function DiagnosticUploadPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        file: null as File | null,
        patientId: "",
        title: "",
        description: "",
        testType: "lab_report"
    });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "diagnostic") router.push("/");
    }, [status, session, router]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadForm.file) {
            toast.error("Please select a file");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", uploadForm.file);
            formData.append("diagnosticId", session?.user?.providerId || "");
            formData.append("patientId", uploadForm.patientId);
            formData.append("title", uploadForm.title);
            formData.append("description", uploadForm.description);
            formData.append("testType", uploadForm.testType);

            const res = await fetch(`${backendUrl}/api/diagnostic/upload-result`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Test result uploaded successfully!");
                setUploadForm({ file: null, patientId: "", title: "", description: "", testType: "lab_report" });
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error("Upload failed. Check backend connection.");
        } finally {
            setUploading(false);
        }
    };

    if (status === "loading") {
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
                    <Link href="/diagnostic/upload" className="flex items-center px-6 py-3 bg-gray-100 text-gray-900 border-r-4 border-cyan-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="ml-3">Upload Results</span>
                    </Link>
                    <Link href="/diagnostic/my-uploads" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100">
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
                        <h2 className="text-3xl font-bold text-gray-900">Upload Test Result</h2>
                        <p className="text-gray-600 mt-1">Upload diagnostic test results for patients</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <form onSubmit={handleUpload} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Patient ID</label>
                                <input
                                    type="text"
                                    value={uploadForm.patientId}
                                    onChange={(e) => setUploadForm({ ...uploadForm, patientId: e.target.value })}
                                    required
                                    placeholder="e.g., PAT-1234567890-ABC123DEF"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={uploadForm.title}
                                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                    required
                                    placeholder="e.g., Blood Test Results - Nov 2024"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                                <select
                                    value={uploadForm.testType}
                                    onChange={(e) => setUploadForm({ ...uploadForm, testType: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                >
                                    <option value="lab_report">Lab Report</option>
                                    <option value="imaging">Imaging (X-ray, MRI, CT)</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={uploadForm.description}
                                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                    required
                                    placeholder="Brief description of the test result"
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                                <input
                                    type="file"
                                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                                    required
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                />
                                <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, JPG, PNG</p>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full px-6 py-3 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                            >
                                {uploading ? "Uploading..." : "Upload Test Result"}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
