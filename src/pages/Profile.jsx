import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Send,
  Reply,
  User,
  Calendar,
} from "lucide-react";
import { nip19 } from "nostr-tools";
import { useStore } from "../store/useStore";
import {
  fetchUserPosts,
  fetchUserProfile,
  fetchFollowedUsers,
  publishPost,
  vote,
  fetchComments,
} from "../utils/nostr";
import { formatDistanceToNow, format } from "date-fns";
import { pl } from "date-fns/locale";

import { useNostr } from "../hooks/useNostr";
function Profile() {
  const { pubkey } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingStates, setVotingStates] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [publishingComments, setPublishingComments] = useState({});
  const { publicKey, privateKey } = useStore();
  const [activeTab, setActiveTab] = useState("all");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followedCount, setFollowedCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const { followUser, unfollowUser, isFollowed } = useNostr();

  useEffect(() => {
    loadProfileData();
  }, []); // [pubkey, publicKey]

  async function loadProfileData() {
    setLoading(true);
    setIsFollowing(isFollowed(pubkey));

    const followed = await fetchFollowedUsers(pubkey);
    const followers = await fetchFollowedUsers();
    try {
      const [userProfile, userPosts] = await Promise.all([
        fetchUserProfile(pubkey),
        fetchUserPosts(pubkey),
      ]);
      setProfile(userProfile);
      setPosts(userPosts.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Błąd ładowania danych profilu:", error);
    } finally {
      setLoading(false);
    }
    setFollowedCount(followed.length);
    setFollowersCount(
      followers.filter((f) => f.followed.includes(pubkey)).length,
    );
    //  setFollowersCount(followers.length);
  }

  async function handleVote(postId, postAuthor, isUpvote) {
    if (!privateKey || votingStates[postId]) return;

    setVotingStates((prev) => ({ ...prev, [postId]: true }));
    try {
      await vote(postId, postAuthor, isUpvote, privateKey);
      await loadProfileData();
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVotingStates((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleExpandComments(postId) {
    if (!expandedComments[postId]) {
      try {
        const fetchedComments = await fetchComments(postId);
        setComments((prev) => ({ ...prev, [postId]: fetchedComments }));
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    } else {
      setExpandedComments((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handlePublishComment(postId) {
    if (!newComments[postId]?.trim() || !privateKey) return;

    if (newComments[postId].length > 280) {
      alert("Komentarz nie może być dłuższy niż 280 znaków!");
      return;
    }

    setPublishingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      await publishPost(newComments[postId], privateKey, postId);
      setNewComments((prev) => ({ ...prev, [postId]: "" }));
      const fetchedComments = await fetchComments(postId);
      setComments((prev) => ({ ...prev, [postId]: fetchedComments }));
      await loadProfileData();
    } catch (error) {
      console.error("Error publishing comment:", error);
    } finally {
      setPublishingComments((prev) => ({ ...prev, [postId]: false }));
    }
  }

  const filteredPosts = posts.filter((post) => {
    if (activeTab === "all") return true;
    if (activeTab === "mikroblog") return post.tags.includes("mikroblog");
    if (activeTab === "main") return !post.tags.includes("mikroblog");
    return true;
  });

  if (loading) {
    return <div className="spinner" />;
  }

  return (
    <div>
      <div className="card profile">
        <div className="profile__header">
          <div className="profile__avatar">
            {profile?.picture ? (
              <img src={profile.picture} alt={profile.name || "Avatar"} />
            ) : (
              <User size={64} />
            )}
          </div>
          <div className="profile__info">
            <div className="profile__heading">
              <h1>{profile?.name || nip19.npubEncode(pubkey).slice(0, 8)}</h1>
              {publicKey && pubkey !== publicKey && (
                <button
                  type="button"
                  className={`button ${isFollowing ? "button--secondary" : ""}`}
                  onClick={async () => {
                    if (isFollowing) {
                      await unfollowUser(pubkey);
                    } else {
                      await followUser(pubkey);
                    }
                    setIsFollowing(!isFollowing);
                  }}
                >
                  {isFollowing ? "Przestań obserwować" : "Obserwuj"}
                </button>
              )}
            </div>
            {profile?.about && <p className="profile__bio">{profile.about}</p>}
            <div className="profile__meta">
              <span>
                {profile?.name || nip19.npubEncode(pubkey).slice(0, 8)}{" "}
                obserwuje: {followedCount}
              </span>
              <span>Liczba obserwujących: {followersCount}</span>
              <span>
                <User size={16} />
                {nip19.npubEncode(pubkey).slice(0, 12)}...
              </span>

              {profile?.created_at && (
                <span>
                  <Calendar size={16} />
                  Dołączył(a):{" "}
                  {format(profile.created_at * 1000, "MMMM yyyy", {
                    locale: pl,
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
        {pubkey === publicKey && (
          <>
            {showPrivateKey && (
              <div className="profile__private-key">
                <p>Twój klucz prywatny:</p>
                <input
                  type="text"
                  value={privateKey}
                  readOnly
                  className="private-key-input"
                />
              </div>
            )}
            <div className="profile__actions">
              <button
                type="button"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="button"
              >
                {showPrivateKey
                  ? "Ukryj klucz prywatny"
                  : "Pokaż klucz prywatny"}
              </button>
              {/*
              <button
                onClick={() => {
                  // Add functionality to regenerate key here
                }}
                className="button button--secondary"
              >
                Regeneruj klucz prywatny
              </button> */}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === "all" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            Wszystkie wpisy
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "mikroblog" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("mikroblog")}
          >
            Mikroblog
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "main" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("main")}
          >
            Główna
          </button>
        </div>

        {filteredPosts.length === 0 ? (
          <p className="text-light">Brak wpisów do wyświetlenia</p>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className="post">
              <div className="post__votes">
                <button
                  type="button"
                  className={`button ${!publicKey || votingStates[post.id] ? "button--disabled" : ""}`}
                  onClick={() => handleVote(post.id, post.author, true)}
                  disabled={!publicKey || votingStates[post.id]}
                >
                  <ArrowUp size={24} />
                </button>
                <span>{post.votes.up - post.votes.down}</span>
                <button
                  type="button"
                  className={`button ${!publicKey || votingStates[post.id] ? "button--disabled" : ""}`}
                  onClick={() => handleVote(post.id, post.author, false)}
                  disabled={!publicKey || votingStates[post.id]}
                >
                  <ArrowDown size={24} />
                </button>
              </div>
              <div className="post__content">
                <h3>{post.content}</h3>
                <div className="post__meta">
                  <span>
                    {formatDistanceToNow(post.createdAt * 1000, {
                      addSuffix: true,
                      locale: pl,
                    })}
                  </span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleExpandComments(post.id)}
                    className="button button--link"
                  >
                    <MessageSquare size={16} />
                    {post.comments} komentarzy
                  </button>
                </div>

                {expandedComments[post.id] && (
                  <div className="comments">
                    {publicKey && (
                      <div className="comments__form">
                        <div className="post-input-wrapper">
                          <textarea
                            value={newComments[post.id] || ""}
                            onChange={(e) =>
                              setNewComments((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            placeholder="Napisz komentarz... (max 280 znaków)"
                            className="post-input"
                            rows="2"
                            maxLength={280}
                          />
                          <span className="character-count">
                            {(newComments[post.id] || "").length}/280
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePublishComment(post.id)}
                          disabled={
                            publishingComments[post.id] ||
                            !newComments[post.id]?.trim()
                          }
                          className="button"
                        >
                          <Reply size={16} />
                          {publishingComments[post.id]
                            ? "Wysyłanie..."
                            : "Odpowiedz"}
                        </button>
                      </div>
                    )}

                    {comments[post.id]?.map((comment) => (
                      <div key={comment.id} className="comment">
                        <div className="comment__votes">
                          <button
                            type="button"
                            className={`button ${!publicKey || votingStates[comment.id] ? "button--disabled" : ""}`}
                            onClick={() =>
                              handleVote(comment.id, comment.author, true)
                            }
                            disabled={!publicKey || votingStates[comment.id]}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <span>{comment.votes.up - comment.votes.down}</span>
                          <button
                            type="button"
                            className={`button ${!publicKey || votingStates[comment.id] ? "button--disabled" : ""}`}
                            onClick={() =>
                              handleVote(comment.id, comment.author, false)
                            }
                            disabled={!publicKey || votingStates[comment.id]}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                        <div className="comment__content">
                          <p>{comment.content}</p>
                          <div className="comment__meta">
                            <Link to={`/profile/${comment.author}`}>
                              {comment.author.slice(0, 8)}...
                            </Link>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(comment.createdAt * 1000, {
                                addSuffix: true,
                                locale: pl,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Profile;
