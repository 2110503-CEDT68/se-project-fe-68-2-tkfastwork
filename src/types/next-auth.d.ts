import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email: string;
    token: string;
    role: "user" | "admin" | "owner";
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      token: string;
      role: "user" | "admin" | "owner";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    token: string;
    role: "user" | "admin" | "owner";
  }
}
