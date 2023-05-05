import { fetchEventSource } from "@fortaine/fetch-event-source";
import { useState, useMemo } from "react";
import { appConfig } from "../../config.browser";

const API_PATH = "/api/chat";
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  show: boolean;
}

/**
 * A custom hook to handle the chat state and logic
 */
export function useChat() {
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<"idle" | "confirming" | "extracting" | "asking" | "typing">("idle");

  // Lets us cancel the stream
  const abortController = useMemo(() => new AbortController(), []);

  /**
   * Cancels the current chat and adds the current chat to the history
   */
  function cancel() {
    setState("idle");
    abortController.abort();
    if (currentChat) {
      const newHistory = [
        ...chatHistory,
        { role: "user", content: currentChat, show: true } as const,
      ];

      setChatHistory(newHistory);
      setCurrentChat("");
    }
  }

  /**
   * Clears the chat history
   */

  function clear() {
    console.log("clear");
    setChatHistory([]);
    setCurrentChat(null);
  }

  /**
   * Sends a new message to the AI function and streams the response
   */
  const sendMessage = (message: string, chatHistory: Array<ChatMessage>) => {
    let chatContent = "";
    const newHistory = [
      ...chatHistory,
      { role: "user", content: message, show: state === "idle" } as const,
    ];

    setChatHistory(newHistory);
    const body = JSON.stringify({
      // Only send the most recent messages. This is also
      // done in the serverless function, but we do it here
      // to avoid sending too much data
      messages: newHistory.slice(-appConfig.historyLength),
    });

    // This is like an EventSource, but allows things like
    // POST requests and headers
    fetchEventSource(API_PATH, {
      body,
      method: "POST",
      signal: abortController.signal,
      // onclose: () => {
      //   console.log("onClose")
      //   setState("idle");
      // },
      onmessage: (event) => {
        setCurrentChat("...");
        if (state === "idle") {
          switch (event.event) {
            case "delta": {
              // This is a new word or chunk from the AI
              const message = JSON.parse(event.data);
              if (message?.role === "assistant") {
                chatContent = "";
                return;
              }
              if (message.content) {
                chatContent += message.content;
              }
              break;
            }
            case "done": {
              // When it's done, we add the message to the history
              // and reset the current chat
              setChatHistory((curr) => [
                ...curr,
                { role: "assistant", content: chatContent, show: false } as const,
              ]);
              // setCurrentChat(null);
              setState("confirming");
            }
            default:
              break;
          }
        } else if (state === "confirming") {
          switch (event.event) {
            case "delta": {
              // This is a new word or chunk from the AI
              const message = JSON.parse(event.data);
              if (message?.role === "assistant") {
                chatContent = "";
                return;
              }
              if (message.content) {
                chatContent += message.content;
              }
              break;
            }
            case "done": {
              // When it's done, we add the message to the history
              // and reset the current chat
              setChatHistory((curr) => [
                ...curr,
                { role: "assistant", content: chatContent, show: false } as const,
              ]);
              // setCurrentChat(null);
              if (chatContent.toLowerCase().includes("true") && !chatContent.toLowerCase().includes("false") && !chatContent.toLowerCase().includes("sorry")) {
                setState("extracting");
              } else {
                setState("asking");
              }
            }
            default:
              break;
          }
        } else if (state === "extracting") {
          switch (event.event) {
            case "delta": {
              // This is a new word or chunk from the AI
              const message = JSON.parse(event.data);
              if (message?.role === "assistant") {
                chatContent = "";
                return;
              }
              if (message.content) {
                chatContent += message.content;
              }
              break;
            }
            case "done": {
              // When it's done, we add the message to the history
              // and reset the current chat
              setChatHistory((curr) => [
                ...curr,
                { role: "assistant", content: chatContent, show: false } as const,
              ]);
              // setCurrentChat(null);
              setState("typing");
            }
            default:
              break;
          }
        } else if (state === "asking") {
          switch (event.event) {
            case "delta": {
              // This is a new word or chunk from the AI
              const message = JSON.parse(event.data);
              if (message?.role === "assistant") {
                chatContent = "";
                return;
              }
              if (message.content) {
                chatContent += message.content;
                setCurrentChat(chatContent);
              }
              break;
            }
            case "done": {
              // When it's done, we add the message to the history
              // and reset the current chat
              setChatHistory((curr) => [
                ...curr,
                { role: "assistant", content: chatContent, show: true } as const,
              ]);
              // setCurrentChat(null);
              setState("idle");
            }
            case "open": {
              // The stream has opened and we should recieve
              // a delta event soon. This is normally almost instant.
              setCurrentChat("...");
              break;
            }
            default:
              break;
          }
        } else if (state === "typing") {
          switch (event.event) {
            case "delta": {
              // This is a new word or chunk from the AI
              const message = JSON.parse(event.data);
              if (message?.role === "assistant") {
                chatContent = "";
                return;
              }
              if (message.content) {
                chatContent += message.content;
                setCurrentChat(chatContent);
              }
              break;
            }
            case "open": {
              // The stream has opened and we should recieve
              // a delta event soon. This is normally almost instant.
              setCurrentChat("...");
              break;
            }
            case "done": {
              // When it's done, we add the message to the history
              // and reset the current chat
              setChatHistory((curr) => [
                ...curr,
                { role: "assistant", content: chatContent, show: true } as const,
              ]);
              setCurrentChat(null);
              setState("idle");
            }
            default:
              break;
          }
        }

      },
    });
  };

  return { sendMessage, currentChat, chatHistory, cancel, clear, state };
}
