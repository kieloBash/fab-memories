import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">
                    Sign in to your account
                </h1>
                <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" fallbackRedirectUrl="/portal" />
            </div>
        </div>
    );
}