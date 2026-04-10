# Jerry Workflow — Complete Node Reference

> Every node available in Jerry, with real-world use cases, parameter explanations, and examples.

---

## 🚦 Trigger Nodes
These nodes **start** a workflow. Every workflow needs one.

---

### ▶️ Start
**Group:** Trigger  
**Purpose:** Manually starts a workflow with optional seed data.

| Parameter | What it does |
|---|---|
| Trigger Data | A JSON object that becomes the first node's input |

**When to use it:**
- Testing a workflow manually from the dashboard
- Workflows that don't need a real event to trigger them

**Example:**
```json
{ "userId": "123", "action": "daily_report" }
```
> Click **Execute** on the toolbar — the workflow starts with that data flowing forward.

---

### 🪝 Webhook
**Group:** Trigger  
**Purpose:** Receives incoming HTTP requests from the outside world and starts the workflow.

| Parameter | What it does |
|---|---|
| Webhook Path | The URL path (e.g. `/my-webhook`) |
| HTTP Method | GET, POST, PUT, DELETE, or Any |
| Authentication | None / Bearer Token / Secret Header |
| Auth Secret | The token value callers must send |
| Response Mode | Respond immediately (202) or wait for workflow to finish |

**When to use it:**
- Receiving WhatsApp messages from Meta
- Stripe payment events
- GitHub push notifications
- Slack slash commands
- Any external service that can call a URL

**Your webhook URL will be:**
```
http://your-server:3001/webhook/{workflowId}/your-path
```
> ⚠️ The workflow must be **Activated** before the webhook will respond.

---

### ⏰ Schedule
**Group:** Trigger  
**Purpose:** Runs the workflow automatically on a timer using cron expressions.

| Parameter | What it does |
|---|---|
| Cron Expression | When to run (e.g. `0 9 * * *`) |
| Timezone | e.g. `Asia/Kolkata`, `UTC` |
| Enabled | Toggle the schedule on/off |

**Cron cheat sheet:**
| Expression | Meaning |
|---|---|
| `*/5 * * * *` | Every 5 minutes |
| `0 9 * * *` | Every day at 9 AM |
| `0 9 * * 1` | Every Monday at 9 AM |
| `0 */2 * * *` | Every 2 hours |
| `0 0 1 * *` | First day of every month |

**When to use it:**
- Checking Gmail inbox every few minutes
- Sending a daily summary report
- Cleaning database records weekly
- Generating invoices monthly

---

## 🌐 Network / HTTP Nodes

---

### 🌐 HTTP Request
**Group:** Regular  
**Purpose:** Calls any external API or website.

| Parameter | What it does |
|---|---|
| Method | GET / POST / PUT / PATCH / DELETE / HEAD |
| URL | The full URL to call |
| Headers | JSON object of request headers |
| Body | JSON/text body for POST/PUT/PATCH |
| Query Parameters | URL query params as JSON |
| Authentication | None / Bearer / Basic Auth / API Key |
| Auth Token | Token/password/key value |
| Timeout (ms) | How long to wait before giving up |
| Follow Redirects | Auto-follow HTTP 301/302 redirects |
| Ignore SSL Errors | Skip SSL certificate check (dev only) |

**Output fields:** `statusCode`, `headers`, `body`, `duration`, `success`

**When to use it:**
- Fetching weather data from an API
- Posting data to a CRM like HubSpot or Salesforce
- Calling OpenAI or any REST API
- Sending data to a Slack/Discord webhook
- Querying your own backend

**Example — GET request:**
- URL: `https://api.coindesk.com/v1/bpi/currentprice.json`
- Method: GET
- Result: `body.bpi.USD.rate` = current Bitcoin price

**Example — POST with auth:**
- URL: `https://api.yourapp.com/users`
- Method: POST
- Auth: Bearer → `your-api-token`
- Body: `{"name": "John", "email": "john@example.com"}`

---

## 📩 Communication Nodes

---

### ✉️ Send Email
**Group:** Communication  
**Purpose:** Sends an email via any SMTP server (Gmail, Outlook, custom).

