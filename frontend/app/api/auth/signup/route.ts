import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const { email, name, password, role } = await req.json();

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: "User already exists with this email" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine initial status
        // Patients are active by default. Professionals need admin approval.
        // NOTE: The User model also enforces this in the pre-save hook as a failsafe.
        const normalizedRole = role ? role.toLowerCase().trim() : 'patient';
        let initialStatus = 'active';
        if (['doctor', 'diagnostic', 'insurer'].includes(normalizedRole)) {
            initialStatus = 'pending';
        }

        // Create user
        const user = await User.create({
            email,
            name,
            password: hashedPassword,
            role: normalizedRole,
            status: initialStatus
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                patientId: user.patientId,
                providerId: user.providerId,
            },
        }, { status: 201 });
    } catch (error: any) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
