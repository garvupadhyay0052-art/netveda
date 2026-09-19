// =========================================================
// NETVEDA CHATBOT FRONTEND
// =========================================================

const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const chatbot = document.getElementById("chatbot");
const chatFloat = document.getElementById("chat-float");
const chatWelcome = document.getElementById("chat-welcome");
const mobileNav = document.getElementById("mobile-nav");

let isSending = false;
let unifiedContext = {
    originalMessage: null,
    phoneNumber: null,
    customerType: null,
    name: null,
    waitingFor: null
};
let conversationHistory = [];


// =========================================================
// OPEN CHAT
// =========================================================

function openChat() {

    if (!chatbot) return;

    chatbot.classList.add("active");

    chatbot.classList.remove("minimized");

    chatbot.setAttribute(
        "aria-hidden",
        "false"
    );

    if (chatFloat) {
        chatFloat.classList.add("hidden");
    }

    if (chatInput) {

        setTimeout(function() {

            chatInput.focus();

        }, 150);

    }
}


// =========================================================
// CLOSE CHAT
// =========================================================

function closeChat() {

    if (!chatbot) return;

    chatbot.classList.remove("active");

    chatbot.classList.remove("minimized");

    chatbot.setAttribute(
        "aria-hidden",
        "true"
    );

    if (chatFloat) {
        chatFloat.classList.remove("hidden");
    }
}


// =========================================================
// MINIMIZE CHAT
// =========================================================

function minimizeChat() {

    if (!chatbot) return;

    chatbot.classList.toggle("minimized");

    if (
        !chatbot.classList.contains("minimized")
        && chatInput
    ) {

        setTimeout(function() {

            chatInput.focus();

        }, 100);

    }
}


// =========================================================
// MOBILE MENU
// =========================================================

function toggleMobileMenu() {

    if (!mobileNav) return;

    mobileNav.classList.toggle("active");
}


function closeMobileMenu() {

    if (!mobileNav) return;

    mobileNav.classList.remove("active");
}


// =========================================================
// PAGE ACTIONS
// =========================================================

