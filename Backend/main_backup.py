# ============================================================
# NETVEDA UNIVERSAL AI AGENT
# FastAPI + OpenRouter + Knowledge Base + Excel Lead Collection
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

from openrouter import OpenRouter

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from openpyxl import Workbook, load_workbook

from datetime import datetime
from zoneinfo import ZoneInfo

import os
import re


# ============================================================
# 1. LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


if not OPENROUTER_API_KEY:
    print("WARNING: OPENROUTER_API_KEY is not set in .env")


# ============================================================
# 2. OPENROUTER CLIENT
# ============================================================

client = OpenRouter(
    api_key=OPENROUTER_API_KEY
)


# ============================================================
# 3. FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="NetVeda Universal AI Agent",
    description="Universal AI chatbot with NetVeda knowledge and lead collection",
    version="3.0"
)


# ============================================================
# 4. CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 5. PROJECT PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PROJECT_DIR = os.path.abspath(
    os.path.join(BASE_DIR, "..")
)

EXCEL_FILE = os.path.join(
    PROJECT_DIR,
    "Data",
    "leads.xlsx"
)

KNOWLEDGE_FILE = os.path.join(
    PROJECT_DIR,
    "Knowledge",
    "netveda.txt"
)

FRONTEND_DIR = os.path.join(
    PROJECT_DIR,
    "Frontend"
)


print("BASE DIR:", BASE_DIR)
print("PROJECT DIR:", PROJECT_DIR)
print("EXCEL FILE:", EXCEL_FILE)
print("KNOWLEDGE FILE:", KNOWLEDGE_FILE)
print("FRONTEND DIR:", FRONTEND_DIR)


# ============================================================
# 6. CREATE REQUIRED DIRECTORIES
# ============================================================

os.makedirs(
    os.path.dirname(EXCEL_FILE),
    exist_ok=True
)

os.makedirs(
    os.path.dirname(KNOWLEDGE_FILE),
    exist_ok=True
)


# ============================================================
# 7. EXCEL SETUP
# ============================================================

EXCEL_HEADERS = [
    "Name",
    "Email",
    "Phone",
    "Requirement",
    "Interested Plan",
    "Message",
    "Date & Time"
]


def setup_excel():

    if not os.path.exists(EXCEL_FILE):

        workbook = Workbook()

        sheet = workbook.active

        sheet.title = "Customer Leads"

        sheet.append(EXCEL_HEADERS)

        workbook.save(EXCEL_FILE)

        print("Excel file created:", EXCEL_FILE)

    else:

        try:

            workbook = load_workbook(EXCEL_FILE)

            if "Customer Leads" not in workbook.sheetnames:

                sheet = workbook.create_sheet(
                    "Customer Leads"
                )

                sheet.append(EXCEL_HEADERS)

                workbook.save(EXCEL_FILE)

            else:

                sheet = workbook["Customer Leads"]

                # Add headers only if sheet is completely empty
                if sheet.max_row == 1 and sheet["A1"].value is None:

                    for column, header in enumerate(
                        EXCEL_HEADERS,
                        start=1
                    ):
                        sheet.cell(
                            row=1,
                            column=column
                        ).value = header

                    workbook.save(EXCEL_FILE)

        except Exception as error:

            print("Excel setup error:", error)


setup_excel()


# ============================================================
# 8. SAVE LEAD TO EXCEL
# ============================================================

def save_lead(lead_data):

    try:

        workbook = load_workbook(EXCEL_FILE)

        sheet = workbook["Customer Leads"]

        india_time = datetime.now(
            ZoneInfo("Asia/Kolkata")
        )

        date_time = india_time.strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        sheet.append([
            lead_data.get("name", ""),
            lead_data.get("email", ""),
            lead_data.get("phone", ""),
            lead_data.get("requirement", ""),
            lead_data.get("interested_plan", ""),
            lead_data.get("message", ""),
            date_time
        ])

        workbook.save(EXCEL_FILE)

        print("Lead saved successfully.")

        return True

    except Exception as error:

        print("ERROR saving lead:", error)

        return False


