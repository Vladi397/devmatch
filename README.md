# DevMatch

DevMatch is a full-stack AI-powered job assistant built with Expo React Native and a Node.js backend. It helps developers find and apply for jobs by analyzing their resume against job descriptions using ATS scoring.

## 🚀 Tech Stack

### Frontend
- **Framework**: Expo 54 + React Native
- **Language**: TypeScript
- **Routing**: Expo Router v6 (file-based)
- **UI**: React Native StyleSheet with custom dark theme
- **Auth Storage**: expo-secure-store (JWT tokens)
- **Icons**: @expo/vector-icons

### Backend
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **ORM**: Prisma v6
- **Database**: PostgreSQL
- **Auth**: JWT (jsonwebtoken) + bcryptjs

## 📱 Features
- **Authentication**: Register and login with JWT-based auth
- **Dashboard**: Overview of job matches and application activity
- **Job Matching**: View job listings with calculated match % based on skills
- **Resume Upload**: Upload and store your resume (in progress)
- **ATS Analysis**: AI-powered resume vs job description scoring (in progress)
- **Application Tracking**: Track status of all your applications
- **Cross-Platform**: Android, iOS, and Web

## 🗄️ Database Schema
- **User** — authentication and profile
- **Resume** — uploaded resumes with ATS scores
- **Job** — job listings
- **Application** — tracks user applications and status
- **MotivationLetter** — AI-generated cover letters
- **ATSAnalysis** — resume vs job description analysis results

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Expo Go](https://expo.dev/go) on your phone or an emulator

### Backend Setup
1. Go to the backend folder:
```bash
   cd backend
```
2. Install dependencies:
```bash
   npm install
```
3. Create a `.env` file:
```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/devmatch"
   JWT_SECRET="your_secret_key"
   PORT=3000
```
4. Run database migrations:
```bash
   npx prisma migrate dev --name init
```
5. Start the backend:
```bash
   npm run dev
```

### Frontend Setup
1. Go to the mobile folder:
```bash
   cd mobile
```
2. Install dependencies:
```bash
   npm install
```
3. Start the app:
```bash
   npx expo start
```

## 📁 Project Structure
