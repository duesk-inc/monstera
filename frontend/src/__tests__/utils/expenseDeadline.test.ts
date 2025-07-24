import {
  calculateExpenseDeadline,
  isWithinDeadline,
  getDaysUntilDeadline,
  getDeadlineWarningLevel,
  getFormattedDeadline,
  getDeadlineMessage,
  getEarliestAllowableExpenseDate,
  isAllowableForSubmission,
} from '@/utils/expenseDeadline';

describe('expenseDeadline', () => {
  describe('calculateExpenseDeadline', () => {
    it('通常月の期限計算', () => {
      const expenseDate = new Date('2025-03-15');
      const deadline = calculateExpenseDeadline(expenseDate);
      
      expect(deadline.getFullYear()).toBe(2025);
      expect(deadline.getMonth()).toBe(3); // 4月（0-indexed）
      expect(deadline.getDate()).toBe(10);
      expect(deadline.getHours()).toBe(23);
      expect(deadline.getMinutes()).toBe(59);
      expect(deadline.getSeconds()).toBe(59);
    });

    it('年末の期限計算', () => {
      const expenseDate = new Date('2025-12-31');
      const deadline = calculateExpenseDeadline(expenseDate);
      
      expect(deadline.getFullYear()).toBe(2026);
      expect(deadline.getMonth()).toBe(0); // 1月
      expect(deadline.getDate()).toBe(10);
    });

    it('月末の期限計算', () => {
      const expenseDate = new Date('2025-01-31');
      const deadline = calculateExpenseDeadline(expenseDate);
      
      expect(deadline.getFullYear()).toBe(2025);
      expect(deadline.getMonth()).toBe(1); // 2月
      expect(deadline.getDate()).toBe(10);
    });
  });

  describe('isWithinDeadline', () => {
    it('期限内の場合', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-09');
      
      expect(isWithinDeadline(expenseDate, currentDate)).toBe(true);
    });

    it('期限当日の場合', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-10 23:59:59');
      
      expect(isWithinDeadline(expenseDate, currentDate)).toBe(true);
    });

    it('期限切れの場合', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-11');
      
      expect(isWithinDeadline(expenseDate, currentDate)).toBe(false);
    });
  });

  describe('getDaysUntilDeadline', () => {
    it('期限まで5日の場合', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-05');
      
      expect(getDaysUntilDeadline(expenseDate, currentDate)).toBe(5);
    });

    it('期限当日の場合', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-10');
      
      expect(getDaysUntilDeadline(expenseDate, currentDate)).toBe(0);
    });

    it('期限を3日過ぎた場合', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-13');
      
      expect(getDaysUntilDeadline(expenseDate, currentDate)).toBe(-3);
    });
  });

  describe('getDeadlineWarningLevel', () => {
    it('期限切れの場合', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-11');
      
      expect(getDeadlineWarningLevel(expenseDate, currentDate)).toBe('expired');
    });

    it('3日以内の場合（critical）', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-08');
      
      expect(getDeadlineWarningLevel(expenseDate, currentDate)).toBe('critical');
    });

    it('7日以内の場合（warning）', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-04');
      
      expect(getDeadlineWarningLevel(expenseDate, currentDate)).toBe('warning');
    });

    it('8日以上余裕がある場合（normal）', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-01');
      
      expect(getDeadlineWarningLevel(expenseDate, currentDate)).toBe('normal');
    });
  });

  describe('getFormattedDeadline', () => {
    it('期限日のフォーマット', () => {
      const expenseDate = new Date('2025-03-15');
      
      expect(getFormattedDeadline(expenseDate)).toBe('2025年04月10日');
    });
  });

  describe('getDeadlineMessage', () => {
    it('期限切れのメッセージ', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-13');
      
      expect(getDeadlineMessage(expenseDate, currentDate))
        .toBe('申請期限（2025年04月10日）を3日過ぎています');
    });

    it('期限当日のメッセージ', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-10');
      
      expect(getDeadlineMessage(expenseDate, currentDate))
        .toBe('本日（2025年04月10日）が申請期限です');
    });

    it('期限間近のメッセージ', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-08');
      
      expect(getDeadlineMessage(expenseDate, currentDate))
        .toBe('申請期限（2025年04月10日）まであと2日です');
    });

    it('通常のメッセージ', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-01');
      
      expect(getDeadlineMessage(expenseDate, currentDate))
        .toBe('申請期限: 2025年04月10日');
    });
  });

  describe('getEarliestAllowableExpenseDate', () => {
    it('月の10日以前の場合', () => {
      const currentDate = new Date('2025-04-05');
      const earliest = getEarliestAllowableExpenseDate(currentDate);
      
      expect(earliest.getFullYear()).toBe(2025);
      expect(earliest.getMonth()).toBe(2); // 3月
      expect(earliest.getDate()).toBe(1);
    });

    it('月の11日以降の場合', () => {
      const currentDate = new Date('2025-04-15');
      const earliest = getEarliestAllowableExpenseDate(currentDate);
      
      expect(earliest.getFullYear()).toBe(2025);
      expect(earliest.getMonth()).toBe(3); // 4月
      expect(earliest.getDate()).toBe(1);
    });
  });

  describe('isAllowableForSubmission', () => {
    it('現在年度内で期限内の場合', () => {
      const expenseDate = new Date('2025-03-15');
      const currentDate = new Date('2025-04-09');
      
      expect(isAllowableForSubmission(expenseDate, currentDate)).toBe(true);
    });

    it('現在年度内で期限切れの場合', () => {
      const expenseDate = new Date('2025-01-15');
      const currentDate = new Date('2025-03-11');
      
      expect(isAllowableForSubmission(expenseDate, currentDate)).toBe(false);
    });

    it('前年度の場合（通常）', () => {
      const expenseDate = new Date('2024-11-15');
      const currentDate = new Date('2025-04-01');
      
      expect(isAllowableForSubmission(expenseDate, currentDate)).toBe(false);
    });

    it('1月の特例：前年12月分で期限内', () => {
      const expenseDate = new Date('2024-12-15');
      const currentDate = new Date('2025-01-09');
      
      expect(isAllowableForSubmission(expenseDate, currentDate)).toBe(true);
    });

    it('1月の特例：前年12月分で期限切れ', () => {
      const expenseDate = new Date('2024-12-15');
      const currentDate = new Date('2025-01-11');
      
      expect(isAllowableForSubmission(expenseDate, currentDate)).toBe(false);
    });
  });
});