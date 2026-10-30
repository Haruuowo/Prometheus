// Frontend Mock API Layer with support for swapping to live backend endpoints
export const api = {
  // Chat endpoint
  async sendChat({ message, user = "You", systemPrompt = "", temperature = 0.75 }, headers = {}) {
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, user, system_prompt: systemPrompt, temperature })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Mock fallback response
    return {
      reply: `Luna received: "${message}". All Prometheus workspace tools and Second Brain memory are ready.`,
      emotion: "supportive",
      provider: "mock",
      stage_ms: { chat: 1, route: 1, intent: 2, rag: 3, llm: 240, avatar: 1 }
    };
  },

  // Notes / Second Brain
  async getNotes(headers = {}) {
    try {
      const res = await fetch('/brain/search?q=', { headers });
      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
    } catch (e) {}
    return [
      { id: "note_1", title: "Prometheus Architecture", content: "All-in-one AI workspace with 3-column layout and Luna avatar pipeline.", source_type: "note", date: "Today" },
      { id: "note_2", title: "Project Milestones", content: "Frontend tool registry, Firebase Google Auth, Live2D/PNG avatar, and tool auto-routing.", source_type: "note", date: "Yesterday" }
    ];
  },

  async ingestNote({ title, content, sourceType = "note", url = "" }, headers = {}) {
    try {
      const res = await fetch('/brain/ingest', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, source_type: sourceType, url })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { ok: true, note: { id: `mock_${Date.now()}`, title, content, source_type: sourceType, date: "Just now" } };
  },

  // Reminders
  async getReminders(headers = {}) {
    try {
      const res = await fetch('/reminders', { headers });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [
      { id: "rem_1", title: "Sync with team on Prometheus release", time: "Tomorrow, 2:00 PM", status: "pending" },
      { id: "rem_2", title: "Review Second Brain chunks & embeddings", time: "Friday, 5:00 PM", status: "pending" }
    ];
  },

  async addReminder(title, time = "Tomorrow", headers = {}) {
    try {
      const res = await fetch('/reminders', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, time })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { ok: true, reminder: { id: `rem_${Date.now()}`, title, time, status: "pending" } };
  },

  // Summarizer
  async summarizeText(text, headers = {}) {
    try {
      const res = await fetch('/summarize', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      summary: `Key takeaways:\n• Main concept extracted from ${text.length} characters.\n• High-priority action items identified.\n• Structured summary ready for Second Brain storage.`
    };
  },

  // Research
  async researchTopic(topic, headers = {}) {
    try {
      const res = await fetch('/research', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      citations: [
        { title: `Overview of ${topic}`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`, snippet: `Comprehensive analysis and documentation for ${topic}.` },
        { title: `${topic} Technical Specs`, url: `https://github.com/search?q=${encodeURIComponent(topic)}`, snippet: `Open-source implementations, benchmarks, and community discussions.` }
      ],
      insights: `Prometheus Research Engine retrieved top references for "${topic}". Information verified across primary sources.`
    };
  },

  // Writing
  async writeContent({ prompt, format = "article", tone = "concise" }, headers = {}) {
    try {
      const res = await fetch('/write', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, format, tone })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      draft: `# Draft: ${prompt}\n\n**Format:** ${format.toUpperCase()} | **Tone:** ${tone}\n\nHere is your polished piece drafted by Prometheus AI. It incorporates structured headings, clear action items, and natural tone.`
    };
  }
};