| Parameter | What it does |
|---|---|
| To | Recipient email(s), comma-separated |
| CC / BCC | Carbon copy / blind copy |
| Subject | Email subject line |
| Message Body | Email content |
| Send as HTML | Treat body as HTML |
| SMTP Host | Server (e.g. `smtp.gmail.com`) |
| SMTP Port | 587 (TLS), 465 (SSL), 25 (plain) |
| SMTP Username | Your email address |
| SMTP Password | Your app password |
| From Name | Display name (e.g. "Jerry Workflows") |

**When to use it:**
- Sending alerts when a workflow fails or succeeds
- Emailing reports to a manager
- Welcome emails to new users
- Order confirmation emails

**Gmail setup:**
1. Go to Google Account → Security → App Passwords
2. Create a password for "Mail"
3. Use `smtp.gmail.com`, port `587`, your Gmail address + app password

---

### 📧 Gmail
**Group:** Communication  
**Purpose:** Sends emails specifically via Gmail using SMTP or simulates without credentials.

Same parameters as Send Email but pre-configured for Gmail (simpler UI).

**Key difference from Send Email:** Defaults to Gmail SMTP — just enter your Gmail + App Password.

---

### 📬 Gmail Reader
**Group:** Communication  
**Purpose:** Reads emails from Gmail inbox via IMAP. Use with a **Schedule** node to poll regularly.

| Parameter | What it does |
|---|---|
| Gmail Address | Your Gmail to read from |
| App Password | Gmail App Password |
| Mailbox Folder | Which folder to check (INBOX, Sent, etc.) |
| Filter | Unread Only / All / Today's |
| Max Emails | How many emails to fetch per run |
| Mark as Read | Mark fetched emails as read (prevents re-processing) |
| Include Body | Fetch full email text |

**Output:** `emails[]` array, each with `from`, `subject`, `body`, `date`, `uid`

**When to use it:**
- Forward new emails to WhatsApp
- Auto-reply to emails with certain subjects
- Log all emails to a spreadsheet/database
- Trigger actions when you receive an invoice

---

### 💬 WhatsApp
**Group:** Communication  
**Purpose:** Sends WhatsApp messages via Meta Business API.

| Parameter | What it does |
|---|---|
| To (Phone Number) | Recipient in international format: `+91XXXXXXXXXX` |
| Message Type | Text or Template |
| Message | Text message content |
| Phone Number ID | From Meta Developer Console |
| Access Token | From Meta Developer Console |

**Simulation mode:** Leave Phone Number ID and Access Token blank — the node logs the message and returns success (great for testing).

**When to use it:**
- Alert yourself when a new order is placed
- Send appointment reminders
- Forward important emails to your WhatsApp
- OTP / notification messages to customers

---

## 🗄️ Data Nodes

---

### ⚙️ Set
**Group:** Data  
**Purpose:** Adds or overwrites fields in the data flowing through the workflow.

| Parameter | What it does |
|---|---|
| Values | JSON object of key-value pairs to add/overwrite |

**Example:**
```json
{ "status": "processed", "timestamp": "2024-01-01", "source": "jerry" }
```
> All existing data passes through, plus your new fields are merged in.

**When to use it:**
- Stamping a processed timestamp
- Setting default values before sending data
- Adding a constant like `environment: "production"`

---

### 💾 Cache
**Group:** Data  
**Purpose:** Store and retrieve temporary data in memory between workflow runs.

| Parameter | What it does |
|---|---|
| Operation | Get / Set / Delete / Clear All |
| Cache Key | Unique string identifier for this cached value |
| Value | JSON value to store (for Set) |
| TTL (seconds) | How long to keep it (0 = forever) |

**Output:** `cacheHit` (true/false), `value` (retrieved data)

**When to use it:**
- Remember the last processed email UID so you don't re-process
- Cache API responses for 1 hour to avoid rate limits
- Share data between two different workflow runs

**Example flow:** Schedule runs every 5 min → Cache GET (`lastEmailUid`) → Gmail Reader → Cache SET (new UID)

---

### 🗄️ Database
**Group:** Data  
**Purpose:** Run SQL queries against a SQLite database (built-in or custom path).

