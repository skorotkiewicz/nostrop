import { SimplePool, getEventHash, signEvent } from 'nostr-tools';

const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social'
];

const pool = new SimplePool();

export async function publishPost(content, privateKey, replyTo = null, section = 'main') {
  try {
    const event = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['t', 'nostrop'],
        ['t', section]
      ],
      content: content,
      pubkey: '',
    };

    if (replyTo) {
      event.tags.push(['e', replyTo]);
    }

    event.id = getEventHash(event);
    event.sig = await signEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, event);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error('Error publishing post:', error);
    throw error;
  }
}

export async function vote(postId, postAuthor, isUpvote, privateKey) {
  try {
    const event = {
      kind: isUpvote ? 7 : 8,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['e', postId],
        ['p', postAuthor],
        ['t', 'nostrop']
      ],
      content: isUpvote ? '+' : '-',
      pubkey: '',
    };

    event.id = getEventHash(event);
    event.sig = await signEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, event);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error('Error voting:', error);
    throw error;
  }
}

export async function fetchVotes(postIds) {
  try {
    const votes = await pool.list(RELAYS, [
      {
        kinds: [7, 8],
        '#e': postIds,
        '#t': ['nostrop']
      }
    ]);

    const voteCounts = {};
    postIds.forEach(id => {
      voteCounts[id] = { up: 0, down: 0 };
    });

    votes.forEach(vote => {
      const postId = vote.tags.find(tag => tag[0] === 'e')?.[1];
      if (postId && voteCounts[postId]) {
        if (vote.kind === 7) voteCounts[postId].up++;
        if (vote.kind === 8) voteCounts[postId].down++;
      }
    });

    return voteCounts;
  } catch (error) {
    console.error('Error fetching votes:', error);
    throw error;
  }
}

