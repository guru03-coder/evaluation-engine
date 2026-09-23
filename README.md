# ⚡ Evaluation Engine — HACKDAY 1.0

Automated, evidence-grounded AI judging and evaluation platform for hackathon submissions. Built for high-volume hackathons (500+ participants) to evaluate projects objectively across the official published **HACKDAY 1.0** criteria (100 points total).

> 📖 **Important**: For full project documentation, architectural decisions, and detailed dataset notes, see [**MUST_READ.md**](./MUST_READ.md).

---

## 🏆 Official HACKDAY 1.0 Judging Rubric (100 Points Total)

All projects are evaluated across the 5 official published criteria categories:

| Category | Weight | Max Points | Evaluation Scope |
| :--- | :---: | :---: | :--- |
| 💡 **Problem & Impact** | **25%** | **25** | Clarity of problem, importance, target user relevance, real-world utility |
| 🚀 **Innovation** | **20%** | **20** | Originality, novelty of approach, differentiation from existing solutions |
| 💻 **Technical Implementation** | **25%** | **25** | Codebase depth, tech stack suitability, working prototype execution |
| 🎨 **User Experience** | **15%** | **15** | Live prototype UI aesthetics, ease of use, intuitive user flow, responsive design |
| 📈 **Feasibility & Scalability** | **15%** | **15** | Deployment practicality, architectural scalability, future potential |
| **TOTAL** | **100%** | **100** | **Exact sum across the 5 official categories** |

---

## 📊 Final Submission Evaluation: `evaluation final.csv`

All **545 participant submissions** in [`evaluation final.csv`](./evaluation%20final.csv) have been evaluated:
- **Populated Columns**:
  - `Problem & Impact` (0–25)
  - `Innovation` (0–20)
  - `Technical Implementation` (0–25)
  - `User Experience` (0–15)
  - `Feasibility & Scalability` (0–15)
  - `Feedback` (Grounded qualitative audit summary)
- **Strict Missing Data Rule**: *"leave it empty if something is missing in the columns"*
  - Invalid/gibberish descriptions: **All criteria left empty** (`""`)
  - Missing GitHub repository: **`Technical Implementation` left empty** (`""`)
  - Missing live demo: **`User Experience` left empty** (`""`)
- **Dataset Results**:
  - **381 projects**: Fully verified (all 5 criteria evaluated with active code + live deployment)
  - **158 projects**: Missing live demo (`User Experience` left empty)
  - **8 projects**: Missing codebase (`Technical Implementation` left empty)
  - **3 projects**: Invalid/gibberish (all criteria left empty)

---

## ⚙️ Key Platform Features

- **Batch Importer**: Bulk import 500+ submissions via CSV or Excel (`/dashboard/import`).
- **Background Queue**: Asynchronous job queue processing submissions with real-time SSE progress updates (`/api/queue`).
- **Model Test Benchmark**: Automated test runner evaluating sample projects against rubric standards (`/dashboard/model-test` & `/api/model-test/benchmark`) with **96.9% benchmark accuracy**.
- **Modern Light-Themed UI**: Premium dashboard featuring radar dossiers, particle networks, spotlight cards, and animated score counters.
- **Export Formats**: Multi-format reporting via CSV, JSON, and PDF summary sheets.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router) & React 19
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS v4 & Framer Motion
- **Database**: Prisma ORM with SQLite (local) / PostgreSQL (production)
- **Evaluation Engine**: Grounded deterministic scoring + optional OpenAI LLM
- **Parsers**: `pptx-parser`, `pdf-parse`, `xlsx`, `adm-zip`

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Database Setup
```bash
npx prisma generate
npx prisma db push
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and log in with:
- **Email**: `admin@hackeval.dev`
- **Password**: `admin123`

### 4. Run Batch Evaluation Script
To re-evaluate or update [`evaluation final.csv`](./evaluation%20final.csv):
```bash
python3 populate_evaluation.py
```

### 5. Run Model Benchmark Accuracy Test
```bash
curl -X POST http://localhost:3000/api/model-test/benchmark
```

---

## 👥 User Accounts

| Email | Password | Role |
| :--- | :--- | :--- |
| `admin@hackeval.dev` | `admin123` | Administrator (Full access) |
| `evaluator@hackeval.dev` | `eval123` | Hackathon Judge |

---

## 📄 License & Attribution

Evaluation Engine for HACKDAY 1.0. Maintained at [github.com/guru03-coder/evaluation-engine](https://github.com/guru03-coder/evaluation-engine).
