import { useState, useMemo, useEffect, useRef } from "react";
import { App } from "../App";
import { useChat } from "../hooks/use-chat";
import { ChatMessage } from "../components/ChatMessage";
import { appConfig } from "../../config.browser";
import { Welcome } from "../components/Welcome";

export default function Index() {
  // The content of the box where the user is typing
  const [message, setMessage] = useState<string>("");

  // This hook is responsible for managing the chat and communicating with the
  // backend
  const { currentChat, chatHistory, sendMessage, cancel, state, clear } =
    useChat();

  // This is the message that is currently being generated by the AI
  const currentMessage = useMemo(() => {
    return { content: currentChat ?? "", role: "assistant", show: state === "typing" } as const;
  }, [currentChat]);

  // This is a ref to the bottom of the chat history. We use it to scroll
  // to the bottom when a new message is added.
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat, chatHistory, state]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // This is a ref to the input box. We use it to focus the input box when the
  // user clicks on the "Send" button.
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    focusInput();
    if (state === "extracting") {
      const latestAssistantChat = chatHistory.filter(obj => obj.role === "assistant").slice(-1)[0];
      sendMessage("Extract the symptoms if there is any, in the following text: " + latestAssistantChat.content, chatHistory);
    } else if (state === "confirming") {
      const secondLatestAssistantChat = chatHistory.filter(obj => obj.role === "assistant").slice(-2, -1).pop();
      sendMessage("Output 'true' or 'false' without dot, is there any symptom in this text: " + secondLatestAssistantChat.content, chatHistory);
    } else if (state === "asking") {
      sendMessage("Rephrase this question in the formal way: Could you please describe more about your symptoms?", chatHistory);
    }
    console.log("STATE", state)
  }, [state]);

  return (
    <App title="Create your own AI chat bot">
      <main className="flex flex-col w-full h-full p-6 bg-white md:rounded-lg md:shadow-md">
        <section className="flex-grow pb-8 mb-4 overflow-y-auto">
          <div className="flex flex-col space-y-4">
            {chatHistory.length === 0 ? (
              <>
                <Welcome />
                {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {appConfig.samplePhrases.map((phrase) => (
                    <button
                      key={phrase}
                      onClick={() => sendMessage(phrase, chatHistory)}
                      className="p-4 bg-gray-100 border-2 border-gray-300 rounded-lg"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
                <div className="flex justify-center">
                  <p className="mt-5 text-sm text-gray-500">
                    Built with 🤖{" "}
                    <a
                      className="underline"
                      href="https://github.com/ascorbic/daneel"
                    >
                      Daneel
                    </a>
                  </p>
                </div> */}
              </>
            ) : (
              chatHistory.map((chat, i) => (
                <ChatMessage key={i} message={chat} />
              ))
            )}

            {currentChat ? <ChatMessage message={currentMessage} /> : null}
          </div>

          <div ref={bottomRef} />
        </section>
        <div className="flex items-center justify-center h-20">
          {state === "idle" ? null : (
            <button
              className="px-4 py-2 my-8 text-gray-900 bg-gray-100"
              onClick={cancel}
            >
              Stop generating
            </button>
          )}
        </div>
        <section className="p-2 bg-gray-100 rounded-lg">
          <form
            className="flex"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(message, chatHistory);
              setMessage("");
            }}
          >
            {chatHistory.length > 1 ? (
              <button
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-l-lg"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  clear();
                  setMessage("");
                }}
              >
                Clear
              </button>
            ) : null}
            <input
              type="text"
              ref={inputRef}
              className="w-full p-2 rounded-l-lg outline-none"
              placeholder={state == "idle" ? "Type your message..." : "..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={state !== "idle"}
            />
            {state === "idle" ? (
              <button
                className="px-4 py-2 font-bold text-white bg-blue-700 rounded-r-lg"
                type="submit"
              >
                Send
              </button>
            ) : null}
          </form>
        </section>
      </main>
    </App>
  );
}
