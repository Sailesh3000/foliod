// GENERATED FILE — do not hand-edit.
// Source of truth: data/portfolio.json — edit that, then run: node scripts/generate-config.js
const CONFIG = {
  "meta": {
    "title": "Chandra Sailesh — AI Engineer & Developer",
    "description": "Personal portfolio of Chandra Sailesh — AI Engineer building intelligent systems, ML pipelines, and seamless web experiences.",
    "keywords": "AI Engineer, Machine Learning, Full Stack Developer, Portfolio"
  },
  "hero": {
    "name": "Chandra Sailesh",
    "subtitle": "AI Engineer & Developer",
    "bio": "I build intelligent systems at the intersection of AI, machine learning, and modern web engineering — focused on shipping products that feel seamless and think deeply.",
    "contact": {
      "email": "saileshhedu@gmail.com",
      "phone": "+91 9121450673"
    },
    "socials": [
      {
        "label": "LinkedIn",
        "url": "https://www.linkedin.com/in/chandra-sailesh-b8584b24b/",
        "icon": "linkedin"
      },
      {
        "label": "GitHub",
        "url": "https://github.com/Sailesh3000",
        "icon": "github"
      },
      {
        "label": "LeetCode",
        "url": "https://leetcode.com/u/chandrasailesh30/",
        "icon": "leetcode"
      },
      {
        "label": "Medium",
        "url": "https://medium.com/@saileshhedu",
        "icon": "medium"
      }
    ]
  },
  "experience": [
    {
      "role": "AI Engineer Intern",
      "company": "Tally Solutions",
      "location": "Bangalore, Karnataka",
      "period": "Nov 2025 — Present",
      "current": true,
      "highlights": [
        "Architected a Hybrid Search RAG agent for TallyPrime TDL using Qdrant, BM25, and RRF reranking, reducing retrieval latency by 80% through a local SQLite retrieval layer, orchestrated with Strands SDK, React, and FastAPI.",
        "Engineered TDL Assistant, a VS Code extension customized from Cline, leveraging a Strands-based sub-agent architecture for context-aware developer assistance and code generation.",
        "Integrated grep-ast for syntax-aware code search, returning hierarchical AST context to reduce LLM context window usage.",
        "Developed a FastMCP-based MCP server exposing tools for semantic search, query classification, and retrieval of TDL documentation and code examples.",
        "Built a dual-tier semantic memory service using mem0 and Qdrant to manage short- and long-term conversational context while reducing token consumption.",
        "Designed a serverless Knowledge API using AWS CDK, Docker, Lambda, and FastAPI, exposing secure REST endpoints via API Gateway for RAG tools."
      ]
    },
    {
      "role": "Full Stack Developer Intern",
      "company": "Rampup Infotech",
      "location": "Mumbai, Maharashtra",
      "period": "Aug 2024 — Oct 2024",
      "current": false,
      "highlights": [
        "Contributed to the development of the admin panel for a cloud-based care management platform.",
        "Designed and implemented RESTful APIs using Node.js and MySQL to streamline timesheet workflows.",
        "Developed key features including agreement cloning and approval/rejection workflows for Team Leads (TL) and Reporting Managers (RM)."
      ]
    }
  ],
  "projects": [
    {
      "name": "Knowledge Detective",
      "category": "Semantic Graph & RAG",
      "description": "Engineered a hybrid semantic graph engine for enterprise memory that unifies cross-platform communication—connecting GitHub commits, Gmail threads, and Google Calendar meetings into a real-time organizational brain. Designed a dual-engine architecture combining Qdrant (high-speed semantic vector search) with Neo4j (graph-based relationship mapping) to deliver fully verified, citation-backed answers. Developed key innovations including graph-level dynamic identity resolution (aliasing handles and emails to canonical person nodes), multi-stage LLM-based query planning, and gap detection for unclosed decision loops. Implemented with a multi-agent FastAPI backend and React dashboard, optimized for AMD ROCm GPU acceleration.",
      "tech": [
        "Python",
        "FastAPI",
        "Neo4j",
        "Qdrant",
        "AMD ROCm",
        "LLMs",
        "Knowledge Graphs",
        "Docker",
        "React"
      ],
      "link": "https://github.com/Sailesh3000/knowledge-detective",
      "highlight": "Dual-Engine semantic vector & graph-RAG architecture",
      "accentColor": "#a78bfa",
      "icon": "detective",
      "filterGroup": "ai"
    },
    {
      "name": "Automated AI Hackathon Evaluation System",
      "category": "Distributed Systems / MLOps",
      "description": "Designed and built a production-ready AI evaluation platform that automatically assesses concurrent hackathon submissions using localized LLMs. Implemented GitHub Webhook ingestion with HMAC verification, Redis RQ job queues, and parallel AI sub-agents (Strands) to evaluate code quality, problem-fit, plagiarism, and contribution balance. Developed an EMA-based scoring engine with PostgreSQL persistence and a live dashboard providing judges with real-time rankings, AST-based contribution insights, and integrity monitoring.",
      "tech": [
        "Python",
        "FastAPI",
        "Redis",
        "Redis RQ",
        "PostgreSQL",
        "GitHub Webhooks",
        "Strands",
        "LLMs",
        "Tree-sitter",
        "Docker"
      ],
      "link": null,
      "highlight": "Real-time Rankings & Distributed Job Queues",
      "accentColor": "#38bdf8",
      "icon": "evaluation",
      "filterGroup": "systems"
    },
    {
      "name": "FontIQ",
      "category": "Deep Learning / CV",
      "description": "Designed and benchmarked multiple deep learning architectures for multilingual font recognition across English and Telugu scripts. Built classification-only, regression-only, dual-head, and transfer learning models, along with a two-stage inference pipeline combining font classification with font-specific regression. Created a synthetic dataset of 1,000+ labeled images, achieving up to 99% classification accuracy and 97% transfer learning accuracy on Telugu fonts.",
      "tech": [
        "Python",
        "TensorFlow",
        "Keras",
        "OpenCV",
        "Scikit-learn",
        "NumPy",
        "Pandas"
      ],
      "link": "https://drive.google.com/drive/folders/1Giz2gBiTsG6YCTR2fk_FCGbYJaVMhdEp",
      "highlight": "99% Telugu Font Classification Accuracy",
      "accentColor": "#34d399",
      "icon": "font",
      "filterGroup": "ai"
    },
    {
      "name": "ShelfX",
      "category": "Full-Stack Web Dev",
      "description": "Developed a full-stack marketplace for buying, selling, and renting books. Built a responsive React frontend with a Node.js/Express backend, implemented secure authentication, RESTful APIs, MySQL-based persistence, and real-time buyer-seller communication using Socket.IO. Also developed an admin dashboard for monitoring platform activity and managing users.",
      "tech": [
        "React",
        "Node.js",
        "Express.js",
        "MySQL",
        "Socket.IO",
        "Docker",
        "Tailwind CSS"
      ],
      "link": "https://github.com/Sailesh3000/ShelfX",
      "highlight": "Real-time Chat & Admin Dashboard Monitoring",
      "accentColor": "#fb923c",
      "icon": "shelf",
      "filterGroup": "systems"
    }
  ],
  "research": {
    "heading": "Research",
    "description": "Published and preprint work.",
    "papers": []
  },
  "writing": {
    "heading": "Writing",
    "description": "Reflections on AI, engineering, and building things that matter.",
    "blogUrl": "https://medium.com/@saileshhedu",
    "blogLabel": "Read on Medium",
    "featured": [
      {
        "title": "Building Memory-Powered AI Agents with Strands, Mem0, and Qdrant",
        "date": "2026",
        "url": "https://medium.com/@saileshhedu/building-memory-powered-ai-agents-with-strands-mem0-and-qdrant-b524ece548c8"
      },
      {
        "title": "Never Lose the Right Chunk: How Hybrid Search Improves Recall in RAG Systems",
        "date": "2026",
        "url": "https://medium.com/@saileshhedu/never-lose-the-right-chunk-how-hybrid-search-improves-recall-in-rag-systems-10adc2693307"
      }
    ]
  },
  "footer": {
    "text": "© 2026 Chandra Sailesh. Built with intention."
  }
};

if (typeof module !== "undefined") module.exports = CONFIG;
