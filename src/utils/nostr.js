import { SimplePool, finalizeEvent } from "nostr-tools";
import { POOL_NAME } from "../config.js";

const RELAYS = [
  // 'wss://relay.damus.io',
  // 'wss://relay.nostr.band',
  "wss://nos.lol",
  // 'wss://relay.snort.social'
];

const pool = new SimplePool();

export async function publishPost(
  content,
  privateKey,
  replyTo = null,
  section = "main",
) {
  try {
    const event = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["t", POOL_NAME],
        ["t", section],
      ],
      content: content,
      pubkey: "",
    };

    if (replyTo) {
      event.tags.push(["e", replyTo]);
    }

    const signedEvent = finalizeEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, signedEvent);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error("Error publishing post:", error);
    throw error;
  }
}

export async function fetchPost(id) {
  try {
    const events = await pool.querySync(RELAYS, {
      kinds: [1],
      ids: [id],
      limit: 1,
      "#t": [POOL_NAME],
    });

    if (events.length === 0) {
      return null;
    }

    const event = events[0];
    const post = {
      id: event.id,
      content: event.content,
      author: event.pubkey,
      createdAt: event.created_at,
      votes: { up: 0, down: 0 },
      comments: 0,
      tags: event.tags.map((tag) => tag[1]),
    };

    const votes = await fetchVotes([post.id]);
    const comments = await fetchComments(post.id);
    post.votes = votes[post.id] || { up: 0, down: 0 };
    post.comments = comments.length;

    return post;
  } catch (error) {
    console.error("Error fetching post:", error);
    throw error;
  }
}

export async function vote(postId, postAuthor, isUpvote, privateKey) {
  try {
    const event = {
      kind: isUpvote ? 7 : 8,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["e", postId],
        ["p", postAuthor],
        ["t", POOL_NAME],
      ],
      content: isUpvote ? "+" : "-",
      pubkey: "",
    };

    const signedEvent = finalizeEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, signedEvent);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error("Error voting:", error);
    throw error;
  }
}

export async function fetchVotes(postIds) {
  try {
    const votes = await pool.querySync(RELAYS, {
      kinds: [7, 8],
      "#e": postIds,
      "#t": [POOL_NAME],
    });

    const voteCounts = {};

    for (const id of postIds) {
      voteCounts[id] = { up: 0, down: 0 };
    }

    for (const vote of votes) {
      const postId = vote.tags.find((tag) => tag[0] === "e")?.[1];
      if (postId && voteCounts[postId]) {
        if (vote.kind === 7) voteCounts[postId].up++;
        if (vote.kind === 8) voteCounts[postId].down++;
      }
    }

    return voteCounts;
  } catch (error) {
    console.error("Error fetching votes:", error);
    throw error;
  }
}

