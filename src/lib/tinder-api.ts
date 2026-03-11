const BASE_URL = "https://api.gotinder.com";

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Tinder/14.21.0 (iPhone; iOS 16.6; Scale/3.00)",
  platform: "ios",
  "app-version": "5430",
};

export interface TinderStats {
  myId: string;
  myName: string;
  totalMatches: number;
  likesYouCount: number;
  totalConversations: number;
  conversationsYouStarted: number;
  conversationsStartedWithReply: number;
  conversationsTheyStarted: number;
  replyRate: number | null;
  conversationRate: number | null;
  matches: MatchSummary[];
}

export interface MatchSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  messageCount: number;
  youStarted: boolean;
  theyReplied: boolean;
  lastMessage: string | null;
  lastMessageDate: string | null;
}

interface TinderMessage {
  _id: string;
  from: string;
  to: string;
  message: string;
  sent_date: string;
}

interface TinderMatch {
  _id: string;
  person?: {
    _id: string;
    name: string;
    photos?: { url: string }[];
  };
  messages: TinderMessage[];
}

async function tinderGet(path: string, token: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { ...BASE_HEADERS, "X-Auth-Token": token },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tinder API ${res.status}: ${text}`);
  }
  return res.json();
}

async function getProfile(token: string) {
  const data = (await tinderGet("/v2/profile?include=user", token)) as {
    data: { user: { _id: string; name: string } };
  };
  return data.data.user;
}

async function getAllMatches(token: string): Promise<TinderMatch[]> {
  const all: TinderMatch[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < 100; i++) {
    const params: Record<string, string> = { count: "60", is_tinder_u: "false", locale: "en" };
    if (pageToken) params.page_token = pageToken;

    const data = (await tinderGet("/v2/matches", token, params)) as {
      data: { matches: TinderMatch[]; next_page_token?: string };
    };

    const matches = data.data?.matches ?? [];
    if (matches.length === 0) break;

    all.push(...matches);
    pageToken = data.data?.next_page_token;
    if (!pageToken) break;
  }
  return all;
}

async function getLikesCount(token: string): Promise<number> {
  try {
    const data = (await tinderGet("/v2/fast-match/count", token)) as {
      data: { count: number };
    };
    return data.data?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchTinderStats(token: string): Promise<TinderStats> {
  const [profile, matches, likesCount] = await Promise.all([
    getProfile(token),
    getAllMatches(token),
    getLikesCount(token),
  ]);

  const myId = profile._id;
  let totalConversations = 0;
  let youStarted = 0;
  let youStartedWithReply = 0;
  let theyStarted = 0;

  const matchSummaries: MatchSummary[] = matches.map((match) => {
    const msgs = [...(match.messages || [])].sort(
      (a, b) => new Date(a.sent_date).getTime() - new Date(b.sent_date).getTime()
    );

    const hasMessages = msgs.length > 0;
    let isYouStarted = false;
    let isTheyReplied = false;

    if (hasMessages) {
      totalConversations++;
      const firstSender = msgs[0].from;

      if (firstSender === myId) {
        youStarted++;
        isYouStarted = true;
        const hasReply = msgs.some((m) => m.from !== myId);
        if (hasReply) {
          youStartedWithReply++;
          isTheyReplied = true;
        }
      } else {
        theyStarted++;
      }
    }

    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

    return {
      id: match._id,
      name: match.person?.name ?? "Unknown",
      photoUrl: match.person?.photos?.[0]?.url ?? null,
      messageCount: msgs.length,
      youStarted: isYouStarted,
      theyReplied: isTheyReplied,
      lastMessage: lastMsg?.message ?? null,
      lastMessageDate: lastMsg?.sent_date ?? null,
    };
  });

  const replyRate = youStarted > 0 ? (youStartedWithReply / youStarted) * 100 : null;
  const conversationRate = matches.length > 0 ? (totalConversations / matches.length) * 100 : null;

  return {
    myId,
    myName: profile.name,
    totalMatches: matches.length,
    likesYouCount: likesCount,
    totalConversations,
    conversationsYouStarted: youStarted,
    conversationsStartedWithReply: youStartedWithReply,
    conversationsTheyStarted: theyStarted,
    replyRate,
    conversationRate,
    matches: matchSummaries,
  };
}
