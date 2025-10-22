import { SignIn } from "@stackframe/stack";
import Link from "next/link";

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-50 to-purple-100">
            <div className="max-w-md w-full space-y-8">
                {/* Show password tab by default so returning users can sign in with email & password */}
                <SignIn firstTab="password" />
                <Link href="/">Go Home</Link>
            </div>
        </div>
    );
}