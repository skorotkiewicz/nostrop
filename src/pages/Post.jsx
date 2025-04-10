import React, { useState, useEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Send,
  Reply,
  User,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { fetchPost, publishPost, vote, fetchComments } from "../utils/nostr";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { Link, useParams } from "react-router-dom";

function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingStates, setVotingStates] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [publishingComments, setPublishingComments] = useState({});
  const { publicKey, privateKey } = useStore();

  useEffect(() => {
    loadPost();
  }, [id]);

  async function loadPost() {
    try {
      const fetchedPost = await fetchPost(id);
      setPost(fetchedPost);
    } catch (error) {
      console.error("Error loading post:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(postId, postAuthor, isUpvote) {
    if (!privateKey || votingStates[postId]) return;

    setVotingStates((prev) => ({ ...prev, [postId]: true }));
    try {
      await vote(postId, postAuthor, isUpvote, privateKey);
      await loadPost();
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

    setPublishingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      await publishPost(newComments[postId], privateKey, postId);
      setNewComments((prev) => ({ ...prev, [postId]: "" }));
      const fetchedComments = await fetchComments(postId);
      setComments((prev) => ({ ...prev, [postId]: fetchedComments }));
      await loadPost();
    } catch (error) {
      console.error("Error publishing comment:", error);
    } finally {
      setPublishingComments((prev) => ({ ...prev, [postId]: false }));
    }
  }

  if (loading) {
    return <div className="spinner" />;
  }

  if (!post) {
    return <div>Post not found.</div>;
  }

  return (
    <div className="card">
      <div className="post">
        <div className="post__votes">
          <button
            type="button"
            className={`button ${
              !publicKey || votingStates[post.id] ? "button--disabled" : ""
            }`}
            onClick={() => handleVote(post.id, post.author, true)}
            disabled={!publicKey || votingStates[post.id]}
          >
            <ArrowUp size={24} />
          </button>
          <span>{post.votes.up - post.votes.down}</span>
          <button
            type="button"
            className={`button ${
              !publicKey || votingStates[post.id] ? "button--disabled" : ""
            }`}
            onClick={() => handleVote(post.id, post.author, false)}
            disabled={!publicKey || votingStates[post.id]}
          >
            <ArrowDown size={24} />
          </button>
        </div>
        <div className="post__content">
          <h3>{post.content}</h3>
          <div className="post__meta">
            <Link to={`/profile/${post.author}`}>
                {post.profile?.picture ? (
                  <img
                    src={post.profile.picture}
                    alt="avatar"
                    className="avatar"
                  />
                ) : (
                  <User size={24} />
                )}
                <span>{post.profile?.name || post.author.slice(0, 8)}</span>
              </Link>
            <span>•</span>
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
                  <textarea
                    value={newComments[post.id] || ""}
                    onChange={(e) =>
                      setNewComments((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    placeholder="Napisz komentarz..."
                    className="post-input"
                    rows="2"
                  />
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
                      className={`button ${
                        !publicKey || votingStates[comment.id]
                          ? "button--disabled"
                          : ""
                      }`}
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
                      className={`button ${
                        !publicKey || votingStates[comment.id]
                          ? "button--disabled"
                          : ""
                      }`}
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
                        {comment.profile?.picture ? (
                          <img
                            src={comment.profile.picture}
                            alt="avatar"
                            className="avatar"
                          />
                        ) : (
                          <User size={16} />
                        )}
                        <span>
                          {comment.profile?.name ||
                            comment.author.slice(0, 8)}
                        </span>
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
    </div>
  );
}

export default PostPage;