import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { generateToken } from "@/lib/auth-edge";
import { logLoginAttempt, extractRequestInfo } from "@/lib/login-logger";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const { ipAddress, userAgent } = extractRequestInfo(request);

  try {
    if (!email || !password) {
      // Log failed login attempt - missing credentials
      await logLoginAttempt({
        email: email || "unknown",
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent,
        failure_reason: "Missing email or password",
      });

      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
      [email]
    );

    const users = rows as any[];
    if (users.length === 0) {
      // Log failed login attempt - user not found
      await logLoginAttempt({
        email,
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent,
        failure_reason: "User not found or inactive",
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = users[0];
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      // Log failed login attempt - invalid password
      await logLoginAttempt({
        user_id: user.id,
        email,
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent,
        failure_reason: "Invalid password",
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Log successful login
    await logLoginAttempt({
      user_id: user.id,
      email,
      success: true,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    const token = await generateToken(user.id, user.name, user.isAdmin);

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        branch_id: user.branch_id,
        isAdmin: user.isAdmin,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    // Log failed login attempt - server error
    await logLoginAttempt({
      email: email || "unknown",
      success: false,
      ip_address: ipAddress,
      user_agent: userAgent,
      failure_reason: "Server error",
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
