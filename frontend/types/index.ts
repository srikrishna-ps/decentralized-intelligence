import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            role?: string;
            patientId?: string;
            providerId?: string;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        role?: string;
        patientId?: string;
        providerId?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: string;
        patientId?: string;
        providerId?: string;
    }
}

export interface MedicalRecord {
    recordId: string;
    patientId: string;
    ipfsHash: string;
    createdAt: Date;
    medicalData?: {
        description: string;
        category: string;
    };
}

export interface AccessRequest {
    id: string;
    patientId: string;
    providerId: string;
    status: "pending" | "approved" | "rejected";
    requestedAt: Date;
}

export interface ActivityLog {
    id: string;
    action: string;
    timestamp: Date;
    blockNumber?: number;
    txHash?: string;
}