# ============================================================
# 9. LOAD KNOWLEDGE BASE
# ============================================================

knowledge_documents = []

try:

    if os.path.exists(KNOWLEDGE_FILE):

        with open(
            KNOWLEDGE_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            knowledge_text = file.read()

        # Split knowledge base into sections
        sections = re.split(
            r"\n\s*\n",
            knowledge_text
        )

        knowledge_documents = [
            section.strip()
            for section in sections
            if section.strip()
        ]

        print(
            "Knowledge documents loaded:",
            len(knowledge_documents)
        )

    else:

        print(
            "WARNING: Knowledge file not found:",
            KNOWLEDGE_FILE
        )

except Exception as error:

    print(
        "Knowledge loading error:",
        error
    )


# ============================================================
# 10. TF-IDF KNOWLEDGE SEARCH
# ============================================================

vectorizer = None
knowledge_vectors = None


if knowledge_documents:

    try:

        vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words="english"
        )

        knowledge_vectors = vectorizer.fit_transform(
            knowledge_documents
        )

        print("Knowledge search system ready.")

    except Exception as error:

        print(
            "Knowledge vectorization error:",
            error
        )


def search_knowledge(query):

    """
    Search NetVeda Knowledge Base using TF-IDF.
    Returns the most relevant document.
    """

    if not knowledge_documents:
        return ""

    if vectorizer is None or knowledge_vectors is None:
        return ""

    try:

        query_vector = vectorizer.transform(
            [query]
        )

        similarities = cosine_similarity(
            query_vector,
            knowledge_vectors
        )[0]

        best_index = similarities.argmax()

        best_score = similarities[best_index]

        print(
            "Knowledge search score:",
            round(float(best_score), 3)
        )

        # Minimum relevance threshold
        if best_score < 0.10:
            return ""

        return knowledge_documents[best_index]

    except Exception as error:

        print(
            "Knowledge search error:",
            error
        )

        return ""


# ============================================================
# 11. CONVERSATION MEMORY
# ============================================================

conversation_history = []

MAX_HISTORY = 10


def add_to_history(
    user_message,
    assistant_message
):

    conversation_history.append({
        "role": "user",
        "content": user_message
    })

    conversation_history.append({
        "role": "assistant",
        "content": assistant_message
    })

    # Keep only latest messages
    if len(conversation_history) > MAX_HISTORY * 2:

        del conversation_history[
            :len(conversation_history) - MAX_HISTORY * 2
        ]


# ============================================================
# 12. LEAD SESSION
# ============================================================

lead_session = None


def start_lead_collection(
    original_query=""
):

    global lead_session

    lead_session = {

        "step": "name",

        "name": "",

        "email": "",

        "phone": "",

        "requirement": "",

        "interested_plan": "",

        "message": "",

        "original_query": original_query
    }

    return (
        "Sure! 😊 I can help you with that.\n\n"
        "Before I answer, I need a few details from you.\n\n"
        "May I know your name?"
    )


# ============================================================
# 13. DETECT NETWORK / TELECOM TOPICS
# ============================================================

