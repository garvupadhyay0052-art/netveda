// =========================================================
// KAIRO AI CHATBOT FRONTEND
// =========================================================

const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const chatbot = document.getElementById("chatbot");
const chatFloat = document.getElementById("chat-float");
const chatWelcome = document.getElementById("chat-welcome");
const mobileNav = document.getElementById("mobile-nav");
const fileInput = document.getElementById("file-input");
const attachmentPreview = document.getElementById("attachment-preview");
const micButton = document.getElementById("mic-button");

let isSending = false;
let selectedFiles = [];
let recognition = null;

// =========================================================
// CHAT OPEN
// =========================================================
function openChat() {
    if (!chatbot) return;
    chatbot.classList.add("active");
    chatbot.classList.remove("minimized");
    chatbot.setAttribute("aria-hidden", "false");
    if (chatFloat) chatFloat.classList.add("hidden");
    if (chatInput) setTimeout(() => chatInput.focus(), 180);
}

// =========================================================
// CHAT CLOSE
// =========================================================
function closeChat() {
    if (!chatbot) return;
    chatbot.classList.remove("active");
    chatbot.classList.remove("minimized");
    chatbot.setAttribute("aria-hidden", "true");
    if (chatFloat) chatFloat.classList.remove("hidden");
}

// =========================================================
// MINIMIZE
// =========================================================
function minimizeChat() {
    if (!chatbot) return;
    chatbot.classList.toggle("minimized");
    if (!chatbot.classList.contains("minimized")) {
        if (chatInput) setTimeout(() => chatInput.focus(), 100);
    }
}

// =========================================================
// MOBILE MENU
// =========================================================
function toggleMobileMenu() {
    if (mobileNav) mobileNav.classList.toggle("active");
}

function closeMobileMenu() {
    if (mobileNav) mobileNav.classList.remove("active");
}

// =========================================================
// PAGE ACTIONS
// =========================================================
function quickMessage(message) {
    openChat();
    sendQuickMessage(message);
}

function sendQuickMessage(message) {
    if (!chatInput) return;
    chatInput.value = message;
    sendMessage();
}

// =========================================================
// FORMAT MESSAGE
// =========================================================
function formatMessage(message) {
    if (!message) return "";

    let safeMessage = String(message)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Markdown Bold
    safeMessage = safeMessage.replace(/\*\*(.*?)\*\*/gs, "<strong>$1</strong>");
    
    // Markdown Italic
    safeMessage = safeMessage.replace(/\*(.*?)\*/gs, "<em>$1</em>");

    // Markdown Links: [text](url)
    safeMessage = safeMessage.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' style='color:#1769e0;text-decoration:underline;'>$1</a>");

    // Line breaks
    safeMessage = safeMessage.replace(/\\n/g, "<br>");

    return safeMessage;
}

// =========================================================
// TEXT TO SPEECH
// =========================================================
function speakText(text, button) {
    if (!("speechSynthesis" in window)) {
        alert("Voice playback is not supported in this browser.");
        return;
    }
    window.speechSynthesis.cancel();
    const cleanText = String(text).replace(/\*\*/g, "");
    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;
    if (button) button.innerHTML = "⏹ Stop";
    speech.onend = function() { if (button) button.innerHTML = "🔊 Listen"; };
    speech.onerror = function() { if (button) button.innerHTML = "🔊 Listen"; };
    window.speechSynthesis.speak(speech);
}

function stopSpeech(button) {
    window.speechSynthesis.cancel();
    if (button) button.innerHTML = "🔊 Listen";
}

