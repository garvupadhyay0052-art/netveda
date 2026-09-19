(function () {
    "use strict";

    var currentScript = document.currentScript;
    var token = (currentScript && currentScript.dataset.chatbotToken) || window.NETVEDA_CHATBOT_TOKEN;
    if (!token) return;

    var scriptUrl = currentScript && currentScript.src;
    var backendOrigin = scriptUrl ? new URL(scriptUrl).origin : window.location.origin;
    var isHostedPage = window.parent !== window;

    if (!isHostedPage) {
        var iframe = document.createElement("iframe");
        iframe.src = backendOrigin + "/chatbot/" + encodeURIComponent(token);
        iframe.title = "NetVeda AI chatbot";
        iframe.style.cssText = [
            "position:fixed", "right:20px", "bottom:20px", "width:390px", "height:620px",
            "border:0", "border-radius:22px", "z-index:2147483647", "box-shadow:0 18px 55px rgba(0,0,0,.24)",
            "background:#fff"
        ].join(";");
        document.body.appendChild(iframe);
        return;
    }

    var root = document.getElementById("app");
    if (!root) return;
    root.innerHTML = [
        "<style>",
        "*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#101828}",
        ".nv{height:100vh;display:flex;flex-direction:column;background:#fff}",
        ".nv-head{padding:18px;background:#1769e0;color:#fff;font-weight:700;font-size:18px}",
        ".nv-status{font-size:12px;font-weight:400;margin-top:4px;color:#b8ffd1}",
        ".nv-messages{flex:1;overflow:auto;padding:16px;background:#f8fafc}",
        ".nv-msg{max-width:88%;padding:11px 13px;border-radius:14px;margin:0 0 10px;line-height:1.45;white-space:pre-wrap}",
        ".nv-bot{background:#eaf0f8}.nv-user{margin-left:auto;background:#1769e0;color:#fff}",
        ".nv-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e4e7ec}",
        ".nv-input{min-width:0;flex:1;padding:12px;border:1px solid #1769e0;border-radius:12px;font-size:14px}",
        ".nv-send{border:0;border-radius:12px;background:#1769e0;color:#fff;padding:0 16px;font-weight:700}",
        "</style>",
        "<div class='nv'><div class='nv-head'>Need help? Ask NetVeda.<div class='nv-status'>Online</div></div>",
        "<div class='nv-messages' id='nv-messages'><div class='nv-msg nv-bot'>Hi! I am NetVeda AI. How can I help you today?</div></div>",
        "<form class='nv-form' id='nv-form'><input class='nv-input' id='nv-input' placeholder='Ask me anything...' autocomplete='off'><button class='nv-send'>Send</button></form></div>"
    ].join("");

    var messages = document.getElementById("nv-messages");
    var input = document.getElementById("nv-input");
    var history = [];

    function addMessage(text, type) {
        var item = document.createElement("div");
        item.className = "nv-msg " + (type === "user" ? "nv-user" : "nv-bot");
        item.textContent = text;
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight;
    }

    document.getElementById("nv-form").addEventListener("submit", function (event) {
        event.preventDefault();
        var message = input.value.trim();
        if (!message) return;
        input.value = "";
        addMessage(message, "user");

        fetch("/unified-chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                message: message,
                surface: "website",
                chatbot_token: token,
                conversation: history.slice(-8)
            })
        })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                var reply = data.reply || "I could not generate a response right now.";
                addMessage(reply, "bot");
                history.push({role: "user", content: message});
                history.push({role: "assistant", content: reply});
            })
            .catch(function () {
                addMessage("I cannot connect to NetVeda AI right now.", "bot");
            });
    });
})();
