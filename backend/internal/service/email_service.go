package service

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"net/smtp"
	"strings"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
)

// EmailService メール送信サービスのインターフェース
type EmailService interface {
	// SendEmail シンプルなメール送信
	SendEmail(ctx context.Context, to []string, subject, body string) error

	// SendHTMLEmail HTML形式のメール送信
	SendHTMLEmail(ctx context.Context, to []string, subject, htmlBody string) error

	// SendTemplatedEmail テンプレートを使用したメール送信
	SendTemplatedEmail(ctx context.Context, to []string, subject, templateName string, data interface{}) error

	// 週報関連メール
	SendWeeklyReportReminder(ctx context.Context, to string, userName string, weekStart, weekEnd string) error
	SendWeeklyReportSubmittedNotice(ctx context.Context, to string, userName string, weekStart, weekEnd string) error

	// アラート関連メール
	SendAlertNotification(ctx context.Context, to string, alertType, severity, message string) error

	// 管理者向けメール
	SendAdminNotification(ctx context.Context, to []string, subject, message string) error

	// 経費申請関連メール
	SendExpenseSubmittedNotice(ctx context.Context, to string, approverName string, expense *model.Expense) error
	SendExpenseApprovedNotice(ctx context.Context, to string, expense *model.Expense, approverName string, isFullyApproved bool) error
	SendExpenseRejectedNotice(ctx context.Context, to string, expense *model.Expense, rejectorName string, reason string) error
	SendExpenseLimitWarning(ctx context.Context, to string, userName string, limitType string, usageRate float64, currentAmount, limitAmount int) error
}

// emailService メール送信サービスの実装
type emailService struct {
	config    *config.EmailConfig
	logger    *zap.Logger
	templates map[string]*template.Template
}

// NewEmailService メール送信サービスのインスタンスを生成
func NewEmailService(cfg *config.EmailConfig, logger *zap.Logger) (EmailService, error) {
	service := &emailService{
		config:    cfg,
		logger:    logger,
		templates: make(map[string]*template.Template),
	}

	// メールテンプレートの初期化
	if err := service.initializeTemplates(); err != nil {
		return nil, fmt.Errorf("メールテンプレートの初期化に失敗しました: %w", err)
	}

	return service, nil
}