| Parameter | What it does |
|---|---|
| Operation | Select / Insert / Update / Delete / Custom SQL |
| SQL Query | The SQL to execute (use `?` for parameters) |
| Query Parameters | JSON array of `?` values |
| SQLite Database Path | File path to the `.db` file |

**Output:** `databaseResult[]` array (rows returned), `rowCount`

**Example queries:**
```sql
-- Select
SELECT * FROM orders WHERE status = ?
-- parameters: ["pending"]

-- Insert
INSERT INTO logs (message, created_at) VALUES (?, ?)
-- parameters: ["Workflow ran", "2024-01-01"]
```

**When to use it:**
- Log every workflow execution to a table
- Look up user data before sending a message
- Update order status after processing

---

### 📁 File
**Group:** Data  
**Purpose:** Read, write, append, or delete files on the server.

| Parameter | What it does |
|---|---|
| Operation | Read / Write / Append / Delete |
| File Path | Absolute path to the file |
| Format | JSON / CSV / XML / Text |
| Content | Data to write (for write/append) |
| Encoding | Usually `utf8` |

**When to use it:**
- Read a CSV file of contacts to send WhatsApp messages to
- Write an output report to a JSON file
- Append logs to a text file
- Process XML data from an external system

---

### 🔄 Transform
**Group:** Data  
**Purpose:** Reshape, rename, and convert fields in your data.

| Parameter | What it does |
|---|---|
| Field Mappings (JSON) | Array of `{source, target, transform}` |
| Conditions | Filter rules to include/exclude items |
| Remove Unmapped Fields | Only keep fields you explicitly map |

**Transformations available:** `uppercase`, `lowercase`, `trim`, `number`, `string`, `boolean`, `date`, `reverse`, `length`, or any JS expression

**Example mappings:**
```json
[
  {"source": "body.from", "target": "senderPhone"},
  {"source": "body.text", "target": "messageText", "transform": "trim"},
  {"source": "timestamp", "target": "receivedAt", "transform": "date"}
]
```

**When to use it:**
- Extract WhatsApp message fields from a complex webhook body
- Rename API response fields to match your schema
- Convert strings to numbers before database insert

---

### 🔍 Filter
**Group:** Data  
**Purpose:** Keep only items from an array that match a condition.

| Parameter | What it does |
|---|---|
| Filter Conditions (JSON) | `{"field": "status", "operator": "equals", "value": "active"}` |

**Operators:** `equals`, `not_equals`, `contains`, `greater_than`, `less_than`, `exists`, `not_exists`

**Output:** `filteredData[]`, `originalCount`, `filteredCount`

**When to use it:**
- Filter emails to only process those from a specific sender
- Only process orders above $100
- Skip already-processed items

---

### ✂️ Split In Batches
**Group:** Data  
**Purpose:** Splits a large array into smaller chunks.

| Parameter | What it does |
|---|---|
| Batch Size | How many items per chunk |
| Split Field | Which array field to split (leave blank for whole input) |

**Output:** `batches[][]`, `totalBatches`, `originalCount`

**When to use it:**
- You have 500 emails but want to process 10 at a time
- Sending WhatsApp messages in batches to avoid rate limits

---

## 🧠 Logic Nodes

---

### 🔀 IF
**Group:** Logic  
**Purpose:** Branches the workflow based on a condition — like an if/else.

| Parameter | What it does |
|---|---|
| Condition | Expression like `data.emailCount > 0` or `data.status === "active"` |

**Output paths:** `true` branch and `false` branch

**Operators you can use:** `>`, `<`, `>=`, `<=`, `===`, `!==`, `includes`, `startsWith`, `endsWith`

**When to use it:**
- Only send WhatsApp if new emails were found
- Only insert to DB if status is "pending"
- Send different emails based on a value

---

### 🔁 Loop
**Group:** Logic  
**Purpose:** Iterates over every item in an array and processes each one.

| Parameter | What it does |
|---|---|
| Items Path | Field name containing the array (e.g. `emails`) |
| Batch Size | How many items per iteration |
| Parallel Processing | Run all items at the same time |
| Max Iterations | Safety cap |

