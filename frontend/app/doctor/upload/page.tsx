"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import DoctorSidebar from "@/components/sidebars/DoctorSidebar";

export default function DoctorUploadPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [uploading, setUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        file: null as File | null,
        patientId: "",
        title: "",
        description: ""
    });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "doctor") router.push("/");
    }, [status, session, router]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadForm.file) {
            alert("Please select a file");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", uploadForm.file);
            formData.append("doctorId", session?.user?.providerId || "");
            formData.append("patientId", uploadForm.patientId);
            formData.append("title", uploadForm.title);
            formData.append("description", uploadForm.description);

            const res = await fetch(`${backendUrl}/api/doctor/upload-note`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                alert("Clinical note uploaded successfully!");
                setUploadForm({ file: null, patientId: "", title: "", description: "" });
            } else {
                alert(data.error || "Upload failed");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Upload failed. Check backend connection.");
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

    if (!session || session.user.role !== "doctor") return null;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <DoctorSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                providerId={session.user.providerId || ""}
            />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Upload Clinical Notes</h2>
                        <p className="text-gray-600 mt-1">Securely upload and share clinical notes with patients.</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <form onSubmit={handleUpload} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Patient ID</label>
                                    <input
                                        type="text"
                                        value={uploadForm.patientId}
                                        onChange={(e) => setUploadForm({ ...uploadForm, patientId: e.target.value })}
                                        required
                                        placeholder="Enter Patient ID (e.g., PAT-123...)"
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
                                        placeholder="e.g., Consultation Notes - Nov 2024"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={uploadForm.description}
                                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                    required
                                    placeholder="Detailed clinical notes..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">File (Optional)</label>
                                <input
                                    type="file"
                                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                                />
                                <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, JPG, PNG, DOC, DOCX</p>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Uploading...
                                    </>
                                ) : (
                                    "Upload Note"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
