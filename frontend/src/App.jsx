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

  // As long as we have a login token and a active chat selected,
  // we should fetch the message chats every 3 seconds.
  useEffect(() => {
    if (!token || !activeChatId) return;
    let cancelled = false;

    async function fetchMsgs() {
      try {
        const ms = await listMessages(token, activeChatId, 100);
        if (!cancelled) setMessages(ms);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    fetchMsgs();
    const t = setInterval(fetchMsgs, 3000);
    return () => { cancelled = true; clearInterval(t); };
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

  // If we do not have a login token, display the login page.
  if (!token) {
    return (
      <div class="loginbody">
      <div class="login">
        <h2>Login</h2>
        <div id="error">{error}</div>
        <div id="success">{success}</div>
          <div>
            <form onSubmit={onLogin}>
            <input
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              placeholder="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Sign in</button>
          </form>
        </div>

        <div>Or... create a <b> new account</b></div>

        <form onSubmit={handleSignup}>
          <input
            placeholder="username"
            type="username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <input
            placeholder="email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <input
            placeholder="password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="submit" disabled={!newUsername || !newEmail || !newPassword}>Create Account</button>
        </form>


      </div>
      </div>
    )
  }

  // Otherwise, if we are logged in, display the homepage.
  return (
    <>
      <div class="header">
        <h1>👋 Welcome, {currentUser}!</h1>
        <div id="error">
          &nbsp;
          {error}
        </div>
        <div id="success">
          &nbsp;
          {success}
        </div>
        <div class="header-left">
          Logged in as: &nbsp; <b>{currentUser}</b>
          <button id="logout" onClick={logout}>Logout</button>
        </div>
      </div>

      <div class="body">
        <div class="load-chats">
          <button id="load-chat" onClick={async () => {
            try {
              const cs = await listChats(token);
              setChats(cs);
            } catch (e) {
              setError(e.message);
            }
          }}>
            Your Chats
          </button>

          <ul>
            {chats.map(c => (
              <li key={c.id}>
                <div>{c.name}</div>
                <div>id: {c.id}</div>
                <button onClick={() => setActiveChatId(c.id)}>
                  Load Chat
                </button>
              </li>
            ))}
            {!chats.length && <li>No chats yet</li>}
          </ul>

        </div>

        <div class="current-chat-name">
            <strong>{activeChat?.name || "Select a chat"}</strong>
        </div>

        <div class="current-chat">
          <div class="messages-list" ref={messagesListRef}>
            {messages.map((m) => (
              <div class="message" key={m.id}>
                <div>
                  <b>{m.author_username ?? m.account_id}</b>{" "}
                  <span>
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                </div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
          <form onSubmit={async e => {
            e.preventDefault();
            if (!draft.trim()) return;

            const now = new Date().toISOString();

            const newMsg = {
              id: Math.random().toString(36).slice(2),
              user: currentUser,
              text: draft,
              created_at: now,
            };
            setMessages(prev => [...prev, newMsg]);

            try {
              await sendMessage(token, activeChatId, draft);
            } catch (err) {
              console.error(err);
            }

            setDraft("");
          }}>
            Send message
            <input value={draft} onChange={e => setDraft(e.target.value)} />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>

      <div class="send-body">
        <div class="received-invites">
          <button onClick={async () => {
            try {
              const invs = await listInvites(token);
              setInvites(invs);
            } catch (e) {
              setError(e.message);
            }
          }}>
            Your Invites
          </button>

          <ul>
            {visibleInvites.map(inv => (
              <li key={inv.id}>
                <div><b>From:</b> {inv.sender_id} → <b>To:</b> {inv.receiver_id}</div>
                <div><b>Chat:</b> {inv.chat_id}</div>
                <div><b>Message:</b> {inv.text}</div>
                <div title={new Date(inv.created_at).toLocaleString()}>
                  <b>Status:</b> {inv.status} • {new Date(inv.created_at).toLocaleString()}
                </div>

                {inv.status === "pending" ? (
                  <div style={{ marginTop: 6 }}>
                    <button
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
                      onClick={async () => {
                        try {
                          await declineInvite(token, inv.id);
                          setInvites(prev => prev.map(i => i.id === inv.id ? { ...i, status: "declined" } : i));
                        } catch (e) { setError(e.message); }
                      }}
                      style={{ marginLeft: 8 }}
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => setActiveChatId(inv.chat_id)}>Go to chat</button>
                  </div>
                )}
              </li>
            ))}
            {!visibleInvites.length && <li>No invites</li>}
          </ul>
        </div>


        
        <div class="send-invite">
          <form onSubmit={async e => {
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

            <p>Send an invite!</p>

            <div style={{ marginBottom: 8 }}>
              <label>
                Receiver ID: &nbsp;
                <input
                  value={receiverId}
                  onChange={e => setReceiverId(e.target.value)}
                  placeholder="e.g. 42"
                />
              </label>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>
                Message: &nbsp;
                <input
                  value={notedraft}
                  onChange={e => setnoteDraft(e.target.value)}
                  placeholder="Invite note"
                />
              </label>
            </div>
            <button type="submit">Send</button>
          </form>
        </div>

        <div>
          <form onSubmit={async e => {
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
              setError(err);
            }

          }}>
            
            <div class="create-chat">
              <p>Create a new chat</p>
              <label>
                Chat Name: &nbsp;
                <input
                  value={newChatName}
                  onChange={e => setChatName(e.target.value)}
                />
              </label>
            
            <button type="submit" disabled={!newChatName}>Create</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