// =========================================================
// ADD MESSAGE
// =========================================================
function addMessage(message, sender, id = null) {
    if (!chatWindow) return;
    const messageDiv = document.createElement("div");
    messageDiv.className = sender === "user" ? "message user-message" : "message bot-message";
    if (id) messageDiv.id = id;
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    messageContent.innerHTML = formatMessage(message);
    messageDiv.appendChild(messageContent);

    if (sender === "bot" && message !== "") {
        const listenButton = document.createElement("button");
        listenButton.type = "button";
        listenButton.className = "listen-button";
        listenButton.innerHTML = "🔊 Listen";
        listenButton.onclick = function() {
            if (window.speechSynthesis.speaking) stopSpeech(listenButton);
            else speakText(message, listenButton);
        };
        messageContent.appendChild(document.createElement("br"));
        messageContent.appendChild(listenButton);
    }

    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showThinkingMessage() {
    removeThinkingMessage();
    if (!chatWindow) return;
    const messageDiv = document.createElement("div");
    messageDiv.className = "message bot-message";
    messageDiv.id = "thinking-message";
    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = '<span class="thinking-dots"><span></span><span></span><span></span></span>';
    messageDiv.appendChild(content);
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeThinkingMessage() {
    const thinking = document.getElementById("thinking-message");
    if (thinking) thinking.remove();
}

// =========================================================
// FILE ATTACHMENT
// =========================================================
if (fileInput) {
    fileInput.addEventListener("change", function() {
        selectedFiles = Array.from(fileInput.files);
        renderAttachmentPreview();
    });
}

function renderAttachmentPreview() {
    if (!attachmentPreview) return;
    attachmentPreview.innerHTML = "";
    if (selectedFiles.length === 0) {
        attachmentPreview.style.display = "none";
        return;
    }
    attachmentPreview.style.display = "block";
    selectedFiles.forEach(function(file, index) {
        const chip = document.createElement("div");
        chip.className = "attachment-chip";
        chip.innerHTML = '<span>📎 ' + escapeHTML(file.name) + '</span><button type="button" class="remove-attachment" onclick="removeAttachment(' + index + ')">×</button>';
        attachmentPreview.appendChild(chip);
    });
}

function removeAttachment(index) {
    selectedFiles.splice(index, 1);
    renderAttachmentPreview();
    if (selectedFiles.length === 0 && fileInput) fileInput.value = "";
}

function escapeHTML(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// =========================================================
// VOICE INPUT
// =========================================================
function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Voice input is not supported in this browser. Please use Google Chrome.");
        return;
    }
    if (recognition) {
        recognition.stop();
        recognition = null;
        return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    micButton.classList.add("listening");
    recognition.start();
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        if (chatInput) chatInput.value = transcript;
    };
    recognition.onerror = function(event) {
        console.error("Voice input error:", event.error);
    };
    recognition.onend = function() {
        micButton.classList.remove("listening");
        recognition = null;
    };
}

// =========================================================
// SEND MESSAGE
// =========================================================
async function sendMessage() {
    if (!chatInput || isSending) return;
    const message = chatInput.value.trim();
    if (!message && selectedFiles.length === 0) return;
    isSending = true;
    if (sendButton) sendButton.disabled = true;
    if (chatWelcome) chatWelcome.style.display = "none";

    let finalMessage = message;
    if (selectedFiles.length > 0) {
        const fileNames = selectedFiles.map(file => file.name).join(", ");
        if (finalMessage) finalMessage += "\\n\\n📎 Attached: " + fileNames;
        else finalMessage = "📎 Attached: " + fileNames;
    }

    addMessage(finalMessage, "user");
    chatInput.value = "";
    showThinkingMessage();

    try {
        const response = await fetch("/unified-chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                message: finalMessage,
                surface: "website",
                chatbot_token: localStorage.getItem("kairo_chatbot_token") || undefined
            })
        });

        if (!response.ok) throw new Error("Server returned HTTP " + response.status);
        const data = await response.json();
        removeThinkingMessage();

        if (data && data.reply) addMessage(data.reply, "bot");
        else addMessage("Sorry, I didn't receive a proper response from Kairo AI.", "bot");
    } catch (error) {
        removeThinkingMessage();
        console.error("Kairo chatbot error:", error);
        addMessage("Sorry, I cannot connect to the Kairo AI server right now. Please make sure the FastAPI server is running.", "bot");
    } finally {
        isSending = false;
        if (sendButton) sendButton.disabled = false;
        selectedFiles = [];
        if (fileInput) fileInput.value = "";
        renderAttachmentPreview();
        if (chatInput) chatInput.focus();
    }
}

if (chatInput) {
    chatInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeChat();
        closeMobileMenu();
        window.speechSynthesis.cancel();
    }
});