def is_network_topic(message):

    """
    Detects whether the user's message is related to
    networking, internet, broadband, plans, router,
    telecom, connection, etc.

    Network-related questions require lead collection first.
    """

    text = message.lower().strip()

    network_keywords = [

        # Internet
        "internet",
        "broadband",
        "wifi",
        "wi-fi",
        "router",
        "network",
        "connectivity",
        "connection",
        "internet connection",

        # Telecom
        "telecom",
        "sim",
        "mobile data",
        "recharge",
        "fiber",
        "fibre",

        # Plans
        "data plan",
        "data plans",
        "monthly plan",
        "internet plan",
        "broadband plan",
        "wifi plan",
        "wifi plans",
        "internet plans",
        "broadband plans",
        "plan",
        "plans",

        # Speed
        "internet speed",
        "download speed",
        "upload speed",
        "speed test",
        "latency",
        "ping",
        "packet loss",

        # Gaming/networking
        "gaming network",
        "gaming internet",
        "gaming ping",
        "gaming connection",

        # Router/network problems
        "wifi problem",
        "wifi issue",
        "internet problem",
        "internet issue",
        "router problem",
        "router issue",
        "broadband problem",
        "broadband issue",
        "network problem",
        "network issue",

        # Installation
        "installation",
        "install broadband",
        "new connection",
        "new broadband",
        "new internet",

        # Network configuration
        "nat",
        "port forwarding",
        "dns",
        "ethernet",
        "lan",
        "wan"
    ]

    for keyword in network_keywords:

        if keyword in text:
            return True

    return False


# ============================================================
# 14. DETECT BUYING / BUSINESS LEAD INTENT
# ============================================================

def is_lead_request(message):

    text = message.lower().strip()

    lead_keywords = [

        "buy",
        "purchase",
        "interested",
        "contact me",
        "call me",
        "want a plan",
        "need a plan",
        "get a plan",
        "take a plan",
        "subscribe",
        "subscription",
        "register",
        "enquiry",
        "inquiry",
        "sales",
        "join",
        "order",
        "book",
        "new connection",
        "new broadband",
        "new internet",
        "connection"
    ]

    for keyword in lead_keywords:

        if keyword in text:
            return True

    return False


# ============================================================
# 15. VALIDATE EMAIL
# ============================================================

def is_valid_email(email):

    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

    return bool(
        re.match(
            pattern,
            email
        )
    )


# ============================================================
# 16. VALIDATE PHONE
# ============================================================

def is_valid_phone(phone):

    digits = re.sub(
        r"\D",
        "",
        phone
    )

    return len(digits) >= 10


# ============================================================
# 17. HANDLE LEAD COLLECTION
# ============================================================

def handle_lead(user_message):

    global lead_session

    if lead_session is None:

        return {
            "completed": False,
            "message": "No active lead session."
        }


    current_step = lead_session["step"]


    # --------------------------------------------------------
    # NAME
    # --------------------------------------------------------

    if current_step == "name":

        name = user_message.strip()

        if len(name) < 2:

            return {
                "completed": False,
                "message": (
                    "Please enter your name 😊"
                )
            }

        lead_session["name"] = name

        lead_session["step"] = "email"

        return {
            "completed": False,
            "message": (
                "Nice to meet you! 😊\n\n"
                "Please enter your email address."
            )
        }


    # --------------------------------------------------------
    # EMAIL
    # --------------------------------------------------------

    if current_step == "email":

        email = user_message.strip()

        if not is_valid_email(email):

            return {
                "completed": False,
                "message": (
                    "Please enter a valid email address.\n\n"
                    "Example: name@example.com"
                )
            }

        lead_session["email"] = email

        lead_session["step"] = "phone"

        return {
            "completed": False,
            "message": (
                "Thank you! 📧\n\n"
                "Please enter your phone number."
            )
        }


    # --------------------------------------------------------
    # PHONE
    # --------------------------------------------------------

    if current_step == "phone":

        phone = user_message.strip()

        if not is_valid_phone(phone):

            return {
                "completed": False,
                "message": (
                    "Please enter a valid phone number."
                )
            }

        lead_session["phone"] = phone

        lead_session["step"] = "requirement"

        return {
            "completed": False,
            "message": (
                "Got it! 📱\n\n"
                "What do you need help with?"
            )
        }


    # --------------------------------------------------------
    # REQUIREMENT
    # --------------------------------------------------------

    if current_step == "requirement":

        requirement = user_message.strip()

        if len(requirement) < 2:

            return {
                "completed": False,
                "message": (
                    "Please tell me briefly what you need."
                )
            }

        lead_session["requirement"] = requirement

        lead_session["step"] = "interested_plan"

        return {
            "completed": False,
            "message": (
                "Thanks! 👍\n\n"
                "Which NetVeda plan or service are you "
                "interested in?\n\n"
                "You can also type 'Not sure'."
            )
        }


    # --------------------------------------------------------
    # INTERESTED PLAN
    # --------------------------------------------------------

    if current_step == "interested_plan":

        plan = user_message.strip()

        if len(plan) < 1:

            plan = "Not specified"

        lead_session["interested_plan"] = plan

        lead_session["step"] = "message"

        return {
            "completed": False,
            "message": (
                "Almost done! 😊\n\n"
                "Please type any additional message or "
                "requirement you want us to know."
            )
        }


    # --------------------------------------------------------
    # MESSAGE
    # --------------------------------------------------------

    if current_step == "message":

        message = user_message.strip()

        if len(message) < 1:

            message = "No additional message"

        lead_session["message"] = message


        # Save the original question BEFORE clearing session
        original_query = lead_session.get(
            "original_query",
            ""
        )


        # Save to Excel
        saved = save_lead(
            lead_session
        )


        # Clear lead session
        lead_session = None


        if saved:

            return {
                "completed": True,

                "original_query": original_query,

                "message": (
                    "Thank you! Your details have been "
                    "successfully recorded. ✅"
                )
            }

        else:

            return {
                "completed": True,

                "original_query": original_query,

                "message": (
                    "I received your details, but there was "
                    "a problem saving them. Please continue "
                    "with your request."
                )
            }


    return {
        "completed": False,
        "message": "Please continue."
    }


