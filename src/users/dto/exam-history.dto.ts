export class ExamHistoryDto {
  id: string;
  examId: string;
  examTitle: string;
  score: number; // số câu trả lời đúng
  totalQuestions: number; // tổng câu hỏi
  correctAnswers: number; // số câu đúng
  percentage: number; // phần trăm: 0-100
  submittedAt: Date;
  timeTaken: number; // giây
}
