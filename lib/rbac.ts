// src/lib/rbac.ts
// Central place to define which roles can access which route prefixes.
// Add to this as you build out /admin, /staff, /vendor, /client pages.

export type Role = "admin" | "staff" | "vendor" | "client";

export const ROUTE_ACCESS: Record<string, Role[]> = {
    "/admin": ["admin"],
    "/staff": ["staff", "admin"], // admins can view staff pages too
    "/vendor": ["vendor"],
    "/client": ["client"],
    "/profile": ["admin", "staff", "vendor", "client"],
    "/notifications": ["admin", "staff", "vendor", "client"],
};

export function canAccess(pathname: string, role: Role | null): boolean {
    if (!role) return false;
    const match = Object.keys(ROUTE_ACCESS).find((prefix) =>
        pathname.startsWith(prefix)
    );
    if (!match) return true; // not a gated route
    return ROUTE_ACCESS[match].includes(role);
}