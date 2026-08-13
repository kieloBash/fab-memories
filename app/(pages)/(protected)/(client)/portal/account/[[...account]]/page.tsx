import { UserProfile } from '@clerk/nextjs';

export default function ClientAccountPage() {
    return (
        <div className="mx-auto max-w-3xl">
            <h1 className="mb-4 text-xl font-semibold text-gray-800">Account Settings</h1>
            <UserProfile
                path="/portal/account"
                routing="path"
                appearance={{ elements: { rootBox: 'w-full' } }}
            />
        </div>
    );
}