// =========================================================
// INITIALIZATION
// =========================================================
document.addEventListener("DOMContentLoaded", function() {
    console.log("Kairo AI Frontend Loaded Successfully.");
    if (chatbot) chatbot.setAttribute("aria-hidden", "true");
});

const workspaceSteps = {
    1: {
        kicker: "STEP 01 / TRAIN",
        title: "Let Kairo learn from your public pages.",
        description: "Paste a website link and create a focused knowledge layer for your assistant.",
        action: "Train source"
    },
    2: {
        kicker: "STEP 02 / CUSTOMIZE",
        title: "Give every answer the right tone.",
        description: "Choose a helpful voice, response length, and handoff behavior for your visitors.",
        action: "Save personality"
    },
    3: {
        kicker: "STEP 03 / LAUNCH",
        title: "Put your assistant where people need it.",
        description: "Copy one lightweight embed and bring Kairo to your website, help center, or product.",
        action: "Copy embed code"
    }
};

window.selectWorkspaceStep = function selectWorkspaceStep(step) {
    const config = workspaceSteps[step];
    const panel = document.getElementById("workspace-panel");
    if (!config || !panel) return;

    document.querySelectorAll(".workspace-step").forEach(function(button) {
        button.classList.toggle("active", Number(button.dataset.step) === step);
    });

    const copy = panel.querySelector(".workspace-panel-copy");
    const board = panel.querySelector(".source-board");
    if (!copy || !board) return;

    if (step === 1) {
        copy.innerHTML = '<span class="workspace-kicker">' + config.kicker + '</span><h3>' + config.title + '</h3><p>' + config.description + '</p><form class="train-form" id="train-form" onsubmit="trainWebsite(event)"><input id="training-url" type="url" placeholder="https://yourwebsite.com" aria-label="Website URL to train"><button type="submit">Train source</button></form><p class="workspace-feedback" id="workspace-feedback" aria-live="polite">Waiting for your first source.</p>';
        board.innerHTML = '<div class="source-board-top"><span class="source-live"></span> KNOWLEDGE MAP <span>Ready to learn</span></div><div class="source-node source-node-main">Kairo core <small>Assistant memory</small></div><div class="source-connector connector-one"></div><div class="source-connector connector-two"></div><div class="source-node source-node-one">Website <small>Public pages</small></div><div class="source-node source-node-two">FAQ <small>Manual answers</small></div><div class="source-node source-node-three">Tickets <small>Human handoff</small></div>';
    } else if (step === 2) {
        copy.innerHTML = '<span class="workspace-kicker">' + config.kicker + '</span><h3>Make Kairo feel like your brand.</h3><p>Set the welcome experience your visitors see before their first question.</p><div class="customize-options"><fieldset class="avatar-fieldset"><legend>Avatar</legend><div class="avatar-grid"><button class="avatar-choice selected" type="button" data-avatar="maya" onclick="selectAvatar(this)"><img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Maya avatar"></button><button class="avatar-choice" type="button" data-avatar="sophia" onclick="selectAvatar(this)"><img src="https://randomuser.me/api/portraits/women/68.jpg" alt="Sophia avatar"></button><button class="avatar-choice" type="button" data-avatar="amara" onclick="selectAvatar(this)"><img src="https://randomuser.me/api/portraits/women/65.jpg" alt="Amara avatar"></button><button class="avatar-choice" type="button" data-avatar="james" onclick="selectAvatar(this)"><img src="https://randomuser.me/api/portraits/men/32.jpg" alt="James avatar"></button><button class="avatar-choice" type="button" data-avatar="oliver" onclick="selectAvatar(this)"><img src="https://randomuser.me/api/portraits/men/75.jpg" alt="Oliver avatar"></button><button class="avatar-choice avatar-custom" type="button" data-avatar="custom" onclick="selectAvatar(this)" aria-label="Add custom avatar">+</button></div></fieldset><fieldset><legend>First Message</legend><label><input type="radio" name="message-mode" value="ai" checked> AI Generated</label><label><input type="radio" name="message-mode" value="custom"> Custom</label><textarea id="custom-message" placeholder="Write a welcome message..." disabled></textarea></fieldset><label class="size-control">Size <input id="chat-size" type="range" min="72" max="120" value="92"><span id="chat-size-value">Medium</span></label><fieldset><legend>Alignment</legend><label><input type="radio" name="alignment" value="left" checked> Left side</label><label><input type="radio" name="alignment" value="right"> Right side</label></fieldset></div><button class="workspace-save" type="button" onclick="saveCustomization()">Save customization</button><p class="workspace-feedback" id="workspace-feedback" aria-live="polite">Your current welcome setup is ready.</p>';
        board.innerHTML = '<div class="chat-preview"><span class="preview-kicker">LIVE PREVIEW</span><div class="preview-bubble">Hi, I’m Kairo. How can I help you today?</div><div class="preview-input">Ask Kairo anything <span>↑</span></div></div>';
        const customMessage = document.getElementById("custom-message");
        document.querySelectorAll("input[name='message-mode']").forEach(function(radio) {
            radio.addEventListener("change", function() { customMessage.disabled = radio.value !== "custom"; });
        });
        const sizeInput = document.getElementById("chat-size");
        const sizeValue = document.getElementById("chat-size-value");
        if (sizeInput && sizeValue) {
            sizeInput.addEventListener("input", function() {
                sizeValue.textContent = sizeInput.value < 88 ? "Small" : sizeInput.value > 104 ? "Large" : "Medium";
            });
        }
    } else {
        const token = localStorage.getItem("kairo_chatbot_token");
        const embedCode = `<script src="${window.location.origin}/embed.js" data-chatbot-token="${token || 'YOUR_TOKEN'}"></script>`;
        const safeEmbedCode = embedCode.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const btnState = token ? "" : "disabled";
        const btnOpacity = token ? "1" : "0.5";
        const btnCursor = token ? "pointer" : "not-allowed";
        const feedColor = token ? "" : "color: #d93025; font-weight: bold;";
        const feedText = token ? "Ready to be installed." : "Please train a website first (Step 1).";
        
        copy.innerHTML = `
            <span class="workspace-kicker">${config.kicker}</span>
            <h3>Add Kairo to your website.</h3>
            <p>Copy this code snippet and paste it right before the closing <code>&lt;/body&gt;</code> tag on your website.</p>
            <div class="launch-link" style="flex-direction: column; align-items: stretch; gap: 12px; border: none; padding: 0; background: transparent;">
                <div style="font-family: monospace; font-size: 11.5px; line-height: 1.5; color: #1769e0; background: #f0f7ff; padding: 14px; border-radius: 8px; border: 1px solid #bfdbfe; word-break: break-all; min-width: 0;">${safeEmbedCode}</div>
                <button type="button" style="align-self: flex-start; opacity: ${btnOpacity}; cursor: ${btnCursor};" ${btnState} onclick="copyKairoLink()">Copy code</button>
            </div>
            <p class="workspace-feedback" id="workspace-feedback" aria-live="polite" style="${feedColor}">${feedText}</p>`;
        board.innerHTML = `<div class="launch-preview"><span>KA IRO AI</span><strong>Ready to meet your visitors.</strong><small>Embed code generated</small><div class="launch-check">✓ Code ready to copy</div></div>`;
    }
};

