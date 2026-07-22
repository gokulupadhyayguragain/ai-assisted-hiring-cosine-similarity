"""Career Development Guide Service.

Generates personalized learning paths, project suggestions, and application
tips based on skill gap analysis results.
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class Resource:
    title: str
    url: str
    type: str  # "course", "docs", "video", "tutorial", "book"
    free: bool = True
    platform: str = ""


@dataclass(slots=True)
class LearningPath:
    skill: str
    difficulty: str  # "beginner", "intermediate", "advanced"
    estimated_hours: int
    resources: list[Resource] = field(default_factory=list)
    description: str = ""


@dataclass(slots=True)
class ProjectSuggestion:
    title: str
    description: str
    skills_demonstrated: list[str] = field(default_factory=list)
    difficulty: str = "intermediate"
    estimated_hours: int = 10
    steps: list[str] = field(default_factory=list)
    technologies: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ApplicationTip:
    category: str  # "resume", "cover_letter", "interview", "networking", "portfolio"
    tip: str
    priority: str = "medium"  # "high", "medium", "low"


@dataclass(slots=True)
class ActionPlan:
    learning_paths: list[LearningPath] = field(default_factory=list)
    project_suggestions: list[ProjectSuggestion] = field(default_factory=list)
    application_tips: list[ApplicationTip] = field(default_factory=list)
    recommended_timeline: str = ""
    next_steps: list[str] = field(default_factory=list)
    score_improvement_estimate: int = 0


# ---------------------------------------------------------------------------
# Curated Resource Database
# ---------------------------------------------------------------------------

SKILL_RESOURCES: dict[str, list[Resource]] = {
    "python": [
        Resource("Python Official Tutorial", "https://docs.python.org/3/tutorial/", "docs", True, "Python.org"),
        Resource("Automate the Boring Stuff", "https://automatetheboringstuff.com/", "book", True, "Al Sweigart"),
        Resource("Python for Everybody (Coursera)", "https://www.coursera.org/specializations/python", "course", True, "Coursera"),
        Resource("Corey Schafer Python Tutorials", "https://www.youtube.com/playlist?list=PL-osiE80TeTt2d9bfVyTiXJA-UTHn6WwU", "video", True, "YouTube"),
    ],
    "javascript": [
        Resource("MDN JavaScript Guide", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", "docs", True, "MDN"),
        Resource("The Odin Project - JavaScript", "https://www.theodinproject.com/paths/full-stack-javascript", "course", True, "The Odin Project"),
        Resource("JavaScript.info", "https://javascript.info/", "tutorial", True, "javascript.info"),
        Resource("freeCodeCamp JS Algorithms", "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", "course", True, "freeCodeCamp"),
    ],
    "typescript": [
        Resource("TypeScript Handbook", "https://www.typescriptlang.org/docs/handbook/", "docs", True, "TypeScript"),
        Resource("Total TypeScript (Matt Pocock)", "https://www.totaltypescript.com/tutorials", "tutorial", True, "Total TypeScript"),
        Resource("TypeScript Deep Dive", "https://basarat.gitbook.io/typescript/", "book", True, "Basarat"),
    ],
    "react": [
        Resource("React Official Docs", "https://react.dev/learn", "docs", True, "React.dev"),
        Resource("freeCodeCamp React Course", "https://www.freecodecamp.org/learn/front-end-development-libraries/#react", "course", True, "freeCodeCamp"),
        Resource("Full React Tutorial (Net Ninja)", "https://www.youtube.com/playlist?list=PL4cUxeGkcC9gZD-Tvwfod2gaISzfRiP9d", "video", True, "YouTube"),
    ],
    "node.js": [
        Resource("Node.js Official Docs", "https://nodejs.org/en/docs/guides", "docs", True, "Node.js"),
        Resource("The Odin Project - NodeJS", "https://www.theodinproject.com/paths/full-stack-javascript/courses/nodejs", "course", True, "The Odin Project"),
        Resource("Traversy Media Node Crash Course", "https://www.youtube.com/watch?v=fBNz5xF-Kx4", "video", True, "YouTube"),
    ],
    "docker": [
        Resource("Docker Official Getting Started", "https://docs.docker.com/get-started/", "docs", True, "Docker"),
        Resource("Docker Curriculum (Prakhar)", "https://docker-curriculum.com/", "tutorial", True, "docker-curriculum"),
        Resource("TechWorld with Nana - Docker", "https://www.youtube.com/watch?v=3c-iBn73dDE", "video", True, "YouTube"),
    ],
    "kubernetes": [
        Resource("Kubernetes Official Tutorials", "https://kubernetes.io/docs/tutorials/", "docs", True, "Kubernetes.io"),
        Resource("KodeKloud Free Labs", "https://kodekloud.com/courses/kubernetes-for-the-absolute-beginners/", "course", True, "KodeKloud"),
        Resource("TechWorld with Nana - K8s", "https://www.youtube.com/watch?v=X48VuDVv0do", "video", True, "YouTube"),
    ],
    "aws": [
        Resource("AWS Free Tier + Docs", "https://aws.amazon.com/free/", "docs", True, "AWS"),
        Resource("AWS Cloud Practitioner (freeCodeCamp)", "https://www.youtube.com/watch?v=SOTamWNgDKc", "video", True, "YouTube"),
        Resource("AWS Skill Builder", "https://skillbuilder.aws/", "course", True, "AWS"),
    ],
    "sql": [
        Resource("SQLBolt Interactive Lessons", "https://sqlbolt.com/", "tutorial", True, "SQLBolt"),
        Resource("Mode SQL Tutorial", "https://mode.com/sql-tutorial", "tutorial", True, "Mode"),
        Resource("PostgreSQL Official Tutorial", "https://www.postgresql.org/docs/current/tutorial.html", "docs", True, "PostgreSQL"),
    ],
    "postgresql": [
        Resource("PostgreSQL Official Tutorial", "https://www.postgresql.org/docs/current/tutorial.html", "docs", True, "PostgreSQL"),
        Resource("SQLBolt Interactive Lessons", "https://sqlbolt.com/", "tutorial", True, "SQLBolt"),
    ],
    "git": [
        Resource("Git Official Book (Pro Git)", "https://git-scm.com/book/en/v2", "book", True, "Git"),
        Resource("Learn Git Branching", "https://learngitbranching.js.org/", "tutorial", True, "learngitbranching"),
        Resource("Fireship Git in 100 Seconds", "https://www.youtube.com/watch?v=hwP7WQkmECE", "video", True, "YouTube"),
    ],
    "graphql": [
        Resource("GraphQL Official Learn", "https://graphql.org/learn/", "docs", True, "GraphQL.org"),
        Resource("How to GraphQL", "https://www.howtographql.com/", "tutorial", True, "HowToGraphQL"),
        Resource("Apollo GraphQL Tutorial", "https://www.apollographql.com/tutorials/", "course", True, "Apollo"),
    ],
    "redis": [
        Resource("Redis University (Free)", "https://university.redis.com/", "course", True, "Redis"),
        Resource("Try Redis (Interactive)", "https://try.redis.io/", "tutorial", True, "Redis"),
        Resource("Redis Official Docs", "https://redis.io/docs/", "docs", True, "Redis.io"),
    ],
    "ci/cd": [
        Resource("GitHub Actions Docs", "https://docs.github.com/en/actions", "docs", True, "GitHub"),
        Resource("GitLab CI/CD Tutorial", "https://docs.gitlab.com/ee/ci/quick_start/", "docs", True, "GitLab"),
        Resource("Fireship CI/CD Explained", "https://www.youtube.com/watch?v=scEDHsr3APg", "video", True, "YouTube"),
    ],
    "machine learning": [
        Resource("Andrew Ng ML Course (Coursera)", "https://www.coursera.org/learn/machine-learning", "course", True, "Coursera"),
        Resource("fast.ai Practical ML", "https://www.fast.ai/", "course", True, "fast.ai"),
        Resource("Scikit-learn Docs", "https://scikit-learn.org/stable/tutorial/", "docs", True, "scikit-learn"),
    ],
    "fastapi": [
        Resource("FastAPI Official Tutorial", "https://fastapi.tiangolo.com/tutorial/", "docs", True, "FastAPI"),
        Resource("Traversy Media FastAPI Crash Course", "https://www.youtube.com/watch?v=tLKKmouUams", "video", True, "YouTube"),
    ],
    "next.js": [
        Resource("Next.js Official Learn", "https://nextjs.org/learn", "course", True, "Next.js"),
        Resource("Next.js Docs", "https://nextjs.org/docs", "docs", True, "Next.js"),
    ],
    "tailwind css": [
        Resource("Tailwind CSS Docs", "https://tailwindcss.com/docs", "docs", True, "Tailwind"),
        Resource("Tailwind CSS Tutorial (Net Ninja)", "https://www.youtube.com/playlist?list=PL4cUxeGkcC9gpXORlEHjc5bgnIi5HEGhw", "video", True, "YouTube"),
    ],
    "mongodb": [
        Resource("MongoDB University (Free)", "https://university.mongodb.com/", "course", True, "MongoDB"),
        Resource("MongoDB Manual", "https://www.mongodb.com/docs/manual/", "docs", True, "MongoDB"),
    ],
    "kafka": [
        Resource("Apache Kafka Docs", "https://kafka.apache.org/documentation/", "docs", True, "Apache"),
        Resource("Confluent Kafka 101", "https://developer.confluent.io/courses/apache-kafka/events/", "course", True, "Confluent"),
    ],
    "rest api": [
        Resource("RESTful API Design (Microsoft)", "https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design", "docs", True, "Microsoft"),
        Resource("REST API Tutorial", "https://restfulapi.net/", "tutorial", True, "restfulapi.net"),
    ],
    "django": [
        Resource("Django Official Tutorial", "https://docs.djangoproject.com/en/stable/intro/tutorial01/", "docs", True, "Django"),
        Resource("Django for Everybody (Coursera)", "https://www.coursera.org/specializations/django", "course", True, "Coursera"),
    ],
    "flask": [
        Resource("Flask Official Tutorial", "https://flask.palletsprojects.com/en/latest/tutorial/", "docs", True, "Flask"),
        Resource("Traversy Media Flask Crash Course", "https://www.youtube.com/watch?v=Z1RJmh_OqeA", "video", True, "YouTube"),
    ],
    "java": [
        Resource("Java Official Tutorials", "https://docs.oracle.com/javase/tutorial/", "docs", True, "Oracle"),
        Resource("MOOC.fi Java Programming", "https://java-programming.mooc.fi/", "course", True, "MOOC.fi"),
    ],
    "go": [
        Resource("A Tour of Go", "https://go.dev/tour/", "tutorial", True, "Go.dev"),
        Resource("Go by Example", "https://gobyexample.com/", "tutorial", True, "GoByExample"),
    ],
    "rust": [
        Resource("The Rust Book", "https://doc.rust-lang.org/book/", "book", True, "Rust"),
        Resource("Rustlings Exercises", "https://github.com/rust-lang/rustlings", "tutorial", True, "GitHub"),
    ],
}


# ---------------------------------------------------------------------------
# Project Suggestion Templates (per skill category)
# ---------------------------------------------------------------------------

PROJECT_TEMPLATES: dict[str, list[ProjectSuggestion]] = {
    "docker": [
        ProjectSuggestion(
            title="Containerize a Web Application",
            description="Take an existing web app and create a production-ready Docker setup with multi-stage builds.",
            skills_demonstrated=["Docker", "DevOps", "Linux"],
            difficulty="beginner",
            estimated_hours=6,
            steps=[
                "Create a simple Flask/Express app with a database dependency",
                "Write a Dockerfile with multi-stage build (builder + runtime)",
                "Create a docker-compose.yml with app + PostgreSQL + Redis",
                "Add health checks and proper environment variable handling",
                "Test locally, then push image to Docker Hub",
                "Write a README documenting the setup",
            ],
            technologies=["Docker", "Docker Compose", "PostgreSQL"],
        ),
        ProjectSuggestion(
            title="CI/CD Pipeline with Docker",
            description="Build a complete CI/CD pipeline that builds, tests, and deploys Docker containers.",
            skills_demonstrated=["Docker", "CI/CD", "GitHub Actions"],
            difficulty="intermediate",
            estimated_hours=12,
            steps=[
                "Set up a GitHub repository with a Dockerized app",
                "Create GitHub Actions workflow for automated testing",
                "Add Docker image build and push to registry on merge",
                "Implement staging and production deployment stages",
                "Add automated rollback on failed health checks",
                "Document the pipeline architecture",
            ],
            technologies=["Docker", "GitHub Actions", "Docker Hub"],
        ),
    ],
    "kubernetes": [
        ProjectSuggestion(
            title="Deploy a Microservice on Kubernetes",
            description="Deploy a multi-container application on a local Kubernetes cluster using Minikube.",
            skills_demonstrated=["Kubernetes", "Docker", "Networking"],
            difficulty="intermediate",
            estimated_hours=15,
            steps=[
                "Install Minikube and kubectl on your machine",
                "Create Deployment YAML for a web app (2+ replicas)",
                "Add a Service (ClusterIP + LoadBalancer) to expose the app",
                "Create ConfigMaps and Secrets for configuration",
                "Set up Horizontal Pod Autoscaler (HPA)",
                "Add Ingress controller for routing",
                "Monitor with kubectl commands and dashboard",
            ],
            technologies=["Kubernetes", "Minikube", "Docker", "YAML"],
        ),
    ],
    "react": [
        ProjectSuggestion(
            title="Build a Task Management Dashboard",
            description="Create a full-featured task management app with drag-and-drop, filtering, and real-time updates.",
            skills_demonstrated=["React", "TypeScript", "State Management", "CSS"],
            difficulty="intermediate",
            estimated_hours=20,
            steps=[
                "Set up Next.js project with TypeScript and Tailwind CSS",
                "Build reusable components: TaskCard, Column, FilterBar",
                "Implement drag-and-drop using @dnd-kit library",
                "Add state management with Zustand or React Context",
                "Create filter/sort functionality (by date, priority, status)",
                "Add local storage persistence",
                "Deploy to Vercel and add to your portfolio",
            ],
            technologies=["React", "Next.js", "TypeScript", "Tailwind CSS"],
        ),
    ],
    "python": [
        ProjectSuggestion(
            title="Build a CLI Data Pipeline Tool",
            description="Create a Python CLI tool that fetches, transforms, and exports data from APIs.",
            skills_demonstrated=["Python", "API Integration", "Data Processing"],
            difficulty="beginner",
            estimated_hours=8,
            steps=[
                "Set up a Python project with proper structure (src/, tests/, pyproject.toml)",
                "Use requests/httpx to fetch data from a public API",
                "Implement data transformation with dataclasses",
                "Add CLI interface using argparse or click",
                "Export results to CSV and JSON formats",
                "Write unit tests with pytest",
                "Publish to PyPI (optional) or GitHub",
            ],
            technologies=["Python", "requests", "pytest", "click"],
        ),
    ],
    "machine learning": [
        ProjectSuggestion(
            title="Build a Resume-Job Matching Model",
            description="Train a text similarity model that scores how well a resume matches a job description.",
            skills_demonstrated=["Machine Learning", "NLP", "Python", "scikit-learn"],
            difficulty="intermediate",
            estimated_hours=25,
            steps=[
                "Collect resume-JD pairs dataset (Kaggle or synthetic)",
                "Preprocess text: tokenize, remove stopwords, normalize",
                "Implement TF-IDF vectorization with scikit-learn",
                "Train a cosine similarity model and evaluate accuracy",
                "Compare with sentence-transformers for semantic matching",
                "Build a simple Flask API to serve predictions",
                "Create a Streamlit demo interface",
            ],
            technologies=["Python", "scikit-learn", "sentence-transformers", "Flask"],
        ),
    ],
    "sql": [
        ProjectSuggestion(
            title="Design a Job Board Database",
            description="Design and implement a normalized database schema for a job board platform.",
            skills_demonstrated=["SQL", "PostgreSQL", "Database Design"],
            difficulty="beginner",
            estimated_hours=8,
            steps=[
                "Draw an ER diagram with entities: Users, Jobs, Applications, Skills",
                "Create normalized tables with proper constraints and indexes",
                "Write seed data scripts with realistic test data",
                "Implement complex queries: job search, applicant ranking, skill matching",
                "Add views and stored procedures for common operations",
                "Write migration scripts for schema changes",
            ],
            technologies=["PostgreSQL", "SQL", "Database Design"],
        ),
    ],
    "graphql": [
        ProjectSuggestion(
            title="Build a GraphQL API for a Blog",
            description="Create a GraphQL API with queries, mutations, subscriptions, and proper auth.",
            skills_demonstrated=["GraphQL", "Node.js", "API Design"],
            difficulty="intermediate",
            estimated_hours=15,
            steps=[
                "Set up Apollo Server with TypeScript",
                "Define schema: User, Post, Comment types with relationships",
                "Implement resolvers with DataLoader for N+1 prevention",
                "Add mutations for CRUD operations",
                "Implement JWT authentication middleware",
                "Add subscriptions for real-time comments",
                "Document with GraphQL Playground",
            ],
            technologies=["GraphQL", "Apollo Server", "TypeScript", "Node.js"],
        ),
    ],
    "aws": [
        ProjectSuggestion(
            title="Deploy a Serverless API on AWS",
            description="Build and deploy a serverless REST API using AWS Lambda, API Gateway, and DynamoDB.",
            skills_demonstrated=["AWS", "Serverless", "Cloud Architecture"],
            difficulty="intermediate",
            estimated_hours=12,
            steps=[
                "Set up AWS free tier account and install AWS CLI",
                "Create a Lambda function (Python/Node.js) for CRUD operations",
                "Set up DynamoDB table for data storage",
                "Configure API Gateway to expose REST endpoints",
                "Add IAM roles with least-privilege permissions",
                "Implement with SAM or Serverless Framework for IaC",
                "Add CloudWatch monitoring and alarms",
            ],
            technologies=["AWS Lambda", "API Gateway", "DynamoDB", "SAM"],
        ),
    ],
    "redis": [
        ProjectSuggestion(
            title="Build a Rate Limiter with Redis",
            description="Implement a token bucket rate limiter using Redis for a web API.",
            skills_demonstrated=["Redis", "Backend", "System Design"],
            difficulty="intermediate",
            estimated_hours=8,
            steps=[
                "Set up Redis locally with Docker",
                "Implement token bucket algorithm using Redis MULTI/EXEC",
                "Create Express/FastAPI middleware that checks rate limits",
                "Add per-user and per-IP rate limiting strategies",
                "Implement sliding window counter as alternative algorithm",
                "Add Redis pub/sub for distributed rate limit sync",
            ],
            technologies=["Redis", "Python/Node.js", "Docker"],
        ),
    ],
    "ci/cd": [
        ProjectSuggestion(
            title="Full CI/CD Pipeline for a Web App",
            description="Set up a complete pipeline: lint, test, build, deploy with automated quality gates.",
            skills_demonstrated=["CI/CD", "DevOps", "Testing"],
            difficulty="intermediate",
            estimated_hours=10,
            steps=[
                "Create a GitHub repo with a web app (any stack)",
                "Add GitHub Actions workflow with lint + type-check steps",
                "Add unit and integration test steps",
                "Configure build step with caching for faster runs",
                "Add deployment to Vercel/Railway/Render on main branch",
                "Implement branch protection rules requiring CI to pass",
                "Add Slack/Discord notifications for failures",
            ],
            technologies=["GitHub Actions", "Docker", "Vercel"],
        ),
    ],
}

# Fallback project for skills without specific templates
DEFAULT_PROJECT = ProjectSuggestion(
    title="Build a Portfolio Project",
    description="Create a project that demonstrates this skill in a real-world context. Add it to GitHub with proper documentation.",
    skills_demonstrated=[],
    difficulty="intermediate",
    estimated_hours=15,
    steps=[
        "Research best practices and common patterns for this technology",
        "Plan a small but complete project (not a toy, not enterprise-scale)",
        "Set up the project with proper structure and tooling",
        "Implement core functionality with clean, documented code",
        "Write tests (unit + integration)",
        "Add a comprehensive README with screenshots/demo",
        "Deploy or publish and add to your portfolio/resume",
    ],
    technologies=[],
)


# ---------------------------------------------------------------------------
# Nepal-specific job boards and tips
# ---------------------------------------------------------------------------

NEPAL_JOB_BOARDS = [
    {"name": "MeroJob", "url": "https://merojob.com", "desc": "Nepal's largest job portal"},
    {"name": "JobsNepal", "url": "https://jobsnepal.com", "desc": "IT and tech-focused listings"},
    {"name": "Kumarijob", "url": "https://kumarijob.com", "desc": "Wide range of industries"},
    {"name": "Hamro Job", "url": "https://hamrojob.com", "desc": "Growing portal with SME focus"},
    {"name": "LinkedIn Nepal", "url": "https://linkedin.com/jobs", "desc": "International + Nepal tech companies"},
]


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def _get_learning_path(skill: str) -> LearningPath:
    """Build a learning path for a given skill."""
    skill_lower = skill.lower().strip()
    resources = SKILL_RESOURCES.get(skill_lower, [])

    # Try partial match if exact not found
    if not resources:
        for key, res in SKILL_RESOURCES.items():
            if key in skill_lower or skill_lower in key:
                resources = res
                break

    # Determine difficulty based on the skill
    advanced_skills = {"kubernetes", "kafka", "machine learning", "system design", "microservices"}
    beginner_skills = {"git", "html", "css", "sql", "python", "javascript"}

    if skill_lower in advanced_skills:
        difficulty = "advanced"
        hours = 40
    elif skill_lower in beginner_skills:
        difficulty = "beginner"
        hours = 15
    else:
        difficulty = "intermediate"
        hours = 25

    return LearningPath(
        skill=skill,
        difficulty=difficulty,
        estimated_hours=hours,
        resources=resources,
        description=f"Learn {skill} from fundamentals to practical application.",
    )


def _get_projects_for_skills(missing_skills: list[str]) -> list[ProjectSuggestion]:
    """Get relevant project suggestions based on missing skills."""
    projects: list[ProjectSuggestion] = []
    seen_titles: set[str] = set()

    for skill in missing_skills[:6]:  # Limit to top 6 skills
        skill_lower = skill.lower().strip()
        skill_projects = PROJECT_TEMPLATES.get(skill_lower, [])

        # Try partial match
        if not skill_projects:
            for key, projs in PROJECT_TEMPLATES.items():
                if key in skill_lower or skill_lower in key:
                    skill_projects = projs
                    break

        if skill_projects:
            for proj in skill_projects:
                if proj.title not in seen_titles:
                    projects.append(proj)
                    seen_titles.add(proj.title)
        else:
            # Generate a generic project suggestion
            generic = ProjectSuggestion(
                title=f"Build a {skill} Demo Project",
                description=f"Create a practical project demonstrating {skill} skills. Focus on real-world usage.",
                skills_demonstrated=[skill],
                difficulty="intermediate",
                estimated_hours=12,
                steps=DEFAULT_PROJECT.steps,
                technologies=[skill],
            )
            if generic.title not in seen_titles:
                projects.append(generic)
                seen_titles.add(generic.title)

    return projects[:5]  # Return max 5 projects


def _get_application_tips(
    matched_skills: list[str],
    missing_skills: list[str],
    mode: str,
) -> list[ApplicationTip]:
    """Generate personalized application tips."""
    tips: list[ApplicationTip] = []

    # Resume tips
    if matched_skills:
        tips.append(ApplicationTip(
            category="resume",
            tip=f"Lead with your strongest matching skills: {', '.join(matched_skills[:5])}. Put them in a prominent Skills section near the top.",
            priority="high",
        ))

    tips.append(ApplicationTip(
        category="resume",
        tip="Use exact keywords from the job description. ATS systems do literal matching — 'React.js' and 'React' may be treated differently.",
        priority="high",
    ))

    tips.append(ApplicationTip(
        category="resume",
        tip="Quantify achievements: 'Improved API response time by 40%' is stronger than 'Optimized API performance'.",
        priority="high",
    ))

    if missing_skills:
        tips.append(ApplicationTip(
            category="resume",
            tip=f"For skills you're learning ({', '.join(missing_skills[:3])}), list them under 'Currently Learning' or demonstrate them through projects.",
            priority="medium",
        ))

    # Cover letter tips
    tips.append(ApplicationTip(
        category="cover_letter",
        tip="Open with a specific reason you're excited about THIS company — show you've done research.",
        priority="medium",
    ))

    tips.append(ApplicationTip(
        category="cover_letter",
        tip="Address skill gaps honestly: 'While I haven't used Kubernetes professionally, I've completed X project using it...'",
        priority="medium",
    ))

    # Interview tips
    tips.append(ApplicationTip(
        category="interview",
        tip="Prepare STAR stories (Situation, Task, Action, Result) for each major skill on your CV.",
        priority="high",
    ))

    tips.append(ApplicationTip(
        category="interview",
        tip="For technical skills you're learning, be honest about your level but emphasize your learning speed and commitment.",
        priority="medium",
    ))

    # Portfolio/networking
    tips.append(ApplicationTip(
        category="portfolio",
        tip="Push all projects to GitHub with proper READMEs. Recruiters will check your profile.",
        priority="high",
    ))

    tips.append(ApplicationTip(
        category="networking",
        tip="Connect with people at target companies on LinkedIn. A referral increases your chances 5-10x.",
        priority="medium",
    ))

    if mode == "scholarship":
        tips.append(ApplicationTip(
            category="resume",
            tip="Highlight research, publications, and academic achievements prominently. Include GPA if above 3.5.",
            priority="high",
        ))
        tips.append(ApplicationTip(
            category="cover_letter",
            tip="Write a compelling personal statement connecting your background to your research interests and career goals.",
            priority="high",
        ))

    return tips


def _estimate_timeline(missing_skills: list[str]) -> str:
    """Estimate how long it will take to become job-ready."""
    count = len(missing_skills)
    if count == 0:
        return "You're already well-qualified! Apply now."
    elif count <= 2:
        return "2-4 weeks of focused learning. You're close — fill these gaps and apply."
    elif count <= 4:
        return "1-2 months. Dedicate 1-2 hours daily to learning + building projects."
    elif count <= 6:
        return "2-3 months. Create a structured study plan and build 2-3 portfolio projects."
    else:
        return "3-6 months. Consider this a career transition — consistent daily effort + community involvement."


def generate_action_plan(
    matched_skills: list[str],
    missing_skills: list[str],
    missing_keywords: list[str] | None = None,
    mode: str = "job",
    target_role: str = "",
) -> ActionPlan:
    """Generate a complete career development action plan.

    Args:
        matched_skills: Skills the candidate already has
        missing_skills: Skills the candidate needs to acquire
        missing_keywords: Additional missing keywords from JD
        mode: 'job' or 'scholarship'
        target_role: Optional target job role for tailored advice

    Returns:
        ActionPlan with learning paths, projects, and application tips
    """
    if missing_keywords is None:
        missing_keywords = []

    # Build learning paths for each missing skill
    learning_paths = [_get_learning_path(skill) for skill in missing_skills[:8]]

    # Get relevant project suggestions
    project_suggestions = _get_projects_for_skills(missing_skills)

    # Generate application tips
    application_tips = _get_application_tips(matched_skills, missing_skills, mode)

    # Timeline estimate
    recommended_timeline = _estimate_timeline(missing_skills)

    # Prioritized next steps
    next_steps: list[str] = []
    if missing_skills:
        next_steps.append(f"Start learning: {missing_skills[0]} (highest priority skill gap)")
    if len(missing_skills) > 1:
        next_steps.append(f"Then tackle: {missing_skills[1]}")
    next_steps.append("Build 1 portfolio project demonstrating your new skills")
    next_steps.append("Update your CV with new skills and project")
    next_steps.append("Re-run this optimizer to check your improved score")
    if mode == "job":
        next_steps.append("Apply to 3-5 positions while continuing to learn")
    else:
        next_steps.append("Prepare your scholarship application with updated CV")

    # Estimate score improvement
    total_missing = len(missing_skills) + len(missing_keywords)
    score_improvement = min(int((len(missing_skills[:5]) / max(total_missing, 1)) * 35), 35)

    return ActionPlan(
        learning_paths=learning_paths,
        project_suggestions=project_suggestions,
        application_tips=application_tips,
        recommended_timeline=recommended_timeline,
        next_steps=next_steps,
        score_improvement_estimate=score_improvement,
    )
