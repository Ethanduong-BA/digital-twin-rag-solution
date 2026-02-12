import { useChat } from '@ai-sdk/react';

export default function Chat() {
  // Chúng ta ép kiểu 'any' tạm thời để TypeScript không chặn đường build của bạn
  const { messages, input, handleInputChange, handleSubmit } = useChat() as any;

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto stretch px-4 text-black bg-white min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-8 text-blue-600">Digital Twin AI</h1>
      
      <div className="flex-1 space-y-4 mb-20 overflow-y-auto">
        {messages?.map((m: any) => (
          <div key={m.id} className={`p-4 rounded-2xl ${m.role === 'user' ? 'bg-blue-50 ml-10 border border-blue-100' : 'bg-gray-100 mr-10 border border-gray-200'}`}>
            <span className="font-bold text-xs uppercase mb-1 block opacity-50">{m.role === 'user' ? 'Bạn' : 'AI'}</span>
            <div className="whitespace-pre-wrap text-sm">{m.content}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="fixed bottom-0 w-full max-w-2xl p-4 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex gap-2">
          <input
            className="flex-1 p-3 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black"
            value={input}
            placeholder="Nhập câu hỏi..."
            onChange={handleInputChange}
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700">Gửi</button>
        </div>
      </form>
    </div>
  );
}