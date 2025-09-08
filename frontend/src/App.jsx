import { useState } from "react";
import { login } from "./api";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
      <h1>Testing!</h1>
      <button onClick={() => { localStorage.removeItem("token"); setToken(""); }}>
        Logout
      </button>
    </>
  )
}
