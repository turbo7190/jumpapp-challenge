import { prisma } from "./prisma";

export async function getFacebookClient(userId: string) {
  const socialAccount = await prisma.socialAccount.findFirst({
    where: {
      userId,
      platform: "facebook",
      isActive: true,
    },
  });

  if (!socialAccount?.accessToken) {
    throw new Error("No Facebook access token found. Please reconnect your Facebook account.");
  }

  return {
    accessToken: socialAccount.accessToken,
    refreshToken: socialAccount.refreshToken,
    expiresAt: socialAccount.expiresAt,
    platformUserId: socialAccount.platformUserId,
  };
}

export async function postToFacebook(
  userId: string,
  message: string
): Promise<{ success: boolean; postId?: string; error?: string; pageName?: string }> {
  try {
    const facebookClient = await getFacebookClient(userId);
    
    console.log("Attempting Facebook post with token:", facebookClient.accessToken.substring(0, 20) + "...");
    
    // First, get user's Facebook Pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${facebookClient.accessToken}`
    );
    
    const pagesData = await pagesResponse.json();
    
    if (!pagesResponse.ok) {
      console.error("Error fetching Facebook pages:", pagesData);
      return {
        success: false,
        error: `Failed to fetch Facebook pages: ${pagesData.error?.message || "Unknown error"}`,
      };
    }
    
    const pages = pagesData.data || [];
    
    if (pages.length === 0) {
      return {
        success: false,
        error: "No Facebook Pages found. Please create a Facebook Page first to post content.",
      };
    }
    
    // Use the first page for posting
    const page = pages[0];
    console.log(`Posting to Facebook Page: ${page.name} (ID: ${page.id})`);
    
    // Post to the Facebook Page
    const endpoint = `https://graph.facebook.com/v18.0/${page.id}/feed`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        access_token: page.access_token, // Use page access token
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Facebook API error:", data);
      
      if (data.error?.code === 200) {
        return {
          success: false,
          error: `Facebook posting failed: ${data.error.message}. This may be due to insufficient page permissions.`,
        };
      }
      
      return {
        success: false,
        error: data.error?.message || "Failed to post to Facebook",
      };
    }

    return {
      success: true,
      postId: data.id,
      pageName: page.name,
    };
  } catch (error) {
    console.error("Error posting to Facebook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function getFacebookProfile(userId: string) {
  try {
    const facebookClient = await getFacebookClient(userId);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${facebookClient.accessToken}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Facebook Profile API error:", data);
      return {
        success: false,
        error: data.error?.message || "Failed to fetch Facebook profile",
      };
    }

    return {
      success: true,
      profile: data,
    };
  } catch (error) {
    console.error("Error fetching Facebook profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function getFacebookPages(userId: string) {
  try {
    const facebookClient = await getFacebookClient(userId);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${facebookClient.accessToken}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Facebook Pages API error:", data);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error("Error fetching Facebook pages:", error);
    return [];
  }
}
