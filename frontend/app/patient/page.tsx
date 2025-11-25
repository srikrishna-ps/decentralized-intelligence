"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import PatientSidebar from "@/components/sidebars/PatientSidebar";

export default function PatientDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
        if (session?.user?.role !== "patient") {
            router.push("/");
        }
    }, [status, session, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "patient") {
        return null;
    }

    const features = [
        {
            id: 'upload',
            title: 'Upload Record',
            description: 'Securely upload a new medical record.',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            ),
            link: '/patient/records',
            bgColor: 'bg-cyan-50',
            iconColor: 'text-cyan-600'
        },
        {
            id: 'view',
            title: 'View Records',
            description: 'Access and review your medical records.',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            link: '/patient/records',
            bgColor: 'bg-gray-50',
            iconColor: 'text-gray-600'
        },
        {
            id: 'access',
            title: 'Manage Access',
            description: 'Approve or deny access requests.',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            ),
            link: '/patient/access',
            bgColor: 'bg-gray-50',
            iconColor: 'text-gray-600'
        },
        {
            id: 'requests',
            title: 'Access Requests',
            description: 'View incoming access requests.',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            ),
            link: '/patient/requests',
            bgColor: 'bg-cyan-50',
            iconColor: 'text-cyan-600'
        },
        {
            id: 'ai',
            title: 'AI Assistant',
            description: 'Get insights from your medical data.',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            ),
            link: '/patient/ai',
            bgColor: 'bg-gray-50',
            iconColor: 'text-gray-600'
        },
        {
            id: 'activity',
            title: 'Activity Log',
            description: 'View your recent account activity.',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            link: '/patient/activity',
            bgColor: 'bg-cyan-50',
            iconColor: 'text-cyan-600'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Reusable Sidebar */}
            <PatientSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                patientId={session.user.patientId || ""}
            />

            {/* Main Content */}
            <main className="flex-1 ml-64 p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-4xl font-bold text-gray-900">Welcome back, {session.user.name?.split(' ')[0]}</h2>
                        <p className="text-gray-600 mt-2">Manage your medical records securely on the blockchain</p>
                    </div>

                    {/* 2-Column Grid Layout for consistency */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {features.map((feature) => (
                            <Link
                                key={feature.id}
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
