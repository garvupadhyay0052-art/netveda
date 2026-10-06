(function () {
    "use strict";

    var currentScript = document.currentScript;
    var token = (currentScript && currentScript.dataset.chatbotToken) || window.NETVEDA_CHATBOT_TOKEN;
    if (!token) return;

    var scriptUrl = currentScript && currentScript.src;
    var backendOrigin = scriptUrl ? new URL(scriptUrl).origin : window.location.origin;

    // Detect if we are being loaded as the hosted chatbot page (via /chatbot/{token})
    // In that case, window.NETVEDA_CHATBOT_TOKEN is set by the server-rendered HTML
    var isHostedPage = !!window.NETVEDA_CHATBOT_TOKEN;

    // =========================================================
    // EXTERNAL EMBED MODE: Show floating bubble + iframe
    // When the script tag is placed on a 3rd-party website
    // =========================================================
    if (!isHostedPage) {
        var bubble = document.createElement("button");
        bubble.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
        bubble.style.cssText = [
            "position:fixed", "right:20px", "bottom:20px", "width:64px", "height:64px",
            "border:none", "border-radius:50%", "background-color:#1769e0", "color:#fff",
            "box-shadow:0 8px 24px rgba(23,105,224,0.3)", "cursor:pointer", "z-index:2147483647",
            "display:flex", "align-items:center", "justify-content:center", "transition:transform 0.2s ease",
            "padding:0", "margin:0"
        ].join(";");

        var iframe = document.createElement("iframe");
        var htmlTemplate = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NetVeda AI</title><style>body{margin:0;font-family:Arial,sans-serif;background:#09090b}#app{height:100vh}</style></head><body><div id="app"></div><script>window.NETVEDA_CHATBOT_TOKEN="' + token + '";</script><script src="' + backendOrigin + '/embed.js"></script></body></html>';
        iframe.srcdoc = htmlTemplate;
        iframe.style.cssText = [
            "position:fixed", "right:20px", "bottom:100px", "width:390px", "height:650px",
            "max-height:calc(100vh - 120px)", "max-width:calc(100vw - 40px)",
            "border:1px solid #e5e7eb", "border-radius:16px", "z-index:2147483647", "box-shadow:0 12px 40px rgba(0,0,0,.15)",
            "background:#fff", "opacity:0", "pointer-events:none", "transform:translateY(20px)", "transition:all 0.3s ease"
        ].join(";");
        iframe.title = "Kairo AI chatbot";

        var isOpen = false;

        bubble.addEventListener("click", function () {
            isOpen = !isOpen;
            if (isOpen) {
                iframe.style.opacity = "1";
                iframe.style.pointerEvents = "auto";
                iframe.style.transform = "translateY(0)";
                bubble.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            } else {
                iframe.style.opacity = "0";
                iframe.style.pointerEvents = "none";
                iframe.style.transform = "translateY(20px)";
                bubble.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
            }
        });

        bubble.addEventListener("mouseenter", function () { bubble.style.transform = "scale(1.05)"; });
        bubble.addEventListener("mouseleave", function () { bubble.style.transform = "scale(1)"; });

        document.body.appendChild(iframe);
        document.body.appendChild(bubble);
        return;
    }

    // =========================================================
    // HOSTED MODE: Render the full chat UI (inside iframe or direct)
    // =========================================================
    var apiBase = backendOrigin;

    var root = document.getElementById("app");
    if (!root) return;
    root.innerHTML = [
        "<style>",
        "*{box-sizing:border-box;margin:0;padding:0}",
        "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;background:#09090b}",
        ".nv{height:100vh;display:flex;flex-direction:column;background:#09090b;overflow:hidden}",
        ".nv-head{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;background:#09090b}",
        ".nv-btn-icon{width:32px;height:32px;border-radius:50%;background:#1e1e22;color:#a1a1aa;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:background 0.2s}",
        ".nv-btn-icon:hover{background:#27272a;color:#fff}",
        ".nv-head-title{font-weight:600;font-size:15px;color:#e4e4e7}",

        ".nv-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}",
        ".nv-orb-container{position:relative;width:140px;height:140px;margin-bottom:24px;display:flex;justify-content:center;align-items:center}",
        ".nv-orb{width:90px;height:90px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #86efac 0%, #22c55e 30%, #166534 70%, #052e16 100%);box-shadow:0 0 50px 10px rgba(34,197,94,0.25);z-index:2;position:relative}",
        ".nv-orb::after{content:'';position:absolute;top:15%;left:15%;width:25px;height:15px;border-radius:50%;background:rgba(255,255,255,0.4);filter:blur(3px);transform:rotate(-45deg)}",
        ".nv-orb-ring{position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,0.05);box-sizing:border-box}",
        ".nv-orb-ring-1{width:115px;height:115px;animation:spin 8s linear infinite;border-top-color:rgba(34,197,94,0.6)}",
        ".nv-orb-ring-2{width:140px;height:140px;animation:spin 12s linear infinite reverse;border-right-color:rgba(34,197,94,0.4)}",
        "@keyframes spin{100%{transform:rotate(360deg)}}",
        ".nv-welcome-text{color:#a1a1aa;font-size:13px;margin-bottom:24px}",
        ".nv-actions{display:flex;gap:12px;width:100%;justify-content:center;flex-wrap:wrap}",
        ".nv-action-btn{background:#1e1e22;color:#e4e4e7;border:1px solid rgba(255,255,255,0.05);border-radius:20px;padding:10px 16px;font-size:13px;cursor:pointer;transition:all 0.2s}",
        ".nv-action-btn:hover{background:#27272a;border-color:rgba(255,255,255,0.1)}",

        ".nv-messages{flex:1;overflow:auto;padding:20px;display:none;flex-direction:column;gap:16px}",
        ".nv-msg{max-width:85%;padding:12px 16px;border-radius:18px;font-size:14px;line-height:1.5;word-wrap:break-word}",
        ".nv-msg a{color:#86efac;text-decoration:underline}",
        ".nv-bot{background:#1e1e22;color:#e4e4e7;border-bottom-left-radius:6px;align-self:flex-start}",
        ".nv-user{background:#22c55e;color:#000;border-bottom-right-radius:6px;align-self:flex-end}",
        ".nv-user a{color:#064e3b}",

        ".nv-form{padding:16px 20px;background:#09090b}",
        ".nv-input-wrapper{display:flex;align-items:center;background:#1e1e22;border-radius:30px;padding:6px 6px 6px 18px;border:1px solid rgba(255,255,255,0.05);transition:border-color 0.2s}",
        ".nv-input-wrapper:focus-within{border-color:rgba(34,197,94,0.4)}",
        ".nv-input{flex:1;background:transparent;border:none;color:#fff;outline:none;font-size:14px;min-width:0}",
        ".nv-input::placeholder{color:#71717a}",
        ".nv-send{width:36px;height:36px;border-radius:50%;background:#fff;color:#000;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background 0.2s}",
        ".nv-send:hover{background:#e4e4e7}",
        ".nv-typing{display:flex;gap:4px;padding:4px 0}.nv-typing span{width:6px;height:6px;background:#a1a1aa;border-radius:50%;animation:bounce .6s infinite alternate}.nv-typing span:nth-child(2){animation-delay:.15s}.nv-typing span:nth-child(3){animation-delay:.3s}",
        "@keyframes bounce{to{opacity:.3;transform:translateY(-4px)}}",
        "</style>",
        "<div class='nv'>",
        "<div class='nv-head'>",
        "<button class='nv-btn-icon' id='nv-min-btn'>\u2212</button>",
        "<div class='nv-head-title'>Kairo AI</div>",
        "<button class='nv-btn-icon'>+</button>",
        "</div>",

        "<div class='nv-welcome' id='nv-welcome'>",
        "<div class='nv-orb-container'>",
        "<div class='nv-orb'></div>",
        "<div class='nv-orb-ring nv-orb-ring-1'></div>",
        "<div class='nv-orb-ring nv-orb-ring-2'></div>",
        "</div>",
        "<div class='nv-welcome-text'>AI is analyzing your data...</div>",
        "<div class='nv-actions'>",
        "<button class='nv-action-btn' data-msg='Smart Analysis'>\u2728 Smart Analysis</button>",
        "<button class='nv-action-btn' data-msg='Generate Report'>\uD83D\uDCCB Generate Report</button>",
        "</div>",
        "</div>",

        "<div class='nv-messages' id='nv-messages'></div>",

        "<form class='nv-form' id='nv-form'>",
        "<div class='nv-input-wrapper'>",
        "<input class='nv-input' id='nv-input' placeholder='Ask anything...' autocomplete='off'>",
        "<button class='nv-send' type='submit'>",
        "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h14'/><path d='m12 5 7 7-7 7'/></svg>",
        "</button>",
        "</div>",
        "</form>",
        "</div>"
    ].join("");

    var welcome = document.getElementById("nv-welcome");
    var messages = document.getElementById("nv-messages");
    var input = document.getElementById("nv-input");
    var form = document.getElementById("nv-form");
    var minBtn = document.getElementById("nv-min-btn");
    var chatHistory = [];

    // Minimize button — tell parent frame to close the chatbot
    if (minBtn) {
        minBtn.addEventListener("click", function () {
            if (window.parent !== window) {
                window.parent.postMessage("kairo-minimize", "*");
            }
        });
    }

    // Action buttons
    document.querySelectorAll(".nv-action-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var msg = this.getAttribute("data-msg");
            if (msg) {
                input.value = msg;
                form.dispatchEvent(new Event("submit"));
            }
        });
    });

    function formatMessage(text) {
        var safe = String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        safe = safe.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:)[^\s)]+)\)/gi, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        safe = safe.replace(/(^|[\s>])(https?:\/\/[^\s<]+)/gi, '$1<a href="$2" target="_blank" rel="noopener noreferrer">Open link</a>');
        safe = safe.replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>");
        safe = safe.replace(/\*([^\*]+)\*/g, "<em>$1</em>");
        return safe.replace(/\n/g, "<br>");
    }

    function addMessage(text, type) {
        if (welcome.style.display !== "none") {
            welcome.style.display = "none";
            messages.style.display = "flex";
        }
        var item = document.createElement("div");
        item.className = "nv-msg " + (type === "user" ? "nv-user" : "nv-bot");
        item.innerHTML = formatMessage(text);
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
        if (welcome.style.display !== "none") {
            welcome.style.display = "none";
            messages.style.display = "flex";
        }
        var el = document.createElement("div");
        el.className = "nv-msg nv-bot";
        el.id = "nv-typing";
        el.innerHTML = "<div class='nv-typing'><span></span><span></span><span></span></div>";
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
    }

    function removeTyping() {
        var el = document.getElementById("nv-typing");
        if (el) el.remove();
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        var message = input.value.trim();
        if (!message) return;
        input.value = "";
        addMessage(message, "user");
        showTyping();

        fetch(apiBase + "/unified-chat", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "1"
            },
            body: JSON.stringify({
                message: message,
                surface: "website",
                chatbot_token: token,
                conversation: chatHistory.slice(-8)
            })
        })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                removeTyping();
                var reply = data.reply || "I could not generate a response right now.";
                addMessage(reply, "bot");
                chatHistory.push({ role: "user", content: message });
                chatHistory.push({ role: "assistant", content: reply });
            })
            .catch(function () {
                removeTyping();
                addMessage("I cannot connect to the server right now.", "bot");
            });
    });

    // Listen for Enter key
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            form.dispatchEvent(new Event("submit"));
        }
    });
})();
