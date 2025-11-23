"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import DoctorSidebar from "@/components/sidebars/DoctorSidebar";
import { useEffect } from "react";
import Link from "next/link";

export default function DoctorDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "doctor") router.push("/");
    }, [status, session, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "doctor") return null;

    const features = [
        {
            title: "Request Access",
            description: "Request access to patient medical records",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
            ),
            link: "/doctor/requests",
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600"
        },
        {
            title: "View Records",
            description: "Access granted patient medical records",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            link: "/doctor/records",
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600"
        },
        {
            title: "Upload Notes",
            description: "Upload clinical notes for patients",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            ),
            link: "/doctor/upload",
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600"
        },
        {
            title: "Activity Log",
            description: "Track all your actions and requests",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
            link: "/doctor/activity",
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600"
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <DoctorSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                doctorId={session.user.providerId || ""}
            />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900">Doctor Dashboard</h1>
                        <p className="text-gray-600 mt-2">Welcome, Dr. {session.user.name}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {features.map((feature, index) => (
                            <Link
                                key={index}
                                href={feature.link}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start space-x-4">
                                    <div className={`p-3 rounded-lg ${feature.bgColor} ${feature.iconColor}`}>
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                                        <p className="text-gray-600 mt-1 text-sm">{feature.description}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
