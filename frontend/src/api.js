const API = import.meta.env.VITE_API_BASE;

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(username, password) {
    const body = new URLSearchParams({
        grant_type: "password",
        username,
        password,
    });

    const res = await fetch(`${API}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Login failed: ${res.status} ${text}`);
    }

    return res.json();
}   

export async function me(token) {
    const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:8000"}/users/me/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load current user");
    return res.json();
}

export async function newAccount(username, email, password) {
    const res = await fetch(`${API}/sign_up`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Send failed: ${res.status} ${msg}`);
    }

}

export async function listChats(token) {
    const res = await fetch(`${API}/gc`, {
        headers: { ...authHeaders(token) },
    });

    if (!res.ok) throw new Error("Failed to load chats");

    return res.json();
}

export async function createChat(token, name) {
    const res = await fetch(`${API}/gc`, {
        method: "POST",
        headers: { 
            ...authHeaders(token), 
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Send failed: ${res.status} ${msg}`);
    }
    return res.json();
}

export async function listMessages(token, chatId, limit = 50) {
    const res = await fetch(`${API}/gc/${chatId}/messages?limit=${limit}`, {
        headers: { ...authHeaders(token) },
    });
    if (!res.ok) throw new Error("Failed to load messages");
    return res.json();
}

export async function sendMessage(token, chatId, text) {
    const res = await fetch(`${API}/gc/${chatId}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(token),
        },
        body: JSON.stringify({ text }),
    });
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Send failed: ${res.status} ${msg}`);
    }
    return res.json();
}

export async function sendInvite(token, receiver_id, chat_id, text) {
    const res = await fetch(`${API}/gc/invites`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(token),
        },
        body: JSON.stringify({ receiver_id, chat_id, text }),
    });
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Send failed: ${res.status} ${msg}`);
    }
    return res.json();
}

export async function listInvites(token, limit = 50) {
    const res = await fetch(`${API}/invites?limit=${limit}`, {
        headers: { ...authHeaders(token) },
    });
    if (!res.ok) throw new Error("Failed to load invites");
    return res.json();
}

export async function acceptInvite(token, inviteId) {
    const res = await fetch(`${API}/invites/${inviteId}/accept`, {
        method: "POST",
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to accept invite");
    return res.json();
}

export async function declineInvite(token, inviteId) {
    const res = await fetch(`${API}/invites/${inviteId}/decline`, {
        method: "POST",
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to decline invite");
    return res.json();
}