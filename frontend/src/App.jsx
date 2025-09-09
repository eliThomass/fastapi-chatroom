import { useEffect, useState } from "react";
import { login, listChats, me, listMessages, sendMessage, listInvites, 
        acceptInvite, declineInvite, sendInvite, newAccount, createChat} from "./api";
import "./App.css";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [username, setUsername] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [password, setPassword] = useState("");

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

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

useEffect(() => {
  if (!error) return;
  const t = setTimeout(() => setError(""), 4000);
  return () => clearTimeout(t);
}, [error]);

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

  async function onSend(e) {
    e.preventDefault();
    if (!draft.trim() || !activeChatId) return;
    try {
      const m = await sendMessage(token, activeChatId, draft.trim());
      setMessages((prev) => [...prev, m]);
      setDraft("");
    } catch (e) {
      setError(e.message);
    }
  }

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



  if (!token) {
    return (
      <div>
        <h2>Login</h2>
        {error && <div style={{color: "crimson"}}>{error}</div>}
        {success && <div style={{ color: "green" }}>{success}</div>}
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
        <p>Uses <code>POST /token</code> (form-encoded)</p>

        <p>OR... create a <b>new account</b></p>

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
    )
  }

  return (
    <>
      <h1>Homepage</h1>
      <hr></hr>
      {error && <div style={{color: "crimson"}}>{error}</div>}
      {success && <div style={{ color: "green" }}>{success}</div>}

        <button onClick={async () => {
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

      <hr></hr>


      <div>
        <strong>{activeChat?.name || "Select a chat"}</strong>
      </div>


      <div>
        {messages.map((m) => (
          <div key={m.id}>
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

      <div>
        <form onSubmit={async e => {
          e.preventDefault();
          if (!draft.trim()) return;

          const now = new Date().toISOString();

          const newMsg = {
            id: Math.random().toString(36).slice(2), // temp id
            user: currentUser,                      // you already track this
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

      <hr></hr>

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



      <div>
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

          Send an invite

          <div style={{ marginBottom: 8 }}>
            <label>
              Receiver ID:
              <input
                value={receiverId}
                onChange={e => setReceiverId(e.target.value)}
                placeholder="e.g. 42"
              />
            </label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>
              Message:
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
      <hr></hr>

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
          } catch(err) {
            setError(err);
          }
          
        }}>
        <b>Create a new chat</b>
        <div>
            <label>
              Chat Name:
              <input
                value={newChatName}
                onChange={e => setChatName(e.target.value)}
              />
            </label>
          </div>
          <button type="submit" disabled={!newChatName}>Create</button>
        </form>
      </div>

      
      <p>You are logged in as: <b>{currentUser} ({currentUserId})  </b>
        <button onClick={logout}>Logout</button>
      </p>

    </>
  )
}
