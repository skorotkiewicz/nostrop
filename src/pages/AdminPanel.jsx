import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, MessageSquare, Ban, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchAllPosts, fetchAllUsers, updateUserRole, banUser, removePost } from '../utils/nostr';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

function AdminPanel() {
  const navigate = useNavigate();
  const { publicKey, profile } = useStore();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState({});

  useEffect(() => {
    if (!publicKey || !profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      navigate('/');
      return;
    }

    loadData();
  }, [publicKey, profile, navigate]);

  async function loadData() {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedPosts] = await Promise.all([
        fetchAllUsers(),
        fetchAllPosts()
      ]);
      setUsers(fetchedUsers);
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRole(userId, newRole) {
    if (processingAction[userId]) return;

    setProcessingAction(prev => ({ ...prev, [userId]: true }));
    try {
      await updateUserRole(userId, newRole);
      await loadData();
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      setProcessingAction(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function handleBanUser(userId, isBanned) {
    if (processingAction[userId]) return;

    setProcessingAction(prev => ({ ...prev, [userId]: true }));
    try {
      await banUser(userId, isBanned);
      await loadData();
    } catch (error) {
      console.error('Error updating user ban status:', error);
    } finally {
      setProcessingAction(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function handleRemovePost(postId) {
    if (processingAction[postId]) return;

    setProcessingAction(prev => ({ ...prev, [postId]: true }));
    try {
      await removePost(postId);
      await loadData();
    } catch (error) {
      console.error('Error removing post:', error);
    } finally {
      setProcessingAction(prev => ({ ...prev, [postId]: false }));
    }
  }

  if (loading) {
    return <div className="spinner" />;
  }

  return (
    <div className="admin-panel">
      <div className="card">
        <div className="admin-panel__header">
          <h1>
            <Shield size={24} />
            Panel {profile?.role === 'admin' ? 'Administratora' : 'Moderatora'}
          </h1>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'users' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <User size={16} />
            Użytkownicy
          </button>
          <button
            className={`tab ${activeTab === 'posts' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <MessageSquare size={16} />
            Wpisy
          </button>
        </div>

        {activeTab === 'users' ? (
          <div className="admin-panel__users">
            <table className="table">
              <thead>
                <tr>
                  <th>Użytkownik</th>
                  <th>Rola</th>
                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className={user.banned ? 'table__row--banned' : ''}>
                    <td>
                      <div className="table__user">
                        {user.picture ? (
                          <img src={user.picture} alt={user.name} />
                        ) : (
                          <User size={24} />
                        )}
                        <div>
                          <strong>{user.name || user.id.slice(0, 8)}</strong>
                          <small>{user.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{user.role || 'user'}</td>
                    <td>
                      {user.banned ? (
                        <span className="badge badge--danger">
                          <Ban size={14} />
                          Zbanowany
                        </span>
                      ) : (
                        <span className="badge badge--success">
                          <CheckCircle size={14} />
                          Aktywny
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="table__actions">
                        {profile?.role === 'admin' && (
                          <select
                            value={user.role || 'user'}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            disabled={processingAction[user.id]}
                          >
                            <option value="user">Użytkownik</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Administrator</option>
                          </select>
                        )}
                        <button
                          className={`button ${user.banned ? 'button--success' : 'button--danger'}`}
                          onClick={() => handleBanUser(user.id, !user.banned)}
                          disabled={processingAction[user.id]}
                        >
                          {user.banned ? (
                            <>
                              <CheckCircle size={16} />
                              Odbanuj
                            </>
                          ) : (
                            <>
                              <Ban size={16} />
                              Zbanuj
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-panel__posts">
            <table className="table">
              <thead>
                <tr>
                  <th>Autor</th>
                  <th>Treść</th>
                  <th>Data</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id}>
                    <td>
                      <div className="table__user">
                        {post.author.picture ? (
                          <img src={post.author.picture} alt={post.author.name} />
                        ) : (
                          <User size={24} />
                        )}
                        <div>
                          <strong>{post.author.name || post.author.id.slice(0, 8)}</strong>
                          <small>{post.author.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="table__content">
                        <p>{post.content}</p>
                        <div className="table__meta">
                          <span>
                            {post.votes.up - post.votes.down} punktów
                          </span>
                          <span>•</span>
                          <span>
                            {post.comments} komentarzy
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {formatDistanceToNow(post.createdAt * 1000, {
                        addSuffix: true,
                        locale: pl
                      })}
                    </td>
                    <td>
                      <button
                        className="button button--danger"
                        onClick={() => handleRemovePost(post.id)}
                        disabled={processingAction[post.id]}
                      >
                        <XCircle size={16} />
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;