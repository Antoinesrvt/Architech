import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

export type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
};

/**
 * Get the current session on the server
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Get the current user from the session
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user) {
    return null;
  }
  
  return {
    ...session.user,
    id: session.user.id || "",
    role: session.user.role || "user",
  } as User;
}

/**
 * Check if the current user is authenticated
 * Useful for server components and middleware
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session?.user;
}

/**
 * Check if the current user has the required role
 * @param requiredRole The role to check for
 */
export async function hasRole(requiredRole: string) {
  const user = await getCurrentUser();
  return user?.role === requiredRole;
} 