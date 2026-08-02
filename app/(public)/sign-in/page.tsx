'use client'
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useState } from "react";

export default function TeamLoginPage() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // Wire this up to your auth request.
        console.log("Team login submit:", { email, password });
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F5F9] p-6">
            <div className="w-[400px] max-w-full rounded-[20px] bg-white p-10 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_rgba(16,24,40,0.08)]">
                {/* Brand */}
                <div className="mb-7 flex items-center gap-2.5">
                    <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#2F6BFF] text-sm font-bold text-white">
                        F
                    </div>
                    <span className="text-[15px] font-bold text-[#1A1D24]">
                        Fab Memories Events
                    </span>
                </div>

                <h1 className="mb-1.5 text-[22px] font-semibold text-[#1A1D24]">
                    Team Login
                </h1>
                <p className="mb-7 text-[13px] text-[#8A8F98]">
                    For administrators and event coordinators.
                </p>

                <form onSubmit={handleSubmit}>
                    <label
                        htmlFor="team-email"
                        className="mb-1.5 block text-[13px] font-medium text-[#3A3F48]"
                    >
                        Email address
                    </label>
                    <input
                        id="team-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="andrea.mercado@fabmemories.ph"
                        required
                        className="mb-4.5 w-full rounded-xl border border-[#E4E6EB] px-3.5 py-3 text-sm text-[#1A1D24] outline-none placeholder:text-[#B5B9C2] focus:border-[#2F6BFF]"
                    />

                    <label
                        htmlFor="team-password"
                        className="mb-1.5 block text-[13px] font-medium text-[#3A3F48]"
                    >
                        Password
                    </label>
                    <div className="relative mb-2.5">
                        <input
                            id="team-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full rounded-xl border border-[#E4E6EB] px-3.5 py-3 pr-11 text-sm text-[#1A1D24] outline-none placeholder:text-[#B5B9C2] focus:border-[#2F6BFF]"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-[#8A8F98]"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="mb-5.5 text-right">
                        <a
                            href="/forgot-password"
                            className="text-[13px] font-medium text-[#2F6BFF] hover:text-[#1d4fd6]"
                        >
                            Forgot password?
                        </a>
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-[#2F6BFF] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4fd6]"
                    >
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
}