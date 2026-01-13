<script lang="ts">
    import { onMount } from "svelte";
    import { CreateMLCEngine } from "@mlc-ai/web-llm";
    import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
    import type {
        MLCEngine,
        ChatCompletionMessageParam,
        ChatCompletionToolChoiceOption,
        ChatCompletionNamedToolChoice,
    } from "@mlc-ai/web-llm";
    import { saveMessages, loadMessages } from "$lib/db";

    // Configuration
    const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f32_1-MLC"; // A balanced model for browser use

    // State
    let engine: MLCEngine;
    let isLoadingModel = true;
    let isGenerating = false;
    let loadingProgress = "Initializing...";
    let userInput = "";

    // Chat history state
    let messages: ChatCompletionMessageParam[] = [
        {
            role: "system",
            content:
                "You are a helpful AI assistant that has access to any knowledge in your training data and specializes in Linux system administration, with vast knowledge of bash and advanced utilities like sed, awk, and git.",
        },
    ];

    onMount(async () => {
        // 1. Load history from IndexedDB first
        const saved = await loadMessages();
        if (saved && saved.length > 0) {
            messages = saved;
        }

        // 2. Initialize the worker engine
        // We use the `?worker` syntax which Vite understands to load it as a Worker
        const Worker = (await import("$lib/worker?worker")).default;
        const worker = new Worker();

        // 3. Initialize the engine on mount
        engine = await CreateMLCEngine(SELECTED_MODEL, {
            initProgressCallback: (progress) => {
                loadingProgress = progress.text;
            },
        });
        isLoadingModel = false;
    });

    async function sendMessage() {
        if (!userInput.trim() || isGenerating) return;

        // 4. Add user message to UI
        const userMsg: ChatCompletionMessageParam = {
            role: "user",
            content: userInput,
        };
        messages = [...messages, userMsg];
        userInput = "";
        isGenerating = true;

        // 5. Create a placeholder for the AI response
        const aiMsg: ChatCompletionMessageParam = {
            role: "assistant",
            content: "",
        };
        messages = [...messages, aiMsg];

        try {
            // 6. Stream the response
            const chunks = await engine.chat.completions.create({
                messages: messages.slice(0, -1), // Send history excluding the empty placeholder
                stream: true,
            });

            let fullResponse = "";
            for await (const chunk of chunks) {
                const content = chunk.choices[0]?.delta?.content || "";
                fullResponse += content;

                // Update the last message (AI response) in real-time
                messages[messages.length - 1].content = fullResponse;
            }

            await saveMessages(messages);
        } catch (err) {
            console.error(err);
            messages[messages.length - 1].content =
                "Error: Failed to generate response.";
        } finally {
            isGenerating = false;
        }
    }

    function clearHistory() {
        messages = [
            {
                role: "system",
                content:
                    "You are a helpful AI assistant running offline in the browser.",
            },
        ];
        saveMessages(messages);
    }
</script>

<main class="container">
  <div class="header">
    <h1>Offline WebLLM</h1>
    <button class="clear-btn" on:click={clearHistory} disabled={isGenerating}>Clear History</button>
  </div>

  {#if isLoadingModel}
    <div class="loading-box">
      <p>Loading Model...</p>
      <p class="sub-text">{loadingProgress}</p>
    </div>
  {/if}

  <div class="chat-box">
    {#each messages as msg}
      {#if msg.role !== 'system'}
        <div class="message {msg.role}">
          <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>
          <p>{msg.content}</p>
        </div>
      {/if}
    {/each}
  </div>

  <div class="input-area">
    <input 
      bind:value={userInput} 
      on:keydown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
      placeholder="Type a message..." 
      disabled={isLoadingModel || isGenerating}
    />
    <button on:click={sendMessage} disabled={isLoadingModel || isGenerating}>
      Send
    </button>
  </div>
</main>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-family: sans-serif;
    }
    .loading-box {
        padding: 20px;
        background: #f0f0f0;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 20px;
    }
    .sub-text {
        font-size: 0.8em;
        color: #666;
    }
    .chat-box {
        border: 1px solid #ccc;
        height: 500px;
        overflow-y: auto;
        padding: 20px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    .message {
        padding: 10px 15px;
        border-radius: 8px;
        max-width: 80%;
    }
    .message.user {
        align-self: flex-end;
        background-color: #007bff;
        color: white;
    }
    .message.assistant {
        align-self: flex-start;
        background-color: #f1f1f1;
        color: black;
    }
    .input-area {
        margin-top: 20px;
        display: flex;
        gap: 10px;
    }
    input {
        flex-grow: 1;
        padding: 10px;
        border-radius: 4px;
        border: 1px solid #ccc;
    }
    button {
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
</style>