function scrollToPlans() {

    const plans =
        document.getElementById("plans");

    if (!plans) return;

    plans.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// =========================================================
// CUSTOMER RECORDS
// =========================================================

async function loadCustomerRecords() {

    const recordsBody =
        document.getElementById("customer-records-body");

    if (!recordsBody) return;

    recordsBody.innerHTML = "<tr><td colspan=\"7\">Loading records...</td></tr>";

    try {
        const response = await fetch("/customer-records");
        if (!response.ok) throw new Error("Unable to load records");

        const data = await response.json();
        recordsBody.innerHTML = "";

        if (!data.records || data.records.length === 0) {
            recordsBody.innerHTML =
                "<tr><td colspan=\"7\">No customer records found.</td></tr>";
            return;
        }

        data.records.forEach(function(record) {
            const row = document.createElement("tr");
            const values = [
                record.customer_id,
                record.name,
                record.phone_number,
                record.ticket_id || "-",
                record.query_text || "-",
                record.ticket_status || "-",
                record.source_surface || "-"
            ];

            values.forEach(function(value) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            recordsBody.appendChild(row);
        });
    } catch (error) {
        console.error("NetVeda records error:", error);
        recordsBody.innerHTML =
            "<tr><td colspan=\"7\">Could not load customer records.</td></tr>";
    }
}


// =========================================================
// PLAN BUTTON
// =========================================================

function askAboutPlan(planName) {

    openChat();

    sendQuickMessage(
        "Tell me about " + planName
    );
}


// =========================================================
// QUICK MESSAGE
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
// ADD MESSAGE
// =========================================================

function addMessage(
    message,
    sender,
    id = null
) {

    if (!chatWindow) return;

    const messageDiv =
        document.createElement("div");

    if (sender === "user") {

        messageDiv.className =
            "message user-message";

    } else {

        messageDiv.className =
            "message bot-message";

    }

    if (id) {
        messageDiv.id = id;
    }

    const messageContent =
        document.createElement("div");

    messageContent.className =
        "message-content";

    messageContent.innerHTML =
        formatMessage(message);

    messageDiv.appendChild(
        messageContent
    );

    chatWindow.appendChild(
        messageDiv
    );

    chatWindow.scrollTop =
        chatWindow.scrollHeight;
}


function addPlanOptions(options) {

    if (!chatWindow || !options || !options.length) return;

    const actions = document.createElement("div");
    actions.className = "chat-plan-options";

    options.forEach(function(plan) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = plan;
        button.addEventListener("click", function() {
            sendQuickMessage("Tell me about " + plan);
        });
        actions.appendChild(button);
    });

    chatWindow.appendChild(actions);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}


// =========================================================
// FORMAT MESSAGE
// =========================================================

function formatMessage(message) {

    if (!message) return "";

    let safeMessage =
        String(message)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Convert **text** to bold

    safeMessage =
        safeMessage.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

    // Convert line breaks

    safeMessage =
        safeMessage.replace(
            /\n/g,
            "<br>"
        );

    return safeMessage;
}


// =========================================================
// THINKING MESSAGE
// =========================================================

function showThinkingMessage() {

    removeThinkingMessage();

    if (!chatWindow) return;

    const messageDiv =
        document.createElement("div");

    messageDiv.className =
        "message bot-message";

    messageDiv.id =
        "thinking-message";

    const content =
        document.createElement("div");

    content.className =
        "message-content";

    content.innerHTML = `
        <span class="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
        </span>
    `;

    messageDiv.appendChild(
        content
    );

    chatWindow.appendChild(
        messageDiv
    );

    chatWindow.scrollTop =
        chatWindow.scrollHeight;
}


// =========================================================
// REMOVE THINKING
// =========================================================

function removeThinkingMessage() {

    const thinking =
        document.getElementById(
            "thinking-message"
        );

    if (thinking) {

        thinking.remove();

    }
}


// =========================================================
// SEND MESSAGE
// =========================================================

async function sendMessage() {

    if (!chatInput) return;

    if (isSending) return;

    const message =
        chatInput.value.trim();

    if (!message) return;

    isSending = true;


    if (sendButton) {

        sendButton.disabled = true;

    }


    // Hide welcome screen

    if (chatWelcome) {

        chatWelcome.style.display =
            "none";

    }


    // Show user message

    addMessage(
        message,
        "user"
    );


    // Clear input

    chatInput.value = "";


    // Show thinking

    showThinkingMessage();


    try {

        const requestBody = {
            message: unifiedContext.originalMessage || message,
            surface: "website",
            customer_type: unifiedContext.customerType,
            conversation: conversationHistory.slice(-8)
        };

        if (unifiedContext.waitingFor === "customer_type") {
            const customerType = message.toLowerCase();
            if (["yes", "y", "existing"].includes(customerType)) {
                unifiedContext.customerType = "existing";
            } else if (["no", "n", "new"].includes(customerType)) {
                unifiedContext.customerType = "new";
            }
            requestBody.customer_type = unifiedContext.customerType;
        }

        if (unifiedContext.waitingFor === "ticket_confirmation") {
            const confirmation = message.toLowerCase();
            if (["yes", "y", "sure", "please", "okay", "ok"].includes(confirmation)) {
                requestBody.message =
                    "Please create a support ticket for: " + unifiedContext.originalMessage;
            } else {
                requestBody.message = message;
                unifiedContext = {
                    originalMessage: null,
                    phoneNumber: null,
                    customerType: null,
                    name: null,
                    waitingFor: null
                };
            }
        }

        if (unifiedContext.waitingFor === "phone") {
            requestBody.phone_number = message;
        }

        if (unifiedContext.waitingFor === "name") {
            requestBody.phone_number = unifiedContext.phoneNumber;
            requestBody.name = message;
        }

        if (unifiedContext.customerType === "new" && unifiedContext.name) {
            requestBody.name = unifiedContext.name;
        }

        const response =
            await fetch(
                "/unified-chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(requestBody)
                }
            );


        if (!response.ok) {

            throw new Error(
                "Server returned HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        removeThinkingMessage();


        if (
            data &&
            data.reply
        ) {

            if (data.needs_customer_type) {
                unifiedContext.originalMessage =
                    unifiedContext.originalMessage || message;
                unifiedContext.waitingFor = "customer_type";
            } else if (data.needs_phone) {
                if (unifiedContext.waitingFor === "name") {
                    unifiedContext.name = message;
                }
                unifiedContext.originalMessage =
                    unifiedContext.originalMessage || message;
                unifiedContext.waitingFor = "phone";
            } else if (data.needs_name) {
                if (unifiedContext.waitingFor === "phone") {
                    unifiedContext.phoneNumber = message;
                }
                if (unifiedContext.waitingFor === "name") {
                    unifiedContext.name = message;
                }
                unifiedContext.waitingFor = "name";
            } else if (data.offer_ticket) {
                unifiedContext.originalMessage = message;
                unifiedContext.waitingFor = "ticket_confirmation";
            } else if (data.ticket) {
                unifiedContext = {
                    originalMessage: null,
                    phoneNumber: null,
                    customerType: null,
                    name: null,
                    waitingFor: null
                };
            }

            addMessage(
                data.reply,
                "bot"
            );

            if (data.plan_options) {
                addPlanOptions(data.plan_options);
            }

            conversationHistory.push({
                role: "user",
                content: message
            });
            conversationHistory.push({
                role: "assistant",
                content: data.reply
            });

        } else {

            addMessage(
                "Sorry, I didn't receive a proper response from NetVeda AI.",
                "bot"
            );

        }


    } catch (error) {

        removeThinkingMessage();

        console.error(
            "NetVeda chatbot error:",
            error
        );


        addMessage(
            "Sorry, I cannot connect to the NetVeda AI server right now. Please make sure the FastAPI server is running.",
            "bot"
        );


    } finally {

        isSending = false;


        if (sendButton) {

            sendButton.disabled =
                false;

        }


        if (chatInput) {

            chatInput.focus();

        }

    }
}


// =========================================================
// ENTER KEY
// =========================================================

if (chatInput) {

    chatInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
                && !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );

}


// =========================================================
// ESCAPE
// =========================================================

document.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Escape") {

            closeChat();

            closeMobileMenu();

        }

    }
);


// =========================================================
// PAGE LOAD
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "NetVeda Frontend Loaded Successfully."
        );

        if (chatbot) {

            chatbot.setAttribute(
                "aria-hidden",
                "true"
            );

        }

    }
);