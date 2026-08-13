import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">
                    Create your account
                </h1>
                <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/portal" />
            </div>
        </div>
    );
}