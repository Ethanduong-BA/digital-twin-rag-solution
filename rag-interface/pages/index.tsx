import { useChat, Message } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto stretch px-4 text-black">
      <h1 className="text-2xl font-bold text-center mb-8">My Digital Twin AI</h1>
      
      <div className="flex-1 space-y-4 mb-20">
        {messages.map((m: Message) => (
          <div key={m.id} className={`p-4 rounded-lg ${m.role === 'user' ? 'bg-blue-50 ml-10' : 'bg-gray-100 mr-10'}`}>
            <span className="font-bold">{m.role === 'user' ? 'Bạn: ' : 'AI: '}</span>
            {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="fixed bottom-0 w-full max-w-2xl p-4 bg-white border-t">
        <input
          className="w-full p-3 border rounded-full shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          placeholder="Nhập câu hỏi của bạn..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}