**Output:** `loopResults[]`, `totalIterations`

**When to use it:**
- Send a WhatsApp message for each email in `emails[]`
- Insert each row from a CSV into a database
- Call an API for each item in a list

---

## ⏱️ Flow Control Nodes

---

### ⏳ Wait (Delay)
**Group:** Flow  
**Purpose:** Pauses the workflow for a specified amount of time.

| Parameter | What it does |
|---|---|
| Amount | Number of time units |
| Unit | Seconds / Minutes / Hours |

**When to use it:**
- Wait 30 seconds between API calls to avoid rate limits
- Pause 5 minutes before sending a follow-up message
- Add space between batches in a bulk send

---

## 💻 Code Node

---

### 💻 Code
**Group:** Data  
**Purpose:** Run custom JavaScript logic when no existing node can do what you need.

| Parameter | What it does |
|---|---|
| JavaScript Code | Your JS code — must `return` a value |
| Timeout (ms) | Max execution time (max 30s) |
| Allow Async/Await | Enable `await` for async operations |

**Available variables:**
| Variable | What it is |
|---|---|
| `$input` | The full input data object |
| `items` | Input as an array (`[inputData]`) |
| `items[0]` | First item (same as `$input` usually) |
| `Math`, `Date`, `JSON` | Standard JS globals |
| `console.log()` | Logs to server console |

**Example — format a phone number:**
```js
const phone = $input.from.replace(/\D/g, '');
return {
  ...$input,
  formattedPhone: '+' + phone
};
```

**Example — compute a value:**
```js
const emails = $input.emails || [];
const urgent = emails.filter(e => e.subject.includes('URGENT'));
return {
  urgentCount: urgent.length,
  urgentEmails: urgent
};
```

**When to use it:**
- Complex string manipulation
- Math calculations
- Restructuring data in custom ways
- Logic that IF and Filter can't handle

---

## 🤖 AI Node

---

### 🤖 AI Assistant
**Group:** AI  
**Purpose:** Calls OpenAI (GPT), Anthropic (Claude), or any OpenAI-compatible API.

| Parameter | What it does |
|---|---|
| AI Provider | OpenAI / Anthropic Claude / Custom |
| Model | e.g. `gpt-4`, `gpt-3.5-turbo`, `claude-3-sonnet-20240229` |
| User Prompt | Your prompt — use `{{input}}` or `{{fieldName}}` |
| System Prompt | Persona/behavior instructions for the AI |
| API Key | Your OpenAI (`sk-...`) or Anthropic key |
| Custom Base URL | For Ollama, Groq, Together AI, etc. |
| Temperature | 0 = precise, 2 = creative |
| Max Tokens | Max response length |
| Output Field Name | Where to store the AI response (default: `aiResponse`) |

**Prompt interpolation:**
- `{{input}}` → entire input JSON
- `{{subject}}` → `$input.subject` field value
- `{{body}}` → `$input.body` field value

**Example prompts:**
```
Summarize this email in 2 sentences: {{body}}
```
```
Is this message spam? Reply YES or NO only. Message: {{messageText}}
```
```
Translate to Hindi: {{body}}
```

**When to use it:**
- Summarize long emails before sending to WhatsApp
- Auto-classify incoming messages
- Draft a reply to an email
- Sentiment analysis on feedback
- Translate messages

---

## 🔗 Practical Workflow Examples

### WhatsApp → Gmail (from your templates)
```
Webhook ──→ Transform ──→ Gmail
  (receives)  (extract msg)  (email log)
```

### Gmail → WhatsApp (from your templates)
```
Schedule ──→ Gmail Reader ──→ IF (has emails?) ──→ Loop ──→ WhatsApp
  (every 5m)   (read inbox)    (skip if none)     (each)   (send msg)
```

### API → Database → Notify
```
Schedule ──→ HTTP Request ──→ Filter ──→ Database ──→ Email
  (daily)     (fetch orders)   (only new)  (log them)  (send report)
```

### AI Email Summarizer
```
Gmail Reader ──→ Loop ──→ AI Assistant ──→ WhatsApp
  (new emails)   (each)   (summarize)      (send summary)
```
