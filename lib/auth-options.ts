import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "database" as const,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
        },
      },
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "public_profile,pages_manage_posts,pages_read_engagement,pages_show_list",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email }: any) {
      console.log("🔐 SignIn callback triggered:", {
        userId: user?.id,
        userEmail: user?.email,
        provider: account?.provider,
        accountId: account?.providerAccountId,
        profileData: profile,
        emailData: email,
      });

      // Always allow sign-ins - let NextAuth handle account linking
      console.log("✅ SignIn callback returning true for user:", user?.email);
      return true;
    },
    async redirect({ url, baseUrl }: any) {
      console.log("🔄 Redirect callback:", { url, baseUrl });
      console.log("🔄 NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
      
      // If url is undefined or empty, redirect to dashboard
      if (!url) {
        console.log("🔄 No URL provided, redirecting to dashboard");
        return `${baseUrl}/dashboard`;
      }
      
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        const fullUrl = `${baseUrl}${url}`;
        console.log("🔄 Relative URL, redirecting to:", fullUrl);
        return fullUrl;
      }
      
      // Allows callback URLs on the same origin
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          console.log("🔄 Same origin URL, redirecting to:", url);
          return url;
        }
      } catch (error) {
        console.error("🔄 Invalid URL format:", url, error);
      }
      
      // Default redirect to dashboard
      console.log("🔄 Fallback redirect to dashboard:", `${baseUrl}/dashboard`);
      return `${baseUrl}/dashboard`;
    },
    async session({ session, token, user }: any) {
      console.log("📋 Session callback triggered:", {
        sessionUser: session?.user?.email,
        tokenProvider: token?.provider,
        userId: user?.id,
      });
      
      if (session.user) {
        session.user.id = user?.id || token?.sub;
        (session as any).accessToken = token?.accessToken;
        (session as any).expiresAt = token?.expiresAt;
        (session as any).memberId = session.user.id; // same as OIDC sub
        console.log("✅ Session updated with user ID:", session.user.id);
      }
      return session;
    },
    async jwt({ token, account, profile }: any) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = Date.now() + (account.expires_in ? account.expires_in * 1000 : 0);
        token.provider = account.provider;
        token.idToken = account.id_token;
      }
      return token;
    },
  },
  events: {
    async linkAccount({ user, account, profile }: any) {
      console.log("🔗 linkAccount event triggered:", {
        userId: user.id,
        userEmail: user.email,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        accessToken: account.access_token ? "***present***" : "missing",
        refreshToken: account.refresh_token ? "***present***" : "missing",
        expiresAt: account.expires_at,
        scope: account.scope || "not provided",
      });

      // Create SocialAccount record for LinkedIn and Facebook
      if (account.provider === "linkedin" || account.provider === "facebook") {
        try {
          console.log(
            `🔍 Checking existing SocialAccount for ${account.provider}...`
          );
          console.log(`🔍 LinkedIn Debug - Account data:`, {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token ? "present" : "missing",
            refreshToken: account.refresh_token ? "present" : "missing",
            expiresAt: account.expires_at,
            scope: account.scope,
            type: account.type,
          });

          // Check if SocialAccount already exists
          const existingSocialAccount = await prisma.socialAccount.findFirst({
            where: {
              userId: user.id,
              platform: account.provider,
              platformUserId: account.providerAccountId,
            },
          });

          console.log("🔍 Existing SocialAccount:", existingSocialAccount);

          if (!existingSocialAccount) {
            console.log(
              `📝 Creating new SocialAccount for ${account.provider}...`
            );

            const newSocialAccount = await prisma.socialAccount.create({
              data: {
                userId: user.id,
                platform: account.provider,
                platformUserId: account.providerAccountId,
                accessToken: account.access_token || "",
                refreshToken: account.refresh_token,
                expiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
                isActive: true,
              },
            });

            console.log(`✅ Created SocialAccount for ${account.provider}:`, {
              id: newSocialAccount.id,
              platform: newSocialAccount.platform,
              platformUserId: newSocialAccount.platformUserId,
              isActive: newSocialAccount.isActive,
            });
          } else {
            console.log(
              `ℹ️ SocialAccount already exists for ${account.provider}, updating...`
            );

            // Update existing account with new tokens
            await prisma.socialAccount.update({
              where: { id: existingSocialAccount.id },
              data: {
                accessToken:
                  account.access_token || existingSocialAccount.accessToken,
                refreshToken:
                  account.refresh_token || existingSocialAccount.refreshToken,
                expiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : existingSocialAccount.expiresAt,
                isActive: true,
              },
            });

            console.log(`✅ Updated SocialAccount for ${account.provider}`);
          }
        } catch (error) {
          console.error("❌ Error creating/updating SocialAccount:", error);
          console.error("Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            code: (error as any)?.code,
            meta: (error as any)?.meta,
          });
        }
      } else {
        console.log(
          `ℹ️ Skipping SocialAccount creation for ${account.provider} (not LinkedIn/Facebook)`
        );
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
