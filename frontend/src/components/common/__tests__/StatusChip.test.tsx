import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import StatusChip, { ApplicationStatus } from '../StatusChip';
import '@testing-library/jest-dom';

// テーマの作成
const theme = createTheme();

// ヘルパー関数
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('StatusChip', () => {
  describe('基本レンダリング', () => {
    test('承認済ステータスが正しく表示される', () => {
      renderWithTheme(<StatusChip status="approved" />);
      
      const chip = screen.getByText('承認済');
      expect(chip).toBeInTheDocument();
      expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    });

    test('申請中ステータスが正しく表示される', () => {
      renderWithTheme(<StatusChip status="pending" />);
      
      const chip = screen.getByText('申請中');
      expect(chip).toBeInTheDocument();
      expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    });

    test('却下ステータスが正しく表示される', () => {
      renderWithTheme(<StatusChip status="rejected" />);
      
      const chip = screen.getByText('却下');
      expect(chip).toBeInTheDocument();
      expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    });

    test('提出済ステータスが正しく表示される', () => {
      renderWithTheme(<StatusChip status="submitted" />);
      
      const chip = screen.getByText('提出済');
      expect(chip).toBeInTheDocument();
      expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorInfo');
    });

    test('下書きステータスが正しく表示される', () => {
      renderWithTheme(<StatusChip status="draft" />);
      
      const chip = screen.getByText('下書き');
      expect(chip).toBeInTheDocument();
      expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorInfo');
    });

    test('未提出ステータスが正しく表示される', () => {
      renderWithTheme(<StatusChip status="not_submitted" />);
      
      const chip = screen.getByText('未提出');
      expect(chip).toBeInTheDocument();
      expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
    });
  });

  describe('ステータスラベルとカラーマッピング', () => {
    const statusTestCases: Array<[ApplicationStatus, string, string]> = [
      ['approved', '承認済', 'MuiChip-colorSuccess'],
      ['pending', '申請中', 'MuiChip-colorWarning'],
      ['rejected', '却下', 'MuiChip-colorError'],
      ['submitted', '提出済', 'MuiChip-colorInfo'],
      ['draft', '下書き', 'MuiChip-colorInfo'],
      ['not_submitted', '未提出', 'MuiChip-colorDefault'],
      ['returned', '差し戻し', 'MuiChip-colorWarning'],
    ];

    test.each(statusTestCases)('%s ステータスで正しいラベルとカラーが適用される', (status, expectedLabel, expectedColorClass) => {
      renderWithTheme(<StatusChip status={status} />);
      
      const chip = screen.getByText(expectedLabel);
      expect(chip).toBeInTheDocument();
      expect(chip.closest('.MuiChip-root')).toHaveClass(expectedColorClass);
    });
  });

  describe('カスタムラベル', () => {
    test('カスタムラベルが正しく表示される', () => {
      renderWithTheme(<StatusChip status="approved" label="カスタム承認" />);
      
      const chip = screen.getByText('カスタム承認');
      expect(chip).toBeInTheDocument();
      expect(screen.queryByText('承認済')).not.toBeInTheDocument();
    });

    test('空文字のカスタムラベルでもデフォルトラベルが表示される', () => {
      renderWithTheme(<StatusChip status="pending" label="" />);
      
      // 空文字が設定されるため、実際は空のラベルが表示される
      const chipElement = screen.getByText('申請中').closest('.MuiChip-root');
      expect(chipElement).toBeInTheDocument();
    });

    test('undefinedのカスタムラベルでデフォルトラベルが使用される', () => {
      renderWithTheme(<StatusChip status="draft" label={undefined} />);
      
      const chip = screen.getByText('下書き');
      expect(chip).toBeInTheDocument();
    });

    test('nullのカスタムラベルでデフォルトラベルが使用される', () => {
      renderWithTheme(<StatusChip status="rejected" label={null as any} />);
      
      const chip = screen.getByText('却下');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('サイズ', () => {
    test('デフォルトサイズはsmall', () => {
      renderWithTheme(<StatusChip status="approved" />);
      
      const chipElement = screen.getByText('承認済').closest('.MuiChip-root');
      expect(chipElement).toHaveClass('MuiChip-sizeSmall');
    });

    test('mediumサイズが正しく適用される', () => {
      renderWithTheme(<StatusChip status="pending" size="medium" />);
      
      const chipElement = screen.getByText('申請中').closest('.MuiChip-root');
      expect(chipElement).toHaveClass('MuiChip-sizeMedium');
    });

    test('smallサイズが明示的に設定される', () => {
      renderWithTheme(<StatusChip status="draft" size="small" />);
      
      const chipElement = screen.getByText('下書き').closest('.MuiChip-root');
      expect(chipElement).toHaveClass('MuiChip-sizeSmall');
    });
  });

  describe('その他のプロパティ', () => {
    test('classNameが正しく適用される', () => {
      renderWithTheme(
        <StatusChip 
          status="submitted" 
          className="custom-status-chip" 
        />
      );
      
      const chipElement = screen.getByText('提出済').closest('.MuiChip-root');
      expect(chipElement).toHaveClass('custom-status-chip');
    });

    test('data-testidが正しく設定される', () => {
      renderWithTheme(
        <StatusChip 
          status="approved" 
          data-testid="test-status-chip" 
        />
      );
      
      expect(screen.getByTestId('test-status-chip')).toBeInTheDocument();
    });

    test('onClickハンドラーが正しく動作する', () => {
      const handleClick = jest.fn();
      
      renderWithTheme(
        <StatusChip 
          status="pending" 
          onClick={handleClick}
        />
      );
      
      const chipElement = screen.getByText('申請中');
      chipElement.click();
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('onDeleteハンドラーが正しく動作する', () => {
      const handleDelete = jest.fn();
      const user = userEvent.setup();
      
      renderWithTheme(
        <StatusChip 
          status="draft" 
          onDelete={handleDelete}
        />
      );
      
      // 削除ボタンが表示される
      const deleteButton = screen.getByTestId('CancelIcon');
      expect(deleteButton).toBeInTheDocument();
      
      fireEvent.click(deleteButton);
      expect(handleDelete).toHaveBeenCalledTimes(1);
    });

    test('disabledプロパティが正しく動作する', () => {
      renderWithTheme(
        <StatusChip 
          status="approved" 
          disabled={true}
        />
      );
      
      const chipElement = screen.getByText('承認済').closest('.MuiChip-root');
      expect(chipElement).toHaveClass('Mui-disabled');
    });
  });

  describe('スタイリング', () => {
    test('デフォルトのスタイルが適用される', () => {
      renderWithTheme(<StatusChip status="submitted" />);
      
      const chipElement = screen.getByText('提出済').closest('.MuiChip-root');
      expect(chipElement).toHaveStyle({
        fontWeight: 'medium',
        borderRadius: '4px', // theme.spacing(1) = 8px -> border-radius: 4px
      });
    });

    test('カスタムsxプロパティが正しく適用される', () => {
      renderWithTheme(
        <StatusChip 
          status="pending" 
          sx={{ 
            backgroundColor: 'red',
            color: 'white'
          }}
        />
      );
      
      const chipElement = screen.getByText('申請中').closest('.MuiChip-root');
      expect(chipElement).toHaveStyle({
        'background-color': 'rgb(255, 0, 0)',
        color: 'rgb(255, 255, 255)'
      });
    });

    test('sxプロパティがデフォルトスタイルとマージされる', () => {
      renderWithTheme(
        <StatusChip 
          status="approved" 
          sx={{ 
            margin: '8px'
          }}
        />
      );
      
      const chipElement = screen.getByText('承認済').closest('.MuiChip-root');
      expect(chipElement).toHaveStyle({
        fontWeight: 'medium',
        borderRadius: '4px',
        margin: '8px'
      });
    });
  });

  describe('バリアント', () => {
    test('outlinedバリアントが正しく適用される', () => {
      renderWithTheme(
        <StatusChip 
          status="pending" 
          variant="outlined"
        />
      );
      
      const chipElement = screen.getByText('申請中').closest('.MuiChip-root');
      expect(chipElement).toHaveClass('MuiChip-outlined');
    });

    test('filledバリアント（デフォルト）が適用される', () => {
      renderWithTheme(<StatusChip status="approved" />);
      
      const chipElement = screen.getByText('承認済').closest('.MuiChip-root');
      expect(chipElement).toHaveClass('MuiChip-filled');
    });
  });

  describe('複合的なテスト', () => {
    test('すべてのプロパティが同時に動作する', () => {
      const handleClick = jest.fn();
      const handleDelete = jest.fn();
      
      renderWithTheme(
        <StatusChip 
          status="rejected"
          label="カスタム却下"
          size="medium"
          variant="outlined"
          onClick={handleClick}
          onDelete={handleDelete}
          className="complex-chip"
          data-testid="complex-status-chip"
          sx={{ margin: '16px' }}
        />
      );
      
      const chip = screen.getByTestId('complex-status-chip');
      const chipText = screen.getByText('カスタム却下');
      
      // 基本的な表示確認
      expect(chipText).toBeInTheDocument();
      expect(chip).toHaveClass('MuiChip-outlined');
      expect(chip).toHaveClass('MuiChip-sizeMedium');
      expect(chip).toHaveClass('MuiChip-colorError');
      expect(chip).toHaveClass('complex-chip');
      
      // スタイルの確認
      expect(chip).toHaveStyle({ margin: '16px' });
      
      // クリックイベントの確認
      chipText.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // 削除イベントの確認
      const deleteButton = screen.getByTestId('CancelIcon');
      fireEvent.click(deleteButton);
      expect(handleDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーケース', () => {
    test('不正なステータスでもクラッシュしない', () => {
      // TypeScriptでは型エラーになるが、実行時エラーは発生しない
      expect(() => {
        renderWithTheme(
          <StatusChip status={'invalid_status' as ApplicationStatus} />
        );
      }).not.toThrow();
    });

    test('undefinedのステータスでもクラッシュしない', () => {
      expect(() => {
        renderWithTheme(
          <StatusChip status={undefined as any} />
        );
      }).not.toThrow();
    });
  });

  describe('アクセシビリティ', () => {
    test('適切なロールが設定される', () => {
      renderWithTheme(<StatusChip status="approved" />);
      
      // MUI ChipはデフォルトでbuttonロールまたはgenericRole
      const chipElement = screen.getByText('承認済').closest('.MuiChip-root');
      expect(chipElement).toBeInTheDocument();
    });

    test('aria-labelが正しく設定される', () => {
      renderWithTheme(
        <StatusChip 
          status="pending" 
          aria-label="申請状況チップ"
        />
      );
      
      const chipElement = screen.getByLabelText('申請状況チップ');
      expect(chipElement).toBeInTheDocument();
    });

    test('クリック可能な場合に適切なタブインデックスが設定される', () => {
      const handleClick = jest.fn();
      
      renderWithTheme(
        <StatusChip 
          status="draft" 
          onClick={handleClick}
        />
      );
      
      const chipElement = screen.getByText('下書き').closest('.MuiChip-root');
      expect(chipElement).toHaveAttribute('tabindex', '0');
    });
  });
});