export async function fetchComments(postId) {
  try {
    const events = await pool.querySync(RELAYS, {
      kinds: [1],
      "#e": [postId],
      "#t": [POOL_NAME],
    });

    const comments = events.map((event) => ({
      id: event.id,
      content: event.content,
      author: event.pubkey,
      createdAt: event.created_at,
      votes: { up: 0, down: 0 },
    }));

    if (comments.length > 0) {
      const votes = await fetchVotes(comments.map((comment) => comment.id));

      for (const comment of comments) {
        comment.votes = votes[comment.id] || { up: 0, down: 0 };
      }
    }

    return comments.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
}

export async function fetchPosts(section = "main", limit = 100) {
  try {
    const events = await pool.querySync(RELAYS, {
      kinds: [1],
      limit: 100,
      "#t": [POOL_NAME, section],
    });

    const posts = events
      .filter((event) => !event.tags.some((tag) => tag[0] === "e"))
      .map((event) => ({
        id: event.id,
        content: event.content,
        author: event.pubkey,
        createdAt: event.created_at,
        votes: { up: 0, down: 0 },
        comments: 0,
        tags: event.tags.map((tag) => tag[1]),
      }));

    if (posts.length > 0) {
      const votes = await fetchVotes(posts.map((post) => post.id));
      const comments = await pool.querySync(RELAYS, {
        kinds: [1],
        "#e": posts.map((p) => p.id),
        limit: 1000,
      });

      for (const post of posts) {
        post.votes = votes[post.id] || { up: 0, down: 0 };
        post.comments = comments.filter((c) =>
          c.tags.some((t) => t[0] === "e" && t[1] === post.id),
        ).length;
      }
    }

    return posts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
}

export async function fetchUserPosts(pubkey) {
  try {
    const events = await pool.querySync(RELAYS, {
      kinds: [1],
      authors: [pubkey],
      "#t": [POOL_NAME],
    });

    const posts = events
      .filter((event) => !event.tags.some((tag) => tag[0] === "e"))
      .map((event) => ({
        id: event.id,
        content: event.content,
        author: event.pubkey,
        createdAt: event.created_at,
        votes: { up: 0, down: 0 },
        comments: 0,
        tags: event.tags.map((tag) => tag[1]),
      }));

    if (posts.length > 0) {
      const votes = await fetchVotes(posts.map((post) => post.id));
      const comments = await pool.querySync(RELAYS, {
        kinds: [1],
        "#e": posts.map((p) => p.id),
        "#t": [POOL_NAME],
      });

      for (const post of posts) {
        post.votes = votes[post.id] || { up: 0, down: 0 };
        post.comments = comments.filter((c) =>
          c.tags.some((t) => t[0] === "e" && t[1] === post.id),
        ).length;
      }
    }

    return posts;
  } catch (error) {
    console.error("Error fetching user posts:", error);
    throw error;
  }
}

export async function fetchUserProfile(pubkey) {
  try {
    const events = await pool.querySync(RELAYS, {
      kinds: [0],
      authors: [pubkey],
    });

    if (events.length === 0) {
      return {
        created_at: Date.now() / 1000,
      };
    }

    const profileEvent = events[0];
    const profile = JSON.parse(profileEvent.content);

    return {
      ...profile,
      created_at: profileEvent.created_at,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

export async function fetchAllUsers() {
  try {
    const events = await pool.querySync(RELAYS, {
      kinds: [0],
      "#t": [POOL_NAME],
    });

    const users = events.map((event) => {
      const profile = JSON.parse(event.content);
      return {
        id: event.pubkey,
        ...profile,
        created_at: event.created_at,
      };
    });

    const roleEvents = await pool.querySync(RELAYS, {
      kinds: [30000],
      "#t": [`${POOL_NAME}-role`],
    });

    const banEvents = await pool.querySync(RELAYS, {
      kinds: [30000],
      "#t": [`${POOL_NAME}-ban`],
    });

    for (const user of users) {
      const roleEvent = roleEvents.find((e) =>
        e.tags.some((t) => t[0] === "p" && t[1] === user.id),
      );
      const banEvent = banEvents.find((e) =>
        e.tags.some((t) => t[0] === "p" && t[1] === user.id),
      );

      user.role = roleEvent?.content || "user";
      user.banned = banEvent?.content === "true";
    }

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

export async function fetchAllPosts() {
  try {
    const events = await pool.querySync(RELAYS, {
      kinds: [1],
      "#t": [POOL_NAME],
    });

    const posts = events
      .filter((event) => !event.tags.some((tag) => tag[0] === "e"))
      .map((event) => ({
        id: event.id,
        content: event.content,
        author: event.pubkey,
        createdAt: event.created_at,
        votes: { up: 0, down: 0 },
        comments: 0,
      }));

    if (posts.length > 0) {
      const votes = await fetchVotes(posts.map((post) => post.id));
      const comments = await pool.querySync(RELAYS, {
        kinds: [1],
        "#e": posts.map((p) => p.id),
        "#t": [POOL_NAME],
      });

      const authors = [...new Set(posts.map((p) => p.author))];
      const profiles = await Promise.all(
        authors.map((author) => fetchUserProfile(author)),
      );

      const authorProfiles = authors.reduce((acc, author, index) => {
        acc[author] = profiles[index];
        return acc;
      }, {});

      for (const post of posts) {
        post.votes = votes[post.id] || { up: 0, down: 0 };
        post.comments = comments.filter((c) =>
          c.tags.some((t) => t[0] === "e" && t[1] === post.id),
        ).length;
        post.author = {
          pubkey: post.author,
          ...authorProfiles[post.author],
        };
      }
    }

    return posts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
}

export async function getFollowedUsers(userPubkey) {
  try {
    const followEvents = await pool.querySync(RELAYS, {
      kinds: [3],
      authors: [userPubkey],
    });

    if (!followEvents || followEvents.length === 0) {
      return [];
    }

    const followedPubkeys = followEvents[0].tags
      .filter((tag) => tag[0] === "p")
      .map((tag) => tag[1]);

    return followedPubkeys;
  } catch (error) {
    console.error("Error fetching followed users:", error);
    throw error;
  }
}

export async function getCommentsByParentId(postId) {
  try {
    const events = await pool.querySync(RELAYS, {
      kinds: [1],
      "#e": [postId],
    });

    const comments = events.map((event) => ({
      id: event.id,
      content: event.content,
      author: event.pubkey,
      createdAt: event.created_at,
      votes: { up: 0, down: 0 },
      replyTo: event.tags.find((tag) => tag[0] === "e")?.[1] || null,
    }));

    const votes = await fetchVotes(comments.map((comment) => comment.id));
    for (const comment of comments) {
      comment.votes = votes[comment.id] || { up: 0, down: 0 };
    }

    return posts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
}

export async function updateUserRole(userId, role, privateKey) {
  try {
    const event = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["t", `${POOL_NAME}-role`],
        ["p", userId],
      ],
      content: role,
      pubkey: "",
    };

    const signedEvent = finalizeEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, signedEvent);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
}

export async function banUser(userId, isBanned, privateKey) {
  try {
    const event = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["t", `${POOL_NAME}-ban`],
        ["p", userId],
      ],
      content: isBanned.toString(),
      pubkey: "",
    };

    const signedEvent = finalizeEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, signedEvent);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error("Error updating user ban status:", error);
    throw error;
  }
}

export async function removePost(postId, privateKey) {
  try {
    const event = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["t", `${POOL_NAME}-remove`],
        ["e", postId],
      ],
      content: "removed",
      pubkey: "",
    };

    const signedEvent = finalizeEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, signedEvent);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error("Error removing post:", error);
    throw error;
  }
}
