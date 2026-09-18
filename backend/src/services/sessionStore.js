import { randomUUID } from "node:crypto";
import { ChatSession } from "../models/ChatSession.js";
import { mongoReady } from "../db.js";

const memory = new Map();

function emptySession(sessionId) {
  return {
    sessionId,
    requirements: { budget: null, currency: "INR", items: [], preferences: [] },
    visualContext: null,
    messages: []
  };
}

export async function getSession(sessionId) {
  const id = sessionId || randomUUID();
  if (mongoReady) {
    let doc = await ChatSession.findOne({ sessionId: id });
    if (!doc) {
      doc = await ChatSession.create(emptySession(id));
    }
    return doc.toObject();
  }
  if (!memory.has(id)) memory.set(id, emptySession(id));
  return memory.get(id);
}

export async function saveSession(session) {
  if (mongoReady) {
    await ChatSession.findOneAndUpdate(
      { sessionId: session.sessionId },
      session,
      { upsert: true }
    );
    return session;
  }
  memory.set(session.sessionId, session);
  return session;
}

export async function appendMessage(session, role, content) {
  session.messages = [...(session.messages || []), { role, content, createdAt: new Date() }].slice(-20);
  return saveSession(session);
}
