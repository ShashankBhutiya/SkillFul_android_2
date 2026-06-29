# Skillful — Release Notes

## Version 1.0.3 (Android Build 3)
**Date:** June 25, 2026  
**Platform:** Web, Android (Capacitor), iOS (Capacitor)  
**Author/Developer:** Shashank Bhutiya  

---

## 🌟 Overview
**Skillful** is an interactive, gamified "judgment training gym" built to help users train their instincts and make better personal and professional life decisions. Using a swipe-based quiz mechanic, the app provides real-time feedback, detailed explanations, and progress tracking across a wide range of real-world scenarios.

---

## 🚀 Key Features

### 1. Interactive Swipe-Based Quiz Gym
- **Dynamic Scenarios:** Real-life situational questions covering complex personal and professional decisions.
- **Immediate Feedback:** Instant visual cues and deep-dive explanations following each action.
- **Milestone Celebrations:** Interactive celebration overlay components that reward users as they reach new score milestones.

### 2. Native Mobile Integration (Capacitor)
- **Multi-Platform Support:** Fully compiled native Android and iOS compatibility wrappers.
- **Custom Branding Assets:** Custom-tailored app launch icons and pixel-perfect splash screens, optimized for varying pixel densities and aspect ratios.
- **Adaptive Splash Screens:** Built-in support for light-mode and dark/night-mode native splash transitions on Android and iOS.

### 3. Backend & User Management (Supabase)
- **Seamless Authentication:** Comprehensive email and social login flows managed through an `AuthContext` provider.
- **Data Syncing:** Profile settings, quiz progression, and custom scores synced automatically with the Supabase database.
- **Global Leaderboard:** Multi-user global ranking board showcasing active top performers.

### 4. Interactive Companion Mascot & Notifications
- **Smart Mascot (Owl Companion):** Integrated interactive mascot component that guides users, offers context-specific tips, and alerts them about new milestones.
- **Notification Center:** Local and database-driven notification scheduling, customized settings, and a slide-out dashboard to review unread updates.
- **Onboarding Prompts:** Built-in alerts for PWA app installation and native notification permissions.

---

## 📚 Training Categories Summary
Skillful ships with **17 diverse learning modules** comprising over **3,400 scenarios**:

### 💼 Professional Skills
*   **Office Politics Mastery (♟️):** Strategy, alignment, and relationship management in corporate settings.
*   **How to Get Promoted Faster (📈):** High-level career acceleration strategies.
*   **Corporate Dangers & Career Pitfalls (⚠️):** Recognizing hazards, warnings, and protection tips.
*   **Awesome Relationship with your Boss (🏢):** Building productive and healthy professional relationships.
*   **How to Negotiate Salary (🤝):** Key tactics to maximize compensation.
*   **Interview Prep (💼):** Comprehensive preparation for job interviews.
*   **Investing & Financial Awareness (📊):** Fundamental structures of personal finance.
*   **Stock Market (📈):** Real-time stock analysis scenarios and market trends.
*   **Chanakya for Corporate (🧭):** Ancient strategic wisdom adapted for modern workplaces.
*   **Machiavellian Strategy & Power (♟️):** Understanding power dynamics and positioning.

### 🌺 Personal Development
*   **Female Self-Worth & Boundaries (🌺):** Boundaries, self-respect, and self-advocacy.
*   **POSH - Avoiding Creeps Beforehand (🚫):** Safety-first awareness and prevention guidelines.
*   **Effective Communication (🗣️):** Clear dialogue, conflict resolution, and active listening.
*   **Personality Dev (🧠):** Personal growth, habits, and mindset improvement.
*   **Dating Tips for Men (👩‍🤝‍🧑):** Relationship-building and dating best practices.
*   **How to be more Masculine (🛡️):** Personal development and responsibility frameworks.

---

## 🛠️ Technical Stack & Infrastructure
*   **Frontend Library:** React 18, TypeScript, Tailwind CSS
*   **Build System:** Vite
*   **CSS Animations:** Framer Motion, Tailwind Animate
*   **Icons:** Lucide React
*   **Native Wrapper:** Capacitor SDK (@capacitor/core, @capacitor/android, @capacitor/ios)
*   **Backend & DB:** Supabase Client Library
*   **SEO Optimization:** Custom SEO-head management, meta tags, and automatic XML sitemap compilation (`/sitemap.xml`) to boost Google Search Console indexing.

---

## 📈 Recent Updates & Enhancements
- Added automated prebuild and postbuild scripts for generating SEO assets.
- Implemented `/sitemap.xml` dynamically reflecting the site directory and quiz modules.
- Refactored `MainLayout.tsx` to simulate a realistic smartphone interface when running on desktop browsers (promoting native design feel).
- Added local storage fallback logic for users exploring quizzes in offline/anonymous modes.
- Released build configuration profiles for APK signing and Play Store release readiness (`my-release-key.jks`).
