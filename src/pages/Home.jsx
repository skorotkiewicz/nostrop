import React, { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, MessageSquare, Send, Reply, User } from "lucide-react";
import { useStore } from "../store/useStore";
import { fetchPosts, publishPost, vote, fetchComments } from "../utils/nostr";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { Link } from "react-router-dom";

function Home() {
  const [posts, setPosts] = useState([ ]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [votingStates, setVotingStates] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [publishingComments, setPublishingComments] = useState({});
  const { publicKey, privateKey } = useStore();

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const fetchedPosts = await fetchPosts();
      setPosts(fetchedPosts.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishPost(e) {
    e.preventDefault();
    if (!newPost.trim() || !privateKey) return;

    setPublishing(true);
    try {
      await publishPost(newPost, privateKey);
      setNewPost("");
      await loadPosts();
    } catch (error) {
      console.error("Error publishing post:", error);
    } finally {
      setPublishing(false);
    }
  }

  async function handleVote(postId, postAuthor, isUpvote) {
    if (!privateKey || votingStates[postId]) return;

    setVotingStates((prev) => ({ ...prev, [postId]: true }));
    try {
      await vote(postId, postAuthor, isUpvote, privateKey);
      await loadPosts();
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
      await loadPosts();
    } catch (error) {
      console.error("Error publishing comment:", error);
    } finally {
      setPublishingComments((prev) => ({ ...prev, [postId]: false }));
    }
  }

  if (loading) {
    return <div className="spinner" />;
  }

  return (
    <div className="card">
      <h2>Gorące dyskusje</h2>
      {posts.length === 0 ? (
        <p className="text-light">Brak postów do wyświetlenia</p>
      ) : (
        posts.map((p) => (
          <div key={p.id}>{renderPost(p)}</div>
        ))
      )}
    </div>
  );

  function renderPost(p) {
    return (
      <>
        {publicKey && (
          <div className="card">
            <form onSubmit={handlePublishPost}>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Co słychać?"
                className="post-input"
                rows="3"
              />
              <button
                type="submit"
                disabled={publishing || !newPost.trim()}
                className="button"
              >
                <Send size={20} />
                {publishing ? "Publikowanie..." : "Opublikuj"}
              </button>
            </form>
          </div>
        )}

        <div className="post">
          <div className="post__votes">
            <button
              type="button"
              className={`button ${!publicKey || votingStates[p.id] ? "button--disabled" : ""
                }`}
              onClick={() => handleVote(p.id, p.author, true)}
              disabled={!publicKey || votingStates[p.id]}
            >
              <ArrowUp size={24} />
            </button>
            <span>{p.votes.up - p.votes.down}</span>
            <button
              type="button"
              className={`button ${!publicKey || votingStates[p.id] ? "button--disabled" : ""
                }`}
              onClick={() => handleVote(p.id, p.author, false)}
              disabled={!publicKey || votingStates[p.id]}
            >
              <ArrowDown size={24} />
            </button>
          </div>
          <div className="post__content">
            <h3>
              <Link to={`/post/${p.id}`}>
                {p.content.split("\n")[0].slice(0, 100) +
                  (p.content.length > 100 ? "..." : "")}
              </Link>
            </h3>
          </div>
        </div>

        {expandedComments[p.id] && (
          <div className="comments">
            {publicKey && (
              <div className="comments__form">
                <textarea
                  value={newComments[p.id] || ""}
                  onChange={(e) =>
                    setNewComments((prev) => ({
                      ...prev,
                      [p.id]: e.target.value,
                    }))
                  }
                  placeholder="Napisz komentarz..."
                  className="post-input"
                  rows="2"
                />
                <button
                  type="button"
                  onClick={() => handlePublishComment(p.id)}
                  disabled={
                    publishingComments[p.id] || !newComments[p.id]?.trim()
                  }
                  className="button"
                >
                  <Reply size={16} />
                  {publishingComments[p.id] ? "Wysyłanie..." : "Odpowiedz"}
                </button>
              </div>
            )}

            {comments[p.id]?.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment__content">
                  <p>{comment.content}</p>
                  <div className="comment__meta">
                    <Link to={`/profile/${comment.author}`}>
                      <span>{comment.profile?.name || comment.author.slice(0, 8)}</span>
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
      </>
    );
  }
}
export default Home;
