export interface PromptTemplate {
  title: string;
  description: string;
  prompt: string;
}

export const TEMPLATE_CATEGORIES: { name: string; templates: PromptTemplate[] }[] = [
  {
    name: "Coding",
    templates: [
      {
        title: "Debug my code",
        description: "Find and explain the bug",
        prompt: "Here is my code. Find the bug, explain why it happens, and give a corrected version:\n\n",
      },
      {
        title: "Explain code",
        description: "Line-by-line walkthrough",
        prompt: "Explain the following code step by step, in simple terms:\n\n",
      },
      {
        title: "Write unit tests",
        description: "Cover edge cases",
        prompt: "Write thorough unit tests (including edge cases) for the following code:\n\n",
      },
      {
        title: "Refactor",
        description: "Cleaner, faster code",
        prompt: "Refactor this code for readability and performance. Explain each change:\n\n",
      },
    ],
  },
  {
    name: "Study",
    templates: [
      {
        title: "Explain simply",
        description: "Beginner-friendly explanation",
        prompt: "Explain this topic as if I'm a complete beginner, with a simple analogy and an example: ",
      },
      {
        title: "Study plan",
        description: "Structured learning path",
        prompt: "Create a 4-week study plan with daily tasks for learning: ",
      },
      {
        title: "Quiz me",
        description: "Practice questions",
        prompt: "Create 10 practice questions with answers hidden at the end, on the topic: ",
      },
      {
        title: "Summarize notes",
        description: "Condense to key points",
        prompt: "Summarize the following notes into concise bullet points with key takeaways:\n\n",
      },
    ],
  },
  {
    name: "Writing",
    templates: [
      {
        title: "Improve my writing",
        description: "Clarity and tone",
        prompt: "Improve the clarity, grammar and flow of this text while keeping my voice:\n\n",
      },
      {
        title: "Write an email",
        description: "Professional message",
        prompt: "Write a clear, professional email about the following. Keep it concise:\n\n",
      },
      {
        title: "Blog outline",
        description: "Structured draft",
        prompt: "Create a detailed blog post outline with headings and key points about: ",
      },
      {
        title: "Rewrite tone",
        description: "Adjust the style",
        prompt: "Rewrite the following text in a friendly yet professional tone:\n\n",
      },
    ],
  },
  {
    name: "Career",
    templates: [
      {
        title: "Resume bullet points",
        description: "Impact-driven wording",
        prompt: "Turn these responsibilities into strong, quantified resume bullet points:\n\n",
      },
      {
        title: "Interview prep",
        description: "Likely questions",
        prompt: "Give me 10 likely interview questions and strong sample answers for the role of: ",
      },
      {
        title: "Cover letter",
        description: "Tailored letter",
        prompt: "Write a tailored cover letter for this role, based on my background:\n\n",
      },
      {
        title: "Career roadmap",
        description: "Skills and milestones",
        prompt: "Build a 12-month career roadmap with skills and milestones for becoming a: ",
      },
    ],
  },
  {
    name: "Data Analysis",
    templates: [
      {
        title: "Analyze this data",
        description: "Trends and insights",
        prompt: "Analyze the following data. Identify trends, outliers and actionable insights:\n\n",
      },
      {
        title: "Write SQL",
        description: "Query from a question",
        prompt: "Write an efficient SQL query for the following requirement, and explain it:\n\n",
      },
      {
        title: "Explain a metric",
        description: "Definition and pitfalls",
        prompt: "Explain this metric, how to calculate it, and common pitfalls when using it: ",
      },
      {
        title: "Chart suggestions",
        description: "Best visualization",
        prompt: "Suggest the best charts to visualize this dataset and explain why:\n\n",
      },
    ],
  },
  {
    name: "Business",
    templates: [
      {
        title: "Business plan",
        description: "Structured overview",
        prompt: "Draft a concise business plan (problem, solution, market, model, risks) for: ",
      },
      {
        title: "Competitor analysis",
        description: "Strengths and gaps",
        prompt: "Do a competitor analysis with strengths, weaknesses and market gaps for: ",
      },
      {
        title: "Pricing strategy",
        description: "Tiers and rationale",
        prompt: "Propose a pricing strategy with tiers and rationale for this product: ",
      },
      {
        title: "Pitch deck outline",
        description: "Slide-by-slide",
        prompt: "Create a slide-by-slide pitch deck outline with talking points for: ",
      },
    ],
  },
  {
    name: "Productivity",
    templates: [
      {
        title: "Plan my day",
        description: "Prioritized schedule",
        prompt: "Help me plan a focused day. Here are my tasks and time available:\n\n",
      },
      {
        title: "Break down a project",
        description: "Tasks and timeline",
        prompt: "Break this project into clear tasks with a realistic timeline:\n\n",
      },
      {
        title: "Meeting agenda",
        description: "Focused structure",
        prompt: "Write a tight meeting agenda with time boxes and desired outcomes for: ",
      },
      {
        title: "Decision help",
        description: "Weigh the options",
        prompt: "Help me decide between these options. List pros, cons and a recommendation:\n\n",
      },
    ],
  },
];