window.saveCustomization = function saveCustomization() {
    const customMessage = document.getElementById("custom-message");
    localStorage.setItem("kairo_customization", JSON.stringify({
        avatar: document.querySelector(".avatar-choice.selected")?.dataset.avatar,
        messageMode: document.querySelector("input[name='message-mode']:checked")?.value,
        message: customMessage?.value || "",
        size: document.getElementById("chat-size")?.value,
        alignment: document.querySelector("input[name='alignment']:checked")?.value
    }));
    applyCustomization();
    selectWorkspaceStep(3);
};

window.selectAvatar = function selectAvatar(button) {
    document.querySelectorAll(".avatar-choice").forEach(function(option) {
        option.classList.remove("selected");
    });
    button.classList.add("selected");
};

window.copyKairoLink = function copyKairoLink() {
    const token = localStorage.getItem("kairo_chatbot_token");
    const feedback = document.getElementById("workspace-feedback");
    if (!token) {
        if (feedback) {
            feedback.textContent = "Error: Please train a website first!";
            feedback.style.color = "#d93025";
            feedback.style.fontWeight = "bold";
        }
        return;
    }
    const embedCode = `<script src="${window.location.origin}/embed.js" data-chatbot-token="${token}"></script>`;
    navigator.clipboard?.writeText(embedCode);
    if (feedback) {
        feedback.textContent = "Embed code copied to your clipboard!";
        feedback.style.color = "";
        feedback.style.fontWeight = "";
    }
};

