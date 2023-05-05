import { useState, useMemo, useEffect, useRef } from "react";
import { App } from "../App";
import { useChat } from "../hooks/use-chat";
import { ChatMessage } from "../components/ChatMessage";
import { appConfig } from "../../config.browser";
import { Welcome } from "../components/Welcome";
import { useLottie } from 'lottie-react';
import animationData from '../assets/green-robot.json';

export default function Index() {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice"
    }
  };

  const { View } = useLottie(defaultOptions);

  // The content of the box where the user is typing
  const [message, setMessage] = useState<string>("");

  // This hook is responsible for managing the chat and communicating with the
  // backend
  const { setCurrentChat, currentChat, chatHistory, sendMessage, cancel, state, clear } =
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
    console.log("STATE", state)
    console.log("HISTORY", chatHistory)
    if (state === "idle") {
      setCurrentChat(null);
    } else if (state === "summarizing") {
      const latestUserChat = chatHistory.filter(obj => obj.role === "user").slice(-1)[0];
      const message = "Summarize the symptoms this text: " + latestUserChat.content;
      sendMessage(message, chatHistory);
    } else if (state === "confirming") {
      const latestUserChat = chatHistory.filter(obj => obj.role === "user").slice(-1)[0];
      const message = "Output 'true' if there is any symptom mentioned in this text: " + latestUserChat.content;
      sendMessage(message, chatHistory);
    } else if (state === "extracting") {
      const secondLatestUserChat = chatHistory.filter(obj => obj.role === "user").slice(-2, -1).pop();
      const message = "Extract the symptoms as a python list in the following text: " + secondLatestUserChat.content;
      sendMessage(message, chatHistory);
    } else if (state === "asking") {
      const secondLatestAssistantChat = chatHistory.filter(obj => obj.role === "assistant").slice(-2, -1).pop();
      const message = "Rephrase this question in the formal way: " + secondLatestAssistantChat.content + " Could you please describe more about your symptoms?";
      sendMessage(message, chatHistory);
    } else if (state === "typing") {
      const latestAssistantChat = chatHistory.filter(obj => obj.role === "assistant").slice(-1)[0];
      fetch("http://127.0.0.1:5000/receiver",
        {
          method: 'POST',
          headers: {
            'Content-type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(latestAssistantChat.content)
        }).then(res => {
          if (res.ok) {
            return res.json()
          } else {
            alert("something is wrong")
          }
        }).then(jsonResponse => {
          console.log(jsonResponse)
          sendMessage(jsonResponse, chatHistory);
        }).catch((err) => console.error(err));
    }
  }, [state]);

  return (
    <App title="Create your own AI chat bot">
      <main className="flex flex-col w-full h-full p-6 bg-white md:rounded-lg md:shadow-md">
        <section className="flex-grow pb-8 mb-4 overflow-y-auto">
          <div className="flex flex-col space-y-4">
            {chatHistory.length === 0 ? (
              <>
                <div className="w-24">{View}</div>
                <Welcome />
              </>
            ) : (
              chatHistory.map((chat, i) => {
                if (chat.show) {
                  return (
                    <ChatMessage key={i} message={chat} />
                  )
                } else {
                  return <></>
                }
              })
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
