"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import DoctorSidebar from "@/components/sidebars/DoctorSidebar";
import api from "@/lib/api";

export default function DoctorPatientsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [patientId, setPatientId] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchResult, setSearchResult] = useState<any>(null);
    const [accessGranted, setAccessGranted] = useState(false);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "doctor") router.push("/");
    }, [status, session, router]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSearchResult(null);
        setAccessGranted(false);

        try {
            // First, try to fetch patient details (assuming a public or basic info endpoint exists, 
            // or using the records endpoint which might fail if no access)
            // Since we don't have a dedicated "get patient info" endpoint that is public, 
            // we'll try to fetch grants to see if the patient exists and if we have access.

            // Actually, we should check if the patient exists first. 
            // But given the current API structure, let's try to fetch access grants for this patient.
            // If we can fetch grants, the patient exists.

            const res = await fetch(`${backendUrl}/api/patient/access-grants/${patientId}`);
            const data = await res.json();

            if (data.success) {
                // Patient exists (at least we got a response)
                // Check if we have access
                const hasAccess = data.grants.some((grant: any) =>
                    grant.providerId === session?.user?.providerId && grant.status === 'active'
                );

                setAccessGranted(hasAccess);
                setSearchResult({ id: patientId, name: "Patient Found" }); // Placeholder name as we might not get it
            } else {
                alert("Patient not found or invalid ID");
            }

        } catch (error: any) {
            console.error("Search error:", error);
            alert("Error searching for patient");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestAccess = async () => {
        try {
            await api.post("/api/doctor/request-access", {
                doctorId: session?.user?.providerId,
                patientId,
                reason: "Medical consultation",
            });
            alert("Access request sent successfully!");
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to request access");
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
                        <h2 className="text-3xl font-bold text-gray-900">My Patients</h2>
                        <p className="text-gray-600 mt-1">Search and manage patient records.</p>
                    </div>

                    {/* Search Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8 max-w-2xl">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">Find a Patient</h3>
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <input
                                type="text"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                required
                                placeholder="Enter Patient ID (e.g., PAT-...)"
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                )}
                                Search
                            </button>
                        </form>
                    </div>

                    {/* Search Result */}
                    {searchResult && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl animate-fade-in">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">Patient Found</h3>
                                    <p className="text-gray-600 mt-1">ID: <span className="font-mono text-cyan-600">{searchResult.id}</span></p>
                                </div>

                                {accessGranted ? (
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Access Granted
                                        </span>
                                        <button
                                            onClick={() => router.push('/doctor/records')}
                                            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium text-sm"
                                        >
                                            View Records
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            Access Required
                                        </span>
                                        <button
                                            onClick={handleRequestAccess}
                                            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium text-sm"
                                        >
                                            Request Access
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
