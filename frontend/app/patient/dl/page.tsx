"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import PatientSidebar from "@/components/sidebars/PatientSidebar";

type TabType = 'diagnosis' | 'summarize' | 'explain' | 'symptoms';

export default function PatientAI() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState<TabType>('diagnosis');
    const [loading, setLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState("");
    const [formData, setFormData] = useState({
        symptoms: "",
        medicalHistory: "",
        labResults: "",
    });

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (session?.user?.role !== "patient") router.push("/");
    }, [status, session, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAiResponse("");

        try {
            let prompt = "";
            let context = "";

            switch (activeTab) {
                case 'diagnosis':
                    prompt = `Patient presents with: ${formData.symptoms}. \nMedical History: ${formData.medicalHistory}. \nPlease provide a comprehensive differential diagnosis and recommended next steps.`;
                    context = "You are a helpful medical DL assistant. Provide clear, professional medical insights but always include a disclaimer that this is not a substitute for professional medical advice.";
                    break;
                case 'summarize':
                    // In a real app, we would fetch records here. For now, we'll use a placeholder or what's in history.
                    prompt = `Please summarize the following medical history: ${formData.medicalHistory}`;
                    context = "Summarize the medical records concisely, highlighting key conditions and treatments.";
                    break;
                case 'explain':
                    prompt = `Explain these lab results in simple terms: ${formData.labResults}`;
                    context = "Explain medical lab results to a patient in plain English, avoiding jargon where possible.";
                    break;
                case 'symptoms':
                    prompt = `Analyze these symptoms: ${formData.symptoms}`;
                    context = "Analyze the symptoms and suggest potential causes and urgency levels.";
                    break;
            }

            const res = await api.post('/api/ai/generate', { prompt, context });

            if (res.data.success) {
                setAiResponse(res.data.data);
                toast.success("Analysis complete");
            } else {
                toast.error(res.data.error || "Failed to generate response");
            }
        } catch (error: any) {
            console.error("AI Error:", error);
            const errorMessage = error.response?.data?.error || error.message;
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
            toast.error(`Failed: ${errorMessage} (Target: ${apiUrl})`);
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-cyan-600 text-xl">Loading...</div>
            </div>
        );
    }

    if (!session || session.user.role !== "patient") return null;

    const tabs = [
        { id: 'diagnosis' as TabType, label: 'Full Diagnosis' },
        { id: 'summarize' as TabType, label: 'Summarize' },
        { id: 'explain' as TabType, label: 'Explain Labs' },
        { id: 'symptoms' as TabType, label: 'Diagnose Symptoms' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <PatientSidebar
                currentPath={pathname}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
                patientId={session.user.patientId || ""}
            />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">AI-Powered Reasoning</h2>
                        <p className="text-gray-600 mt-1">Interact with AI models to get insights from medical data.</p>
                    </div>

                    <div className="flex gap-2 mb-6 border-b border-gray-200">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === tab.id
                                    ? 'border-cyan-600 text-cyan-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        {aiResponse && (
                            <div className="mb-8 p-6 bg-cyan-50 border border-cyan-100 rounded-lg">
                                <h3 className="text-lg font-semibold text-cyan-900 mb-2">AI Analysis</h3>
                                <div className="prose prose-cyan max-w-none text-gray-800 whitespace-pre-wrap">
                                    {aiResponse}
                                </div>
                                <button
                                    onClick={() => setAiResponse("")}
                                    className="mt-4 text-sm text-cyan-700 hover:text-cyan-900 font-medium"
                                >
                                    Clear Result
                                </button>
                            </div>
                        )}

                        {activeTab === 'diagnosis' && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Comprehensive Diagnosis Assistant</h3>
                                <p className="text-gray-600 mb-6">Provide patient details to receive a comprehensive diagnosis and treatment plan.</p>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">Current Symptoms</label>
                                        <textarea
                                            value={formData.symptoms}
                                            onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                                            placeholder="Describe the patient's current symptoms in detail..."
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent text-gray-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">Past Medical History (Optional)</label>
                                        <textarea
                                            value={formData.medicalHistory}
                                            onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                                            placeholder="Provide relevant past medical records, diagnoses, and treatments..."
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent text-gray-900"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
                                    >
                                        {loading ? "Analyzing..." : "Get Diagnosis"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'summarize' && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Summarize Medical Records</h3>
                                <p className="text-gray-600 mb-6">Get a concise summary of your complete medical history.</p>

                                <div className="space-y-4">
                                    <p className="text-gray-700">This feature will analyze all your medical records and provide a comprehensive summary including:</p>
                                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                                        <li>Key diagnoses and conditions</li>
                                        <li>Medications and treatments</li>
                                        <li>Recent test results</li>
                                        <li>Health trends over time</li>
                                    </ul>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 mt-6"
                                    >
                                        {loading ? "Generating Summary..." : "Generate Summary"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'explain' && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Explain Lab Results</h3>
                                <p className="text-gray-600 mb-6">Understand your lab results in simple, easy-to-understand terms.</p>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">Lab Results</label>
                                        <textarea
                                            value={formData.labResults}
                                            onChange={(e) => setFormData({ ...formData, labResults: e.target.value })}
                                            placeholder="Paste your lab results here or describe the values you want explained..."
                                            rows={6}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent text-gray-900"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
                                    >
                                        {loading ? "Analyzing..." : "Explain Results"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'symptoms' && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Diagnose Symptoms</h3>
                                <p className="text-gray-600 mb-6">Enter your symptoms for AI-powered preliminary diagnosis.</p>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">Symptoms</label>
                                        <textarea
                                            value={formData.symptoms}
                                            onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                                            placeholder="Describe your symptoms (e.g., fever, headache, cough)..."
                                            rows={5}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent text-gray-900"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
                                    >
                                        {loading ? "Analyzing..." : "Diagnose"}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