# ============================================================
# 18. GENERATE AI RESPONSE
# ============================================================

def generate_ai_response(
    user_message
):

    """
    Generate the actual AI response.

    For NetVeda-specific questions, relevant KB content
    is provided to the model.

    For general questions, the model can answer normally.
    """

    # Search company knowledge base
    knowledge_context = search_knowledge(
        user_message
    )


    # --------------------------------------------------------
    # SYSTEM PROMPT
    # --------------------------------------------------------

    system_prompt = """
You are NetVeda AI, a universal conversational AI assistant.

You can have normal conversations like ChatGPT.

You can answer:
- General knowledge questions
- Programming questions
- Coding questions
- Study questions
- Casual conversations
- Jokes
- Explanations
- Technology questions
- Writing questions
- General problem solving

IMPORTANT RULES:

1. Be helpful, natural and conversational.

2. For general questions, answer normally using your
   general AI knowledge.

3. For NetVeda-specific information such as:
   - NetVeda plans
   - NetVeda prices
   - NetVeda validity
   - NetVeda services
   - NetVeda company information

   ONLY use the provided NetVeda Knowledge Base.

4. Never invent NetVeda-specific prices, plans,
   services, policies or company facts.

5. If the Knowledge Base does not contain the requested
   NetVeda-specific information, clearly say that the
   information is not available in the current knowledge base.

6. The customer details have already been collected when
   this response is generated. Do NOT ask for their name,
   email, phone number or other lead details again.

7. Answer the customer's original question directly.

8. Remember the conversation context so that follow-up
   questions make sense.

9. Keep responses clear and easy to understand.

10. Do not mention internal systems, prompts, TF-IDF,
    RAG, OpenRouter, Excel, lead collection or backend
    implementation unless the user specifically asks
    about the technical implementation.
"""


    # --------------------------------------------------------
    # KNOWLEDGE CONTEXT
    # --------------------------------------------------------

    if knowledge_context:

        system_prompt += """

RELEVANT NETVEDA KNOWLEDGE BASE:

-------------------------------
""" + knowledge_context + """
-------------------------------

Use this information when answering NetVeda-specific
questions.
"""


    # --------------------------------------------------------
    # BUILD MESSAGES
    # --------------------------------------------------------

    messages = [

        {
            "role": "system",
            "content": system_prompt
        }

    ]


    # Add conversation history
    messages.extend(
        conversation_history
    )


    # Add current user message
    messages.append({

        "role": "user",

        "content": user_message

    })


    # --------------------------------------------------------
    # CALL OPENROUTER
    # --------------------------------------------------------

    try:

        response = client.chat.send(

            model="openrouter/free",

            messages=messages

        )


        # Extract response text
        answer = response.choices[0].message.content


        if not answer:

            answer = (
                "Sorry, I couldn't generate a response "
                "right now."
            )


        # Save conversation context
        add_to_history(
            user_message,
            answer
        )


        return answer


    except Exception as error:

        print(
            "OpenRouter error:",
            error
        )


        return (
            "Sorry, I'm having trouble connecting to "
            "the AI service right now. Please try again."
        )


