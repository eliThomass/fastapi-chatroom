import { useEffect, useState, useRef } from "react";
import { login, listChats, me, listMessages, sendMessage, listInvites,
        acceptInvite, declineInvite, sendInvite, newAccount, createChat} from "./api";
import "./App.css";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [username, setUsername] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [password, setPassword] = useState("");

  const messagesListRef = useRef(null);

  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newEmail, setNewEmail] = useState("")

  const [receiverId, setReceiverId] = useState("");
  const [invites, setInvites] = useState([]);

  const [newChatName, setChatName] = useState("");
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  const [success, setSuccess] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [notedraft, setnoteDraft] = useState("");
  const [error, setError] = useState("");

  // Add account to database on signup.
  async function handleSignup(e) {
    e.preventDefault();

    if (!newUsername || !newEmail || !newPassword) {
      setError("Please fill username, email, and password.");
      return;
    }
    try {
      const msg = await newAccount(newUsername, newEmail, newPassword);
      setNewPassword("");
      setSuccess("Account created!");
    } catch (err) {
      setError(err.message);
    }
  }

  // Verify username & password are correct
  async function onLogin(e) {
    e.preventDefault();
    try {
      const { access_token } = await login(username, password);
      setToken(access_token);
      localStorage.setItem("token", access_token);
      setPassword("");
      setSuccess("Login Successful!");
    } catch (e) {
      setError(e.message);
    }
  }

  // Clear success messages after 4 seconds
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

  // Clear error messages after 4 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  // If user is logged in with JWT token,
  // We must update all associated variables with that
  // account's respective data
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const u = await me(token);
        setCurrentUser(u.username);
        setCurrentUserId(u.user_id);
        const cs = await listChats(token);
        const invs = await listInvites(token);
        setInvites(invs);
        setChats(cs);
        if (cs.length && !activeChatId) setActiveChatId(cs[0].id);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [token]);

  // Load inital chat messages on selection
  useEffect(() => {
    if (!token || !activeChatId) {
      setMessages([]); // Clear messages if no chat is active
      return;
    }
    listMessages(token, activeChatId, 100)
      .then(ms => {
        setMessages(ms);
      })
      .catch(err => {
        setError(err.message);
      });
  }, [token, activeChatId]);

  // Automatically scroll to bottom of chat (newest messages)
  useEffect(() => {
    if (messagesListRef.current) {
      const messagesContainer = messagesListRef.current;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  // Websocket stuff for grabbing new messages
  useEffect(() => {
    if (!token || !activeChatId) return;


    const WS_BASE = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/^http/, "ws");

    const ws = new WebSocket(
      `${WS_BASE}/gc/${activeChatId}/ws?token=${encodeURIComponent(token)}`
    );

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg?.type === "message" && msg.payload) {
          setMessages(prev => [...prev, msg.payload]);
        }
      } catch {}
    };
    return () => ws.close();
  }, [token, activeChatId]);

  // On logout, clear all variables associated with user.
  function logout() {
    setToken("");
    localStorage.removeItem("token");
    setChats([]);
    setInvites([]);
    setMessages([]);
    setActiveChatId(null);
    setCurrentUser("");
    setCurrentUserId(null);
  }

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  const visibleInvites = currentUserId == null
  ? invites
  : invites.filter(inv => Number(inv.receiver_id) === Number(currentUserId));

  const Toasts = () => (
    (error || success) && (
      <div className="toast-stack">
        {error && <div className="toast toast-error">{error}</div>}
        {success && <div className="toast toast-success">{success}</div>}
      </div>
    )
  );

  // If we do not have a login token, display the login page.
  if (!token) {
    return (
      <div className="auth-shell">
        <Toasts />
        <div className="auth-card">
          <div className="auth-brand">Web Chat App</div>

          <form className="auth-form" onSubmit={onLogin}>
            <div className="field">
              <label>Username</label>
              <input
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                placeholder="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit">Sign in</button>
          </form>

          <div className="auth-divider">or create an account</div>

          <form className="auth-form" onSubmit={handleSignup}>
            <div className="field">
              <label>Username</label>
              <input
                placeholder="username"
                type="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                placeholder="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                placeholder="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button className="btn" type="submit" disabled={!newUsername || !newEmail || !newPassword}>
              Create Account
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Otherwise, if we are logged in, display the homepage.
  return (
    <div className="app-shell">
      <Toasts />

      <div className="topbar">
        <div className="topbar-brand">Web Chat App</div>
        <div className="topbar-user">
          Signed in as <b>{currentUser}</b> (#{currentUserId})
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="app-body">
        <div className="sidebar">
          <div className="panel chats-panel">
            <div className="panel-header">
              <h2>Your Chats</h2>
              <button className="btn btn-sm" onClick={async () => {
                try {
                  const cs = await listChats(token);
                  setChats(cs);
                } catch (e) {
                  setError(e.message);
                }
              }}>
                Refresh
              </button>
            </div>
            <ul>
              {chats.map(c => (
                <li
                  key={c.id}
                  className={`chat-list-item ${c.id === activeChatId ? "active" : ""}`}
                  onClick={() => setActiveChatId(c.id)}
                >
                  <span className="chat-list-item-name">{c.name}</span>
                  <span className="chat-list-item-id">#{c.id}</span>
                </li>
              ))}
              {!chats.length && <li className="empty-state">No chats yet</li>}
            </ul>
          </div>

          <div className="panel invites-panel">
            <div className="panel-header">
              <h2>Invites</h2>
              <button className="btn btn-sm" onClick={async () => {
                try {
                  const invs = await listInvites(token);
                  setInvites(invs);
                } catch (e) {
                  setError(e.message);
                }
              }}>
                Refresh
              </button>
            </div>
            <ul>
              {visibleInvites.map(inv => (
                <li className="invite-item" key={inv.id}>
                  <div className="invite-item-meta">From <b>{inv.sender_id}</b> · Chat #{inv.chat_id}</div>
                  <div className="invite-item-text">{inv.text}</div>
                  <div className="invite-status" title={new Date(inv.created_at).toLocaleString()}>
                    {inv.status} · {new Date(inv.created_at).toLocaleString()}
                  </div>

                  {inv.status === "pending" ? (
                    <div className="invite-actions">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={async () => {
                          try {
                            await acceptInvite(token, inv.id);
                            setInvites(prev => prev.map(i => i.id === inv.id ? { ...i, status: "accepted" } : i));
                            setActiveChatId(inv.chat_id);
                            const cs = await listChats(token);
                            setChats(cs);
                          } catch (e) { setError(e.message); }
                        }}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={async () => {
                          try {
                            await declineInvite(token, inv.id);
                            setInvites(prev => prev.map(i => i.id === inv.id ? { ...i, status: "declined" } : i));
                          } catch (e) { setError(e.message); }
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <div className="invite-actions">
                      <button className="btn btn-sm" onClick={() => setActiveChatId(inv.chat_id)}>Go to chat</button>
                    </div>
                  )}
                </li>
              ))}
              {!visibleInvites.length && <li className="empty-state">No invites</li>}
            </ul>
          </div>
        </div>

        <div className="panel chat-main">
          <div className="chat-main-header">
            <h2>{activeChat?.name || "Select a chat"}</h2>
            {activeChat && <span>#{activeChat.id}</span>}
          </div>

          <div className="messages-list" ref={messagesListRef}>
            {messages.map((m) => {
              const isOwn = (m.author_username ?? m.account_id) === currentUser
                || Number(m.account_id) === Number(currentUserId);
              return (
                <div className={`message-row ${isOwn ? "own" : ""}`} key={m.id}>
                  <div className="message-bubble">
                    <div className="message-meta">
                      <b>{m.author_username ?? m.account_id}</b>
                      <span>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div className="message-text">{m.text}</div>
                  </div>
                </div>
              );
            })}
            {!messages.length && <div className="empty-state">No messages yet... say hello!</div>}
          </div>

          <form className="composer" onSubmit={async e => {
            e.preventDefault();
            if (!draft.trim()) return;

            try {
              await sendMessage(token, activeChatId, draft);
            } catch (err) {
              console.error(err);
              setDraft(draft);
              setError("Failed to send message.");
            }

            setDraft("");
          }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={activeChatId ? "Type a message…" : "Select a chat first"}
              disabled={!activeChatId}
            />
            <button className="btn btn-primary" type="submit" disabled={!activeChatId}>Send</button>
          </form>
        </div>

        <div className="side-forms">
          <div className="panel">
            <div className="panel-header">
              <h2>Send Invite</h2>
            </div>
            <form className="panel-body" onSubmit={async e => {
              e.preventDefault();
              if (!notedraft.trim() || !receiverId || !activeChatId) {
                setError("Pick a chat and fill Receiver ID + Message.");
                return;
              }

              setIsSendingInvite(true);
              try {
                const created = await sendInvite(
                  token,
                  Number(receiverId),
                  Number(activeChatId),
                  notedraft.trim()
                );
                setInvites(prev => [created, ...prev]);
                setnoteDraft("");
                setReceiverId("");
                setSuccess("Invite successfully sent!");
              } catch (err) {
                setError(err.message);
              } finally {
                setIsSendingInvite(false);
              }
            }}>
              <div className="field">
                <label>Receiver ID</label>
                <input
                  value={receiverId}
                  onChange={e => setReceiverId(e.target.value)}
                  placeholder="e.g. 42"
                />
              </div>
              <div className="field">
                <label>Message</label>
                <input
                  value={notedraft}
                  onChange={e => setnoteDraft(e.target.value)}
                  placeholder="Invite note"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={isSendingInvite}>Send</button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>New Chat</h2>
            </div>
            <form className="panel-body" onSubmit={async e => {
              e.preventDefault();
              if (!newChatName) {
                setError("No chat name provided.");
                return;
              }

              try {
                const created = await createChat(token, newChatName);
                setChats(prev => [created, ...prev]);
                setActiveChatId(created.id);
                setChatName("");
              } catch (err) {
                setError(err.message);
              }
            }}>
              <div className="field">
                <label>Chat Name</label>
                <input
                  value={newChatName}
                  onChange={e => setChatName(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={!newChatName}>Create</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
