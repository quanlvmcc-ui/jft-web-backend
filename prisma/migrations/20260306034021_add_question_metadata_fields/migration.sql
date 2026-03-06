-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Untitled Question',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'MCQ';