export async function fetchComments(postId) {
  try {
    const events = await pool.list(RELAYS, [
      {
        kinds: [1],
        '#e': [postId],
        '#t': ['nostrop']
      }
    ]);

    const comments = events.map(event => ({
      id: event.id,
      content: event.content,
      author: event.pubkey,
      createdAt: event.created_at,
      votes: { up: 0, down: 0 }
    }));

    if (comments.length > 0) {
      const votes = await fetchVotes(comments.map(comment => comment.id));
      comments.forEach(comment => {
        comment.votes = votes[comment.id] || { up: 0, down: 0 };
      });
    }

    return comments.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

export async function fetchPosts(section = 'main') {
  try {
    const events = await pool.list(RELAYS, [
      {
        kinds: [1],
        limit: 100,
        '#t': ['nostrop', section]
      }
    ]);

    const posts = events.filter(event => 
      !event.tags.some(tag => tag[0] === 'e')
    ).map(event => ({
      id: event.id,
      content: event.content,
      author: event.pubkey,
      createdAt: event.created_at,
      votes: { up: 0, down: 0 },
      comments: 0,
      tags: event.tags.map(tag => tag[1])
    }));

    if (posts.length > 0) {
      const votes = await fetchVotes(posts.map(post => post.id));
      const comments = await pool.list(RELAYS, [
        {
          kinds: [1],
          '#e': posts.map(p => p.id),
          '#t': ['nostrop']
        }
      ]);

      posts.forEach(post => {
        post.votes = votes[post.id] || { up: 0, down: 0 };
        post.comments = comments.filter(c => 
          c.tags.some(t => t[0] === 'e' && t[1] === post.id)
        ).length;
      });
    }

    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}

export async function fetchUserPosts(pubkey) {
  try {
    const events = await pool.list(RELAYS, [
      {
        kinds: [1],
        authors: [pubkey],
        '#t': ['nostrop']
      }
    ]);

    const posts = events.filter(event => 
      !event.tags.some(tag => tag[0] === 'e')
    ).map(event => ({
      id: event.id,
      content: event.content,
      author: event.pubkey,
      createdAt: event.created_at,
      votes: { up: 0, down: 0 },
      comments: 0,
      tags: event.tags.map(tag => tag[1])
    }));

    if (posts.length > 0) {
      const votes = await fetchVotes(posts.map(post => post.id));
      const comments = await pool.list(RELAYS, [
        {
          kinds: [1],
          '#e': posts.map(p => p.id),
          '#t': ['nostrop']
        }
      ]);

      posts.forEach(post => {
        post.votes = votes[post.id] || { up: 0, down: 0 };
        post.comments = comments.filter(c => 
          c.tags.some(t => t[0] === 'e' && t[1] === post.id)
        ).length;
      });
    }

    return posts;
  } catch (error) {
    console.error('Error fetching user posts:', error);
    throw error;
  }
}

export async function fetchUserProfile(pubkey) {
  try {
    const events = await pool.list(RELAYS, [
      {
        kinds: [0],
        authors: [pubkey]
      }
    ]);

    if (events.length === 0) {
      return {
        created_at: Date.now() / 1000
      };
    }

    const profileEvent = events[0];
    const profile = JSON.parse(profileEvent.content);

    return {
      ...profile,
      created_at: profileEvent.created_at
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

export async function fetchAllUsers() {
  try {
    const events = await pool.list(RELAYS, [
      {
        kinds: [0],
        '#t': ['nostrop']
      }
    ]);

    const users = events.map(event => {
      const profile = JSON.parse(event.content);
      return {
        id: event.pubkey,
        ...profile,
        created_at: event.created_at
      };
    });

    const roleEvents = await pool.list(RELAYS, [
      {
        kinds: [30000],
        '#t': ['nostrop-role']
      }
    ]);

    const banEvents = await pool.list(RELAYS, [
      {
        kinds: [30000],
        '#t': ['nostrop-ban']
      }
    ]);

    users.forEach(user => {
      const roleEvent = roleEvents.find(e => 
        e.tags.some(t => t[0] === 'p' && t[1] === user.id)
      );
      const banEvent = banEvents.find(e => 
        e.tags.some(t => t[0] === 'p' && t[1] === user.id)
      );

      user.role = roleEvent?.content || 'user';
      user.banned = banEvent?.content === 'true';
    });

    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export async function fetchAllPosts() {
  try {
    const events = await pool.list(RELAYS, [
      {
        kinds: [1],
        '#t': ['nostrop']
      }
    ]);

    const posts = events.filter(event => 
      !event.tags.some(tag => tag[0] === 'e')
    ).map(event => ({
      id: event.id,
      content: event.content,
      author: event.pubkey,
      createdAt: event.created_at,
      votes: { up: 0, down: 0 },
      comments: 0
    }));

    if (posts.length > 0) {
      const votes = await fetchVotes(posts.map(post => post.id));
      const comments = await pool.list(RELAYS, [
        {
          kinds: [1],
          '#e': posts.map(p => p.id),
          '#t': ['nostrop']
        }
      ]);

      const authors = [...new Set(posts.map(p => p.author))];
      const profiles = await Promise.all(
        authors.map(author => fetchUserProfile(author))
      );

      const authorProfiles = authors.reduce((acc, author, index) => {
        acc[author] = profiles[index];
        return acc;
      }, {});

      posts.forEach(post => {
        post.votes = votes[post.id] || { up: 0, down: 0 };
        post.comments = comments.filter(c => 
          c.tags.some(t => t[0] === 'e' && t[1] === post.id)
        ).length;
        post.author = {
          id: post.author,
          ...authorProfiles[post.author]
        };
      });
    }

    return posts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}

export async function updateUserRole(userId, role) {
  try {
    const event = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['t', 'nostrop-role'],
        ['p', userId]
      ],
      content: role,
      pubkey: '',
    };

    event.id = getEventHash(event);
    event.sig = await signEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, event);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export async function banUser(userId, isBanned) {
  try {
    const event = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['t', 'nostrop-ban'],
        ['p', userId]
      ],
      content: isBanned.toString(),
      pubkey: '',
    };

    event.id = getEventHash(event);
    event.sig = await signEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, event);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error('Error updating user ban status:', error);
    throw error;
  }
}

export async function removePost(postId) {
  try {
    const event = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['t', 'nostrop-remove'],
        ['e', postId]
      ],
      content: 'removed',
      pubkey: '',
    };

    event.id = getEventHash(event);
    event.sig = await signEvent(event, privateKey);

    const pubs = pool.publish(RELAYS, event);
    await Promise.all(pubs);

    return event;
  } catch (error) {
    console.error('Error removing post:', error);
    throw error;
  }
}