window.trainWebsite = function trainWebsite(event) {
    event.preventDefault();
    const input = document.getElementById("training-url");
    const feedback = document.getElementById("workspace-feedback");
    if (!input || !feedback) return;

    if (!input.value.trim()) {
        feedback.textContent = "Add a website URL to start training.";
        input.focus();
        return;
    }

    const rawUrl = input.value.trim();
    const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : "https://" + rawUrl;
    feedback.textContent = "Connecting to Kairo and reading your website...";
    trainSource(normalizedUrl, feedback).then(function() {
        input.value = "";
    });
};

async function trainSource(url, feedback) {
    try {
        feedback.textContent = "Creating a new assistant for this website...";
        const createResponse = await fetch("/chatbot/create", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: "Kairo AI"})
        });
        if (!createResponse.ok) throw new Error("Could not create assistant");
        const created = await createResponse.json();
        const token = created.chatbot.public_token;

        localStorage.setItem("kairo_chatbot_token", token);

        feedback.textContent = "Connecting to Kairo and reading your website...";

        const trainResponse = await fetch(
            "/chatbot/" + encodeURIComponent(token) + "/knowledge/link",
            {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({url: url, max_pages: 5})
            }
        );
        const result = await trainResponse.json();

        if (!trainResponse.ok) {
            throw new Error(result.detail || "The website could not be trained");
        }

        feedback.textContent = "Website trained successfully! Kairo analyzed " + (result.pages_crawled || 1) + " pages.";
        selectWorkspaceStep(2);
    } catch (error) {
        console.error("Kairo training error:", error);
        feedback.textContent = error.message || "Training failed. Check the URL and try again.";
    }
}

function applyCustomization() {
    const data = localStorage.getItem("kairo_customization");
    if (!data) return;
    try {
        const settings = JSON.parse(data);
        const avatarMap = {
            "maya": "https://randomuser.me/api/portraits/women/44.jpg",
            "sophia": "https://randomuser.me/api/portraits/women/68.jpg",
            "amara": "https://randomuser.me/api/portraits/women/65.jpg",
            "james": "https://randomuser.me/api/portraits/men/32.jpg",
            "oliver": "https://randomuser.me/api/portraits/men/75.jpg"
        };
        if (settings.avatar && avatarMap[settings.avatar]) {
            const avatarUrl = avatarMap[settings.avatar];
            document.querySelectorAll(".bot-avatar img, .welcome-avatar, .float-avatar img").forEach(function(img) {
                img.src = avatarUrl;
            });
        }
        if (settings.messageMode === "custom" && settings.message) {
            const welcomeText = document.querySelector(".welcome-row p");
            if (welcomeText) {
                welcomeText.innerText = settings.message;
            }
        }
    } catch(e) {
        console.error("Failed to apply customization", e);
    }
}

document.addEventListener("DOMContentLoaded", applyCustomization);

// =========================================================
// LOGIN LOGIC
// =========================================================
window.openLogin = function openLogin() {
    const modal = document.getElementById("login-modal");
    if (!modal) return;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
};

window.closeLogin = function closeLogin() {
    const modal = document.getElementById("login-modal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
};

window.completeLogin = function completeLogin(provider) {
    document.body.classList.add("workspace-unlocked");
    localStorage.setItem("kairo_workspace_unlocked", "true");
    closeLogin();
    const workspace = document.getElementById("workspace");
    if (workspace) {
        workspace.setAttribute("aria-hidden", "false");
        if (typeof selectWorkspaceStep === "function") selectWorkspaceStep(1);
    }
};

document.addEventListener("DOMContentLoaded", function() {
    if (localStorage.getItem("kairo_workspace_unlocked") === "true") {
        document.body.classList.add("workspace-unlocked");
        const workspace = document.getElementById("workspace");
        if (workspace) workspace.setAttribute("aria-hidden", "false");
    }
});