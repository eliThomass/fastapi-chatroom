import { useEffect, useState } from "react";
import { login, listChats, me , listMessages, sendMessage} from "./api";
import "./App.css";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [username, setUsername] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  async function onLogin(e) {
    e.preventDefault();
    setError("");
    try {
      const { access_token } = await login(username, password);
      setToken(access_token);
      localStorage.setItem("token", access_token);
      setPassword("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const u = await me(token);
        setCurrentUser(u.username);
        const cs = await listChats(token);
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
      setMessages((prev) => [...prev, m]);  // append
      setDraft("");
    } catch (e) {
      setError(e.message);
    }
  }

  function logout() {
    setToken("");
    localStorage.removeItem("token");
    setChats([]);
    setMessages([]);
    setActiveChatId(null);
    setCurrentUser("");
  }

  const activeChat = chats.find(c => c.id === activeChatId) || null;


  if (!token) {
    return (
      <div>
        <h2>Login</h2>
        {error && <div>{error}</div>}
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
      </div>
    )
  }

  return (
    <>
      <h1>Homepage</h1>
      {error && <div style={{color: "crimson"}}>{error}</div>}

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
  
      <p>You are logged in as: <b>{username}  </b>
        <button onClick={logout}>Logout</button>
      </p>
    </>
  )
}
