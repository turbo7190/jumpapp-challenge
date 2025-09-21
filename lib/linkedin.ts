import { prisma } from "./prisma";

export async function getLinkedInClient(userId: string) {
  const socialAccount = await prisma.socialAccount.findFirst({
    where: {
      userId,
      platform: "linkedin",
      isActive: true,
    },
  });

  if (!socialAccount?.accessToken) {
    throw new Error("No LinkedIn access token found. Please reconnect your LinkedIn account.");
  }

  return {
    accessToken: socialAccount.accessToken,
    refreshToken: socialAccount.refreshToken,
    expiresAt: socialAccount.expiresAt,
    platformUserId: socialAccount.platformUserId,
  };
}

export async function getLinkedInUserInfo(accessToken: string) {
  const r = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // includes { sub, name/given_name/family_name, email?, picture? }
}

export async function postToLinkedIn(
  userId: string,
  text: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const linkedinClient = await getLinkedInClient(userId);
    
    // Use OIDC userinfo to get member ID (sub)
    const userInfo = await getLinkedInUserInfo(linkedinClient.accessToken);
    const authorUrn = `urn:li:person:${userInfo.sub}`;

    // Create the post using UGC API
    const postResponse = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${linkedinClient.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: text,
              },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        }),
      }
    );

    const postData = await postResponse.json();

    if (!postResponse.ok) {
      console.error("LinkedIn Post API error:", postData);
      
      // Check for specific LinkedIn posting permission errors
      if (postData.error?.code === 403) {
        return {
          success: false,
          error: "LinkedIn posting requires additional permissions. Please ensure your LinkedIn app has 'w_member_social' scope and has been approved by LinkedIn for posting content.",
        };
      }
      
      return {
        success: false,
        error: postData.message || "Failed to post to LinkedIn",
      };
    }

    return {
      success: true,
      postId: postData.id,
    };
  } catch (error) {
    console.error("Error posting to LinkedIn:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