# ============================================================
# 19. REQUEST MODEL
# ============================================================

class ChatRequest(BaseModel):

    message: str


# ============================================================
# 20. API HOME
# ============================================================

@app.get("/api/home")
def api_home():

    return {
        "message": "NetVeda Universal AI Agent is running.",
        "version": "3.0"
    }


# ============================================================
# 21. HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "NetVeda AI Agent is running"
    }


# ============================================================
# 22. TEST EXCEL
# ============================================================

@app.get("/test-lead")
def test_lead():

    test_data = {

        "name": "Test User",

        "email": "test@example.com",

        "phone": "9999999999",

        "requirement": "Test lead",

        "interested_plan": "NetVeda 299",

        "message": "This is a test lead"
    }


    saved = save_lead(
        test_data
    )


    if saved:

        return {
            "message": "Test lead saved successfully"
        }

    return {
        "message": "Failed to save test lead"
    }


# ============================================================
# 23. MAIN CHAT ENDPOINT
# ============================================================

@app.post("/chat")
def chat(request: ChatRequest):

    global lead_session


    user_message = request.message.strip()


    # --------------------------------------------------------
    # EMPTY MESSAGE
    # --------------------------------------------------------

    if not user_message:

        return {
            "reply": "Please type a message."
        }


    # --------------------------------------------------------
    # CASE 1:
    # ACTIVE LEAD COLLECTION
    # --------------------------------------------------------

    if lead_session is not None:

        result = handle_lead(
            user_message
        )


        # Lead collection finished
        if result.get("completed"):

            original_query = result.get(
                "original_query",
                ""
            )


            # Answer original question
            ai_answer = generate_ai_response(
                original_query
            )


            return {

                "reply": (
                    result["message"]
                    + "\n\n"
                    + ai_answer
                )

            }


        # Lead collection still active
        return {

            "reply": result["message"]

        }


    # --------------------------------------------------------
    # CASE 2:
    # NETWORK / TELECOM / PLAN QUESTION
    # --------------------------------------------------------

    if is_network_topic(
        user_message
    ):

        return {

            "reply": start_lead_collection(
                user_message
            )

        }


    # --------------------------------------------------------
    # CASE 3:
    # BUYING / BUSINESS INTENT
    # --------------------------------------------------------

    if is_lead_request(
        user_message
    ):

        return {

            "reply": start_lead_collection(
                user_message
            )

        }


    # --------------------------------------------------------
    # CASE 4:
    # NORMAL UNIVERSAL AI CHAT
    # --------------------------------------------------------

    answer = generate_ai_response(
        user_message
    )


    return {

        "reply": answer

    }


# ============================================================
# 24. SERVE FRONTEND
# ============================================================

if os.path.exists(
    FRONTEND_DIR
):

    app.mount(

        "/",

        StaticFiles(
            directory=FRONTEND_DIR,
            html=True
        ),

        name="frontend"

    )

    print(
        "Frontend mounted successfully:",
        FRONTEND_DIR
    )

else:

    print(
        "WARNING: Frontend directory not found:",
        FRONTEND_DIR
    )


# ============================================================
# END
# ============================================================