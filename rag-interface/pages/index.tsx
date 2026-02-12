import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I am the Digital Twin. Ask me anything about my professional background." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mx-auto">Digital Twin AI</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl mx-auto w-full">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-600" : "bg-purple-600"}`}>
              {msg.role === "user" ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
            </div>
            <div className={`p-4 rounded-2xl max-w-[80%] leading-relaxed shadow-sm ${msg.role === "user" ? "bg-white border border-gray-200 text-gray-900" : "bg-white text-gray-800"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-center text-sm text-gray-400">Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 sticky bottom-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center shadow-lg rounded-full bg-white border border-gray-200 p-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 pl-6 pr-12 py-3 bg-transparent outline-none text-gray-700"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading} className="p-3 bg-gray-900 rounded-full hover:bg-black transition-colors">
            <Send size={18} className="text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}