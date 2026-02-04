/*
  Warnings:

  - You are about to drop the column `createBy` on the `Exam` table. All the data in the column will be lost.
  - You are about to drop the column `answers` on the `ExamSession` table. All the data in the column will be lost.
  - Added the required column `createdBy` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timeLimit` to the `ExamSession` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('SCRIPT_VOCABULARY', 'CONVERSATION_EXPRESSION', 'LISTENING', 'READING');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_createBy_fkey";

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "createBy",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ExamSession" DROP COLUMN "answers",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "timeLimit" INTEGER NOT NULL,
ADD COLUMN     "totalCorrect" INTEGER,
ADD COLUMN     "totalUnanswered" INTEGER,
ADD COLUMN     "totalWrong" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "sectionType" "SectionType" NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "explanationHtml" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "orderNo" INTEGER NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sectionType" "SectionType" NOT NULL,
    "orderNo" INTEGER NOT NULL,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExamSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSetExam" (
    "id" TEXT NOT NULL,
    "examSetId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "orderNo" INTEGER NOT NULL,

    CONSTRAINT "ExamSetExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSessionAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "answeredAt" TIMESTAMP(3),
    "isCorrect" BOOLEAN,
    "questionSnapshotHtml" TEXT,
    "optionsSnapshotJson" JSONB,
    "correctOptionId" TEXT,

    CONSTRAINT "ExamSessionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_sectionType_idx" ON "Question"("sectionType");

-- CreateIndex
CREATE INDEX "Question_status_deletedAt_idx" ON "Question"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- CreateIndex
CREATE INDEX "ExamQuestion_examId_orderNo_idx" ON "ExamQuestion"("examId", "orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "ExamQuestion_examId_questionId_key" ON "ExamQuestion"("examId", "questionId");

-- CreateIndex
CREATE INDEX "ExamSet_status_deletedAt_idx" ON "ExamSet"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "ExamSetExam_examSetId_orderNo_idx" ON "ExamSetExam"("examSetId", "orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSetExam_examSetId_examId_key" ON "ExamSetExam"("examSetId", "examId");

-- CreateIndex
CREATE INDEX "ExamSessionAnswer_sessionId_idx" ON "ExamSessionAnswer"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSessionAnswer_sessionId_questionId_key" ON "ExamSessionAnswer"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "Exam_status_deletedAt_idx" ON "Exam"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "ExamSession_userId_status_idx" ON "ExamSession"("userId", "status");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSet" ADD CONSTRAINT "ExamSet_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSetExam" ADD CONSTRAINT "ExamSetExam_examSetId_fkey" FOREIGN KEY ("examSetId") REFERENCES "ExamSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSetExam" ADD CONSTRAINT "ExamSetExam_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSessionAnswer" ADD CONSTRAINT "ExamSessionAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSessionAnswer" ADD CONSTRAINT "ExamSessionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