// initializeTemplates メールテンプレートを初期化
func (s *emailService) initializeTemplates() error {
	// 週報リマインダーテンプレート
	weeklyReminderTmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>週報提出のリマインド</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f4f4f4; }
        .button { display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>週報提出のリマインド</h2>
        </div>
        <div class="content">
            <p>{{.UserName}} 様</p>
            <p>週報の提出期限が近づいています。</p>
            <p><strong>対象期間: {{.WeekStart}} 〜 {{.WeekEnd}}</strong></p>
            <p>まだ提出されていない場合は、早めの提出をお願いいたします。</p>
            <p style="text-align: center; margin-top: 30px;">
                <a href="{{.SystemURL}}/weekly-report" class="button">週報を提出する</a>
            </p>
        </div>
        <div class="footer">
            <p>このメールは自動送信されています。</p>
        </div>
    </div>
</body>
</html>
`

	// アラート通知テンプレート
	alertNotificationTmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>アラート通知</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { padding: 20px; text-align: center; }
        .header.high { background-color: #e74c3c; color: white; }
        .header.medium { background-color: #f39c12; color: white; }
        .header.low { background-color: #3498db; color: white; }
        .content { padding: 20px; background-color: #f4f4f4; }
        .alert-box { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header {{.Severity}}">
            <h2>{{.AlertType}}</h2>
        </div>
        <div class="content">
            <div class="alert-box">
                <h3>アラート詳細</h3>
                <p><strong>重要度:</strong> {{.SeverityLabel}}</p>
                <p><strong>メッセージ:</strong></p>
                <p>{{.Message}}</p>
            </div>
            <p style="text-align: center; margin-top: 30px;">
                <a href="{{.SystemURL}}/alerts" class="button">詳細を確認する</a>
            </p>
        </div>
        <div class="footer">
            <p>このメールは自動送信されています。</p>
        </div>
    </div>
</body>
</html>
`

	// テンプレートを解析して保存
	tmpl, err := template.New("weekly_reminder").Parse(weeklyReminderTmpl)
	if err != nil {
		return fmt.Errorf("週報リマインダーテンプレートの解析に失敗: %w", err)
	}
	s.templates["weekly_reminder"] = tmpl

	tmpl, err = template.New("alert_notification").Parse(alertNotificationTmpl)
	if err != nil {
		return fmt.Errorf("アラート通知テンプレートの解析に失敗: %w", err)
	}
	s.templates["alert_notification"] = tmpl

	// 経費申請提出通知テンプレート
	expenseSubmittedTmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>経費申請承認依頼</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f4f4f4; }
        .expense-details { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .expense-details table { width: 100%; border-collapse: collapse; }
        .expense-details td { padding: 8px; border-bottom: 1px solid #eee; }
        .expense-details td:first-child { font-weight: bold; width: 30%; }
        .button { display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>経費申請承認依頼</h2>
        </div>
        <div class="content">
            <p>{{.ApproverName}} 様</p>
            <p>以下の経費申請について承認をお願いいたします。</p>
            <div class="expense-details">
                <table>
                    <tr>
                        <td>申請者</td>
                        <td>{{.Expense.User.Name}}</td>
                    </tr>
                    <tr>
                        <td>申請タイトル</td>
                        <td>{{.Expense.Title}}</td>
                    </tr>
                    <tr>
                        <td>金額</td>
                        <td>{{.Expense.Amount}}円</td>
                    </tr>
                    <tr>
                        <td>経費発生日</td>
                        <td>{{.ExpenseDate}}</td>
                    </tr>
                    <tr>
                        <td>カテゴリ</td>
                        <td>{{.CategoryName}}</td>
                    </tr>
                    <tr>
                        <td>説明</td>
                        <td>{{.Expense.Description}}</td>
                    </tr>
                </table>
            </div>
            <p style="text-align: center; margin-top: 30px;">
                <a href="{{.SystemURL}}/admin/expenses/pending" class="button">承認画面へ</a>
            </p>
        </div>
        <div class="footer">
            <p>このメールは自動送信されています。</p>
        </div>
    </div>
</body>
</html>
`

	// 経費申請承認済み通知テンプレート
	expenseApprovedTmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>経費申請承認のお知らせ</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4caf50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f4f4f4; }
        .status { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #4caf50; }
        .button { display: inline-block; padding: 10px 20px; background-color: #4caf50; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>経費申請承認のお知らせ</h2>
        </div>
        <div class="content">
            <p>{{.Expense.User.Name}} 様</p>
            <div class="status">
                <p>あなたの経費申請「<strong>{{.Expense.Title}}</strong>」（{{.Expense.Amount}}円）が</p>
                {{if .IsFullyApproved}}
                <p><strong>全ての承認を得て完了しました。</strong></p>
                {{else}}
                <p><strong>{{.ApproverName}}さんに承認されました。</strong></p>
                <p>次の承認者の確認を待っています。</p>
                {{end}}
            </div>
            <p style="text-align: center; margin-top: 30px;">
                <a href="{{.SystemURL}}/expenses/{{.Expense.ID}}" class="button">詳細を確認</a>
            </p>
        </div>
        <div class="footer">
            <p>このメールは自動送信されています。</p>
        </div>
    </div>
</body>
</html>
`

	// 経費申請却下通知テンプレート
	expenseRejectedTmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>経費申請却下のお知らせ</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f4f4f4; }
        .status { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #f44336; }
        .reason { background-color: #fff8e1; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .button { display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>経費申請却下のお知らせ</h2>
        </div>
        <div class="content">
            <p>{{.Expense.User.Name}} 様</p>
            <div class="status">
                <p>あなたの経費申請「<strong>{{.Expense.Title}}</strong>」（{{.Expense.Amount}}円）が</p>
                <p><strong>{{.RejectorName}}さんによって却下されました。</strong></p>
            </div>
            <div class="reason">
                <p><strong>却下理由：</strong></p>
                <p>{{.Reason}}</p>
            </div>
            <p>修正が必要な場合は、新しい申請として再提出してください。</p>
            <p style="text-align: center; margin-top: 30px;">
                <a href="{{.SystemURL}}/expenses" class="button">経費申請一覧へ</a>
            </p>
        </div>
        <div class="footer">
            <p>このメールは自動送信されています。</p>
        </div>
    </div>
</body>
</html>
`

	// 上限警告通知テンプレート
	expenseLimitWarningTmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>経費申請上限警告</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f4f4f4; }
        .warning-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .usage-info { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .usage-info table { width: 100%; border-collapse: collapse; }
        .usage-info td { padding: 8px; }
        .usage-info td:first-child { font-weight: bold; width: 40%; }
        .button { display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>経費申請上限警告</h2>
        </div>
        <div class="content">
            <p>{{.UserName}} 様</p>
            <div class="warning-box">
                <p><strong>{{.LimitTypeLabel}}経費申請上限の{{.UsageRate}}%を使用しています。</strong></p>
                <p>計画的な申請をお願いします。</p>
            </div>
            <div class="usage-info">
                <table>
                    <tr>
                        <td>現在の使用額</td>
                        <td>{{.CurrentAmount}}円</td>
                    </tr>
                    <tr>
                        <td>{{.LimitTypeLabel}}上限額</td>
                        <td>{{.LimitAmount}}円</td>
                    </tr>
                    <tr>
                        <td>残額</td>
                        <td>{{.RemainingAmount}}円</td>
                    </tr>
                </table>
            </div>
            <p style="text-align: center; margin-top: 30px;">
                <a href="{{.SystemURL}}/expenses" class="button">経費申請状況を確認</a>
            </p>
        </div>
        <div class="footer">
            <p>このメールは自動送信されています。</p>
        </div>
    </div>
</body>
</html>
`

	// テンプレートを追加で解析
	tmpl, err = template.New("expense_submitted").Parse(expenseSubmittedTmpl)
	if err != nil {
		return fmt.Errorf("経費申請提出テンプレートの解析に失敗: %w", err)
	}
	s.templates["expense_submitted"] = tmpl

	tmpl, err = template.New("expense_approved").Parse(expenseApprovedTmpl)
	if err != nil {
		return fmt.Errorf("経費申請承認テンプレートの解析に失敗: %w", err)
	}
	s.templates["expense_approved"] = tmpl

	tmpl, err = template.New("expense_rejected").Parse(expenseRejectedTmpl)
	if err != nil {
		return fmt.Errorf("経費申請却下テンプレートの解析に失敗: %w", err)
	}
	s.templates["expense_rejected"] = tmpl

	tmpl, err = template.New("expense_limit_warning").Parse(expenseLimitWarningTmpl)
	if err != nil {
		return fmt.Errorf("経費申請上限警告テンプレートの解析に失敗: %w", err)
	}
	s.templates["expense_limit_warning"] = tmpl

	return nil
}

// SendEmail シンプルなメール送信
func (s *emailService) SendEmail(ctx context.Context, to []string, subject, body string) error {
	if !s.config.Enabled {
		s.logger.Info("Email service is disabled, skipping email send",
			zap.Strings("to", to),
			zap.String("subject", subject))
		return nil
	}

	// メールメッセージの構築
	msg := s.buildMessage(to, subject, body, false)

	// SMTP認証
	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

	// メール送信
	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
	err := smtp.SendMail(addr, auth, s.config.From, to, []byte(msg))
	if err != nil {
		s.logger.Error("Failed to send email",
			zap.Strings("to", to),
			zap.String("subject", subject),
			zap.Error(err))
		return fmt.Errorf("メール送信に失敗しました: %w", err)
	}

	s.logger.Info("Email sent successfully",
		zap.Strings("to", to),
		zap.String("subject", subject))

	return nil
}

// SendHTMLEmail HTML形式のメール送信
func (s *emailService) SendHTMLEmail(ctx context.Context, to []string, subject, htmlBody string) error {
	if !s.config.Enabled {
		s.logger.Info("Email service is disabled, skipping email send",
			zap.Strings("to", to),
			zap.String("subject", subject))
		return nil
	}

	// メールメッセージの構築
	msg := s.buildMessage(to, subject, htmlBody, true)

	// SMTP認証
	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

	// メール送信
	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
	err := smtp.SendMail(addr, auth, s.config.From, to, []byte(msg))
	if err != nil {
		s.logger.Error("Failed to send HTML email",
			zap.Strings("to", to),
			zap.String("subject", subject),
			zap.Error(err))
		return fmt.Errorf("HTMLメール送信に失敗しました: %w", err)
	}

	s.logger.Info("HTML email sent successfully",
		zap.Strings("to", to),
		zap.String("subject", subject))

	return nil
}

// SendTemplatedEmail テンプレートを使用したメール送信
func (s *emailService) SendTemplatedEmail(ctx context.Context, to []string, subject, templateName string, data interface{}) error {
	tmpl, exists := s.templates[templateName]
	if !exists {
		return fmt.Errorf("テンプレート %s が見つかりません", templateName)
	}

	// テンプレートを実行してHTML生成
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("テンプレートの実行に失敗しました: %w", err)
	}

	return s.SendHTMLEmail(ctx, to, subject, buf.String())
}

// SendWeeklyReportReminder 週報リマインダーを送信
func (s *emailService) SendWeeklyReportReminder(ctx context.Context, to string, userName string, weekStart, weekEnd string) error {
	subject := "【リマインド】週報提出のお願い"

	data := map[string]interface{}{
		"UserName":  userName,
		"WeekStart": weekStart,
		"WeekEnd":   weekEnd,
		"SystemURL": s.config.SystemURL,
	}

	return s.SendTemplatedEmail(ctx, []string{to}, subject, "weekly_reminder", data)
}

// SendWeeklyReportSubmittedNotice 週報提出完了通知を送信
func (s *emailService) SendWeeklyReportSubmittedNotice(ctx context.Context, to string, userName string, weekStart, weekEnd string) error {
	subject := "週報提出完了のお知らせ"

	body := fmt.Sprintf(`
%s 様

週報の提出を確認いたしました。
対象期間: %s 〜 %s

ご提出ありがとうございました。

※このメールは自動送信されています。
`, userName, weekStart, weekEnd)

	return s.SendEmail(ctx, []string{to}, subject, body)
}

// SendAlertNotification アラート通知を送信
func (s *emailService) SendAlertNotification(ctx context.Context, to string, alertType, severity, message string) error {
	subject := fmt.Sprintf("【アラート】%s", alertType)

	severityLabel := map[string]string{
		"high":   "高",
		"medium": "中",
		"low":    "低",
	}[severity]

	data := map[string]interface{}{
		"AlertType":     alertType,
		"Severity":      severity,
		"SeverityLabel": severityLabel,
		"Message":       message,
		"SystemURL":     s.config.SystemURL,
	}

	return s.SendTemplatedEmail(ctx, []string{to}, subject, "alert_notification", data)
}

// SendAdminNotification 管理者向け通知を送信
func (s *emailService) SendAdminNotification(ctx context.Context, to []string, subject, message string) error {
	body := fmt.Sprintf(`
管理者各位

%s

詳細はシステムにログインしてご確認ください。
%s

※このメールは自動送信されています。
`, message, s.config.SystemURL)

	return s.SendEmail(ctx, to, subject, body)
}

// buildMessage メールメッセージを構築
func (s *emailService) buildMessage(to []string, subject, body string, isHTML bool) string {
	headers := make(map[string]string)
	headers["From"] = s.config.From
	headers["To"] = strings.Join(to, ",")
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"

	if isHTML {
		headers["Content-Type"] = "text/html; charset=\"UTF-8\""
	} else {
		headers["Content-Type"] = "text/plain; charset=\"UTF-8\""
	}

	// ヘッダーを組み立て
	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	return message
}

// SendExpenseSubmittedNotice 経費申請提出通知を送信（承認者向け）
func (s *emailService) SendExpenseSubmittedNotice(ctx context.Context, to string, approverName string, expense *model.Expense) error {
	subject := "【承認依頼】経費申請の承認をお願いします"

	// カテゴリ名を取得（実際の実装では適切に取得）
	categoryName := getCategoryDisplayName(expense.Category)

	data := map[string]interface{}{
		"ApproverName": approverName,
		"Expense":      expense,
		"ExpenseDate":  expense.ExpenseDate.Format("2006年01月02日"),
		"CategoryName": categoryName,
		"SystemURL":    s.config.SystemURL,
	}

	return s.SendTemplatedEmail(ctx, []string{to}, subject, "expense_submitted", data)
}

// SendExpenseApprovedNotice 経費申請承認通知を送信（申請者向け）
func (s *emailService) SendExpenseApprovedNotice(ctx context.Context, to string, expense *model.Expense, approverName string, isFullyApproved bool) error {
	subject := "経費申請が承認されました"

	data := map[string]interface{}{
		"Expense":         expense,
		"ApproverName":    approverName,
		"IsFullyApproved": isFullyApproved,
		"SystemURL":       s.config.SystemURL,
	}

	return s.SendTemplatedEmail(ctx, []string{to}, subject, "expense_approved", data)
}

// SendExpenseRejectedNotice 経費申請却下通知を送信（申請者向け）
func (s *emailService) SendExpenseRejectedNotice(ctx context.Context, to string, expense *model.Expense, rejectorName string, reason string) error {
	subject := "経費申請が却下されました"

	data := map[string]interface{}{
		"Expense":      expense,
		"RejectorName": rejectorName,
		"Reason":       reason,
		"SystemURL":    s.config.SystemURL,
	}

	return s.SendTemplatedEmail(ctx, []string{to}, subject, "expense_rejected", data)
}

// SendExpenseLimitWarning 経費申請上限警告を送信
func (s *emailService) SendExpenseLimitWarning(ctx context.Context, to string, userName string, limitType string, usageRate float64, currentAmount, limitAmount int) error {
	subject := fmt.Sprintf("【警告】%s経費申請上限に近づいています", getLimitTypeLabel(limitType))

	remainingAmount := limitAmount - currentAmount
	if remainingAmount < 0 {
		remainingAmount = 0
	}

	data := map[string]interface{}{
		"UserName":        userName,
		"LimitType":       limitType,
		"LimitTypeLabel":  getLimitTypeLabel(limitType),
		"UsageRate":       fmt.Sprintf("%.0f", usageRate),
		"CurrentAmount":   currentAmount,
		"LimitAmount":     limitAmount,
		"RemainingAmount": remainingAmount,
		"SystemURL":       s.config.SystemURL,
	}

	return s.SendTemplatedEmail(ctx, []string{to}, subject, "expense_limit_warning", data)
}

// getCategoryDisplayName カテゴリの表示名を取得
func getCategoryDisplayName(category model.ExpenseCategory) string {
	switch category {
	case model.ExpenseCategoryTransport:
		return "交通費"
	case model.ExpenseCategoryMeal:
		return "食費"
	case model.ExpenseCategoryAccommodation:
		return "宿泊費"
	case model.ExpenseCategoryEntertainment:
		return "接待費"
	case model.ExpenseCategoryOfficeSupplies:
		return "備品"
	case model.ExpenseCategoryBook:
		return "書籍"
	case model.ExpenseCategorySeminar:
		return "セミナー・研修"
	case model.ExpenseCategoryOther:
		return "その他"
	default:
		return string(category)
	}
}

// getLimitTypeLabel 上限タイプのラベルを取得
func getLimitTypeLabel(limitType string) string {
	switch limitType {
	case "monthly":
		return "月次"
	case "yearly":
		return "年次"
	default:
		return limitType
	}
}
