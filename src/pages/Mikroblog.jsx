import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, MessageSquare, Send, Reply } from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchPosts, publishPost, vote, fetchComments } from '../utils/nostr';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

function Mikroblog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
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
      const fetchedPosts = await fetchPosts('mikroblog');
      setPosts(fetchedPosts.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishPost(e) {
    e.preventDefault();
    if (!newPost.trim() || !privateKey) return;

    if (newPost.length > 280) {
      alert('Wpis nie może być dłuższy niż 280 znaków!');
      return;
    }

    setPublishing(true);
    try {
      await publishPost(newPost, privateKey, null, 'mikroblog');
      setNewPost('');
      await loadPosts();
    } catch (error) {
      console.error('Error publishing post:', error);
    } finally {
      setPublishing(false);
    }
  }

  async function handleVote(postId, postAuthor, isUpvote) {
    if (!privateKey || votingStates[postId]) return;

    setVotingStates(prev => ({ ...prev, [postId]: true }));
    try {
      await vote(postId, postAuthor, isUpvote, privateKey);
      await loadPosts();
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVotingStates(prev => ({ ...prev, [postId]: false }));
    }
  }

  async function handleExpandComments(postId) {
    if (!expandedComments[postId]) {
      try {
        const fetchedComments = await fetchComments(postId);
        setComments(prev => ({ ...prev, [postId]: fetchedComments }));
        setExpandedComments(prev => ({ ...prev, [postId]: true }));
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    } else {
      setExpandedComments(prev => ({ ...prev, [postId]: false }));
    }
  }

  async function handlePublishComment(postId) {
    if (!newComments[postId]?.trim() || !privateKey) return;

    if (newComments[postId].length > 280) {
      alert('Komentarz nie może być dłuższy niż 280 znaków!');
      return;
    }

    setPublishingComments(prev => ({ ...prev, [postId]: true }));
    try {
      await publishPost(newComments[postId], privateKey, postId, 'mikroblog');
      setNewComments(prev => ({ ...prev, [postId]: '' }));
      const fetchedComments = await fetchComments(postId);
      setComments(prev => ({ ...prev, [postId]: fetchedComments }));
      await loadPosts();
    } catch (error) {
      console.error('Error publishing comment:', error);
    } finally {
      setPublishingComments(prev => ({ ...prev, [postId]: false }));
    }
  }

  if (loading) {
    return <div className="spinner" />;
  }

  return (
    <div>
      {publicKey && (
        <div className="card">
          <form onSubmit={handlePublishPost}>
            <div className="post-input-wrapper">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Co słychać? (max 280 znaków)"
                className="post-input"
                rows="3"
                maxLength={280}
              />
              <span className="character-count">
                {newPost.length}/280
              </span>
            </div>
            <button
              type="submit"
              disabled={publishing || !newPost.trim()}
              className="button"
            >
              <Send size={20} />
              {publishing ? 'Publikowanie...' : 'Opublikuj'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Mikroblog</h2>
        {posts.length === 0 ? (
          <p className="text-light">Brak wpisów do wyświetlenia</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="post">
              <div className="post__votes">
                <button
                  className={`button ${!publicKey || votingStates[post.id] ? 'button--disabled' : ''}`}
                  onClick={() => handleVote(post.id, post.author, true)}
                  disabled={!publicKey || votingStates[post.id]}
                >
                  <ArrowUp size={24} />
                </button>
                <span>{post.votes.up - post.votes.down}</span>
                <button
                  className={`button ${!publicKey || votingStates[post.id] ? 'button--disabled' : ''}`}
                  onClick={() => handleVote(post.id, post.author, false)}
                  disabled={!publicKey || votingStates[post.id]}
                >
                  <ArrowDown size={24} />
                </button>
              </div>
              <div className="post__content">
                <h3>{post.content}</h3>
                <div className="post__meta">
                  <span>przez {post.author.slice(0, 8)}...</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(post.createdAt * 1000, {
                      addSuffix: true,
                      locale: pl
                    })}
                  </span>
                  <span>•</span>
                  <button
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
                            value={newComments[post.id] || ''}
                            onChange={(e) => setNewComments(prev => ({
                              ...prev,
                              [post.id]: e.target.value
                            }))}
                            placeholder="Napisz komentarz... (max 280 znaków)"
                            className="post-input"
                            rows="2"
                            maxLength={280}
                          />
                          <span className="character-count">
                            {(newComments[post.id] || '').length}/280
                          </span>
                        </div>
                        <button
                          onClick={() => handlePublishComment(post.id)}
                          disabled={publishingComments[post.id] || !newComments[post.id]?.trim()}
                          className="button"
                        >
                          <Reply size={16} />
                          {publishingComments[post.id] ? 'Wysyłanie...' : 'Odpowiedz'}
                        </button>
                      </div>
                    )}

                    {comments[post.id]?.map(comment => (
                      <div key={comment.id} className="comment">
                        <div className="comment__votes">
                          <button
                            className={`button ${!publicKey || votingStates[comment.id] ? 'button--disabled' : ''}`}
                            onClick={() => handleVote(comment.id, comment.author, true)}
                            disabled={!publicKey || votingStates[comment.id]}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <span>{comment.votes.up - comment.votes.down}</span>
                          <button
                            className={`button ${!publicKey || votingStates[comment.id] ? 'button--disabled' : ''}`}
                            onClick={() => handleVote(comment.id, comment.author, false)}
                            disabled={!publicKey || votingStates[comment.id]}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                        <div className="comment__content">
                          <p>{comment.content}</p>
                          <div className="comment__meta">
                            <span>przez {comment.author.slice(0, 8)}...</span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(comment.createdAt * 1000, {
                                addSuffix: true,
                                locale: pl
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

export default Mikroblog;